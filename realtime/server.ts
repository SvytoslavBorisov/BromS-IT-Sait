// server.ts
import http from "http";
import { Server } from "socket.io";
import { jwtVerify } from "jose";
import { randomUUID } from "crypto";
import "dotenv/config";

const PORT  = Number(process.env.SOCKETS_PORT ?? 4000);
const HOST  = process.env.SOCKETS_HOST ?? "0.0.0.0";
const JWT_SECRET_STR = process.env.SOCKETS_JWT_SECRET;

if (!JWT_SECRET_STR) {
  // Жёстко валим на старте, чтобы не гонять сервер без секрета
  throw new Error("SOCKETS_JWT_SECRET is not set");
}
const SECRET = new TextEncoder().encode(JWT_SECRET_STR);

/** Разрешённые origin'ы: CSV из ENV, плюс dev по умолчанию */
const CORS_ORIGINS = (process.env.SOCKETS_CORS_ORIGINS ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// По умолчанию добавим dev и прод, если не задано явно
if (CORS_ORIGINS.length === 0) {
  CORS_ORIGINS.push("http://localhost:3000", "https://broms-it.ru");
}

const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGINS },
  path: "/socket.io",
});

type AuthedUser = { sub: string; name?: string; email?: string; picture?: string };
type ChatIncoming = { room: string; text: string; mid?: string };
type ChatMessage  = { mid: string; room: string; text: string; userId: string; userName?: string; userAvatar?: string; ts: number };

// Простая in‑memory история по комнатам (на прод можно вынести в БД/Redis)
const HISTORY: Record<string, ChatMessage[]> = {};

io.use(async (socket, next) => {
  try {
    const token = (socket.handshake.auth?.token ?? "") as string;
    if (!token) return next(new Error("No token"));
    const { payload } = await jwtVerify(token, SECRET);
    socket.data.user = {
      sub: String(payload.sub ?? ""),
      name: payload.name as string | undefined,
      email: payload.email as string | undefined,
      picture: payload.picture as string | undefined,
    } satisfies AuthedUser;
    if (!socket.data.user.sub) return next(new Error("Invalid token payload"));
    next();
  } catch (e) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user as AuthedUser;

  socket.on("chat:join", (room: string) => {
    if (typeof room !== "string") return;
    const r = room.trim();
    if (!r) return;
    socket.join(r);
  });

  socket.on("chat:message", (p: ChatIncoming) => {
    if (!p || typeof p.room !== "string" || typeof p.text !== "string") return;
    const room = p.room.trim();
    const text = p.text.trim();
    if (!room || !text) return;

    const mid = (p.mid && typeof p.mid === "string" && p.mid.length <= 64)
      ? p.mid
      : randomUUID();

    const msg: ChatMessage = {
      mid,
      room,
      text,
      userId: user.sub,
      userName: user.name,
      userAvatar: user.picture,
      ts: Date.now(),
    };

    // сохраняем короткую историю
    (HISTORY[room] ??= []).push(msg);
    if (HISTORY[room].length > 200) HISTORY[room].splice(0, HISTORY[room].length - 200);

    // Рассылка:
    //  - если клиент делает «оптимистический эхо» локально — достаточно отправить всем КРОМЕ отправителя:
    // socket.to(room).emit("chat:message", msg);
    //  - если нужно отправлять ВКЛЮЧАЯ отправителя:
    io.to(room).emit("chat:message", msg);
  });

  socket.on("chat:history", ({ room, limit }: { room: string; limit?: number }) => {
    if (typeof room !== "string" || !room.trim()) return;
    const lim = Math.max(1, Math.min(200, limit ?? 50));
    const items = (HISTORY[room.trim()] ?? []);
    const slice = items.slice(-lim);
    socket.emit("chat:history", slice);
  });

  socket.on("chat:typing", (p: { room: string; userName?: string; typing: boolean }) => {
    if (!p || typeof p.room !== "string" || !p.room.trim()) return;
    // Всем в комнате, кроме отправителя:
    socket.to(p.room.trim()).emit("chat:typing", { userName: p.userName ?? user.name, typing: !!p.typing });
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Socket.IO listening on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(`CORS origins: ${CORS_ORIGINS.join(", ")}`);
});

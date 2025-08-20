// server.ts
import http from "http";
import { Server } from "socket.io";
import { jwtVerify } from "jose";
import "dotenv/config";

const SECRET = new TextEncoder().encode(process.env.SOCKETS_JWT_SECRET!);
const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: { origin: ["http://localhost:3000"] },
  path: "/socket.io",
});

type AuthedUser = { sub: string; name?: string; email?: string; picture?: string; };
type ChatIncoming = { room: string; text: string; mid?: string };
type ChatMessage  = { mid: string; room: string; text: string; userId: string; userName?: string; userAvatar?: string; ts: number };

// простая in‑memory история по комнатам (замени на Prisma при желании)
const HISTORY: Record<string, ChatMessage[]> = {};

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("No token"));
    const { payload } = await jwtVerify(token, SECRET);
    socket.data.user = {
      sub: String(payload.sub),
      name: payload.name as string | undefined,
      email: payload.email as string | undefined,
      picture: payload.picture as string | undefined,
    } as AuthedUser;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user as AuthedUser;

  socket.on("chat:join", (room: string) => {
    if (typeof room !== "string" || !room) return;
    socket.join(room);
  });

  socket.on("chat:message", (p: ChatIncoming) => {
    if (!p || typeof p.room !== "string" || typeof p.text !== "string") return;
    const room = p.room.trim();
    const text = p.text.trim();
    if (!room || !text) return;

    const mid =
      p.mid && typeof p.mid === "string" && p.mid.length <= 64
        ? p.mid
        : (globalThis.crypto?.randomUUID?.() ??
           `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

    const msg: ChatMessage = {
      mid,
      room,
      text,
      userId: user.sub,
      userName: user.name,
      userAvatar: user.picture,
      ts: Date.now(),
    };

    // сохраняем в историю (по желанию)
    (HISTORY[room] ??= []).push(msg);
    if (HISTORY[room].length > 200) HISTORY[room].splice(0, HISTORY[room].length - 200);

    // рассылаем РОВНО один раз всем в комнате (включая отправителя)
    socket.to(room).emit("chat:message", msg);
  });

  socket.on("chat:history", ({ room, limit }: { room: string; limit?: number }) => {
    const lim = Math.max(1, Math.min(200, limit ?? 50));
    const items = (HISTORY[room] ?? []);
    const slice = items.slice(-lim);
    socket.emit("chat:history", slice);
  });

  socket.on("chat:typing", (p: { room: string; userName?: string; typing: boolean }) => {
    if (!p?.room) return;
    // всем кроме отправителя
    socket.to(p.room).emit("chat:typing", { userName: p.userName ?? user.name, typing: !!p.typing });
  });
});

const PORT = Number(process.env.SOCKETS_PORT ?? 4000);
httpServer.listen(PORT, "0.0.0.0", () =>
  console.log(`Socket.IO listening on http://localhost:${PORT}`)
);

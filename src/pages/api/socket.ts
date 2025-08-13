// pages/api/socket.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { Server as IOServer } from "socket.io"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { redis, redlock } from "@/lib/redis"
import { z } from "zod"
import type { Server as HTTPServer } from "http"
import type { Server as IOServerType } from "socket.io"

export const config = { api: { bodyParser: false } } // ⬅️ важно для Socket.IO

type HTTPServerWithIO = HTTPServer & { io?: IOServerType }
type ResWithIO = NextApiResponse & {
  socket: NextApiResponse["socket"] & { server: HTTPServerWithIO }
}

const actionSchema = z.object({
  tableId: z.string(),
  actionId: z.string().uuid(),
  type: z.enum(["JOIN","LEAVE","BET","CALL","FOLD","CHECK","START_HAND"]),
  amount: z.number().int().nonnegative().optional(),
})

type State = {
  hand: number; pot: number;
  players: Record<string, { stack: number; inHand: boolean }>;
  toAct: string | null;
}
function createInitialState(): State { return { hand: 0, pot: 0, players: {}, toAct: null } }
function applyAction(state: State, a: z.infer<typeof actionSchema>, userId: string): State {
  const s: State = JSON.parse(JSON.stringify(state))
  switch (a.type) {
    case "JOIN": s.players[userId] ??= { stack: 1000, inHand: true }; break
    case "BET":  if (!s.players[userId]?.inHand) break; s.players[userId].stack -= a.amount ?? 0; s.pot += a.amount ?? 0; break
    case "FOLD": if (s.players[userId]) s.players[userId].inHand = false; break
    case "START_HAND": s.hand += 1; s.pot = 0; Object.values(s.players).forEach(p => p.inHand = true); break
  }
  return s
}

export default async function handler(_req: NextApiRequest, res: ResWithIO) {
  const server: HTTPServerWithIO = res.socket.server

  console.log("[socket api hit]", _req.url, _req.headers.cookie?.slice(0,80))

  if (!server.io) {
    const io = new IOServer(server, {
      path: "/api/socket",              // ⬅️ этот path должен совпадать с клиентом
      addTrailingSlash: false,
    })

    // ---- Авторизация: NextAuth JWT из cookies ----
    io.use(async (socket, next) => {
      try {
        const token = await getToken({
          req: socket.request as any,
          secret: process.env.NEXTAUTH_SECRET,
        })
        if (!token?.sub) return next(new Error("unauthorized"))
        // можно без запроса в БД, если не нужно: socket.data.userId = token.sub
        socket.data.userId = token.sub
        return next()
      } catch (e) {
        return next(new Error("unauthorized"))
      }
    })
    io.on("connection", (socket) => {
      const user = socket.data.user as { id: string; name?: string | null }

      socket.on("join_table", async ({ tableId }: { tableId: string }) => {
        socket.join(tableId)
        await redis.sadd(`table:${tableId}:players`, user.id)
        if (user.name) await redis.set(`user:${user.id}:name`, user.name)
        const ids = await redis.smembers(`table:${tableId}:players`)
        const players = await Promise.all(ids.map(async id => ({
          id, name: (await redis.get(`user:${id}:name`)) ?? null
        })))
        io.to(tableId).emit("presence", players)
      })

      socket.on("action", async (payload) => {
        const data = actionSchema.parse(payload)
        const lock = await redlock.acquire([`lock:table:${data.tableId}`], 2000)
        try {
          const stateKey = `table:${data.tableId}:state`
          const seenKey  = `table:${data.tableId}:seen`
          if ((await redis.sadd(seenKey, data.actionId)) === 0) return
          const raw = await redis.get(stateKey)
          const state = raw ? JSON.parse(raw) : createInitialState()
          const newState = applyAction(state, data, user.id)
          await redis.set(stateKey, JSON.stringify(newState))
          io.to(data.tableId).emit("state", newState)
        } finally { await lock.release().catch(() => {}) }
      })
    })

    server.io = io
    // Лог для дебага
    console.log("[socket] IO server attached at /api/socket")
  }

  // Важно: обычный HTTP-ответ, чтобы Next не ставил 400
  res.status(200).end("ok")
}

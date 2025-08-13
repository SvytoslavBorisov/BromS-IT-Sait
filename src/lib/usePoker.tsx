"use client"
import { io, type Socket } from "socket.io-client"
import { useEffect, useRef, useState } from "react"
import type { PlayerPresence } from "@/types/realtime"

export function usePoker(tableId: string) {
  const socketRef = useRef<Socket | null>(null)
  const [state, setState] = useState<any>(null)
  const [presence, setPresence] = useState<PlayerPresence[]>([])

  useEffect(() => {
    let stopped = false

    // 1) дергаем HTTP, чтобы на dev инициализировать сервер
    fetch("/api/socket").finally(() => {
      if (stopped) return
      // 2) подключаемся к Socket.IO на ТОЧНО таком же path
      const socket = io({
        path: "/api/socket",
        transports: ["websocket", "polling"], // оставим оба на всякий
        withCredentials: true,                // куки для NextAuth
      })
      socketRef.current = socket

      socket.on("connect", () => socket.emit("join_table", { tableId }))
      socket.on("state", setState)
      socket.on("presence", (payload: any) => {
        const norm: PlayerPresence[] =
          Array.isArray(payload) && typeof payload[0] === "string"
            ? (payload as string[]).map(id => ({ id, name: null }))
            : (payload as PlayerPresence[])
        setPresence(norm)
      })
    })

    return () => { stopped = true; socketRef.current?.disconnect() }
  }, [tableId])

  function act(type: string, amount?: number) {
    socketRef.current?.emit("action", { tableId, type, amount, actionId: crypto.randomUUID() })
  }

  return { state, presence, act }
}
"use client";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  // реиспользуем одно соединение
  if (socket && socket.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKETS_URL ?? "http://localhost:4000", {
    path: "/socket.io",
    auth: { token },
    // не форсируем websocket — пускай сделает polling->websocket (надёжнее за прокси)
    autoConnect: true,
    withCredentials: false,
  });

  return socket;
}

export function getCurrentSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

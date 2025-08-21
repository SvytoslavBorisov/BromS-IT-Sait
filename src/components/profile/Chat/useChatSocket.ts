"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { connectSocket } from "@/lib/realtime";
import { dedupeMsgs, isPromise } from "./utils";
import type { Message, TypingPayload } from "./types";

type UseChatSocketArgs = {
  room: string;
  you: string;
};

export function useChatSocket({ room, you }: UseChatSocketArgs) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [othersTyping, setOthersTyping] = useState<string[]>([]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1) connect once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch("/api/socket-token");
      if (!res.ok) return;
      const { token } = await res.json();

      const maybeSocket = connectSocket(token) as Socket | Promise<Socket>;
      const s: Socket = isPromise(maybeSocket) ? await maybeSocket : (maybeSocket as Socket);
      if (!mounted) return;
      setSocket(s);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 2) bind events
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setConnected(true);
      socket.emit("chat:join", room);
      socket.emit("chat:history", { room, limit: 50 });
    };
    const onDisconnect = () => setConnected(false);

    const onMessage = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    };

    const onHistory = (msgs: Message[]) => {
      setMessages((prev) => dedupeMsgs([...prev, ...msgs]).sort((a, b) => a.ts - b.ts));
    };

    const onTyping = (payload: TypingPayload) => {
      const u = payload.userName?.trim();
      if (!u || u === you) return;
      setOthersTyping((prev) => {
        const set = new Set(prev);
        if (payload.typing) set.add(u); else set.delete(u);
        return Array.from(set);
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat:message", onMessage);
    socket.on("chat:history", onHistory);
    socket.on("chat:typing", onTyping);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat:message", onMessage);
      socket.off("chat:history", onHistory);
      socket.off("chat:typing", onTyping);
    };
  }, [socket, room, you]);

  const emitTyping = (typing: boolean) => {
    if (!socket) return;
    socket.emit("chat:typing", { room, userName: you, typing });
  };

  const sendMessage = (payload: { text: string; avatar?: string }) => {
    if (!socket) return;
    const t = payload.text.trim();
    if (!t) return;
    socket.emit("chat:message", { room, text: t });
    // optimistic echo
    setMessages((prev) => [
      ...prev,
      { room, text: t, ts: Date.now(), userName: you, userAvatar: payload.avatar },
    ]);
  };

  return {
    socket,
    connected,
    messages,
    othersTyping,
    emitTyping,
    sendMessage,
    typingTimer,
  };
}

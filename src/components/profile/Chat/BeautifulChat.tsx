"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { connectSocket } from "@/lib/realtime";

// ===== Types =====
export type Message = {
  room: string;
  text: string;
  ts: number; // unix ms
  userId?: string;
  userName?: string;
  userAvatar?: string;
};

export default function BeautifulChat({
  room = "global",
  user,
  avatar,
}: {
  room?: string;
  user: string; // current user display name
  avatar?: string; // optional current user avatar url
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [othersTyping, setOthersTyping] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  // ===== Helpers =====
  const you = useMemo(() => user?.trim() || "you", [user]);

  const grouped = useMemo(() => groupByDay(messages), [messages]);

  // Smooth autoscroll to bottom
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  // ===== 1) Connect once: fetch token and create socket =====
  useEffect(() => {
    let mounted = true;

    (async () => {
      const res = await fetch("/api/socket-token");
      if (!res.ok) return;
      const { token } = await res.json();

      // connectSocket may return Socket or Promise<Socket>
      const maybeSocket = connectSocket(token) as Socket | Promise<Socket>;
      const s: Socket = isPromise(maybeSocket) ? await maybeSocket : (maybeSocket as Socket);
      if (!mounted) return;
      setSocket(s);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ===== 2) Bind/unbind socket listeners =====
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setConnected(true);
      socket.emit("chat:join", room);
    };
    const onDisconnect = () => setConnected(false);

    const onMessage = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    };

    const onHistory = (msgs: Message[]) => {
      setMessages((prev) => dedupeMsgs([...prev, ...msgs]).sort((a, b) => a.ts - b.ts));
      scrollToBottom();
    };

    const onTyping = (payload: { userName?: string; typing: boolean }) => {
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

    // ask for recent history
    socket.emit("chat:history", { room, limit: 50 });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat:message", onMessage);
      socket.off("chat:history", onHistory);
      socket.off("chat:typing", onTyping);
    };
  }, [socket, room, you]);

  // ===== 3) Send message =====
  const send = () => {
    const t = text.trim();
    if (!t || !socket) return;

    socket.emit("chat:message", { room, text: t });
    // optimistic local echo (optional)
    setMessages((prev) => [
      ...prev,
      {
        room,
        text: t,
        ts: Date.now(),
        userName: you,
        userAvatar: avatar,
      },
    ]);

    setText("");
    emitTyping(false);
    scrollToBottom();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  // ===== Typing indicator =====
  const emitTyping = (typing: boolean) => {
    if (!socket) return;
    socket.emit("chat:typing", { room, userName: you, typing });
  };

  const onChange = (v: string) => {
    setText(v);
    if (!socket) return;
    emitTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 900);
  };

  return (
    <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-900/60 to-neutral-900/20 backdrop-blur p-4 md:p-6 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`relative h-3 w-3 rounded-full ${connected ? "bg-emerald-400" : "bg-neutral-500"}`}></div>
          <div className="text-sm text-white/70">{connected ? `Room: ${room}` : "Подключение…"}</div>
        </div>
        <div className="flex items-center gap-3">
          {avatar ? (
            <img src={avatar} alt="me" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center text-xs text-white/70">
              {initials(you)}
            </div>
          )}
          <div className="text-sm text-white/80">{you}</div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="h-[480px] overflow-y-auto rounded-2xl bg-black/20 border border-white/10 p-3 md:p-4 space-y-6 scroll-smooth"
      >
        {grouped.map(({ day, items }) => (
          <div key={day} className="space-y-3">
            <DayDivider label={day} />
            {items.map((m, i) => (
              <MessageBubble key={`${m.ts}-${i}`} m={m} isMine={(m.userName ?? "") === you} />
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {othersTyping.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-white/60 pl-1">
            <TypingDots />
            <span>
              {othersTyping.slice(0, 2).join(", ")}
              {othersTyping.length > 2 ? ` и ещё ${othersTyping.length - 2}` : ""} печатает…
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2">
        <div className="flex-1 rounded-2xl border border-white/10 bg-black/30 focus-within:border-white/20 px-3 py-2">
          <textarea
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Напишите сообщение…"
            rows={1}
            className="w-full resize-none bg-transparent outline-none placeholder-white/40 text-white text-sm max-h-40"
          />
          <div className="flex justify-between items-center pt-1">
            <div className="text-[10px] text-white/40">Enter — отправить • Shift+Enter — перенос строки</div>
            <div className="text-[10px] text-white/40">{text.trim().length}/2000</div>
          </div>
        </div>
        <button
          onClick={send}
          disabled={!socket || !text.trim()}
          className="shrink-0 rounded-xl px-4 py-2 text-sm font-medium bg-white/90 text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
        >
          Отправить
        </button>
      </div>
    </div>
  );
}

// ===== Bubbles & UI bits =====
function MessageBubble({ m, isMine }: { m: Message; isMine: boolean }) {
  const time = timeHHMM(m.ts);
  return (
    <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <AvatarCircle name={m.userName} src={m.userAvatar} accent={!isMine} />
        {/* Bubble */}
        <div
          className={
            "rounded-2xl px-3 py-2 shadow-md border " +
            (isMine
              ? "bg-emerald-500/90 border-emerald-400/20 text-black"
              : "bg-white/5 border-white/10 text-white")
          }
        >
          <div className={`text-[11px] mb-0.5 ${isMine ? "text-black/70" : "text-white/60"}`}>
            {m.userName || m.userId || "user"}
          </div>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.text}</div>
          <div className={`text-[10px] mt-1 ${isMine ? "text-black/60" : "text-white/50"}`}>{time}</div>
        </div>
      </div>
    </div>
  );
}

function AvatarCircle({ name, src, accent = false }: { name?: string; src?: string; accent?: boolean }) {
  if (src) return <img src={src} alt={name || "avatar"} className={`h-7 w-7 rounded-full object-cover ${accent ? "ring-2 ring-emerald-400/40" : ""}`} />;
  return (
    <div className={`h-7 w-7 rounded-full grid place-items-center text-[10px] ${accent ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/70"}`}>
      {initials(name)}
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <span className="absolute px-3 py-1 text-[10px] uppercase tracking-wider bg-black/50 text-white/60 rounded-full border border-white/10">
        {label}
      </span>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1">
      <Dot />
      <Dot delay={120} />
      <Dot delay={240} />
    </span>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

// ===== Utils =====
function isPromise<T = any>(x: any): x is Promise<T> {
  return x && typeof x.then === "function";
}

function dedupeMsgs(arr: Message[]) {
  const seen = new Set<string>();
  const out: Message[] = [];
  for (const m of arr) {
    const key = `${m.ts}:${m.userId ?? m.userName ?? ""}:${m.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(m);
    }
  }
  return out;
}

function groupByDay(msgs: Message[]) {
  const by: Record<string, Message[]> = {};
  for (const m of msgs) {
    const day = dayLabel(m.ts);
    by[day] ??= [];
    by[day].push(m);
  }
  return Object.entries(by)
    .map(([day, items]) => ({ day, items }))
    .sort((a, b) => (a.items[0]?.ts ?? 0) - (b.items[0]?.ts ?? 0));
}

function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth(), da = today.getDate();
  const isToday = d.getFullYear() === y && d.getMonth() === m && d.getDate() === da;
  const yesterday = new Date();
  yesterday.setDate(da - 1);
  const isYesterday = d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate();
  if (isToday) return "Сегодня";
  if (isYesterday) return "Вчера";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: d.getFullYear() !== y ? "numeric" : undefined });
}

function timeHHMM(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function initials(name?: string) {
  const s = (name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[1]![0]).toUpperCase();
}

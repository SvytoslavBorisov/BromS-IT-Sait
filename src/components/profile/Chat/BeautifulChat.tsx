"use client";

import React, { useMemo, useState } from "react";
import type { Message } from "./types";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import { useChatSocket } from "./useChatSocket";

export default function BeautifulChat({
  room = "global",
  user,
  avatar,
}: {
  room?: string;
  user: string;   // display name
  avatar?: string;
}) {
  const [text, setText] = useState("");
  const you = useMemo(() => user?.trim() || "you", [user]);

  const {
    connected,
    messages,
    othersTyping,
    emitTyping,
    sendMessage,
    typingTimer,
  } = useChatSocket({ room, you });

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const onChange = (v: string) => {
    setText(v);
    emitTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 900);
  };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    sendMessage({ text: t, avatar });
    setText("");
    emitTyping(false);
  };

  return (
    <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-900/60 to-neutral-900/20 backdrop-blur p-4 md:p-6 shadow-xl flex flex-col gap-4">
      <ChatHeader connected={connected} room={room} you={you} avatar={avatar} />

      <MessageList messages={messages as Message[]} you={you} typingNames={othersTyping} />

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
          disabled={!text.trim()}
          className="shrink-0 rounded-xl px-4 py-2 text-sm font-medium bg-white/90 text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
        >
          Отправить
        </button>
      </div>
    </div>
  );
}

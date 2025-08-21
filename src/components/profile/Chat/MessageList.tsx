"use client";
import DayDivider from "./DayDivider";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { groupByDay } from "./utils";
import type { Message } from "./types";
import { useEffect, useRef } from "react";

export default function MessageList({
  messages,
  you,
  typingNames,
}: {
  messages: Message[];
  you: string;
  typingNames: string[];
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const grouped = groupByDay(messages);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  useEffect(() => { scrollToBottom(); }, [messages, typingNames.length]);

  return (
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
      <TypingIndicator names={typingNames} />
    </div>
  );
}

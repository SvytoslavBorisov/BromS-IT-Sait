"use client";
import AvatarCircle from "./AvatarCircle";
import { timeHHMM } from "./utils";
import type { Message } from "./types";

export default function MessageBubble({ m, isMine }: { m: Message; isMine: boolean }) {
  const time = timeHHMM(m.ts);
  return (
    <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
        <AvatarCircle name={m.userName} src={m.userAvatar} accent={!isMine} />
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

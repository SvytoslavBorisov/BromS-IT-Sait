"use client";
import AvatarCircle from "./AvatarCircle";

export default function ChatHeader({
  connected,
  room,
  you,
  avatar,
}: {
  connected: boolean;
  room: string;
  you: string;
  avatar?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`relative h-3 w-3 rounded-full ${connected ? "bg-emerald-400" : "bg-neutral-500"}`} />
        <div className="text-sm text-white/70">{connected ? `Room: ${room}` : "Подключение…"}</div>
      </div>
      <div className="flex items-center gap-3">
        {avatar ? <img src={avatar} alt="me" className="h-8 w-8 rounded-full object-cover" /> : <AvatarCircle name={you} />}
        <div className="text-sm text-white/80">{you}</div>
      </div>
    </div>
  );
}

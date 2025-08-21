"use client";
import { initials } from "./utils";

export default function AvatarCircle({
  name,
  src,
  accent = false,
  size = 28, // px
}: { name?: string; src?: string; accent?: boolean; size?: number }) {
  const cls = accent ? "ring-2 ring-emerald-400/40" : "";
  const box = `h-[${size}px] w-[${size}px]`;
  if (src) {
    return <img src={src} alt={name || "avatar"} className={`rounded-full object-cover ${cls}`} style={{ height: size, width: size }} />;
  }
  return (
    <div
      className={`rounded-full grid place-items-center text-[10px] ${accent ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/70"}`}
      style={{ height: size, width: size }}
    >
      {initials(name)}
    </div>
  );
}

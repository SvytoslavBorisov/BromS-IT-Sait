"use client";
import { initials } from "@/app/test/football/lib/utils";

function Silhouette() {
  return (
    <svg viewBox="0 0 64 64" className="w-14 h-14 text-neutral-300">
      <circle cx="32" cy="22" r="12" fill="currentColor" />
      <path d="M8 58c0-11 10-20 24-20s24 9 24 20" fill="currentColor" />
    </svg>
  );
}

export default function PlayerAvatar({ name }: { name?: string }) {
  return (
    <div className="relative">
      <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200">
        <Silhouette />
      </div>
      {name ? (
        <div className="absolute -bottom-1 -right-1 rounded-md bg-neutral-900 px-1.5 py-0.5 text-xs font-medium text-white">
          {initials(name)}
        </div>
      ) : null}
    </div>
  );
}

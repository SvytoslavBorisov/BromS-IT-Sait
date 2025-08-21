"use client";
export default function DayDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <span className="absolute px-3 py-1 text-[10px] uppercase tracking-wider bg-black/50 text-white/60 rounded-full border border-white/10">
        {label}
      </span>
    </div>
  );
}

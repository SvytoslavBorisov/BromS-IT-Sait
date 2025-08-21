"use client";
function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

export default function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-white/60 pl-1">
      <span className="inline-flex gap-1"><Dot /><Dot delay={120} /><Dot delay={240} /></span>
      <span>
        {names.slice(0, 2).join(", ")}
        {names.length > 2 ? ` и ещё ${names.length - 2}` : ""} печатает…
      </span>
    </div>
  );
}

// StatItem.tsx
"use client";
export default function StatItem({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 px-4 py-3 bg-white/60">
      <div className="text-[13px] text-neutral-500">{label}</div>
      <div className="mt-0.5 text-base font-semibold">{value}</div>
      {sub ? <div className="mt-0.5 text-[12px] text-neutral-500">{sub}</div> : null}
    </div>
  );
}

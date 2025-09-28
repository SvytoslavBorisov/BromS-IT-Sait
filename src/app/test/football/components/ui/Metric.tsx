"use client";

export default function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <div className="text-[12px] leading-none text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold leading-tight text-neutral-900">{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-neutral-500">{sub}</div> : null}
    </div>
  );
}

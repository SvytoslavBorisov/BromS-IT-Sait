"use client";
export default function Tooltip({
  x, y, children, visible = true,
}: { x: number; y: number; children: React.ReactNode; visible?: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 rounded-md bg-white shadow-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-800"
      style={{ left: x + 12, top: y + 12, maxWidth: 260 }}
    >
      {children}
    </div>
  );
}

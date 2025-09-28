// components/Timeline.tsx
"use client";
import { mmss } from "../utils/format";

type Row = {
  minute: number; second: number;
  type: string; outcome: string; to: string; position: string;
};

export default function Timeline({ items }: { items: Row[] }) {
  if (!items.length) return <div className="text-sm text-neutral-500">События игрока в матче не найдены.</div>;

  return (
    <ul className="space-y-3">
      {items.map((e, i) => (
        <li key={i} className="flex items-start gap-3">
          <time className="w-16 shrink-0 text-sm font-mono text-neutral-500">
            {mmss(e.minute, e.second)}
          </time>
          <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-3 shadow-sm">
            <div className="font-medium text-neutral-800">
              {e.type}{e.outcome ? ` — ${e.outcome}` : ""}
            </div>
            {(e.to || e.position) && (
              <div className="text-sm text-neutral-600">
                {e.to && <>Кому/кто: <b>{e.to}</b>{e.position ? " · " : ""}</>}
                {e.position && <>Позиция: {e.position}</>}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

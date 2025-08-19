"use client";

import { Button } from "@/components/ui/button";
import { toLocalInputValue } from "../utils";

export default function MetaFields({
  comment,
  expiresAt,
  onChange,
}: {
  comment: string;
  expiresAt: string | null;
  onChange: (p: Partial<{ comment: string; expiresAt: string | null }>) => void;
}) {
  const preset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    onChange({ expiresAt: toLocalInputValue(d) });
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl border p-4 shadow-sm bg-white/60">
        <label htmlFor="comment" className="block text-sm font-medium mb-1">Комментарий</label>
        <input
          id="comment"
          value={comment}
          onChange={(e) => onChange({ comment: e.target.value })}
          className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 border-gray-200"
          placeholder="Короткая заметка для участников"
        />
      </div>

      <div className="rounded-2xl border p-4 shadow-sm bg-white/60">
        <label htmlFor="expires" className="block text-sm font-medium mb-1">Время истечения</label>
        <div className="flex gap-2">
          <input
            id="expires"
            type="datetime-local"
            value={expiresAt ?? ""}
            onChange={(e) => onChange({ expiresAt: e.target.value || null })}
            className="flex-1 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 border-gray-200"
          />
          <Button type="button" variant="outline" onClick={() => preset(7)}>+7д</Button>
          <Button type="button" variant="outline" onClick={() => preset(30)}>+30д</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Оставьте пустым, если срок не нужен.</p>
      </div>
    </div>
  );
}

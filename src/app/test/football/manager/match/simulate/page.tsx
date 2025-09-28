'use client';

import { useState } from "react";

export default function SimulatePage() {
  const [matchId, setMatchId] = useState<string>("1");
  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function simulate() {
    setLoading(true);
    setOut(null);
    const r = await fetch('/api/football/manager/matches/simulate', { method: 'POST', body: JSON.stringify({ matchId }) });
    const json = await r.json();
    setOut(json);
    setLoading(false);
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="h2">Симуляция матча</div>
      <div className="flex gap-2 items-center">
        <label className="text-sm">ID матча</label>
        <input className="border rounded px-2 py-1 text-sm" value={matchId} onChange={e => setMatchId(e.target.value)} />
        <button onClick={simulate} className="px-3 py-1.5 text-sm rounded bg-black text-white disabled:opacity-50" disabled={loading}>
          {loading ? 'Считаю…' : 'Симулировать'}
        </button>
      </div>
      {out && (
        <pre className="text-xs bg-neutral-100 p-3 rounded">{JSON.stringify(out, null, 2)}</pre>
      )}
      <p className="muted text-sm">Сначала создай команды/игроков и сгенерируй расписание через API <code>/api/schedule/generate</code>.</p>
    </div>
  );
}

// src/pages/admin/metrics-email.tsx
import * as React from "react";

type MetricBuckets = { p50: number; p95: number; p99: number; avg: number };
type Snapshot = {
  totals: { sent: number; errors: number; throttled: number };
  latency: { verify: MetricBuckets; send: MetricBuckets };
  fallback: { primary465: number; fallback587: number; primary587: number; fallback465: number };
  dkim: { enabled: boolean; domain: string; selector: string; lastCheckedAt: number };
  errorsTail: Array<{ ts: number; code?: string | number; message: string; attempt?: string }>;
};

export default function EmailMetricsAdminPage() {
  const [data, setData] = React.useState<Snapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const r = await fetch("/api/admin/metrics-email");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as Snapshot;
      setData(j);
    } catch (e: any) {
      setError(e?.message || "Failed to load metrics");
    }
  }

  React.useEffect(() => {
    load();
    const id = setInterval(load, 5000); // автообновление каждые 5с
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Email Metrics (Mail.ru)</h1>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
          Ошибка загрузки метрик: {error}
        </div>
      )}

      {!data ? (
        <div className="text-gray-500">Загрузка…</div>
      ) : (
        <>
          {/* Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Tile title="Sent" value={data.totals.sent} />
            <Tile title="Errors" value={data.totals.errors} />
            <Tile
              title="Error rate"
              value={
                data.totals.sent + data.totals.errors === 0
                  ? "0%"
                  : `${Math.round((data.totals.errors * 100) / (data.totals.sent + data.totals.errors))}%`
              }
            />
            <Tile title="Throttled" value={data.totals.throttled} />
          </div>

          {/* DKIM */}
          <section className="rounded-xl border p-4">
            <h2 className="font-medium mb-2">DKIM</h2>
            <div className="flex flex-wrap gap-6 items-center">
              <Badge ok={data.dkim.enabled}>
                {data.dkim.enabled ? "Enabled" : "Disabled"}
              </Badge>
              <div className="text-sm text-gray-600">
                <div><strong>Domain:</strong> {data.dkim.domain || "—"}</div>
                <div><strong>Selector:</strong> {data.dkim.selector || "—"}</div>
                <div><strong>Checked:</strong> {data.dkim.lastCheckedAt ? new Date(data.dkim.lastCheckedAt).toLocaleString() : "—"}</div>
              </div>
            </div>
          </section>

          {/* Latency */}
          <section className="rounded-xl border p-4">
            <h2 className="font-medium mb-3">Latency (ms)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LatencyCard title="SMTP verify()" buckets={data.latency.verify} />
              <LatencyCard title="sendMail()" buckets={data.latency.send} />
            </div>
          </section>

          {/* Fallback */}
          <section className="rounded-xl border p-4">
            <h2 className="font-medium mb-3">Attempts</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Tile title="primary:465" value={data.fallback.primary465} small />
              <Tile title="fallback:587" value={data.fallback.fallback587} small />
              <Tile title="primary:587" value={data.fallback.primary587} small />
              <Tile title="fallback:465" value={data.fallback.fallback465} small />
            </div>
          </section>

          {/* Errors tail */}
          <section className="rounded-xl border p-4">
            <h2 className="font-medium mb-3">Last errors</h2>
            {data.errorsTail.length === 0 ? (
              <div className="text-sm text-gray-500">Нет ошибок 👌</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Time</th>
                      <th className="py-2 pr-4">Attempt</th>
                      <th className="py-2 pr-4">Code</th>
                      <th className="py-2">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.errorsTail.slice().reverse().map((e, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4 whitespace-nowrap">{new Date(e.ts).toLocaleString()}</td>
                        <td className="py-2 pr-4">{e.attempt || "—"}</td>
                        <td className="py-2 pr-4">{e.code ?? "—"}</td>
                        <td className="py-2">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Tile({ title, value, small }: { title: string; value: number | string; small?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${small ? "py-3" : "py-6"}`}>
      <div className={`text-sm text-gray-600 ${small ? "" : "mb-1"}`}>{title}</div>
      <div className={`font-semibold ${small ? "text-lg" : "text-2xl"}`}>{value}</div>
    </div>
  );
}

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ok ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
      {children}
    </span>
  );
}

function LatencyCard({ title, buckets }: { title: string; buckets: { p50: number; p95: number; p99: number; avg: number } }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="font-medium mb-2">{title}</div>
      <div className="grid grid-cols-4 gap-3 text-sm">
        <div><div className="text-gray-500">p50</div><div className="font-semibold">{buckets.p50} ms</div></div>
        <div><div className="text-gray-500">p95</div><div className="font-semibold">{buckets.p95} ms</div></div>
        <div><div className="text-gray-500">p99</div><div className="font-semibold">{buckets.p99} ms</div></div>
        <div><div className="text-gray-500">avg</div><div className="font-semibold">{buckets.avg} ms</div></div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import type { Snapshot } from "./page";

const nfInt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const df = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" });

function pct(n: number) {
  return new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 }).format(n);
}

export default function AdminEmailMetricsClient({ initialData }: { initialData: Snapshot }) {
  const [data, setData] = React.useState<Snapshot>(initialData);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Поллинг с безопасной очисткой + пауза при скрытии вкладки
  React.useEffect(() => {
    let abort = new AbortController();
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await fetch("/api/admin/metrics-email", { cache: "no-store", signal: abort.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as Snapshot;
        if (active) setData(j);
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e?.message ?? "Failed to load metrics");
      } finally {
        if (active) setLoading(false);
      }
    };

    const start = () => {
      if (timer) return;
      void load();
      timer = setInterval(load, 5000);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      abort.abort();
      abort = new AbortController();
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      active = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const total = data.totals.sent + data.totals.errors;
  const errorRate = total === 0 ? 0 : data.totals.errors / total;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Email Metrics (Mail.ru)</h1>
        <button
          onClick={async () => {
            try {
              setLoading(true);
              setError(null);
              const r = await fetch("/api/admin/metrics-email", { cache: "no-store" });
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              setData(await r.json());
            } catch (e: any) {
              setError(e?.message ?? "Failed to refresh");
            } finally {
              setLoading(false);
            }
          }}
          className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-60"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Обновляю…" : "Обновить"}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
          Ошибка загрузки метрик: {error}
        </div>
      )}

      {/* Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Tile title="Sent" value={nfInt.format(data.totals.sent)} />
        <Tile title="Errors" value={nfInt.format(data.totals.errors)} />
        <Tile title="Error rate" value={pct(errorRate)} />
        <Tile title="Throttled" value={nfInt.format(data.totals.throttled)} />
      </div>

      {/* DKIM */}
      <section className="rounded-xl border p-4">
        <h2 className="font-medium mb-2">DKIM</h2>
        <div className="flex flex-wrap gap-6 items-center">
          <Badge ok={data.dkim.enabled}>{data.dkim.enabled ? "Enabled" : "Disabled"}</Badge>
          <div className="text-sm text-gray-600">
            <div><strong>Domain:</strong> {data.dkim.domain || "—"}</div>
            <div><strong>Selector:</strong> {data.dkim.selector || "—"}</div>
            <div><strong>Checked:</strong> {data.dkim.lastCheckedAt ? df.format(data.dkim.lastCheckedAt) : "—"}</div>
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

      {/* Attempts */}
      <section className="rounded-xl border p-4">
        <h2 className="font-medium mb-3">Attempts</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Tile title="primary:465" value={nfInt.format(data.fallback.primary465)} small />
          <Tile title="fallback:587" value={nfInt.format(data.fallback.fallback587)} small />
          <Tile title="primary:587" value={nfInt.format(data.fallback.primary587)} small />
          <Tile title="fallback:465" value={nfInt.format(data.fallback.fallback465)} small />
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
                  <tr key={`${e.ts}-${i}`} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{df.format(e.ts)}</td>
                    <td className="py-2 pr-4">{e.attempt ?? "—"}</td>
                    <td className="py-2 pr-4">{String(e.code ?? "—")}</td>
                    <td className="py-2">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* UI bits */

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
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        ok ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
      }`}
      aria-live="polite"
    >
      {children}
    </span>
  );
}

function LatencyCard({ title, buckets }: { title: string; buckets: { p50: number; p95: number; p99: number; avg: number } }) {
  const nfMs = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  return (
    <div className="rounded-lg border p-4">
      <div className="font-medium mb-2">{title}</div>
      <div className="grid grid-cols-4 gap-3 text-sm">
        <div><div className="text-gray-500">p50</div><div className="font-semibold">{nfMs.format(buckets.p50)} ms</div></div>
        <div><div className="text-gray-500">p95</div><div className="font-semibold">{nfMs.format(buckets.p95)} ms</div></div>
        <div><div className="text-gray-500">p99</div><div className="font-semibold">{nfMs.format(buckets.p99)} ms</div></div>
        <div><div className="text-gray-500">avg</div><div className="font-semibold">{nfMs.format(buckets.avg)} ms</div></div>
      </div>
    </div>
  );
}

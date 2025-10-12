// Server component — получает первый срез метрик на сервере
// и передаёт в клиентский компонент как initialData.

import AdminEmailMetricsClient from "./AdminEmailMetricsClient";

export const dynamic = "force-dynamic"; // всегда свежие данные
export const revalidate = 0;            // не кэшируем render-результат

type MetricBuckets = { p50: number; p95: number; p99: number; avg: number };
export type Snapshot = {
    totals: { sent: number; errors: number; throttled: number };
    latency: { verify: MetricBuckets; send: MetricBuckets };
    fallback: { primary465: number; fallback587: number; primary587: number; fallback465: number };
    dkim: { enabled: boolean; domain: string; selector: string; lastCheckedAt: number };
    errorsTail: Array<{ ts: number; code?: string | number; message: string; attempt?: string }>;
};

async function getInitialSnapshot(): Promise<Snapshot> {
  // Лучше звать напрямую доменную функцию/репозиторий.
  // Если удобнее — оставь API-роут, но не кэшируй.
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/admin/metrics-email`, {
    cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.status}`);
    return res.json();
}

export default async function Page() {
    const initial = await getInitialSnapshot();
    return <AdminEmailMetricsClient initialData={initial} />;
}

// src/lib/metrics/email-mail.ts

export type MetricBuckets = { p50: number; p95: number; p99: number; avg: number };

export const emailMetrics = {
  totals: { sent: 0, errors: 0, throttled: 0 },
  latency: { verify: [] as number[], send: [] as number[] },
  fallback: { primary465: 0, fallback587: 0, primary587: 0, fallback465: 0 },
  dkim: { enabled: false, domain: "", selector: "", lastCheckedAt: 0 },
  errorsTail: [] as Array<{ ts: number; code?: string | number; message: string; attempt?: string }>,

  onVerify(durationMs: number) {
    this.latency.verify.push(durationMs);
    if (this.latency.verify.length > 500) this.latency.verify.shift();
  },
  onSendOk(durationMs: number, attempt: string) {
    this.totals.sent++;
    this.latency.send.push(durationMs);
    if (this.latency.send.length > 500) this.latency.send.shift();
    this._countAttempt(attempt);
  },
  onSendFail(err: any, attempt: string) {
    this.totals.errors++;
    this.errorsTail.push({
      ts: Date.now(),
      code: err?.code || err?.responseCode,
      message: String(err?.message || ""),
      attempt,
    });
    if (this.errorsTail.length > 100) this.errorsTail.shift();
    this._countAttempt(attempt);
  },
  incThrottled() {
    this.totals.throttled++;
  },
  _countAttempt(attempt: string) {
    if (attempt.includes("primary:465")) this.fallback.primary465++;
    else if (attempt.includes("fallback:587")) this.fallback.fallback587++;
    else if (attempt.includes("primary:587")) this.fallback.primary587++;
    else if (attempt.includes("fallback:465")) this.fallback.fallback465++;
  },
  setDkimStatus(enabled: boolean, domain: string, selector: string) {
    this.dkim = { enabled, domain, selector, lastCheckedAt: Date.now() };
  },
  snapshot() {
    const calc = (arr: number[]): MetricBuckets => {
      if (!arr.length) return { p50: 0, p95: 0, p99: 0, avg: 0 };
      const sorted = [...arr].sort((a, b) => a - b);
      const q = (p: number) => sorted[Math.floor((sorted.length - 1) * p)];
      const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
      return { p50: q(0.5), p95: q(0.95), p99: q(0.99), avg };
    };
    return {
      totals: this.totals,
      latency: { verify: calc(this.latency.verify), send: calc(this.latency.send) },
      fallback: this.fallback,
      dkim: this.dkim,
      errorsTail: this.errorsTail.slice(-50),
    };
  },
};

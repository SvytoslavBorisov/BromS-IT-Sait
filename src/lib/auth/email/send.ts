// src/lib/auth/email_mail/transport.ts
import { createTransport, Transporter } from "nodemailer";
import { readMailruEnv } from "./env";
import { logger } from "@/lib/logger";
import * as fs from "fs";
import * as path from "path";
import { emailMetrics } from "@/lib/metrics/email-mail";

const baseLog = logger.child({ module: "EmailMail/Transport" });

// === Простые счётчики для логов (метрики — в emailMetrics) ===
let lastSendTime = 0;
const MIN_INTERVAL_MS = 300; // троттлинг: не чаще чем одно письмо каждые 300 мс (~3/сек)

/** Создаём Transporter с нужными режимами (TLS 465 / STARTTLS 587), IPv4, EHLO, DKIM и троттлингом */
export function buildTransport({ port, secure }: { port: number; secure: boolean }): Transporter {
  const t0 = Date.now();
  const { host, user, pass, pool } = readMailruEnv();

  baseLog.debug({
    message: "Build Mail.ru transport",
    host,
    port,
    secure,
    pool,
    user,
  });

  // --- DKIM: читаем ключ из файла и выставляем статус метрик ---
  let dkim: any = undefined;
  try {
    const dkimPath = process.env.MAILRU_DKIM_KEY_PATH || path.resolve(process.cwd(), "dkim-private.pem");
    const dkimDomain = process.env.MAILRU_DKIM_DOMAIN || "broms-it.ru";
    const dkimSelector = process.env.MAILRU_DKIM_SELECTOR || "mail"; // DNS: mail._domainkey.<domain>

    if (fs.existsSync(dkimPath)) {
      const privateKey = fs.readFileSync(dkimPath, "utf8");
      dkim = { domainName: dkimDomain, keySelector: dkimSelector, privateKey };
      emailMetrics.setDkimStatus(true, dkimDomain, dkimSelector);
      baseLog.info({ message: "DKIM loaded", dkimDomain, dkimSelector });
    } else {
      emailMetrics.setDkimStatus(false, dkimDomain, dkimSelector);
      baseLog.warn?.({ message: "DKIM key not found", expectedPath: dkimPath });
    }
  } catch (err) {
    baseLog.warn?.({ message: "Failed to read DKIM key", error: (err as Error).message });
  }

  const transporter = createTransport({
    host,
    port,
    secure,                 // 465=true, 587=false
    requireTLS: !secure,    // для 587
    name: "broms-it.ru",
    family: 4,              // принудительно IPv4 (лечит ECONNRESET/ECONNREFUSED у некоторых)
    auth: { user, pass, method: "LOGIN" },
    tls: { servername: host },
    ...(pool ? { pool: true, maxConnections: 3, maxMessages: 50 } : undefined),
    connectionTimeout: 45_000,
    socketTimeout: 45_000,
    logger: false,
    debug: false,
    ...(dkim ? { dkim } : {}),
  });

  baseLog.debug({ message: "Transport built", durationMs: Date.now() - t0 });

  // --- Оборачиваем sendMail для троттлинга и подсчёта throttled ---
  const originalSend = transporter.sendMail.bind(transporter);
  transporter.sendMail = async function (...args: any[]) {
    const now = Date.now();
    const diff = now - lastSendTime;
    if (diff < MIN_INTERVAL_MS) {
      const wait = MIN_INTERVAL_MS - diff;
      emailMetrics.incThrottled();
      baseLog.debug({ message: `Throttling: wait ${wait} ms before next send` });
      await new Promise(r => setTimeout(r, wait));
    }
    lastSendTime = Date.now();
    return originalSend(...args);
  };

  return transporter;
}

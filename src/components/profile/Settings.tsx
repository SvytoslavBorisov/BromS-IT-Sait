/* app/(dashboard)/settings/page.tsx или components/Settings.tsx */
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

/* простой audit-хелпер — пишет в лог через /api/audit */
async function audit(event: string, data: Record<string, any> = {}) {
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...data }),
    });
  } catch {}
}

/* общая форма пользовательских настроек */
type UserSettings = {
  // Security
  twoFA: boolean;
  requireReauthForSign: boolean;
  sessionTimeoutMin: number;
  loginAlerts: boolean;
  lockPolicy: { attempts: number; banMinutes: number };
  // Access
  ipAllowlist: string;   // строки CIDR через запятую
  geoAllowed: string;    // коды стран через запятую
  // Crypto
  defaultHash: "streebog256" | "sha256";
  defaultSignAlgo: "gost2012_256" | "rsa_pss" | "ecdsa_p256";
  cadesProfile: "cades_bes";
  signatureMode: "attached" | "detached";
  tsaEnabled: boolean;
  ocspEnabled: boolean;
  // Keys/Quorum
  keyRotationDays: number;
  requireHardwareKey: boolean;
  quorumT: number; quorumN: number;
  // Documents
  autoEncryptUploads: boolean;
  defaultClassification: "Public" | "Internal" | "Confidential" | "Restricted";
  watermarkPreview: boolean;
  restrictExternalShare: boolean;
  // Logs
  logLevel: "error" | "warn" | "info" | "debug";
  piiMaskFields: string; // через запятую
  logRetentionDays: number;
  // Alerts
  anomalyThreshold: number; // 0..100
  notifyEmail: boolean;
  notifyWebhookUrl: string;
  panicReadOnly: boolean;
  // API
  apiAllowIPs: string;
  webhookSecretSet: boolean; // индикатор
  // Misc
  timezone: string;
  locale: string;
};

const defaults: UserSettings = {
  twoFA: false,
  requireReauthForSign: true,
  sessionTimeoutMin: 30,
  loginAlerts: true,
  lockPolicy: { attempts: 5, banMinutes: 15 },
  ipAllowlist: "",
  geoAllowed: "",
  defaultHash: "streebog256",
  defaultSignAlgo: "gost2012_256",
  cadesProfile: "cades_bes",
  signatureMode: "attached",
  tsaEnabled: true,
  ocspEnabled: true,
  keyRotationDays: 180,
  requireHardwareKey: false,
  quorumT: 3, quorumN: 5,
  autoEncryptUploads: true,
  defaultClassification: "Internal",
  watermarkPreview: true,
  restrictExternalShare: true,
  logLevel: "info",
  piiMaskFields: "password,token,secret,authorization,cookie",
  logRetentionDays: 30,
  anomalyThreshold: 80,
  notifyEmail: true,
  notifyWebhookUrl: "",
  panicReadOnly: false,
  apiAllowIPs: "",
  webhookSecretSet: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Warsaw",
  locale: "ru-RU",
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const [s, setS] = useState<UserSettings>(defaults);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{type:"ok"|"err"; text:string}|null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/settings");
        if (r.ok) {
          const data = await r.json();
          setS({ ...defaults, ...data });
        }
      } catch {}
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (!r.ok) throw new Error(String(r.status));
      await audit("settings.updated", { userId: (session?.user as any)?.id });
      setNotice({ type: "ok", text: "Настройки сохранены" });
    } catch (e) {
      await audit("settings.update_failed");
      setNotice({ type: "err", text: "Не удалось сохранить" });
    } finally {
      setSaving(false);
    }
  };

  const row = (label: string, control: React.ReactNode, hint?: string) => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-3 border-b last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className="md:min-w-[280px]">{control}</div>
    </div>
  );

  const btn = (on:boolean) =>
    `inline-flex h-6 w-11 items-center rounded-full transition ${
      on ? "bg-emerald-600" : "bg-gray-300"
    }`;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Настройки</h1>
        <p className="text-sm text-muted-foreground">Управляйте безопасностью, криптополитиками и уведомлениями.</p>
      </header>

      {notice && (
        <div className={`rounded-xl border p-3 ${notice.type==="ok" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"}`}>
          {notice.text}
        </div>
      )}

      {/* Security */}
      <section className="rounded-2xl border bg-card">
        <div className="px-5 py-3 border-b text-sm font-semibold">Безопасность</div>
        <div className="px-5">
          {row(
            "Двухфакторная аутентификация",
            <button className={btn(s.twoFA)} onClick={() => setS({ ...s, twoFA: !s.twoFA })}>
              <span className={`h-5 w-5 bg-white rounded-full shadow transform transition ${s.twoFA ? "translate-x-5" : "translate-x-1"}`} />
            </button>,
            "TOTP/WebAuthn. Рекомендуется включить."
          )}
          {row(
            "Повторный вход для подписи",
            <button className={btn(s.requireReauthForSign)} onClick={() => setS({ ...s, requireReauthForSign: !s.requireReauthForSign })}>
              <span className={`h-5 w-5 bg-white rounded-full shadow transform transition ${s.requireReauthForSign ? "translate-x-5" : "translate-x-1"}`} />
            </button>,
            "Запрашивать re‑auth для критичных операций."
          )}
          {row(
            "Тайм‑аут сессии (мин)",
            <input type="number" min={5} max={720} value={s.sessionTimeoutMin} onChange={(e)=>setS({...s, sessionTimeoutMin:+e.target.value})} className="w-28 rounded-lg border px-3 py-1.5 text-sm" />,
            "Автовыход при бездействии."
          )}
          {row(
            "Уведомления о входе",
            <button className={btn(s.loginAlerts)} onClick={() => setS({ ...s, loginAlerts: !s.loginAlerts })}>
              <span className={`h-5 w-5 bg-white rounded-full shadow transform transition ${s.loginAlerts ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          )}
          {row(
            "Политика блокировок",
            <div className="flex gap-2">
              <input type="number" min={3} max={20} value={s.lockPolicy.attempts} onChange={(e)=>setS({...s, lockPolicy:{...s.lockPolicy, attempts:+e.target.value}})} className="w-24 rounded-lg border px-3 py-1.5 text-sm" />
              <input type="number" min={1} max={1440} value={s.lockPolicy.banMinutes} onChange={(e)=>setS({...s, lockPolicy:{...s.lockPolicy, banMinutes:+e.target.value}})} className="w-28 rounded-lg border px-3 py-1.5 text-sm" />
            </div>,
            "Попыток до блокировки и длительность бана."
          )}
        </div>
      </section>

      {/* Access Control */}
      <section className="rounded-2xl border bg-card">
        <div className="px-5 py-3 border-b text-sm font-semibold">Контроль доступа</div>
        <div className="px-5">
          {row(
            "Разрешённые IP (CIDR)",
            <input value={s.ipAllowlist} onChange={(e)=>setS({...s, ipAllowlist:e.target.value})} className="w-full md:w-[420px] rounded-lg border px-3 py-1.5 text-sm" placeholder="10.0.0.0/24, 203.0.113.5/32" />,
            "Пусто — без ограничений."
          )}
          {row(
            "Разрешённые страны (ISO‑коды)",
            <input value={s.geoAllowed} onChange={(e)=>setS({...s, geoAllowed:e.target.value})} className="w-full md:w-[420px] rounded-lg border px-3 py-1.5 text-sm" placeholder="PL, RU, UA" />
          )}
        </div>
      </section>

      {/* Crypto / Signature */}
      <section className="rounded-2xl border bg-card">
        <div className="px-5 py-3 border-b text-sm font-semibold">Криптография и подпись</div>
        <div className="px-5">
          {row(
            "Хэш по умолчанию",
            <select value={s.defaultHash} onChange={(e)=>setS({...s, defaultHash:e.target.value as UserSettings["defaultHash"]})} className="rounded-lg border px-3 py-1.5 text-sm">
              <option value="streebog256">Стрибог‑256</option>
              <option value="sha256">SHA‑256</option>
            </select>
          )}
          {row(
            "Алгоритм подписи",
            <select value={s.defaultSignAlgo} onChange={(e)=>setS({...s, defaultSignAlgo:e.target.value as UserSettings["defaultSignAlgo"]})} className="rounded-lg border px-3 py-1.5 text-sm">
              <option value="gost2012_256">ГОСТ Р 34.10‑2012 (256)</option>
              <option value="rsa_pss">RSA‑PSS</option>
              <option value="ecdsa_p256">ECDSA P‑256</option>
            </select>
          )}
          {row(
            "Формат подписи",
            <select value={s.cadesProfile} disabled className="rounded-lg border px-3 py-1.5 text-sm">
              <option value="cades_bes">CAdES‑BES</option>
            </select>,
            "Профиль фиксирован (BES)."
          )}
          {row(
            "Вложение подписи",
            <select value={s.signatureMode} onChange={(e)=>setS({...s, signatureMode:e.target.value as UserSettings["signatureMode"]})} className="rounded-lg border px-3 py-1.5 text-sm">
              <option value="attached">Attached</option>
              <option value="detached">Detached</option>
            </select>
          )}
          {row(
            "TSA‑штамп времени",
            <button className={btn(s.tsaEnabled)} onClick={() => setS({ ...s, tsaEnabled: !s.tsaEnabled })}>
              <span className={`h-5 w-5 bg-white rounded-full shadow transform transition ${s.tsaEnabled ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          )}
          {row(
            "Проверка OCSP/CRL",
            <button className={btn(s.ocspEnabled)} onClick={() => setS({ ...s, ocspEnabled: !s.ocspEnabled })}>
              <span className={`h-5 w-5 bg-white rounded-full shadow transform transition ${s.ocspEnabled ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          )}
          {row(
            "Ротация ключей (дней)",
            <input type="number" min={30} max={3650} value={s.keyRotationDays} onChange={(e)=>setS({...s, keyRotationDays:+e.target.value})} className="w-28 rounded-lg border px-3 py-1.5 text-sm" />
          )}
          {row(
            "Требовать аппаратный ключ",
            <button className={btn(s.requireHardwareKey)} onClick={() => setS({ ...s, requireHardwareKey: !s.requireHardwareKey })}>
              <span className={`h-5 w-5 bg-white rounded-full shadow transform transition ${s.requireHardwareKey ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          )}
          {row(
            "Кворум t / n",
            <div className="flex gap-2">
              <input type="number" min={1} value={s.quorumT} onChange={(e)=>setS({...s, quorumT:+e.target.value})} className="w-20 rounded-lg border px-3 py-1.5 text-sm" />
              <input type="number" min={1} value={s.quorumN} onChange={(e)=>setS({...s, quorumN:+e.target.value})} className="w-20 rounded-lg border px-3 py-1.5 text-sm" />
            </div>,
            "Порог для восстановления/расшаривания."
          )}
        </div>
      </section>

      {/* Documents */}
      <section className="rounded-2xl border bg-card">
        <div className="px-5 py-3 border-b text-sm font-semibold">Документы</div>
        <div className="px-5">
          {row(
            "Авто‑шифровать загрузки",
            <button className={btn(s.autoEncryptUploads)} onClick={() => setS({ ...s, autoEncryptUploads: !s.autoEncryptUploads })}>
              <span className={`h-5 w-5 bg-white rounded-full shadow transform transition ${s.autoEncryptUploads ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          )}
          {row(
            "Классификация по умолчанию",
            <select value={s.defaultClassification} onChange={(e)=>setS({...s, defaultClassification:e.target.value as UserSettings["defaultClassification"]})} className="rounded-lg border px-3 py-1.5 text-sm">
              <option>Public</option>
              <option>Internal</option>
              <option>Confidential</option>
              <option>Restricted</option>
            </select>
          )}
          {row(
            "Водяные знаки превью",
            <button className={btn(s.watermarkPreview)} onClick={() => setS({ ...s, watermarkPreview: !s.watermarkPreview })}>
              <span className={`h-5 w-5 bg-white rounded-full shadow transform transition ${s.watermarkPreview ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          )}
          {row(
            "Запрет внешнего шаринга",
            <button className={btn(s.restrictExternalShare)} onClick={() => setS({ ...s, restrictExternalShare: !s.restrictExternalShare })}>
              <span className={`h-5 w-5 bg-white rounded-full shadow transform transition ${s.restrictExternalShare ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          )}
        </div>
      </section>

      {/* Logs & Audit */}
      <section className="rounded-2xl border bg-card">
        <div className="px-5 py-3 border-b text-sm font-semibold">Логи и аудит</div>
        <div className="px-5">
          {row(
            "Уровень логирования",
            <select value={s.logLevel} onChange={(e)=>setS({...s, logLevel:e.target.value as UserSettings["logLevel"]})} className="rounded-lg border px-3 py-1.5 text-sm">
              <option>error</option><option>warn</option><option>info</option><option>debug</option>
            </select>
          )}
          {row(
            "Маскируемые поля (PII)",
            <input value={s.piiMaskFields} onChange={(e)=>setS({...s, piiMaskFields:e.target.value})} className="w-full md:w-[420px] rounded-lg border px-3 py-1.5 text-sm" />
          )}
          {row(
            "Срок хранения логов (дней)",
            <input type="number" min={1} max={3650} value={s.logRetentionDays} onChange={(e)=>setS({...s, logRetentionDays:+e.target.value})} className="w-28 rounded-lg border px-3 py-1.5 text-sm" />
          )}
        </div>
      </section>

      {/* Alerts */}
      <section className="rounded-2xl border bg-card">
        <div className="px-5 py-3 border-b text-sm font-semibold">Оповещения и инциденты</div>
        <div className="px-5">
          {row(
            "Порог аномалий (0–100)",
            <input type="number" min={0} max={100} value={s.anomalyThreshold} onChange={(e)=>setS({...s, anomalyThreshold:+e.target.value})} className="w-28 rounded-lg border px-3 py-1.5 text-sm" />
          )}
          {row(
            "Email‑уведомления",
            <button className={btn(s.notifyEmail)} onClick={() => setS({ ...s, notifyEmail: !s.notifyEmail })}>
              <span className={`h-5 w-5 bg-white rounded-full shadow transform transition ${s.notifyEmail ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          )}
          {row(
            "Webhook URL (Slack/Teams)",
            <input value={s.notifyWebhookUrl} onChange={(e)=>setS({...s, notifyWebhookUrl:e.target.value})} className="w-full md:w-[420px] rounded-lg border px-3 py-1.5 text-sm" placeholder="https://hooks.slack.com/..." />
          )}
          {row(
            "Паник‑режим (Read‑Only)",
            <button className={btn(s.panicReadOnly)} onClick={() => setS({ ...s, panicReadOnly: !s.panicReadOnly })}>
              <span className={`h-5 w-5 bg-white rounded-full shadow transform transition ${s.panicReadOnly ? "translate-x-5" : "translate-x-1"}`} />
            </button>,
            "Временная блокировка изменений по всему сервису."
          )}
        </div>
      </section>

      {/* API */}
      <section className="rounded-2xl border bg-card">
        <div className="px-5 py-3 border-b text-sm font-semibold">API‑доступ</div>
        <div className="px-5">
          {row(
            "Разрешённые IP для API",
            <input value={s.apiAllowIPs} onChange={(e)=>setS({...s, apiAllowIPs:e.target.value})} className="w-full md:w-[420px] rounded-lg border px-3 py-1.5 text-sm" placeholder="1.2.3.4/32, 10.0.0.0/8" />
          )}
          {row(
            "Секрет подписи вебхуков",
            <div className="flex items-center gap-2">
              <span className={`text-xs ${s.webhookSecretSet ? "text-emerald-700" : "text-muted-foreground"}`}>
                {s.webhookSecretSet ? "Установлен" : "Не задан"}
              </span>
              <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted">Сбросить…</button>
            </div>,
            "HMAC‑подпись исходящих вебхуков."
          )}
        </div>
      </section>

      {/* Misc */}
      <section className="rounded-2xl border bg-card">
        <div className="px-5 py-3 border-b text-sm font-semibold">Прочее</div>
        <div className="px-5">
          {row(
            "Часовой пояс",
            <input value={s.timezone} onChange={(e)=>setS({...s, timezone:e.target.value})} className="w-72 rounded-lg border px-3 py-1.5 text-sm" />
          )}
          {row(
            "Локаль",
            <input value={s.locale} onChange={(e)=>setS({...s, locale:e.target.value})} className="w-72 rounded-lg border px-3 py-1.5 text-sm" />
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white shadow hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

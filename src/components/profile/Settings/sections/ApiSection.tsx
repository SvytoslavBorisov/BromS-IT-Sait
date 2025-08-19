"use client";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { TextInput } from "../ui/Inputs";
import { UserSettings } from "../types";

export function ApiSection({ s, setS }: { s: UserSettings; setS: (u: UserSettings) => void }) {
  return (
    <Section title="API‑доступ">
      <Row label="Разрешённые IP для API">
        <TextInput value={s.apiAllowIPs} onChange={(e)=>setS({ ...s, apiAllowIPs:e.target.value })} className="w-full md:w-[420px]" placeholder="1.2.3.4/32, 10.0.0.0/8" />
      </Row>
      <Row label="Секрет подписи вебхуков" hint="HMAC‑подпись исходящих вебхуков.">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${s.webhookSecretSet ? "text-emerald-700" : "text-muted-foreground"}`}>
            {s.webhookSecretSet ? "Установлен" : "Не задан"}
          </span>
          <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted" type="button">Сбросить…</button>
        </div>
      </Row>
    </Section>
  );
}

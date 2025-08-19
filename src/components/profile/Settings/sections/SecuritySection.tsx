"use client";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { Switch } from "../ui/Switch";
import { NumberInput } from "../ui/Inputs";
import { UserSettings } from "../types";

export function SecuritySection({ s, setS }: { s: UserSettings; setS: (u: UserSettings) => void }) {
  return (
    <Section title="Безопасность">
      <Row label="Двухфакторная аутентификация" hint="TOTP/WebAuthn. Рекомендуется включить.">
        <Switch on={s.twoFA} onToggle={() => setS({ ...s, twoFA: !s.twoFA })} />
      </Row>
      <Row label="Повторный вход для подписи" hint="Запрашивать re‑auth для критичных операций.">
        <Switch on={s.requireReauthForSign} onToggle={() => setS({ ...s, requireReauthForSign: !s.requireReauthForSign })} />
      </Row>
      <Row label="Тайм‑аут сессии (мин)" hint="Автовыход при бездействии.">
        <NumberInput min={5} max={720} value={s.sessionTimeoutMin} onChange={(e)=>setS({ ...s, sessionTimeoutMin:+e.target.value })} className="w-28" />
      </Row>
      <Row label="Уведомления о входе">
        <Switch on={s.loginAlerts} onToggle={() => setS({ ...s, loginAlerts: !s.loginAlerts })} />
      </Row>
      <Row label="Политика блокировок" hint="Попыток до блокировки и длительность бана.">
        <div className="flex gap-2">
          <NumberInput min={3} max={20} value={s.lockPolicy.attempts} onChange={(e)=>setS({ ...s, lockPolicy:{...s.lockPolicy, attempts:+e.target.value} })} className="w-24" />
          <NumberInput min={1} max={1440} value={s.lockPolicy.banMinutes} onChange={(e)=>setS({ ...s, lockPolicy:{...s.lockPolicy, banMinutes:+e.target.value} })} className="w-28" />
        </div>
      </Row>
    </Section>
  );
}

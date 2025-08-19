"use client";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { Switch } from "../ui/Switch";
import { NumberInput, TextInput } from "../ui/Inputs";
import { UserSettings } from "../types";

export function AlertsSection({ s, setS }: { s: UserSettings; setS: (u: UserSettings) => void }) {
  return (
    <Section title="Оповещения и инциденты">
      <Row label="Порог аномалий (0–100)">
        <NumberInput min={0} max={100} value={s.anomalyThreshold} onChange={(e)=>setS({ ...s, anomalyThreshold:+e.target.value })} className="w-28" />
      </Row>
      <Row label="Email‑уведомления">
        <Switch on={s.notifyEmail} onToggle={() => setS({ ...s, notifyEmail: !s.notifyEmail })} />
      </Row>
      <Row label="Webhook URL (Slack/Teams)">
        <TextInput value={s.notifyWebhookUrl} onChange={(e)=>setS({ ...s, notifyWebhookUrl:e.target.value })} className="w-full md:w-[420px]" placeholder="https://hooks.slack.com/..." />
      </Row>
      <Row label="Паник‑режим (Read‑Only)" hint="Временная блокировка изменений по всему сервису.">
        <Switch on={s.panicReadOnly} onToggle={() => setS({ ...s, panicReadOnly: !s.panicReadOnly })} />
      </Row>
    </Section>
  );
}

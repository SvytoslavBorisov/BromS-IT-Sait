"use client";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { NumberInput, Select, TextInput } from "../ui/Inputs";
import { UserSettings } from "../types";

export function LogsSection({ s, setS }: { s: UserSettings; setS: (u: UserSettings) => void }) {
  return (
    <Section title="Логи и аудит">
      <Row label="Уровень логирования">
        <Select value={s.logLevel} onChange={(e)=>setS({ ...s, logLevel:e.target.value as UserSettings["logLevel"] })}>
          <option>error</option>
          <option>warn</option>
          <option>info</option>
          <option>debug</option>
        </Select>
      </Row>
      <Row label="Маскируемые поля (PII)">
        <TextInput value={s.piiMaskFields} onChange={(e)=>setS({ ...s, piiMaskFields:e.target.value })} className="w-full md:w-[420px]" />
      </Row>
      <Row label="Срок хранения логов (дней)">
        <NumberInput min={1} max={3650} value={s.logRetentionDays} onChange={(e)=>setS({ ...s, logRetentionDays:+e.target.value })} className="w-28" />
      </Row>
    </Section>
  );
}

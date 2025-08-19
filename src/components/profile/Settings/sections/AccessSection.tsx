"use client";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { TextInput } from "../ui/Inputs";
import { UserSettings } from "../types";

export function AccessSection({ s, setS }: { s: UserSettings; setS: (u: UserSettings) => void }) {
  return (
    <Section title="Контроль доступа">
      <Row label="Разрешённые IP (CIDR)" hint="Пусто — без ограничений.">
        <TextInput value={s.ipAllowlist} onChange={(e)=>setS({ ...s, ipAllowlist:e.target.value })} className="w-full md:w-[420px]" placeholder="10.0.0.0/24, 203.0.113.5/32" />
      </Row>
      <Row label="Разрешённые страны (ISO‑коды)">
        <TextInput value={s.geoAllowed} onChange={(e)=>setS({ ...s, geoAllowed:e.target.value })} className="w-full md:w-[420px]" placeholder="PL, RU, UA" />
      </Row>
    </Section>
  );
}

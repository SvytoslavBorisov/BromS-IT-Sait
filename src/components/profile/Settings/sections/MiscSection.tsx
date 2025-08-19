"use client";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { TextInput } from "../ui/Inputs";
import { UserSettings } from "../types";

export function MiscSection({ s, setS }: { s: UserSettings; setS: (u: UserSettings) => void }) {
  return (
    <Section title="Прочее">
      <Row label="Часовой пояс">
        <TextInput value={s.timezone} onChange={(e)=>setS({ ...s, timezone:e.target.value })} className="w-72" />
      </Row>
      <Row label="Локаль">
        <TextInput value={s.locale} onChange={(e)=>setS({ ...s, locale:e.target.value })} className="w-72" />
      </Row>
    </Section>
  );
}

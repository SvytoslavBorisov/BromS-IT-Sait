"use client";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { Switch } from "../ui/Switch";
import { Select } from "../ui/Inputs";
import { UserSettings } from "../types";

export function DocumentsSection({ s, setS }: { s: UserSettings; setS: (u: UserSettings) => void }) {
  return (
    <Section title="Документы">
      <Row label="Авто‑шифровать загрузки">
        <Switch on={s.autoEncryptUploads} onToggle={() => setS({ ...s, autoEncryptUploads: !s.autoEncryptUploads })} />
      </Row>
      <Row label="Классификация по умолчанию">
        <Select value={s.defaultClassification} onChange={(e)=>setS({ ...s, defaultClassification:e.target.value as UserSettings["defaultClassification"] })}>
          <option>Public</option>
          <option>Internal</option>
          <option>Confidential</option>
          <option>Restricted</option>
        </Select>
      </Row>
      <Row label="Водяные знаки превью">
        <Switch on={s.watermarkPreview} onToggle={() => setS({ ...s, watermarkPreview: !s.watermarkPreview })} />
      </Row>
      <Row label="Запрет внешнего шаринга">
        <Switch on={s.restrictExternalShare} onToggle={() => setS({ ...s, restrictExternalShare: !s.restrictExternalShare })} />
      </Row>
    </Section>
  );
}

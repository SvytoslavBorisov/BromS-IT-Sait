"use client";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { Switch } from "../ui/Switch";
import { type UserSettings } from "../types";
import { useState } from "react";

export function TelegramSection({
  s,
  setS,
}: {
  s: UserSettings;
  setS: (u: UserSettings) => void;
}) {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    try {
      setBusy(true);
      const next = !s.telegramAllowsWrite;
      const r = await fetch("/api/auth/telegram/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!r.ok) {
        const { error } = await r.json().catch(() => ({ error: "" }));
        throw new Error(error || String(r.status));
      }
      setS({ ...s, telegramAllowsWrite: next });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Телеграм">
      <Row
        label="Уведомления от бота"
        hint="Включить/выключить личные сообщения от телеграм-бота."
      >
        <div className="flex items-center gap-3">
          <Switch
            on={s.telegramAllowsWrite}     // 🔑 начальное значение из базы
            onToggle={() => !busy && toggle()}
          />
          {busy && <span className="text-xs text-muted-foreground">Сохраняю…</span>}
        </div>
      </Row>
    </Section>
  );
}

"use client";

import { useSettings } from "./useSettings";
import { SettingsHeader } from "./Header";
import { Notice } from "./Notice";
import { SaveBar } from "./SaveBar";

import { SecuritySection } from "./sections/SecuritySection";
import { AccessSection } from "./sections/AccessSection";
import { CryptoSection } from "./sections/CryptoSection";
import { DocumentsSection } from "./sections/DocumentsSection";
import { LogsSection } from "./sections/LogsSection";
import { AlertsSection } from "./sections/AlertsSection";
import { ApiSection } from "./sections/ApiSection";
import { MiscSection } from "./sections/MiscSection";
import { TelegramSection } from "./sections/TelegramSection";

export default function SettingsPage() {
  const { s, setS, loading, saving, notice, setNotice, save } = useSettings();

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-sm text-muted-foreground">Загрузка настроек…</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <SettingsHeader />
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {notice && <Notice type={notice.type} text={notice.text} />}
        <SecuritySection s={s} setS={setS} />
        <AccessSection   s={s} setS={setS} />
        <CryptoSection   s={s} setS={setS} />
        <DocumentsSection s={s} setS={setS} />
        <LogsSection     s={s} setS={setS} />
        <AlertsSection   s={s} setS={setS} />
        <ApiSection      s={s} setS={setS} />
        <MiscSection     s={s} setS={setS} />
        <TelegramSection s={s} setS={setS} />
        <SaveBar saving={saving} onSave={async ()=>{ setNotice(null); await save(); }} />
      </div>
    </div>
  );
}

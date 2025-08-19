"use client";
import { useEffect, useState } from "react";
import { defaults, type UserSettings } from "./types";
import { loadSettings, saveSettings, audit } from "./api";
import { useSession } from "next-auth/react";

export function useSettings() {
  const { data: session } = useSession();
  const [s, setS] = useState<UserSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const data = await loadSettings();
      if (data) setS({ ...defaults, ...data });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await saveSettings(s);
      await audit("settings.updated", { userId: (session?.user as any)?.id });
      setNotice({ type: "ok", text: "Настройки сохранены" });
    } catch {
      await audit("settings.update_failed");
      setNotice({ type: "err", text: "Не удалось сохранить" });
    } finally {
      setSaving(false);
    }
  };

  return { s, setS, loading, saving, notice, setNotice, save };
}

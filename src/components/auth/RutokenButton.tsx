"use client";

import { useEffect, useState } from "react";
import { FaUsb } from "react-icons/fa";

/** Позволяет TypeScript обращаться к window.rutoken */
declare global {
  interface Window { rutoken?: any }
}

type Props = {
  setError: (err: string | null) => void;
  onSuccess?: () => void;
  /** Можно переопределить стили контейнера (например, сделать кнопку не квадратной) */
  className?: string;
  /** aria-label для доступности */
  ariaLabel?: string;
};

export function RutokenButton({ setError, onSuccess, className, ariaLabel = "Войти через Рутокен" }: Props) {
  const [loading, setLoading] = useState(false);

  // helpers
  const toB64 = (u8: Uint8Array) =>
    typeof window !== "undefined"
      ? btoa(String.fromCharCode(...u8))
      : Buffer.from(u8).toString("base64");

  const toU8 = (b64: string) => {
    const bin = typeof window !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };

  async function loginWithRutoken() {
    try {
      setLoading(true);
      setError(null);

      const rutoken = (window as any).rutoken;
      if (!rutoken) throw new Error("Rutoken SDK не загрузился");

      // 1) окружение
      await rutoken.ready;
      const hasExt = await rutoken.isExtensionInstalled();
      if (!hasExt) throw new Error("Расширение Rutoken не установлено");
      const hasPlg = await rutoken.isPluginInstalled();
      if (!hasPlg) throw new Error("Плагин Rutoken не найден");

      // 2) инициализация и устройство
      const plugin = await rutoken.loadPlugin();
      const deviceIds: number[] = await plugin.enumerateDevices();
      if (!deviceIds?.length) throw new Error("Рутокен не вставлен");

      // Собираем возможные «вторые аргументы» из объекта plugin (числовые константы)
      const numericCandidates: number[] = [];
      for (const k of Object.keys(plugin)) {
        const v = (plugin as any)[k];
        if (typeof v === "number" && /(CERT|CATEGORY|STORE|LOCATION|TOKEN|USER|CA|UNSPEC)/i.test(k)) {
          numericCandidates.push(v);
        }
      }
      for (let i = 0; i <= 5; i++) numericCandidates.push(i); // запас
      const SECOND_ARGS = Array.from(new Set(numericCandidates));

      let picked: null | { deviceId: number; certId?: string; keyId?: string } = null;

      outer:
      for (const deviceId of deviceIds) {
        // enumerateCertificates с 2 аргументами
        for (const arg2 of SECOND_ARGS) {
          try {
            const ids: string[] = await plugin.enumerateCertificates(deviceId, arg2);
            if (Array.isArray(ids) && ids.length) {
              picked = { deviceId, certId: ids[0] };
              break outer;
            }
          } catch {}
        }
        // enumerateKeys → getCertificateByKey
        try {
          const keys: string[] = await plugin.enumerateKeys(deviceId);
          if (Array.isArray(keys) && keys.length) {
            for (const kid of keys) {
              try {
                const cid: string = await plugin.getCertificateByKey(deviceId, kid);
                if (cid) { picked = { deviceId, certId: cid, keyId: kid }; break outer; }
              } catch {}
            }
            if (!picked) { picked = { deviceId, keyId: keys[0] }; break outer; }
          }
        } catch {}
      }

      if (!picked) {
        throw new Error("Плагин не вернул ни сертификатов, ни ключей. Проверьте, что сертификат записан в контейнер (PKCS#11).");
      }

      const { deviceId, certId, keyId: keyIdMaybe } = picked;

      // PIN (если поддерживается строго 2 аргументами)
      try {
        if (typeof plugin.login === "function") {
          const pin = window.prompt("PIN Рутокена (Отмена — системный диалог)", "");
          if (pin) await plugin.login(deviceId, pin);
        }
      } catch {}

      // CHALLENGE от сервера
      const chalResp = await fetch("/api/auth/challenge");
      if (!chalResp.ok) throw new Error("Не удалось получить challenge");
      const { id, nonce } = await chalResp.json();
      if (!id || !nonce) throw new Error("Некорректный challenge");
      const data = toU8(nonce);

      // digest (Стрибог‑256) на устройстве
      let hashBytes: Uint8Array | null = null;
      try {
        hashBytes = await plugin.digest(deviceId, plugin.HASH_TYPE_GOST3411_12_256, data);
      } catch {
        throw new Error("digest() недоступен. Посчитайте Стрибог‑256 на фронте и используйте rawSign(hash).");
      }

      // keyId из сертификата, если нужно
      let keyId = keyIdMaybe || null;
      if (!keyId && certId) {
        try { keyId = await plugin.getKeyByCertificate(deviceId, certId); } catch {}
      }

      // Подпись
      let sigBytes: Uint8Array | null = null;
      if (certId && typeof plugin.signByCertificate === "function") {
        try {
          sigBytes = await plugin.signByCertificate(deviceId, certId, data, plugin.SIGN_ALGO_GOST12_256);
        } catch {}
      }
      if (!sigBytes && keyId) {
        sigBytes = await plugin.rawSign(deviceId, keyId, hashBytes);
      }
      if (!sigBytes) throw new Error("Не удалось выполнить подпись (ни signByCertificate, ни rawSign).");

      // Сертификат PEM (если есть certId)
      let certPem: string | null = null;
      if (certId) {
        try { certPem = await plugin.getCertificate(deviceId, certId); } catch {}
      }

      // Отправляем на сервер
      const payload: any = {
        id,
        nonce,
        signatureB64: toB64(sigBytes),
      };
      if (certPem) payload.certPem = certPem;

      const verifyResp = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await verifyResp.json();
      if (!verifyResp.ok || !result?.ok) throw new Error(result?.error || "Верификация не пройдена");

      if (onSuccess) onSuccess();
      else window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Неизвестная ошибка входа через Рутокен");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={loginWithRutoken}
      disabled={loading}
      aria-label={ariaLabel}
      className={[
        // Базовый красивый квадрат-тайл с анимацией
        "group relative flex items-center justify-center h-12 rounded-2xl bg-indigo-500 text-white",
        "ring-1 ring-black/10 hover:ring-black/20 transition overflow-hidden",
        "hover:scale-[1.03] active:scale-[0.98] duration-200 ease-out",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className || ""
      ].join(" ")}
    >
      {/* Бликующий шиммер */}
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-0
                   transition-transform duration-600 bg-gradient-to-r
                   from-white/0 via-white/20 to-white/0"
      />
      {loading ? (
        <span className="animate-pulse text-sm font-medium">Входим…</span>
      ) : (
        <FaUsb className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
      )}
    </button>
  );
}

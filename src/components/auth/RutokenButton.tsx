"use client";
import { useEffect, useState } from "react";

type Props = { setError: (err: string | null) => void; onSuccess?: () => void };

export function RutokenButton({ setError, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  // Подключаем bootstrap скрипт (без ESM, чтобы не конфликтовать с Turbopack)
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@aktivco-it/rutoken-plugin-bootstrap@1.9.7/dist/index.js";
    script.async = true;
    script.onload = () => console.log("Rutoken bootstrap loaded");
    script.onerror = () => setError("Не удалось загрузить Rutoken bootstrap");
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [setError]);

  // helpers для base64
  const toB64 = (u8: Uint8Array) =>
    typeof window !== "undefined"
      ? btoa(String.fromCharCode(...u8))
      : Buffer.from(u8).toString("base64");
  const fromB64 = (b64: string) => {
    if (typeof window !== "undefined") {
      const bin = atob(b64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    // SSR fallback
    return new Uint8Array(Buffer.from(b64, "base64"));
  };

async function loginWithRutoken() {
  try {
    setLoading(true);
    setError(null);
console.log('asdawdasdasda')
    // @ts-ignore
    const rutoken = window.rutoken;
    if (!rutoken) throw new Error("Rutoken SDK не загрузился");

    // 1) окружение
    await rutoken.ready;
    const hasExt = await rutoken.isExtensionInstalled();
    if (!hasExt) throw new Error("Расширение Rutoken не установлено");
    const hasPlg = await rutoken.isPluginInstalled();
    if (!hasPlg) throw new Error("Плагин Rutoken не найден");
console.log('asdawdasdasda')
    // 2) инициализация и устройство
const plugin = await rutoken.loadPlugin();

const deviceIds: number[] = await plugin.enumerateDevices();
if (!deviceIds?.length) throw new Error("Рутокен не вставлен");

function toU8(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const toB64 = (u8: Uint8Array) => btoa(String.fromCharCode(...u8));

// Собираем возможные «вторые аргументы» из объекта plugin (числовые константы)
const numericCandidates: number[] = [];
for (const k of Object.keys(plugin)) {
  const v = (plugin as any)[k];
  if (typeof v === "number" &&
      /(CERT|CATEGORY|STORE|LOCATION|TOKEN|USER|CA|UNSPEC)/i.test(k)) {
    numericCandidates.push(v);
  }
}
// На всякий случай добавим 0..5
for (let i = 0; i <= 5; i++) numericCandidates.push(i);

// Уберём дубликаты, сохраним порядок
const SECOND_ARGS = Array.from(new Set(numericCandidates));

let picked = null as null | { deviceId: number; certId?: string; keyId?: string };

outer:
for (const deviceId of deviceIds) {
  // 1) Пробуем enumerateCertificates строго с 2 аргументами
  for (const arg2 of SECOND_ARGS) {
    try {
      const ids: string[] = await plugin.enumerateCertificates(deviceId, arg2);
      if (Array.isArray(ids) && ids.length) {
        picked = { deviceId, certId: ids[0] };
        break outer;
      }
    } catch {/* пропускаем */}
  }
  // 2) Если не вышло — через ключи (enumerateKeys → getCertificateByKey), оба с 2 аргументами
  try {
    const keys: string[] = await plugin.enumerateKeys(deviceId);
    if (Array.isArray(keys) && keys.length) {
      for (const kid of keys) {
        try {
          const cid: string = await plugin.getCertificateByKey(deviceId, kid);
          if (cid) { picked = { deviceId, certId: cid, keyId: kid }; break outer; }
        } catch {}
      }
      // ключи есть, но серт не нашёлся — всё равно используем ключ и подпишем RAW
      if (!picked) { picked = { deviceId, keyId: keys[0] }; break outer; }
    }
  } catch {}
}


if (!picked) {
  throw new Error("Плагин не вернул ни сертификатов, ни ключей. Проверьте, что сертификат записан в контейнер токена (PKCS#11).");
}

const { deviceId, certId, keyId: keyIdMaybe } = picked;

// --- PIN, если API поддерживает login(deviceId, pin) строго с 2 args (иначе пропускаем — плагин спросит сам) ---
try {
  if (typeof plugin.login === "function") {
    const pin = window.prompt("PIN Рутокена (Отмена — системный диалог)", "");
    if (pin) await plugin.login(deviceId, pin); // ровно 2 аргумента
  }
} catch {}

// --- CHALLENGE от сервера ---
const chalResp = await fetch("/api/auth/challenge");
if (!chalResp.ok) throw new Error("Не удалось получить challenge");
const { id, nonce } = await chalResp.json();
if (!id || !nonce) throw new Error("Некорректный challenge");
const data = toU8(nonce);

// --- Хэш Стрибог‑256 на устройстве: digest(deviceId, HASH_TYPE, data) — строго 3 аргумента ---
let hashBytes: Uint8Array | null = null;
try {
  hashBytes = await plugin.digest(deviceId, plugin.HASH_TYPE_GOST3411_12_256, data);
} catch {
  // Если digest отсутствует в этой сборке — посчитай Стрибог на фронте своей функцией и подставь сюда bytes
  throw new Error("digest() недоступен в этой сборке. Посчитайте Стрибог‑256 на фронте и используйте rawSign(hash).");
}

// --- keyId: если не был, достанем из сертификата (getKeyByCertificate(deviceId, certId)) — 2 аргумента ---
let keyId = keyIdMaybe || null;
if (!keyId && certId) {
  try { keyId = await plugin.getKeyByCertificate(deviceId, certId); } catch {}
}

// --- Подпись ---
// 1) если есть signByCertificate(deviceId, certId, data, algo) — используем её (ровно 4 аргумента)
let sigBytes: Uint8Array | null = null;
if (certId && typeof plugin.signByCertificate === "function") {
  try {
    sigBytes = await plugin.signByCertificate(deviceId, certId, data, plugin.SIGN_ALGO_GOST12_256);
  } catch {}
}
// 2) иначе — RAW подпись хэша: rawSign(deviceId, keyId, hashBytes) — строго 3 аргумента
if (!sigBytes && keyId) {
  sigBytes = await plugin.rawSign(deviceId, keyId, hashBytes);
}

if (!sigBytes) throw new Error("Не удалось выполнить подпись (ни signByCertificate, ни rawSign).");

// --- Сертификат PEM, если есть certId: getCertificate(deviceId, certId) — 2 аргумента
let certPem: string | null = null;
if (certId) {
  try { certPem = await plugin.getCertificate(deviceId, certId); } catch {}
}

// --- Отправляем на сервер ---
const payload: any = {
  id,
  nonce,                         // base64 исходных данных
  signatureB64: toB64(sigBytes), // R||S в base64
};
if (certPem) payload.certPem = certPem;

const verifyResp = await fetch("/api/auth/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const result = await verifyResp.json();
if (!verifyResp.ok || !result?.ok) throw new Error(result?.error || "Верификация не пройдена");

window.location.reload();
  } catch (e: any) {
    setError(e?.message || "Неизвестная ошибка входа через Рутокен");
  } finally {
    setLoading(false);
  }
}

  return (
    <button
      type="button"
      disabled={loading}
      onClick={loginWithRutoken}
      className="w-full rounded-xl bg-indigo-500 py-3 text-white font-semibold hover:brightness-110 disabled:opacity-60"
    >
      {loading ? "Входим через Рутокен…" : "Войти через Рутокен"}
    </button>
  );
}

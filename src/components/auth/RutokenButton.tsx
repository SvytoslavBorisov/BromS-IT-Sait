"use client";

import { useState } from "react";
import { FaUsb } from "react-icons/fa";

declare global { interface Window { rutoken?: any } }

type CertItem = {
  deviceId: number;
  certId: string;
  location: "TOKEN" | "SYSTEM" | "UNKNOWN";
  subject?: string;
  notBefore?: string;
  notAfter?: string;
  algo?: "gost2001" | "gost2012-256" | "unknown";
  keyId?: string;
};

type Props = {
  setError: (err: string | null) => void;
  onSuccess?: () => void;
  className?: string;
  ariaLabel?: string;
};

export function RutokenButton({
  setError,
  onSuccess,
  className,
  ariaLabel = "Войти через Рутокен",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [certs, setCerts] = useState<CertItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const toB64 = (u8: Uint8Array) =>
    typeof window !== "undefined" ? btoa(String.fromCharCode(...u8)) : Buffer.from(u8).toString("base64");

  const toU8 = (b64: string) => {
    const bin = typeof window !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };

  const locName = (plugin: any, loc: number): CertItem["location"] => {
    if (loc === plugin?.CERT_LOCATION_TOKEN) return "TOKEN";
    if (loc === plugin?.CERT_LOCATION_SYSTEM) return "SYSTEM";
    return "UNKNOWN";
  };

  const detectAlgo = (info: any): CertItem["algo"] => {
    const s = JSON.stringify(info || {}).toLowerCase();
    if (s.includes("2012") || s.includes("3410-2012") || s.includes("streebog") || s.includes("12_256")) return "gost2012-256";
    if (s.includes("2001") || s.includes("3410-2001") || s.includes("3411-94")) return "gost2001";
    return "unknown";
  };

  async function readCertMeta(plugin: any, deviceId: number, certId: string, loc: number): Promise<CertItem> {
    let subject: string | undefined;
    let notBefore: string | undefined;
    let notAfter: string | undefined;
    let algo: CertItem["algo"] = "unknown";

    try {
      if (typeof plugin.getCertificateInfo === "function") {
        const info = await plugin.getCertificateInfo(deviceId, certId);
        subject = info?.subjectName || info?.subject || info?.Subject || subject;
        notBefore = info?.notBefore || info?.validFrom || notBefore;
        notAfter = info?.notAfter || info?.validTo || notAfter;
        algo = detectAlgo(info);
      }
    } catch {}

    if (!subject && typeof plugin.getCertificate === "function") {
      try {
        const pem: string = await plugin.getCertificate(deviceId, certId);
        const m = /CN\s*=\s*([^,\n\r\/]+)/i.exec(pem);
        if (m) subject = m[1].trim();
      } catch {}
    }

    return { deviceId, certId, location: locName(plugin, loc), subject, notBefore, notAfter, algo };
  }

  // --- КЛЮЧЕВОЕ: безопасное перечисление сертификатов с поддержкой разных сигнатур ---
  async function safeEnumerateCertificates(plugin: any, deviceId: number): Promise<{ id: string; loc: number }[]> {
    const out: { id: string; loc: number }[] = [];
    const isNum = (x: any) => typeof x === "number" && Number.isFinite(x);
    const CAT = isNum(plugin.CERT_CATEGORY_USER) ? plugin.CERT_CATEGORY_USER : 0;

    const locs = [plugin.CERT_LOCATION_TOKEN, plugin.CERT_LOCATION_SYSTEM, plugin.CERT_LOCATION_ALL].filter(isNum);

    // 3 аргумента: (deviceId, category, location)
    for (const loc of locs) {
      try {
        const ids = await plugin.enumerateCertificates(deviceId, CAT, loc);
        if (Array.isArray(ids)) ids.forEach((id: string) => out.push({ id, loc }));
      } catch {}
    }
    if (out.length) return out;

    // 2 аргумента: (deviceId, category)
    try {
      const ids = await plugin.enumerateCertificates(deviceId, CAT);
      if (Array.isArray(ids)) return ids.map((id: string) => ({ id, loc: plugin.CERT_LOCATION_TOKEN ?? -1 }));
    } catch {}

    // 1 аргумент: (deviceId)
    try {
      const ids = await plugin.enumerateCertificates(deviceId);
      if (Array.isArray(ids)) return ids.map((id: string) => ({ id, loc: plugin.CERT_LOCATION_TOKEN ?? -1 }));
    } catch {}

    return [];
  }

  async function enumerateAllCertificates(plugin: any): Promise<CertItem[]> {
    if (!plugin || typeof plugin.enumerateDevices !== "function") throw new Error("Плагин не инициализирован");

    const devs: number[] = await plugin.enumerateDevices();
    if (!Array.isArray(devs) || !devs.length) throw new Error("Рутокен не вставлен");

    const result: CertItem[] = [];

    for (const dev of devs) {
      // 1) все известные сигнатуры enumerateCertificates
      const byCert = await safeEnumerateCertificates(plugin, dev);
      for (const { id: cid, loc } of byCert) {
        result.push(await readCertMeta(plugin, dev, cid, loc));
      }

      // 2) запасной путь: ключи -> сертификаты
      try {
        if (typeof plugin.enumerateKeys === "function") {
          const keys: string[] = await plugin.enumerateKeys(dev);
          for (const kid of keys || []) {
            try {
              const cid: string = await plugin.getCertificateByKey(dev, kid);
              if (cid) {
                const exists = result.find(r => r.deviceId === dev && r.certId === cid);
                if (exists) exists.keyId = kid;
                else result.push({ deviceId: dev, certId: cid, location: "UNKNOWN", keyId: kid, algo: "unknown" });
              }
            } catch {}
          }
        }
      } catch {}
    }

    // дедуп по (deviceId, certId)
    const uniq = new Map<string, CertItem>();
    for (const c of result) {
      const k = `${c.deviceId}:${c.certId}`;
      if (!uniq.has(k)) uniq.set(k, c);
      else if (c.keyId && !uniq.get(k)!.keyId) uniq.get(k)!.keyId = c.keyId;
    }
    return Array.from(uniq.values());
  }

  async function loadAndShowCertificates() {
    try {
      setLoading(true);
      setError(null);

      const rt = (window as any).rutoken;
      if (!rt) throw new Error("Rutoken SDK не загрузился");
      await rt.ready;

      const okExt = await rt.isExtensionInstalled();
      if (!okExt) throw new Error("Расширение Rutoken не установлено");

      const okPlg = await rt.isPluginInstalled();
      if (!okPlg) throw new Error("Плагин Rutoken не найден");

      const plugin = await rt.loadPlugin();
      const list = await enumerateAllCertificates(plugin);

      if (!Array.isArray(list) || list.length === 0) {
        throw new Error("Сертификаты не найдены ни на токене, ни в системном хранилище");
      }

      setCerts(list);
      setSelectedIdx(0);
    } catch (e: any) {
      setError(e?.message || "Ошибка при перечислении сертификатов");
    } finally {
      setLoading(false);
    }
  }

  async function signAndLogin() {
    if (selectedIdx == null || !certs[selectedIdx]) {
      setError("Сначала выберите сертификат");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const rt = (window as any).rutoken;
      const plugin = await rt.loadPlugin();

      const chosen = certs[selectedIdx];
      const { deviceId, certId } = chosen;

      // PIN
      try {
        const pin = window.prompt("PIN Рутокена (Отмена — системный диалог)", "");
        if (pin) {
          if (typeof plugin.CKU_USER === "number" && typeof plugin.loginWithType === "function") {
            await plugin.loginWithType(deviceId, plugin.CKU_USER, pin);
          } else if (typeof plugin.login === "function") {
            await plugin.login(deviceId, pin);
          }
        }
      } catch {}

      // challenge
      const chal = await fetch("/api/auth/challenge");
      if (!chal.ok) throw new Error("Не удалось получить challenge");
      const { id, nonce } = await chal.json();
      if (!id || !nonce) throw new Error("Некорректный challenge");
      const data = toU8(nonce);

      // выбор алгоритма
      let useG12 =
        chosen.algo === "gost2012-256" ||
        (typeof plugin.SIGN_ALGO_GOST12_256 === "number" && typeof plugin.HASH_TYPE_GOST3411_12_256 === "number");

      const hashType = useG12 ? plugin.HASH_TYPE_GOST3411_12_256 : plugin.HASH_TYPE_GOST3411;
      const signAlgo = useG12 ? plugin.SIGN_ALGO_GOST12_256 : plugin.SIGN_ALGO_GOST2001;

      // digest на устройстве
      let digest: Uint8Array;
      try {
        digest = await plugin.digest(deviceId, hashType, data);
      } catch {
        throw new Error(
          useG12 ? "digest(Стрибог-256) недоступен на этом устройстве" : "digest(ГОСТ 34.11-94) недоступен на этом устройстве"
        );
      }

      // подпись
      let sig: Uint8Array | null = null;

      if (typeof plugin.signByCertificate === "function") {
        try {
          sig = await plugin.signByCertificate(deviceId, certId, data, signAlgo);
        } catch {}
      }

      if (!sig) {
        let keyId = chosen.keyId;
        if (!keyId && typeof plugin.getKeyByCertificate === "function") {
          try { keyId = await plugin.getKeyByCertificate(deviceId, certId); } catch {}
        }
        if (!keyId && typeof plugin.enumerateKeys === "function") {
          try {
            const keys: string[] = await plugin.enumerateKeys(deviceId);
            if (Array.isArray(keys) && keys.length) keyId = keys[0];
          } catch {}
        }
        if (!keyId) throw new Error("Ключ для подписи не найден");
        sig = await plugin.rawSign(deviceId, keyId, digest);
      }

      let certPem: string | undefined;
      try { certPem = await plugin.getCertificate(deviceId, certId); } catch {}

      const payload: any = {
        id,
        nonce,
        signatureB64: toB64(sig),
        alg: useG12 ? "gost2012-256" : "gost2001",
        certPem,
      };

      const resp = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.ok) throw new Error(json?.error || "Верификация не пройдена");

      if (onSuccess) onSuccess();
      else window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Неизвестная ошибка входа через Рутокен");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={["flex flex-col gap-3", className || ""].join(" ")}>
      <button
        type="button"
        onClick={certs.length ? signAndLogin : loadAndShowCertificates}
        disabled={loading}
        aria-label={ariaLabel}
        className={[
          "group relative flex items-center justify-center h-12 rounded-2xl bg-indigo-500 text-white",
          "ring-1 ring-black/10 hover:ring-black/20 transition overflow-hidden",
          "hover:scale-[1.03] active:scale-[0.98] duration-200 ease-out",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-0
                     transition-transform duration-600 bg-gradient-to-r
                     from-white/0 via-white/20 to-white/0"
        />
        {loading ? (
          <span className="animate-pulse text-sm font-medium">
            {certs.length ? "Подписываем…" : "Ищем сертификаты…"}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <FaUsb className="h-5 w-5" />
            {certs.length ? "Войти подписью" : "Найти сертификаты"}
          </span>
        )}
      </button>

      {certs.length > 0 && (
        <div className="rounded-xl border border-black/10 p-3 bg-white/50 dark:bg-white/5">
          <div className="mb-2 text-sm font-semibold opacity-80">Найденные сертификаты</div>
          <div className="flex flex-col gap-2 max-h-64 overflow-auto pr-1">
            {certs.map((c, i) => (
              <label
                key={`${c.deviceId}:${c.certId}`}
                className={[
                  "flex items-start gap-2 rounded-lg p-2 cursor-pointer",
                  i === selectedIdx ? "bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-300" : "hover:bg-black/5",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="cert"
                  className="mt-1"
                  checked={i === selectedIdx}
                  onChange={() => setSelectedIdx(i)}
                />
                <div className="text-sm">
                  <div className="font-medium">
                    {c.subject || "(без Subject)"} <span className="opacity-60">[{c.location}]</span>
                  </div>
                  <div className="opacity-70">
                    ID: <span className="font-mono break-all">{c.certId}</span>
                  </div>
                  {(c.notBefore || c.notAfter) && (
                    <div className="opacity-70">
                      {c.notBefore ? `с ${c.notBefore}` : ""}{c.notAfter ? ` по ${c.notAfter}` : ""}
                    </div>
                  )}
                  <div className="opacity-70">
                    Алгоритм: {c.algo === "gost2012-256" ? "ГОСТ Р 34.10-2012 (256)" :
                               c.algo === "gost2001" ? "ГОСТ Р 34.10-2001" : "не определён"}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

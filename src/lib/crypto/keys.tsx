import { getSession } from "next-auth/react";


export async function jwkFingerprint(jwk: JsonWebKey): Promise<string> {
  if (!jwk.n) throw new Error("У JWK нет поля n");

  // base64url → Uint8Array
  const nBytes = Uint8Array.from(
    atob(jwk.n.replace(/-/g, "+").replace(/_/g, "/")),
    c => c.charCodeAt(0)
  );

  // SHA-256 → hex-строка
  const hashBuf = await crypto.subtle.digest("SHA-256", nBytes);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Шифрует строку «share» публичным JWK и
 * возвращает **Base64**-строку, готовую к отправке в БД/по сети.
 */
export async function encryptWithPubkey(
  share: string,
  jwkPub: JsonWebKey
): Promise<string> {
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwkPub,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

    console.log("PUB-fingerprint:",
    await jwkFingerprint(jwkPub));

  const data = new TextEncoder().encode(share);
  const ct = await crypto.subtle.encrypt(
    { name: "RSA-OAEP"}, // важно указать hash, как при генерации
    publicKey,
    data
  );

  // Uint8Array → Base64
  const bytes = new Uint8Array(ct);
  return btoa(String.fromCharCode(...bytes));
}

/* --- маленькая утилита для декодирования на клиенте --- */
export function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

export function decodeCiphertext(raw: unknown): Uint8Array {
  /* 1. Uint8Array / ArrayBuffer */
  if (raw instanceof Uint8Array)  return raw;
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);

  /* 2. Node {type:'Buffer',data:[…]} */
  if (
    raw && typeof raw === "object" &&
    (raw as any).type === "Buffer" &&
    Array.isArray((raw as any).data)
  ) {
    return Uint8Array.from((raw as any).data as number[]);
  }

  /* 3. Mongo { $binary:{ base64:'…' } } */
  if (
    raw && typeof raw === "object" &&
    (raw as any).$binary &&
    typeof (raw as any).$binary.base64 === "string"
  ) {
    return decodeCiphertext((raw as any).$binary.base64);
  }

  /* 4. Обёртки { ciphertext | data | value | bytes } */
  if (
    raw && typeof raw === "object" &&
    ("ciphertext" in raw || "data" in raw || "value" in raw || "bytes" in raw)
  ) {
    const inner = (raw as any).ciphertext ??
                  (raw as any).data ??
                  (raw as any).value ??
                  (raw as any).bytes;
    return decodeCiphertext(inner);
  }

  /* 5a. Массив чисел/строк/bigint (0-255) */
  if (Array.isArray(raw)) {
    // ⬇️  если все элементы — числа/строки-цифры
    if (raw.every(v => typeof v === "number" || typeof v === "string" || typeof v === "bigint")) {
      const nums = raw.map(v => Number(v));
      if (nums.every(n => Number.isFinite(n) && n >= 0 && n <= 255)) {
        return Uint8Array.from(nums);
      }
    }

    /* 5b. Массив строк-символов Base64 (Q, p, M, …) */
    if (raw.every(v => typeof v === "string" && v.length === 1)) {
      return decodeCiphertext((raw as string[]).join(""));
    }
  }

  /* 6. Строка Base64 / Base64-URL */
  if (typeof raw === "string") {
    let b64 = raw.trim().replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);

    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) out[i] = bin.charCodeAt(i);
    return out;
  }

  throw new TypeError("ciphertext: unsupported type");
}

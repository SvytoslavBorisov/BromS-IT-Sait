// lib/crypto/fingerprint.tsx
const te = new TextEncoder();

function b64u(buf: ArrayBuffer | Uint8Array) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = typeof window === "undefined"
    ? Buffer.from(b).toString("base64")
    : btoa(String.fromCharCode(...b));
  return s.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export async function jwkFingerprint(jwk: JsonWebKey): Promise<string> {
  if (!jwk || !jwk.kty) throw new Error("JWK без поля kty");

  // RFC 7638: фиксированный набор полей по типу ключа
  let canon: Record<string, string>;
  switch (jwk.kty) {
    case "RSA": {
      const { e, n } = jwk as any;
      if (!e || !n) throw new Error("RSA-JWK должен иметь поля n и e");
      canon = { e, kty: "RSA", n };
      break;
    }
    case "EC":
    case "ECGOST": // если ты так помечаешь ГОСТ-JWK
    case "GOST": {
      const { crv, x, y } = jwk as any;
      if (!crv || !x || !y) throw new Error("EC-JWK должен иметь поля crv, x, y");
      canon = { crv, kty: "EC", x, y };
      break;
    }
    case "OKP": {
      const { crv, x } = jwk as any;
      if (!crv || !x) throw new Error("OKP-JWK должен иметь поля crv и x");
      canon = { crv, kty: "OKP", x };
      break;
    }
    default:
      throw new Error(`Неподдерживаемый kty: ${jwk.kty}`);
  }

  // Канонический JSON с сортировкой ключей
  const json = JSON.stringify(canon);
  const hash = await crypto.subtle.digest("SHA-256", te.encode(json)); // хочешь — замени на Стрибог-256
  return b64u(hash);
}

// app/api/auth/verify/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import * as asn1 from "@peculiar/asn1-x509"; // либо pkijs, как удобнее
import { fromBER } from "asn1js";
import { createHash } from "crypto";
// возьмите свою ГОСТ‑библиотеку:
import gostCrypto from "gost-crypto"; // пример

function pemToDer(pem: string): Buffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return Buffer.from(b64, "base64");
}

async function verifyGost2012_256(certDer: Buffer, digestHex: string, sigHex: string) {
  // 1) Достаём публичный ключ из X.509
  const { result } = fromBER(certDer);
  if (result.offset === -1) throw new Error("Bad cert ASN.1");
  const cert = new asn1.Certificate({ schema: result });
  const spki = Buffer.from(cert.subjectPublicKeyInfo.subjectPublicKey);

  // 2) Готовим ключ для WebCrypto‑подобного verify в gost-crypto
  const subtle = gostCrypto.subtle;
  const alg = {
    name: 'GOST R 34.10',
    length: 256,
    hash: { name: 'GOST R 34.11', length: 256 }
  };

  const key = await subtle.importKey(
    'spki',
    spki,
    alg,
    true,
    ['verify']
  );

  // 3) Подпись: hex → bytes. RFC 9215: s||r (big‑endian) — проверьте у своей либы!
  const sig = Buffer.from(sigHex, "hex");
  const digest = Buffer.from(digestHex, "hex");

  // 4) Проверяем
  return await subtle.verify(alg as any, key, sig, digest);
}

export async function POST(req: Request) {
  const { id, certPem, sigHex } = await req.json();

  const raw = await redis.get(`nonce:${id}`);
  if (!raw) return NextResponse.json({ error: "challenge expired" }, { status: 401 });
  await redis.del(`nonce:${id}`);

  const { nonceB64, hashHex } = JSON.parse(raw);
  // На всякий случай пересчитаем digest локально из nonceB64:
  const digestHex = createHash("sha256").digest("hex"); // <-- ЗАГЛУШКА! (см. ниже)
  // ↑ ВАЖНО: это был пример. Для ГОСТ нужен Стрибог-256:
  // либо храните ранее выданный hashHex, либо пересчитывайте Стрибог-256 тут же вашей ГОСТ‑библиотекой.

  const certDer = pemToDer(certPem);

  // Базовая проверка подписи
  const ok = await verifyGost2012_256(certDer, hashHex, sigHex);
  if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  // TODO: Проверка срока действия и цепочки (AIA/CDP → OCSP/CRL).
  // TODO: Маппинг subject/serial → userId; выпуск JWT/сессии.

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getRedis, ensureRedisConnected } from "@/lib/redis";
import * as asn1 from "@peculiar/asn1-x509";
import { fromBER } from "asn1js";
import gostCrypto from "gost-crypto";

function pemToDer(pem: string): Buffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return Buffer.from(b64, "base64");
}

async function verifyGost2012_256(certDer: Buffer, digestHex: string, sigHex: string) {
  const { result } = fromBER(certDer);
  if (result.offset === -1) throw new Error("Bad cert ASN.1");
  const cert = new asn1.Certificate({ schema: result });
  const spki = Buffer.from(cert.subjectPublicKeyInfo.subjectPublicKey);

  const subtle = gostCrypto.subtle;
  const alg = {
    name: "GOST R 34.10",
    length: 256,
    hash: { name: "GOST R 34.11", length: 256 },
  };

  const key = await subtle.importKey("spki", spki, alg, true, ["verify"]);
  const sig = Buffer.from(sigHex, "hex");
  const digest = Buffer.from(digestHex, "hex");

  return await subtle.verify(alg as any, key, sig, digest);
}

export async function POST(req: Request) {
  const { id, certPem, sigHex } = await req.json();

  const redis = await getRedis();
  await ensureRedisConnected();

  const raw = await redis.get(`nonce:${id}`);
  if (!raw) return NextResponse.json({ error: "challenge expired" }, { status: 401 });
  await (redis as any).del?.(`nonce:${id}`);

  const { nonceB64, hashHex } = JSON.parse(raw);

  // Либо доверяй сохранённому hashHex,
  // либо пересчитай Стрибог-256 из nonceB64:
  // const digestHex = streebog256Hex(Buffer.from(nonceB64, "base64"));

  const certDer = pemToDer(certPem);
  const ok = await verifyGost2012_256(certDer, hashHex, sigHex);

  if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  return NextResponse.json({ ok: true });
}

// src/app/api/signatures/[id]/verify/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";

// криптография
import { streebog256 as streebog256Sync } from "@/lib/crypto/streebog";
import { CryptoProA_2012_256 } from "@/lib/crypto/espoint";

const streebog256 = async (data: Uint8Array) => Promise.resolve(streebog256Sync(data));

// === утилиты ===
const leToBe = (b: Uint8Array) => b.slice().reverse();
const bytesToBigIntBE = (b: Uint8Array) => b.reduce((acc, v) => (acc << 8n) + BigInt(v), 0n);
const bytesToBigIntLE = (b: Uint8Array) => bytesToBigIntBE(leToBe(b));

type TLV = { tag: number; len: number; head: number; valOff: number; end: number };
function parseTLV(buf: Uint8Array, off: number): TLV {
  if (off >= buf.length) throw new Error("ASN.1: EOF");
  const tag = buf[off];
  let i = off + 1;
  if (i >= buf.length) throw new Error("ASN.1: bad len");
  const b0 = buf[i++];
  let len = 0;
  if (b0 < 0x80) {
    len = b0;
  } else {
    const n = b0 & 0x7f;
    if (n === 0 || i + n > buf.length) throw new Error("ASN.1: OOR");
    len = Number(bytesToBigIntBE(buf.slice(i, i + n)));
    i += n;
  }
  const head = i - off;
  const valOff = i;
  const end = valOff + len;
  if (end > buf.length) throw new Error("ASN.1: OOR2");
  return { tag, len, head, valOff, end };
}
function decodeOID(b: Uint8Array): string {
  if (!b.length) return "";
  const first = b[0];
  const a = Math.floor(first / 40);
  const y = first % 40;
  const out: number[] = [a, y];
  let v = 0;
  for (let i = 1; i < b.length; i++) {
    const c = b[i];
    v = (v << 7) | (c & 0x7f);
    if ((c & 0x80) === 0) { out.push(v); v = 0; }
  }
  return out.join(".");
}
function pemToDer(pem: string): Uint8Array {
  const b64 = (pem.match(/-----BEGIN[\s\S]+?-----([\s\S]*?)-----END[\s\S]+?-----/i)?.[1] ?? "")
    .replace(/[\r\n\s]/g, "");
  if (!b64) throw new Error("Не удалось распарсить PEM");
  return new Uint8Array(Buffer.from(b64, "base64"));
}

// ===== OIDs
const OID = {
  id_data: "1.2.840.113549.1.7.1",
  id_signedData: "1.2.840.113549.1.7.2",
  contentType: "1.2.840.113549.1.9.3",
  messageDigest: "1.2.840.113549.1.9.4",
  DIGEST_256: "1.2.643.7.1.1.2.2",
  SIGN_2012_256: "1.2.643.7.1.1.3.2",
};

// === извлечение Qx,Qy из сертификата (SPKI) ===
function extractPublicQ_LE_fromCert(certDer: Uint8Array): { qx: bigint; qy: bigint } {
  const cert = parseTLV(certDer, 0);
  const certVal = certDer.slice(cert.valOff, cert.end);
  const tbs = parseTLV(certVal, 0);
  const tbsVal = certVal.slice(tbs.valOff, tbs.end);

  let p = 0;
  const first = parseTLV(tbsVal, p);
  if (first.tag === 0xA0) p += first.head + first.len; // version
  p += parseTLV(tbsVal, p).head + parseTLV(tbsVal, p).len; // serial
  p += parseTLV(tbsVal, p).head + parseTLV(tbsVal, p).len; // sigAlg
  p += parseTLV(tbsVal, p).head + parseTLV(tbsVal, p).len; // issuer
  p += parseTLV(tbsVal, p).head + parseTLV(tbsVal, p).len; // validity
  p += parseTLV(tbsVal, p).head + parseTLV(tbsVal, p).len; // subject

  const spki = parseTLV(tbsVal, p);
  const spkiVal = tbsVal.slice(spki.valOff, spki.end);

  let q = 0;
  const _alg = parseTLV(spkiVal, q); q += _alg.head + _alg.len;
  const spk = parseTLV(spkiVal, q);
  if (spk.tag !== 0x03) throw new Error("SPKI: ожидается BIT STRING");
  const bitstr = spkiVal.slice(spk.valOff, spk.end);
  if (bitstr[0] !== 0x00) throw new Error("SPKI: unused bits != 0");
  const payload = bitstr.slice(1);

  // внутри BIT STRING иногда OCTET STRING, иногда «голые» 64 байта
  try {
    const inner = parseTLV(payload, 0);
    if (inner.tag === 0x04) {
      const pub = payload.slice(inner.valOff, inner.end);
      if (pub.length !== 64) throw new Error("SPKI: ожидалось 64 байта (Qx||Qy)");
      return { qx: bytesToBigIntLE(pub.slice(0, 32)), qy: bytesToBigIntLE(pub.slice(32, 64)) };
    }
  } catch {}
  if (payload.length !== 64) throw new Error("SPKI: ожидалось 64 байта (Qx||Qy)");
  return { qx: bytesToBigIntLE(payload.slice(0, 32)), qy: bytesToBigIntLE(payload.slice(32, 64)) };
}

// === EC math + verify ===
function mod(a: bigint, m: bigint) { const r = a % m; return r >= 0n ? r : r + m; }
function egcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  if (b === 0n) return [a, 1n, 0n];
  const [g, x1, y1] = egcd(b, a % b);
  return [g, y1, x1 - (a / b) * y1];
}
function invMod(a: bigint, m: bigint) {
  const [g, x] = egcd(mod(a, m), m);
  if (g !== 1n) throw new Error("invMod: non invertible");
  return mod(x, m);
}
type Curve = { p: bigint; a: bigint; b: bigint; q: bigint; gx: bigint; gy: bigint; };
type P = { x: bigint; y: bigint } | null;
function isInfinity(P: P): P is null { return P === null; }
function pointAdd(cur: Curve, P1: P, P2: P): P {
  const { p } = cur;
  if (isInfinity(P1)) return P2;
  if (isInfinity(P2)) return P1;
  if (P1.x === P2.x && mod(P1.y + P2.y, p) === 0n) return null;
  let λ: bigint;
  if (P1.x === P2.x && P1.y === P2.y) {
    λ = mod((3n * P1.x * P1.x + cur.a) * invMod(2n * P1.y, p), p);
  } else {
    λ = mod((P2.y - P1.y) * invMod(P2.x - P1.x, p), p);
  }
  const x3 = mod(λ * λ - P1.x - P2.x, p);
  const y3 = mod(λ * (P1.x - x3) - P1.y, p);
  return { x: x3, y: y3 };
}
function pointMul(cur: Curve, k: bigint, P: P): P {
  let n = mod(k, cur.q);
  if (n === 0n || isInfinity(P)) return null;
  let Q: P = null;
  let N: P = P;
  while (n > 0n) {
    if (n & 1n) Q = pointAdd(cur, Q, N);
    N = pointAdd(cur, N, N);
    n >>= 1n;
  }
  return Q;
}
function verifyGost2012_256(cur: Curve, Qx: bigint, Qy: bigint, r: bigint, s: bigint, e: bigint): boolean {
  const { q, gx, gy } = cur;
  if (r <= 0n || r >= q) return false;
  if (s <= 0n || s >= q) return false;
  const v = invMod(e, q);
  const z1 = mod(s * v, q);
  const z2 = mod(q - mod(r * v, q), q);
  const G: P = { x: gx, y: gy };
  const Q: P = { x: Qx, y: Qy };
  const A = pointMul(cur, z1, G);
  const B = pointMul(cur, z2, Q);
  const C = pointAdd(cur, A, B);
  if (C === null) return false;
  const R = mod(C.x, q);
  return R === r;
}

// === нормализация пути + чтение файла ===
function normalizeStoragePath(p: string): string {
  let u = p.replace(/\\/g, "/");
  if (u.startsWith("/uploads/")) return path.join(process.cwd(), "public", u.replace(/^\/+/, ""));
  if (u.startsWith("uploads/")) return path.join(process.cwd(), "public", u);
  if (u.startsWith("public/")) return path.join(process.cwd(), u);
  return path.join(process.cwd(), u);
}
async function readFileIfExists(filePath: string): Promise<Uint8Array> {
  const abs = normalizeStoragePath(filePath);
  const raw = await fs.readFile(abs);
  if (raw[0] === 0x30) return new Uint8Array(raw); // DER
  const asText = raw.toString("utf8").trim();
  const m = asText.match(/-----BEGIN[\s\S]+?-----(?<b64>[\s\S]*?)-----END[\s\S]+?-----/i);
  if (m?.groups?.b64) return new Uint8Array(Buffer.from(m.groups.b64.replace(/[\s\r\n]/g, ""), "base64"));
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(asText))
    return new Uint8Array(Buffer.from(asText.replace(/[\s\r\n]/g, ""), "base64"));
  throw new Error(`Не DER/PEM/base64: ${abs}`);
}

type ParsedCMS = {
  detached: boolean;
  econtent?: Uint8Array;
  signedAttrs_fullDER: Uint8Array;
  messageDigest: Uint8Array;
  contentTypeOk: boolean;
  digestOID: string;
  signOID: string;
  sigR: bigint;
  sigS: bigint;
  certDer: Uint8Array;
};

// === парсер CMS CAdES-BES (под ГОСТ) ===
function parseCMS_CadesBes(der: Uint8Array): ParsedCMS {
  const tlv = (o: number) => parseTLV(der, o);

  // ContentInfo ::= SEQUENCE { contentType OID, [0] EXPLICIT ANY (SignedData) }
  const contentInfo = tlv(0);
  if (contentInfo.tag !== 0x30) throw new Error("ContentInfo: ожидался SEQUENCE");
  let ciOff = contentInfo.valOff;

  const ci_oid = tlv(ciOff);
  const ci_oidVal = decodeOID(der.slice(ci_oid.valOff, ci_oid.end));
  if (ci_oidVal !== OID.id_signedData) throw new Error("ContentInfo: не SignedData");
  ciOff = ci_oid.end;

  const ci_explicit0 = tlv(ciOff);
  if (ci_explicit0.tag !== 0xA0) throw new Error("ContentInfo: ожидался [0] EXPLICIT");
  const sd = tlv(ci_explicit0.valOff);
  if (sd.tag !== 0x30) throw new Error("SignedData: ожидался SEQUENCE");
  let sdOff = sd.valOff;

  // SignedData.version
  sdOff = tlv(sdOff).end;

  // digestAlgorithms
  sdOff = tlv(sdOff).end;

  // encapContentInfo ::= SEQUENCE
  const eci = tlv(sdOff);
  if (eci.tag !== 0x30) throw new Error("encapContentInfo: ожидался SEQUENCE");
  let eciOff = eci.valOff;

  const eci_type = tlv(eciOff);
  const eci_oidVal = decodeOID(der.slice(eci_type.valOff, eci_type.end));
  if (eci_oidVal !== OID.id_data) throw new Error("encapContentInfo: eContentType != id-data");
  eciOff = eci_type.end;

  let detached = true;
  let econtent: Uint8Array | undefined;
  if (eciOff < eci.end) {
    const eci_ctx0 = tlv(eciOff);
    if (eci_ctx0.tag === 0xA0) {
      const oct = tlv(eci_ctx0.valOff);
      if (oct.tag !== 0x04) throw new Error("encapContentInfo: eContent не OCTET STRING");
      econtent = der.slice(oct.valOff, oct.end);
      detached = false;
    }
  }
  sdOff = eci.end;

  // certificates [0] IMPLICIT OPTIONAL
  let certDer: Uint8Array | undefined;
  let t = tlv(sdOff);
  if ((t.tag & 0xE0) === 0xA0 && (t.tag & 0x1f) === 0x00) { // [0]
    // IMPLICIT: внутри сразу элементы CertificateSet (CHOICE)
    // ищем первый SEQUENCE — это и будет X.509
    let cOff = t.valOff;
    while (cOff < t.end) {
      const c = tlv(cOff);
      if (c.tag === 0x30) { // Certificate
        certDer = der.slice(c.valOff - c.head, c.end);
        break;
      }
      cOff = c.end;
    }
    sdOff = t.end;
    t = tlv(sdOff);
  }

  // crls [1] IMPLICIT OPTIONAL — пропускаем, если есть
  if ((t.tag & 0xE0) === 0xA0 && (t.tag & 0x1f) === 0x01) {
    sdOff = t.end;
  }

  // signerInfos ::= SET OF SignerInfo
  const siContainer = tlv(sdOff);
  let signerInfo: TLV;
  if (siContainer.tag === 0x31) {
    if (siContainer.len === 0) throw new Error("signerInfos: пустой SET");
    signerInfo = parseTLV(der, siContainer.valOff);
  } else if (siContainer.tag === 0x30) {
    signerInfo = siContainer; // некоторые кладут без SET
  } else {
    throw new Error("signerInfos: ожидался SET или SEQUENCE");
  }
  if (signerInfo.tag !== 0x30) throw new Error("SignerInfo: ожидался SEQUENCE");
  let siOff = signerInfo.valOff;

  // version
  siOff = tlv(siOff).end;

  // sid (issuerAndSerial | [0]SKI) — пропускаем
  siOff = tlv(siOff).end;

  // digestAlgorithm
  const digestAlg = tlv(siOff);
  const digestAlg_oidTLV = tlv(digestAlg.valOff);
  const digestOID = decodeOID(der.slice(digestAlg_oidTLV.valOff, digestAlg_oidTLV.end));
  siOff = digestAlg.end;

  // signedAttrs: [0] IMPLICIT SET OF Attribute
  const signedAttrs_tagged = tlv(siOff);
  if (signedAttrs_tagged.tag !== 0xA0) throw new Error("SignerInfo: нет signedAttrs");
  const sa_content = der.slice(signedAttrs_tagged.valOff, signedAttrs_tagged.end);

  // восстановить полный DER SET (0x31 + len + content)
  const len = sa_content.length;
  const lenEnc = (() => {
    if (len < 0x80) return Uint8Array.of(len);
    const bytes: number[] = [];
    let x = len;
    while (x) { bytes.push(x & 0xff); x >>>= 8; }
    bytes.reverse();
    return Uint8Array.of(0x80 | bytes.length, ...bytes);
  })();
  const signedAttrs_fullDER = new Uint8Array(1 + lenEnc.length + sa_content.length);
  signedAttrs_fullDER[0] = 0x31;
  signedAttrs_fullDER.set(lenEnc, 1);
  signedAttrs_fullDER.set(sa_content, 1 + lenEnc.length);

  // разобрать атрибуты
  let ap = 0;
  let messageDigest: Uint8Array | null = null;
  let contentTypeOk = false;
  while (ap < sa_content.length) {
    const a = parseTLV(sa_content, ap); ap += a.head + a.len;
    const aval = sa_content.slice(a.valOff, a.end);
    const ot = parseTLV(aval, 0);
    const attrOID = decodeOID(aval.slice(ot.valOff, ot.end));
    const setv = parseTLV(aval, ot.head + ot.len);
    const any = parseTLV(aval.slice(ot.head + ot.len, ot.head + ot.len + setv.len), 0);
    const v = aval.slice(ot.head + ot.len + any.valOff, ot.head + ot.len + any.end);

    if (attrOID === OID.contentType) {
      const oidCT = decodeOID(v);
      contentTypeOk = (oidCT === OID.id_data);
    } else if (attrOID === OID.messageDigest) {
      messageDigest = v.slice();
    }
  }
  if (!messageDigest) throw new Error("signedAttrs: нет messageDigest");

  siOff = signedAttrs_tagged.end;

  // signatureAlgorithm
  const sigAlg = tlv(siOff);
  const sigAlg_oidTLV = tlv(sigAlg.valOff);
  const signOID = decodeOID(der.slice(sigAlg_oidTLV.valOff, sigAlg_oidTLV.end));
  siOff = sigAlg.end;

  // signature (OCTET STRING) — 64 байта R||S (LE)
  const sigVal = tlv(siOff);
  if (sigVal.tag !== 0x04) throw new Error("signature: ожидался OCTET STRING");
  let sigBytes = der.slice(sigVal.valOff, sigVal.end);
  if (sigBytes.length >= 65 && sigBytes[0] === 0x00) sigBytes = sigBytes.slice(1); // редкий префикс 0x00
  if (sigBytes.length !== 64) throw new Error("signature: ожидалось 64 байта R||S (LE)");
  const sigR = bytesToBigIntLE(sigBytes.slice(0, 32));
  const sigS = bytesToBigIntLE(sigBytes.slice(32, 64));

  if (!certDer) throw new Error("В CMS отсутствует сертификат (нет certificates [0])");

  return {
    detached,
    econtent,
    signedAttrs_fullDER,
    messageDigest,
    contentTypeOk,
    digestOID,
    signOID,
    sigR,
    sigS,
    certDer,
  };
}

// === Handler ===
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, status: "ERROR", message: "Unauthorized" }, { status: 401 });
    }

    const sig = await prisma.signatures.findUnique({
      where: { id },
      include: { document: true, user: true },
    });
    if (!sig) return NextResponse.json({ ok: false, status: "ERROR", message: "Подпись не найдена" }, { status: 404 });

    let cmsDer: Uint8Array;
    if (sig.filePath) cmsDer = await readFileIfExists(sig.filePath);
    else if (sig.pem) cmsDer = pemToDer(sig.pem);
    else return NextResponse.json({ ok: false, status: "ERROR", message: "Нет данных подписи" }, { status: 400 });

    const parsed = parseCMS_CadesBes(cmsDer);

    // проверка алгоритмов/атрибутов
    if (parsed.digestOID !== OID.DIGEST_256)
      return NextResponse.json({ ok: false, status: "ERROR", message: `Неподдерживаемый digest OID: ${parsed.digestOID}` });
    if (parsed.signOID !== OID.SIGN_2012_256)
      return NextResponse.json({ ok: false, status: "ERROR", message: `Неподдерживаемый signature OID: ${parsed.signOID}` });
    if (!parsed.contentTypeOk)
      return NextResponse.json({ ok: false, status: "ERROR", message: "contentType в атрибутах не id-data" });

    // контент
    let content: Uint8Array;
    if (parsed.detached) {
      if (!sig.document?.filePath)
        return NextResponse.json({ ok: false, status: "ERROR", message: "Detached подпись: у записи нет документа" });
      content = await readFileIfExists(sig.document.filePath);
    } else {
      content = parsed.econtent!;
    }

    // сверка messageDigest(content)
    const md = await streebog256(content);
    if (Buffer.compare(Buffer.from(md), Buffer.from(parsed.messageDigest)) !== 0)
      return NextResponse.json({ ok: false, status: "ERROR", message: "messageDigest не совпадает с H(content)" });

    // e = H(der(SET signedAttrs))
    const eBytes = await streebog256(parsed.signedAttrs_fullDER);
    let e = bytesToBigIntLE(eBytes);
    if (e === 0n) e = 1n;

    // публичный ключ
    const { qx, qy } = extractPublicQ_LE_fromCert(parsed.certDer);

    // верификация ГОСТ 2012-256
    const curve = {
      p: BigInt(CryptoProA_2012_256.p),
      a: BigInt(CryptoProA_2012_256.a),
      b: BigInt(CryptoProA_2012_256.b),
      q: BigInt(CryptoProA_2012_256.q),
      gx: BigInt(CryptoProA_2012_256.gx),
      gy: BigInt(CryptoProA_2012_256.gy),
    };
    const ok = verifyGost2012_256(curve, qx, qy, parsed.sigR, parsed.sigS, e);
    if (!ok) return NextResponse.json({ ok: false, status: "ERROR", message: "Криптографическая проверка не пройдена" });

    return NextResponse.json({ ok: true, status: "OK", message: "Подпись корректна (CAdES-BES, ГОСТ-2012-256)" });

  } catch (e: any) {
    return NextResponse.json({ ok: false, status: "ERROR", message: e?.message ?? String(e) }, { status: 500 });
  }
}

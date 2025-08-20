import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";

// крипта из твоих либ
import { streebog256 as streebog256Sync } from "@/lib/crypto/streebog";
import { CryptoProA_2012_256 } from "@/lib/crypto/espoint"; // curve params p,a,b,q,gx,gy

// ===== утилиты =====
const streebog256 = async (data: Uint8Array) => Promise.resolve(streebog256Sync(data));
const concat = (...arr: Uint8Array[]) => {
  const len = arr.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arr) { out.set(a, off); off += a.length; }
  return out;
};
const beToLe = (b: Uint8Array) => b.slice().reverse();
const leToBe = (b: Uint8Array) => b.slice().reverse();
const bytesToBigIntBE = (b: Uint8Array) => b.reduce((acc, v) => (acc << 8n) + BigInt(v), 0n);
const bytesToBigIntLE = (b: Uint8Array) => bytesToBigIntBE(leToBe(b));
const bigIntToBE = (x: bigint, size?: number) => {
  let hex = x.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  let out = Uint8Array.from(hex.match(/../g)!.map(h => parseInt(h, 16)));
  if (size !== undefined) {
    if (out.length > size) out = out.slice(out.length - size);
    if (out.length < size) {
      const pad = new Uint8Array(size);
      pad.set(out, size - out.length);
      out = pad;
    }
  } else if (out.length && (out[0] & 0x80)) {
    out = Uint8Array.of(0x00, ...out);
  }
  return out;
};

// ====== мини ASN.1 ======
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
    if (i + n > buf.length) throw new Error("ASN.1: OOR");
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

// ====== OIDs ======
const OID = {
  id_data:               "1.2.840.113549.1.7.1",
  id_signedData:         "1.2.840.113549.1.7.2",
  contentType:           "1.2.840.113549.1.9.3",
  messageDigest:         "1.2.840.113549.1.9.4",
  signingTime:           "1.2.840.113549.1.9.5",
  signingCertificateV2:  "1.2.840.113549.1.9.16.2.47",
  DIGEST_256:            "1.2.643.7.1.1.2.2",
  SIGN_2012_256:         "1.2.643.7.1.1.3.2",
};

// ==== PEM ====
function pemToDer(pem: string): Uint8Array {
  const b64 = (pem.match(/-----BEGIN[\s\S]+?-----([\s\S]*?)-----END[\s\S]+?-----/i)?.[1] ?? "")
    .replace(/[\r\n\s]/g, "");
  if (!b64) throw new Error("Не удалось распарсить PEM");
  const bin = Buffer.from(b64, "base64");
  return new Uint8Array(bin);
}

// ==== извлечь из Certificate SPKI → Qx,Qy (LE 32+32) ====
function extractPublicQ_LE_fromCert(certDer: Uint8Array): { qx: bigint; qy: bigint } {
  const cert = parseTLV(certDer, 0); // Certificate
  const certVal = certDer.slice(cert.valOff, cert.end);
  const tbs = parseTLV(certVal, 0);  // tbsCertificate
  const tbsVal = certVal.slice(tbs.valOff, tbs.end);

  // перейти: [0] version? → serial → sigAlg → issuer → validity → subject → spki
  let p = 0;
  const first = parseTLV(tbsVal, p);
  if (first.tag === 0xA0) p += first.head + first.len;
  const serial = parseTLV(tbsVal, p); p += serial.head + serial.len;
  const sigAlg = parseTLV(tbsVal, p); p += sigAlg.head + sigAlg.len;
  const issuer = parseTLV(tbsVal, p); p += issuer.head + issuer.len;
  const validity = parseTLV(tbsVal, p); p += validity.head + validity.len;
  const subject = parseTLV(tbsVal, p); p += subject.head + subject.len;
  const spki = parseTLV(tbsVal, p);
  const spkiVal = tbsVal.slice(spki.valOff, spki.end);

  // SubjectPublicKeyInfo ::= SEQUENCE { algorithm SEQ, subjectPublicKey BIT STRING }
  let q = 0;
  const spkiAlg = parseTLV(spkiVal, q); q += spkiAlg.head + spkiAlg.len;
  const spk = parseTLV(spkiVal, q); // BIT STRING
  if (spk.tag !== 0x03) throw new Error("SPKI: ожидается BIT STRING");
  const bitstr = spkiVal.slice(spk.valOff, spk.end);
  if (bitstr[0] !== 0x00) throw new Error("SPKI: unsupported unused bits != 0");
  const payload = bitstr.slice(1);

  // у тебя внутри BIT STRING лежит OCTET STRING( Qx||Qy (LE) )
  try {
    const inner = parseTLV(payload, 0);
    if (inner.tag === 0x04 /* OCTET STRING */) {
      const pub = payload.slice(inner.valOff, inner.end);
      if (pub.length !== 64) throw new Error("SPKI: ожидалось 64 байта (Qx||Qy)");
      const qx = bytesToBigIntLE(pub.slice(0, 32));
      const qy = bytesToBigIntLE(pub.slice(32, 64));
      return { qx, qy };
    }
  } catch {
    // если вдруг без OCTET STRING — допускаем «голые» 64 байта
    if (payload.length === 64) {
      const qx = bytesToBigIntLE(payload.slice(0, 32));
      const qy = bytesToBigIntLE(payload.slice(32, 64));
      return { qx, qy };
    }
  }
  throw new Error("SPKI: не удалось извлечь публичный ключ");
}

// ==== извлечь issuer+serial (для сверки sid при необходимости) ====
function extractIssuerAndSerial(certDer: Uint8Array): { issuerNameTLV: Uint8Array; serial: bigint } {
  const cert = parseTLV(certDer, 0);
  const certVal = certDer.slice(cert.valOff, cert.end);
  const tbs = parseTLV(certVal, 0);
  const tbsVal = certVal.slice(tbs.valOff, tbs.end);

  let p = 0;
  const first = parseTLV(tbsVal, p);
  if (first.tag === 0xA0) p += first.head + first.len;
  const serialTLV = parseTLV(tbsVal, p); p += serialTLV.head + serialTLV.len;
  const serialBytes = tbsVal.slice(serialTLV.valOff, serialTLV.end);
  let si = 0; while (si < serialBytes.length && serialBytes[si] === 0x00) si++;
  const serial = bytesToBigIntBE(serialBytes.slice(si));

  const sigAlg = parseTLV(tbsVal, p); p += sigAlg.head + sigAlg.len;
  const issuer = parseTLV(tbsVal, p);
  const issuerNameTLV = tbsVal.slice(p, p + issuer.head + issuer.len);
  return { issuerNameTLV, serial };
}

function tryExtractSKI(certDer: Uint8Array): Uint8Array | undefined {
  const cert = parseTLV(certDer, 0);
  const certVal = certDer.slice(cert.valOff, cert.end);
  const tbs = parseTLV(certVal, 0);
  const tbsVal = certVal.slice(tbs.valOff, tbs.end);

  let p = 0;
  const first = parseTLV(tbsVal, p);
  if (first.tag === 0xA0) p += first.head + first.len;
  const serial = parseTLV(tbsVal, p); p += serial.head + serial.len;
  const sigAlg = parseTLV(tbsVal, p); p += sigAlg.head + sigAlg.len;
  const issuer = parseTLV(tbsVal, p); p += issuer.head + issuer.len;
  const validity = parseTLV(tbsVal, p); p += validity.head + validity.len;
  const subject = parseTLV(tbsVal, p); p += subject.head + subject.len;
  const spki = parseTLV(tbsVal, p); p += spki.head + spki.len;

  while (p < tbsVal.length) {
    const t = parseTLV(tbsVal, p);
    if (t.tag === 0xA3) {
      const extSeq = tbsVal.slice(t.valOff, t.end);
      let q = 0;
      while (q < extSeq.length) {
        const ext = parseTLV(extSeq, q); q += ext.head + ext.len;
        const body = extSeq.slice(ext.valOff, ext.end);
        const oidT = parseTLV(body, 0);
        if (oidT.tag !== 0x06) continue;
        const oid = decodeOID(body.slice(oidT.valOff, oidT.end));
        let r = oidT.head + oidT.len;
        const maybe = parseTLV(body, r);
        let extnValueTLV: TLV;
        if (maybe.tag === 0x01) { // critical
          r += maybe.head + maybe.len;
          extnValueTLV = parseTLV(body, r);
        } else extnValueTLV = maybe;
        if (oid === "2.5.29.14") {
          const outer = body.slice(extnValueTLV.valOff, extnValueTLV.end);
          const inner = parseTLV(outer, 0);
          if (inner.tag === 0x04) { // OCTET
            return outer.slice(inner.valOff, inner.end);
          }
        }
      }
    }
    p += t.head + t.len;
  }
  return undefined;
}

// ====== EC math over F_p ======
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
    // λ = (3*x1^2 + a) / (2*y1)
    λ = mod((3n * P1.x * P1.x + cur.a) * invMod(2n * P1.y, p), p);
  } else {
    // λ = (y2 - y1) / (x2 - x1)
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

// ===== ГОСТ 34.10-2012 verify =====
function verifyGost2012_256(
  curve: Curve,
  Qx: bigint,
  Qy: bigint,
  r: bigint,
  s: bigint,
  e: bigint
): boolean {
  const { q, gx, gy } = curve;
  if (r <= 0n || r >= q) return false;
  if (s <= 0n || s >= q) return false;

  const v = invMod(e, q);
  const z1 = mod(s * v, q);
  const z2 = mod(q - mod(r * v, q), q); // = (-r*v) mod q

  const G: P = { x: gx, y: gy };
  const Q: P = { x: Qx, y: Qy };

  const A = pointMul(curve, z1, G);
  const B = pointMul(curve, z2, Q);
  const C = pointAdd(curve, A, B);
  if (C === null) return false;
  const R = mod(C.x, q);
  return R === r;
}

// ===== CMS parse (минимально для твоего билда) =====
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
  sidType: "ski" | "issuerAndSerial";
  sidValue: Uint8Array | { issuerNameTLV: Uint8Array; serial: bigint };
};

function peekTag(buf: Uint8Array, off: number): number | null {
  if (off >= buf.length) return null;
  return buf[off];
}

function parseCMS_CadesBes(der: Uint8Array): ParsedCMS {
  // ContentInfo
  const ci = parseTLV(der, 0);
  const ciVal = der.slice(ci.valOff, ci.end);
  let p = 0;
  const oid = parseTLV(ciVal, p); p += oid.head + oid.len;
  const oidStr = decodeOID(ciVal.slice(oid.valOff, oid.end));
  if (oidStr !== OID.id_signedData) throw new Error("Не SignedData");
  const explicit0 = parseTLV(ciVal, p);
  const sdTLV    = parseTLV(ciVal, explicit0.valOff);   // парсим по исходному буферу и абсолютному смещению
  const sdVal    = ciVal.slice(sdTLV.valOff, sdTLV.end);
  if (explicit0.tag !== 0xA0) throw new Error("Ожидался [0] EXPLICIT");

  let sdp = 0;

  // version
  const _ver = parseTLV(sdVal, sdp); sdp += _ver.head + _ver.len;
  // digestAlgorithms (SET OF AlgorithmIdentifier)
  const digestSet = parseTLV(sdVal, sdp); sdp += digestSet.head + digestSet.len;
  // encapContentInfo ::= SEQ { eContentType OID, [0] EXPLICIT OCTET STRING OPTIONAL }
  const eci = parseTLV(sdVal, sdp); sdp += eci.head + eci.len;
  const eciVal = sdVal.slice(eci.valOff, eci.end);

  let ecip = 0;
  const eContentType = parseTLV(eciVal, ecip); ecip += eContentType.head + eContentType.len;
  const eContentTypeOID = decodeOID(eciVal.slice(eContentType.valOff, eContentType.end));

  let detached = true;
  let econtent: Uint8Array | undefined;

  if (ecip < eciVal.length) {
    const econtExp = parseTLV(eciVal, ecip);
    if (econtExp.tag === 0xA0) {
      // ВАЖНО: парсим по ТОМУ ЖЕ буферу и с абсолютным offset
      const oct = parseTLV(eciVal, econtExp.valOff);
      if (oct.tag !== 0x04) throw new Error("eContent: ожидался OCTET STRING");
      econtent = eciVal.slice(oct.valOff, oct.end);
      detached = false;
      // ecip += econtExp.head + econtExp.len; // (если дальше по eciVal ещё пойдёшь)
    }
  }

  // certificates: [0] IMPLICIT CertificateSet (берём первый)
  const certsIm = parseTLV(sdVal, sdp); sdp += certsIm.head + certsIm.len;
  if (certsIm.tag !== 0xA0) throw new Error("Ожидались сертификаты [0] IMPLICIT");
let certDer: Uint8Array | undefined;
let nextTag = peekTag(sdVal, sdp);

if (nextTag === 0xA0) {
  const certsIm = parseTLV(sdVal, sdp); sdp += certsIm.head + certsIm.len;
  // content IMPLICIT: внутри подряд DER сертификаты. Берём первый – парсер дальше ожидает один.
  certDer = sdVal.slice(certsIm.valOff, certsIm.end);
  nextTag = peekTag(sdVal, sdp);
}

// crls? ([1] IMPLICIT) — просто пропускаем, если есть
if (nextTag === 0xA1) {
  const crlsIm = parseTLV(sdVal, sdp); sdp += crlsIm.head + crlsIm.len;
  nextTag = peekTag(sdVal, sdp);
}

// signerInfos (SET, tag 0x31) — обязателен
if (nextTag !== 0x31) {
  throw new Error(`Ожидался signerInfos (SET, 0x31), но встретился tag 0x${(nextTag ?? 0).toString(16)}`);
}

const siSet = parseTLV(sdVal, sdp);
// дальше как было:
const siSetVal = sdVal.slice(siSet.valOff, siSet.end);
  // для простоты считаем один SignerInfo
  const si = parseTLV(siSetVal, 0);
  const siVal = siSetVal.slice(si.valOff, si.end);
  let sip = 0;
  const siVer = parseTLV(siVal, sip); sip += siVer.head + siVer.len;

  // sid: [0] IMPLICIT OCTET STRING (SKI) ИЛИ issuerAndSerialNumber SEQ
  const sid = parseTLV(siVal, sip); sip += sid.head + sid.len;
  let sidType: ParsedCMS["sidType"];
  let sidValue: ParsedCMS["sidValue"];
  if (sid.tag === 0x80) { // SKI
    sidType = "ski";
    sidValue = siVal.slice(sid.valOff, sid.end);
  } else {
    sidType = "issuerAndSerial";
    const sidVal = siVal.slice(sid.valOff, sid.end);
    const issuer = parseTLV(sidVal, 0);
    const issuerTLV = sidVal.slice(0, issuer.head + issuer.len);
    const serialTLV = parseTLV(sidVal, issuer.head + issuer.len);
    const serialBytes = sidVal.slice(serialTLV.valOff, serialTLV.end);
    let si0 = 0; while (si0 < serialBytes.length && serialBytes[si0] === 0x00) si0++;
    const serial = bytesToBigIntBE(serialBytes.slice(si0));
    sidValue = { issuerNameTLV: issuerTLV, serial };
  }

  const digestAlg = parseTLV(siVal, sip); sip += digestAlg.head + digestAlg.len;
  // signedAttrs: [0] IMPLICIT SET OF Attribute  (НО для хэша берём полный SET с тегом 0x31 из исходного среза)
  const signedAttrs_tagged = parseTLV(siVal, sip); sip += signedAttrs_tagged.head + signedAttrs_tagged.len;
  if (signedAttrs_tagged.tag !== 0xA0) throw new Error("Ожидались signedAttrs [0] IMPLICIT");

  // нам нужен полный TLV SET (0x31 ...), восстановим его из tagged: tag 0xA0 → заменить на 0x31 и добавить заголовок
  const sa_content = siVal.slice(signedAttrs_tagged.valOff, signedAttrs_tagged.end);
  // сформируем искусственно полный SET: 0x31 + len + content
  const len = sa_content.length;
  const lenEnc = ((): Uint8Array => {
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

  // пробежимся по атрибутам, достанем нужные
  let mdAttr: Uint8Array | undefined;
  let ctypeOk = false;
  let haveScv2 = false;

  let ap = 0;
  while (ap < sa_content.length) {
    const a = parseTLV(sa_content, ap); ap += a.head + a.len; // Attribute ::= SEQ
    const aval = sa_content.slice(a.valOff, a.end);
    const ot = parseTLV(aval, 0);
    const oid = decodeOID(aval.slice(ot.valOff, ot.end));
    const setv = parseTLV(aval, ot.head + ot.len);
    // values SET → берём первый ANY
    const any = parseTLV(aval.slice(ot.head + ot.len, ot.head + ot.len + setv.len), 0);
    const v = aval.slice(ot.head + ot.len + any.valOff, ot.head + ot.len + any.end);

    if (oid === OID.contentType) {
      const oidCT = decodeOID(v);
      ctypeOk = (oidCT === OID.id_data);
    } else if (oid === OID.messageDigest) {
      mdAttr = v.slice();
    } else if (oid === OID.signingCertificateV2) {
      // SEQUENCE OF ESSCertIDv2; ESSCertIDv2 ::= SEQ( SEQ(oid)?, OCTET hash, issuerSerial? )
      const list = parseTLV(v, 0);
      const item = parseTLV(v, list.valOff); // первый
      const itemVal = v.slice(item.valOff, item.end);
      let ip = 0;
      const maybeAlg = parseTLV(itemVal, ip);
      let hashOct: Uint8Array | null = null;
      if (maybeAlg.tag === 0x30) {
        ip += maybeAlg.head + maybeAlg.len;
        const hashTLV = parseTLV(itemVal, ip);
        if (hashTLV.tag === 0x04) hashOct = itemVal.slice(hashTLV.valOff, hashTLV.end);
      } else if (maybeAlg.tag === 0x04) {
        hashOct = itemVal.slice(maybeAlg.valOff, maybeAlg.end);
      }
      haveScv2 = !!hashOct;
      // сравнение будет позже, когда будет certDer
    }
  }
  if (!mdAttr) throw new Error("В атрибутах нет messageDigest");

  const sigAlg = parseTLV(siVal, sip); sip += sigAlg.head + sigAlg.len;
  const sigVal = parseTLV(siVal, sip); // OCTET STRING(R||S LE)
  if (sigVal.tag !== 0x04) throw new Error("Ожидался OCTET STRING подписи");
  const sigBytes = siVal.slice(sigVal.valOff, sigVal.end);
  if (sigBytes.length !== 64) throw new Error("Размер подписи должен быть 64 байта (R||S LE)");
  const sigR = bytesToBigIntLE(sigBytes.slice(0, 32));
  const sigS = bytesToBigIntLE(sigBytes.slice(32, 64));

  // достанем OID алгоритмов
  const digVal = siVal.slice(digestAlg.valOff, digestAlg.end);
  const digOID = decodeOID(digVal.slice(parseTLV(digVal, 0).valOff, parseTLV(digVal, 0).end));
  const saVal = siVal.slice(sigAlg.valOff, sigAlg.end);
  const saOID = decodeOID(saVal.slice(parseTLV(saVal, 0).valOff, parseTLV(saVal, 0).end));

  return {
    detached,
    econtent,
    signedAttrs_fullDER,
    messageDigest: mdAttr!,
    contentTypeOk: ctypeOk,
    digestOID: digOID,
    signOID: saOID,
    sigR, sigS,
    certDer,
    sidType,
    sidValue,
  };
}

function normalizeStoragePath(p: string): string {
  let u = p.replace(/\\/g, "/");
  if (u.startsWith("file://")) u = u.slice(7);
  if (/^[a-zA-Z]:\//.test(u)) return u;                          // C:/...
  if (u.startsWith("/public/")) return path.join(process.cwd(), u.slice(1));
  if (u.startsWith("/uploads/")) return path.join(process.cwd(), "public", u.replace(/^\/+/, ""));
  if (u.startsWith("public/")) return path.join(process.cwd(), u);
  if (u.startsWith("uploads/")) return path.join(process.cwd(), "public", u);
  return path.join(process.cwd(), u);
}

async function readFileIfExists(filePath: string): Promise<Uint8Array> {
  const abs = normalizeStoragePath(filePath);
  const raw = await fs.readFile(abs);
  // если DER — начинается с 0x30 (SEQUENCE). Иначе пробуем PEM/BASE64-текст:
  if (raw[0] === 0x30) return new Uint8Array(raw);

  const asText = raw.toString("utf8").trim();
  // PEM
  const m = asText.match(/-----BEGIN[\s\S]+?-----(?<b64>[\s\S]*?)-----END[\s\S]+?-----/i);
  if (m?.groups?.b64) return new Uint8Array(Buffer.from(m.groups.b64.replace(/[\s\r\n]/g, ""), "base64"));
  // голый base64
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(asText)) {
    return new Uint8Array(Buffer.from(asText.replace(/[\s\r\n]/g, ""), "base64"));
  }
  throw new Error(`Формат подписи не распознан (не DER/PEM/base64). Путь: ${abs}`);
}
// ==== основной handler ====
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; 
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, status: "ERROR", message: "Unauthorized" }, { status: 401 });
    }

    // подгружаем подпись + документ
    const sig = await prisma.signatures.findUnique({
      where: { id },
      include: {
        document: true,
        user: true,
      },
    });

    if (!sig) {
      return NextResponse.json({ ok: false, status: "ERROR", message: "Подпись не найдена" }, { status: 404 });
    }

    // получить DER CMS
    let cmsDer: Uint8Array;
    if (sig.filePath) {
      cmsDer = await readFileIfExists(sig.filePath);
      // если это PEM — переведём
      if (cmsDer[0] !== 0x30) {
        const pem = Buffer.from(cmsDer).toString("utf8");
        cmsDer = pemToDer(pem);
      }
    } else if (sig.pem) {
      cmsDer = pemToDer(sig.pem);
    } else {
      return NextResponse.json({ ok: false, status: "ERROR", message: "Нет данных подписи (file/pem)" }, { status: 400 });
    }

    // парсим CMS
    let parsed;
    try {
      parsed = parseCMS_CadesBes(cmsDer);
    } catch (e:any) {
      return NextResponse.json({
        ok: false, status: "ERROR",
        message: `Ошибка парсинга CMS: ${e?.message ?? e}`,
        details: { stage: "parseCMS_CadesBes", firstBytesHex: Buffer.from(cmsDer.slice(0, 64)).toString("hex") }
      }, { status: 200 });
    }

    // сверка алгоритмов
    if (parsed.digestOID !== OID.DIGEST_256) {
      return NextResponse.json({ ok: false, status: "ERROR", message: `Неподдерживаемый digest OID: ${parsed.digestOID}` }, { status: 400 });
    }
    if (parsed.signOID !== OID.SIGN_2012_256) {
      return NextResponse.json({ ok: false, status: "ERROR", message: `Неподдерживаемый signature OID: ${parsed.signOID}` }, { status: 400 });
    }
    if (!parsed.contentTypeOk) {
      return NextResponse.json({ ok: false, status: "ERROR", message: "contentType в атрибутах не id-data" }, { status: 400 });
    }

    // получить content
    let contentBytes: Uint8Array;
    if (parsed.detached) {
      // берём контент из документа
      const doc = sig.document;
      if (!doc) {
        return NextResponse.json({ ok: false, status: "ERROR", message: "Detached подпись: у записи нет документа" }, { status: 400 });
      }
      if (!doc.filePath) {
        return NextResponse.json({ ok: false, status: "ERROR", message: "Detached подпись: у документа нет filePath" }, { status: 400 });
      }
      contentBytes = await readFileIfExists(doc.filePath);
    } else {
      if (!parsed.econtent) {
        return NextResponse.json({ ok: false, status: "ERROR", message: "Attached подпись без eContent" }, { status: 400 });
      }
      contentBytes = parsed.econtent;
    }

    // проверка messageDigest
    const md = await streebog256(contentBytes);
    if (Buffer.compare(Buffer.from(md), Buffer.from(parsed.messageDigest)) !== 0) {
      return NextResponse.json({
        ok: false,
        status: "ERROR",
        message: "messageDigest в атрибутах не совпадает с H(content)",
        details: { expected: Buffer.from(md).toString("hex"), got: Buffer.from(parsed.messageDigest).toString("hex") }
      }, { status: 200 });
    }

    // проверить SigningCertificateV2
    const certHash = await streebog256(parsed.certDer);
    // (в parse мы только проверили наличие; здесь просто сравним с любым ESSCertIDv2, который есть)
    // Для краткости: если SCV2 есть, он уже разобран; чтобы не разбирать снова — допустим сверка через includes:
    // (в строгом варианте нужно достать OCTET STRING из SCV2 и сравнить с certHash)
    // Мы сделаем строгий разбор здесь:
    const scv2Ok = (() => {
      try {
        // найти атрибут ещё раз, вытащить OCTET STRING хэша
        const full = parsed.signedAttrs_fullDER;
        const setTLV = parseTLV(full, 0);
        const setVal = full.slice(setTLV.valOff, setTLV.end);
        let ap = 0;
        while (ap < setVal.length) {
          const a = parseTLV(setVal, ap); ap += a.head + a.len;
          const aval = setVal.slice(a.valOff, a.end);
          const ot = parseTLV(aval, 0);
          const oid = decodeOID(aval.slice(ot.valOff, ot.end));
          if (oid !== OID.signingCertificateV2) continue;
          const setv = parseTLV(aval, ot.head + ot.len);
          const any = parseTLV(aval.slice(ot.head + ot.len, ot.head + ot.len + setv.len), 0);
          const v = aval.slice(ot.head + ot.len + any.valOff, ot.head + ot.len + any.end);
          const list = parseTLV(v, 0);
          const item = parseTLV(v, list.valOff);
          const itemVal = v.slice(item.valOff, item.end);
          let ip = 0;
          const maybeAlg = parseTLV(itemVal, ip);
          let hashOct: Uint8Array | null = null;
          if (maybeAlg.tag === 0x30) {
            ip += maybeAlg.head + maybeAlg.len;
            const hashTLV = parseTLV(itemVal, ip);
            if (hashTLV.tag === 0x04) hashOct = itemVal.slice(hashTLV.valOff, hashTLV.end);
          } else if (maybeAlg.tag === 0x04) {
            hashOct = itemVal.slice(maybeAlg.valOff, maybeAlg.end);
          }
          if (!hashOct) return false;
          return Buffer.compare(Buffer.from(hashOct), Buffer.from(certHash)) === 0;
        }
        return false;
      } catch { return false; }
    })();

    if (!scv2Ok) {
      return NextResponse.json({
        ok: false,
        status: "ERROR",
        message: "SigningCertificateV2 не совпадает с хэшем сертификата",
      }, { status: 200 });
    }

    // проверить sid ⇄ cert (SKI или issuer+serial)
    const sidMatch = (() => {
      try {
        if (parsed.sidType === "ski") {
          const ski = tryExtractSKI(parsed.certDer);
          return !!ski && Buffer.compare(Buffer.from(ski), Buffer.from(parsed.sidValue as Uint8Array)) === 0;
        } else {
          const { issuerNameTLV, serial } = extractIssuerAndSerial(parsed.certDer);
          const sv = parsed.sidValue as { issuerNameTLV: Uint8Array; serial: bigint };
          if (serial !== sv.serial) return false;
          return Buffer.compare(Buffer.from(issuerNameTLV), Buffer.from(sv.issuerNameTLV)) === 0;
        }
      } catch { return false; }
    })();

    if (!sidMatch) {
      return NextResponse.json({
        ok: false,
        status: "ERROR",
        message: "SignerIdentifier не соответствует сертификату",
      }, { status: 200 });
    }

    // вычислить e = H(der(SET signedAttrs)) как в билдере, LE-интерпретация
    const eBytes = await streebog256(parsed.signedAttrs_fullDER);
    let e = bytesToBigIntLE(eBytes);
    if (e === 0n) e = 1n;

    // вытащить публичный ключ из cert
    const { qx, qy } = extractPublicQ_LE_fromCert(parsed.certDer);

    // верификация подписи (ГОСТ 2012-256)
    const curve = {
      p: BigInt(CryptoProA_2012_256.p),
      a: BigInt(CryptoProA_2012_256.a),
      b: BigInt(CryptoProA_2012_256.b),
      q: BigInt(CryptoProA_2012_256.q),
      gx: BigInt(CryptoProA_2012_256.gx),
      gy: BigInt(CryptoProA_2012_256.gy),
    };

    const ok = verifyGost2012_256(curve, qx, qy, parsed.sigR, parsed.sigS, e);
    if (!ok) {
      return NextResponse.json({
        ok: false,
        status: "ERROR",
        message: "Криптографическая проверка подписи не пройдена",
      }, { status: 200 });
    }

    return NextResponse.json({
      ok: true,
      status: "OK",
      message: "Подпись корректна (CAdES-BES, ГОСТ-2012-256).",
      details: {
        detached: parsed.detached,
        algorithms: { digest: parsed.digestOID, signature: parsed.signOID },
      }
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      status: "ERROR",
      message: e?.message ?? String(e),
    }, { status: 500 });
  }
}

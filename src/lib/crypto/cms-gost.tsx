// cms_gost2012.ts
// Корректная CMS (PKCS#7 attached, DER) подпись ГОСТ Р 34.10-2012/34.11-2012.
// Совместимо с CryptoPro/gost-engine: signature = OCTET STRING( R||S в LE ), e = H(content octets of SignedAttributes)

import * as asn1js from "asn1js";
import { streebog256 } from "@/lib/crypto/streebog";
import { DSGOST } from "@/lib/crypto/dsgost";

// ---------- OIDs ----------
const OID_DATA = "1.2.840.113549.1.7.1";
const OID_SIGNED_DATA = "1.2.840.113549.1.7.2";
const OID_GOST_DIGEST_2012_256 = "1.2.643.7.1.1.2.2";
const OID_GOST_SIGN_2012_256   = "1.2.643.7.1.1.3.2";

// ---------- utils ----------
const cleanHex = (h: string) => h.replace(/0x/gi, "").replace(/\s+/g, "");
const bytesToHex = (u8: Uint8Array) => Array.from(u8, b => b.toString(16).padStart(2, "0")).join("");

function hexToBytes(hex: string): Uint8Array {
  const s0 = cleanHex(hex);
  const s = s0.length % 2 ? "0" + s0 : s0;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < s.length; i += 2) out[i / 2] = parseInt(s.slice(i, i + 2), 16);
  return out;
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const buf = u8.buffer as ArrayBuffer;
  if (u8.byteOffset === 0 && u8.byteLength === buf.byteLength) return buf;
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

export function pemToDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  if (typeof Buffer !== "undefined") return Uint8Array.from(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ----- DER helpers -----
function derContentOctets(tlv: Uint8Array): Uint8Array {
  if (tlv.length < 2) throw new Error("TLV too short");
  let i = 1, len = 0;
  const b = tlv[i++];
  if (b < 0x80) len = b;
  else {
    const n = b & 0x7f;
    if (n === 0 || n > 4 || i + n > tlv.length) throw new Error("Bad DER length");
    for (let k = 0; k < n; k++) len = (len << 8) | tlv[i++];
  }
  const start = i, end = start + len;
  if (end > tlv.length) throw new Error("DER length overflow");
  return tlv.slice(start, end);
}

function sortByDer(blocks: asn1js.BaseBlock<any>[]): asn1js.BaseBlock<any>[] {
  return blocks.slice().sort((A, B) => {
    const a = new Uint8Array(A.toBER(false));
    const b = new Uint8Array(B.toBER(false));
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return a.length - b.length;
  });
}

// ----- X.509 helpers -----
export function parseIssuerAndSerial(certDer: Uint8Array): {
  issuer: asn1js.Sequence; serial: asn1js.Integer;
} {
  const certASN1 = asn1js.fromBER(toArrayBuffer(certDer));
  if (certASN1.offset === -1) throw new Error("Bad cert DER");
  const certSeq = certASN1.result as asn1js.Sequence;
  const tbs = certSeq.valueBlock.value[0] as asn1js.Sequence;

  let idx = 0;
  const first = tbs.valueBlock.value[0] as asn1js.BaseBlock<any>;
  if (first.idBlock.tagClass === 3 && first.idBlock.tagNumber === 0) idx = 1; // [0] Version

  const serial = tbs.valueBlock.value[idx] as asn1js.Integer;
  const issuer = tbs.valueBlock.value[idx + 2] as asn1js.Sequence;
  return { issuer, serial };
}

// Достаём Qx,Qy (LE 32 + LE 32) из сертификата (типичный ГОСТ SPKI: BIT STRING -> OCTET STRING(Qx||Qy) [LE])
function extractQ_LE_fromCert(certDER: Uint8Array): Uint8Array | null {
  const certASN1 = asn1js.fromBER(toArrayBuffer(certDER));
  if (certASN1.offset === -1) return null;
  const certSeq = certASN1.result as asn1js.Sequence;
  const tbs = certSeq.valueBlock.value[0] as asn1js.Sequence;

  // SubjectPublicKeyInfo = SEQUENCE { algorithm, subjectPublicKey BIT STRING }
  let spki: asn1js.Sequence | null = null;
  for (const v of tbs.valueBlock.value) {
    if (v instanceof asn1js.Sequence) {
      const vals = v.valueBlock.value;
      if (vals.length >= 2 && vals[1] instanceof asn1js.BitString) { spki = v; break; }
    }
  }
  if (!spki) return null;

  const pkBitStr = spki.valueBlock.value[1] as asn1js.BitString;
  const bit = new Uint8Array(pkBitStr.valueBlock.valueHex as ArrayBuffer);
  const inner = bit.length && bit[0] === 0 ? bit.slice(1) : bit; // drop unused bits octet 0

  let qBytes: Uint8Array = inner;
  if (inner.length >= 2 && inner[0] === 0x04) {
    const oct = asn1js.fromBER(toArrayBuffer(inner)).result as asn1js.OctetString;
    qBytes = new Uint8Array(oct.valueBlock.valueHex as ArrayBuffer);
  }
  return qBytes.length === 64 ? qBytes : null;
}

// ---------- подпись / упаковка ----------
const BYTE_LEN = 32; // ГОСТ-256

function packRS_LE(rHexBE: string, sHexBE: string): Uint8Array {
  const pad = (h: string) => cleanHex(h).padStart(BYTE_LEN * 2, "0").slice(-BYTE_LEN * 2);
  const rLE = hexToBytes(pad(rHexBE)).reverse();
  const sLE = hexToBytes(pad(sHexBE)).reverse();
  const out = new Uint8Array(64);
  out.set(rLE, 0); out.set(sLE, BYTE_LEN);
  return out;
}
function packSR_LE(rHexBE: string, sHexBE: string): Uint8Array {
  const pad = (h: string) => cleanHex(h).padStart(BYTE_LEN * 2, "0").slice(-BYTE_LEN * 2);
  const rLE = hexToBytes(pad(rHexBE)).reverse();
  const sLE = hexToBytes(pad(sHexBE)).reverse();
  const out = new Uint8Array(64);
  out.set(sLE, 0); out.set(rLE, BYTE_LEN);
  return out;
}

function attrsContentOctets(signedAttrs: asn1js.BaseBlock<any>): Uint8Array {
  const tlv = new Uint8Array(signedAttrs.toBER(false)); // TLV of [0] IMPLICIT SET
  return derContentOctets(tlv); // only content octets (SET OF DER)
}

function normalizeQVariants(userQHex: string): { Qx_be: string, Qy_be: string }[] {
  // userQHex должен быть 128 hex (X||Y). Мы строим 4 варианта: BE(X||Y), LE(X||Y), BE(Y||X), LE(Y||X).
  const q = hexToBytes(userQHex);
  if (q.length !== 64) throw new Error(`Public key must be 64 bytes (got ${q.length})`);
  const X = q.slice(0, 32), Y = q.slice(32);

  const be = (u: Uint8Array) => bytesToHex(u);
  const le = (u: Uint8Array) => bytesToHex(u.slice().reverse());

  return [
    { Qx_be: be(X),     Qy_be: be(Y)     }, // BE X||Y
    { Qx_be: le(X),     Qy_be: le(Y)     }, // LE X||Y  -> convert to BE
    { Qx_be: be(Y),     Qy_be: be(X)     }, // BE Y||X (иногда путают порядок)
    { Qx_be: le(Y),     Qy_be: le(X)     }, // LE Y||X  -> convert to BE
  ];
}

function algSeqDigest(oid: string): asn1js.Sequence {
  return new asn1js.Sequence({ value: [ new asn1js.ObjectIdentifier({ value: oid }) ] });
}
function algSeqGostSignature(signOid: string, digestOid?: string): asn1js.Sequence {
  const arr: any[] = [ new asn1js.ObjectIdentifier({ value: signOid }) ];
  if (digestOid) arr.push(new asn1js.ObjectIdentifier({ value: digestOid }));
  return new asn1js.Sequence({ value: arr });
}

function buildSignedAttrs(messageDigest: Uint8Array): asn1js.BaseBlock<any> {
  const attrCT = new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: "1.2.840.113549.1.9.3" }),
      new asn1js.Set({ value: [ new asn1js.ObjectIdentifier({ value: OID_DATA }) ] }),
    ],
  });
  const attrMD = new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: "1.2.840.113549.1.9.4" }),
      new asn1js.Set({ value: [ new asn1js.OctetString({ valueHex: toArrayBuffer(messageDigest) }) ] }),
    ],
  });
  const attrST = new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: "1.2.840.113549.1.9.5" }),
      new asn1js.Set({ value: [ new asn1js.UTCTime({ valueDate: new Date() }) ] }),
    ],
  });
  const set = new asn1js.Set({ value: sortByDer([attrCT, attrMD, attrST]) });
  (set.idBlock as any).tagClass = 3; // [0] IMPLICIT
  (set.idBlock as any).tagNumber = 0;
  return set;
}

function buildAttachedCMS_DER(opts: {
  fileBytes: Uint8Array,
  signerCertDER: Uint8Array,
  signerIssuer: asn1js.Sequence,
  signerSerial: asn1js.Integer,
  signedAttrs: asn1js.BaseBlock<any>,
  signatureBytes: Uint8Array,                  // 64 (LE)
  includeSigAlgParamDigestOID?: boolean,       // default true
}): Uint8Array {
  const {
    fileBytes, signerCertDER, signerIssuer, signerSerial, signedAttrs, signatureBytes,
    includeSigAlgParamDigestOID = true,
  } = opts;

  const digestAlgs = new asn1js.Set({ value: [ algSeqDigest(OID_GOST_DIGEST_2012_256) ] });

  const encapContentInfo = new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: OID_DATA }),
      new asn1js.Constructed({
        idBlock: { tagClass: 3, tagNumber: 0 },
        value: [ new asn1js.OctetString({ valueHex: toArrayBuffer(fileBytes) }) ]
      })
    ],
  });

  const certSchema = (asn1js.fromBER(toArrayBuffer(signerCertDER)).result) as asn1js.Sequence;
  const certificates = new asn1js.Constructed({
    idBlock: { tagClass: 3, tagNumber: 0 },
    value: [ certSchema ],
  });

  const sid = new asn1js.Sequence({ value: [ signerIssuer, signerSerial ] });
  const digestAlg = algSeqDigest(OID_GOST_DIGEST_2012_256);
  const sigAlg = includeSigAlgParamDigestOID
    ? algSeqGostSignature(OID_GOST_SIGN_2012_256, OID_GOST_DIGEST_2012_256)
    : algSeqGostSignature(OID_GOST_SIGN_2012_256);

  const signature = new asn1js.OctetString({ valueHex: toArrayBuffer(signatureBytes) });

  const signerInfo = new asn1js.Sequence({
    value: [
      new asn1js.Integer({ value: 1 }),
      sid,
      digestAlg,
      signedAttrs,
      sigAlg,
      signature,
    ],
  });

  const signerInfos = new asn1js.Set({ value: [ signerInfo ] });

  const signedData = new asn1js.Sequence({
    value: [
      new asn1js.Integer({ value: 1 }),
      digestAlgs,
      encapContentInfo,
      certificates,
      signerInfos,
    ],
  });

  const contentInfo = new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: OID_SIGNED_DATA }),
      new asn1js.Constructed({
        idBlock: { tagClass: 3, tagNumber: 0 },
        value: [ signedData ],
      }),
    ],
  });

  return new Uint8Array(contentInfo.toBER(false));
}

function extractCurveOidFromCert(certDER: Uint8Array): string | null {
  const certASN1 = asn1js.fromBER(toArrayBuffer(certDER));
  if (certASN1.offset === -1) return null;
  const certSeq = certASN1.result as asn1js.Sequence;
  const tbs = certSeq.valueBlock.value[0] as asn1js.Sequence;

  // SubjectPublicKeyInfo = SEQUENCE { algorithm = SEQUENCE{ oid, params }, subjectPublicKey BIT STRING }
  for (const v of tbs.valueBlock.value) {
    if (v instanceof asn1js.Sequence) {
      const vals = v.valueBlock.value;
      if (vals.length >= 2 && vals[0] instanceof asn1js.Sequence && vals[1] instanceof asn1js.BitString) {
        const alg = vals[0] as asn1js.Sequence;
        if (alg.valueBlock.value.length >= 2) {
          const params = alg.valueBlock.value[1];
          if (params instanceof asn1js.ObjectIdentifier) {
            return (params as asn1js.ObjectIdentifier).valueBlock.toString(); // OID кривой
          }
        }
      }
    }
  }
  return null;
}

// ---------- ПУБЛИЧНЫЕ API ----------

/**
 * Подписать файл корректным CMS (attached, DER) ГОСТ-2012-256.
 * @param gost   экземпляр DSGOST
 * @param fileBytes  содержимое файла
 * @param signerCertPEM  PEM сертификат (с тем же ключом!)
 * @param privD_Hex     приватный ключ d (BE hex, 32 байта)
 * @param publicQHex    публичный ключ (128 hex = X||Y), как ты прислал
 * @param opts          опции
 */
export function signFileToCMS_DER(
  gost: DSGOST,
  fileBytes: Uint8Array,
  signerCertPEM: string,
  privD_Hex: string,
  publicQHex: string,
  opts?: { includeSigAlgParamDigestOID?: boolean }
): Uint8Array {
  // 0) нормализуем Q из параметров (пробуем 4 варианта BE)
  const qVariants = normalizeQVariants(publicQHex);

  // 1) messageDigest = H(file) для signedAttrs
  const mdFile = streebog256(fileBytes);

  // 2) signedAttrs: DER-сортировка, [0] IMPLICIT
  const signedAttrs = buildSignedAttrs(mdFile);

  // 3) e = H(content octets of signedAttrs)
  const attrsContent = attrsContentOctets(signedAttrs);
  const e = streebog256(attrsContent);

  // 4) ГОСТ-подпись над e (BE hex на вход)
  const { r, s } = gost.signHex("0x" + bytesToHex(e), privD_Hex);

  // 5) Достаём issuer/serial и Q из сертификата
  const certDER = pemToDer(signerCertPEM);
  const { issuer, serial } = parseIssuerAndSerial(certDER);
  const qLE_from_cert = extractQ_LE_fromCert(certDER); // чаще всего LE(X||Y)
  if (!qLE_from_cert) throw new Error("Cannot extract public key (Q) from cert");

  // 6) Сверим, совпадает ли Q из параметров с Q из сертификата (в любой из 4 нормализаций)
  const qCertCandidates = [
    { Qx_be: bytesToHex(qLE_from_cert.slice(0, 32).slice().reverse()),
      Qy_be: bytesToHex(qLE_from_cert.slice(32).slice().reverse()) }, // cert LE -> BE
    { Qx_be: bytesToHex(qLE_from_cert.slice(32).slice().reverse()),
      Qy_be: bytesToHex(qLE_from_cert.slice(0, 32).slice().reverse()) }, // cert LE (Y||X) -> BE
  ];

  const matchesCert = (cand: {Qx_be:string,Qy_be:string}) =>
    qVariants.some(v => v.Qx_be.toLowerCase() === cand.Qx_be.toLowerCase()
                     && v.Qy_be.toLowerCase() === cand.Qy_be.toLowerCase());

  const certMatch = qCertCandidates.some(matchesCert);
  if (!certMatch) {
    throw new Error("Сертификат НЕ соответствует переданному публичному ключу: замените cert на тот, который выпущен для данного ключа (Q).");
  }

  // 7) Выбираем укладку подписи (RS или SR) по локальной verifyHex, если доступно
  const anyG: any = gost as any;
  const sigRS = packRS_LE(r, s);
  let finalSig = sigRS;

  if (typeof anyG.verifyHex === "function") {
    // пробуем все Q-варианты и обе раскладки — выбираем первый, что верифицируется
    let ok = false;
    for (const v of qVariants) {
      if (anyG.verifyHex(bytesToHex(e), v.Qx_be, v.Qy_be, r, s)) { // проверка на уровне BE чисел
        finalSig = sigRS; ok = true; break;
      }
      const sigSR = packSR_LE(r, s);
      // для SR: меняем порядок r/s при проверке
      if (anyG.verifyHex(bytesToHex(e), v.Qx_be, v.Qy_be, s, r)) {
        finalSig = sigSR; ok = true; break;
      }
    }
    if (!ok) {
      throw new Error("Local verify failed for all Q/order variants — проверь d, Q, реализацию hash/sign и соответствие сертификата ключу.");
    }
  }
  // если verifyHex нет — оставляем RS (LE), как делает gost-engine/CryptoPro

  // 8) Сборка CMS (attached, DER)
  return buildAttachedCMS_DER({
    fileBytes,
    signerCertDER: certDER,
    signerIssuer: issuer,
    signerSerial: serial,
    signedAttrs,
    signatureBytes: finalSig,
    includeSigAlgParamDigestOID: opts?.includeSigAlgParamDigestOID ?? true,
  });
}

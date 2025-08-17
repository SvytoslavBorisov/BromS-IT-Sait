// lib/cms-gost2012.ts
// CAdES-BES (CMS/PKCS#7) для ГОСТ Р 34.10-2012 (256) + Стрибог-256.
// Совместимо с CryptoPro: подпись по H(der(signedAttrsSet)), signature = OCTET STRING(R||S в LE).
// Автоматически подбирает signerIdentifier: SKI (если есть в сертификате) или issuerAndSerialNumber (если SKI нет).

/* ====== Типы ====== */
export type Gost256CurveParams = { p: bigint; a: bigint; b: bigint; q: bigint; gx: bigint; gy: bigint; };
export type Signer256 = (e: bigint, dPriv: bigint, params: Gost256CurveParams) =>
  Promise<{ r: bigint; s: bigint }> | { r: bigint; s: bigint };
export type Hash256 = (data: Uint8Array) => Promise<Uint8Array> | Uint8Array;

export type BuildCadesOptions = {
  content?: Uint8Array;        // байты для расчёта messageDigest
  detached?: boolean;          // <- ДОБАВИТЬ
  certDer: Uint8Array;
  privKeyHex: string;
  curve: Gost256CurveParams;
  streebog256: Hash256;
  gost3410_2012_256_sign: Signer256;
  signingTime?: Date;
};
/* ====== OIDs ====== */
const OID = {
  // CMS
  id_data:                 "1.2.840.113549.1.7.1",
  id_signedData:           "1.2.840.113549.1.7.2",
  // PKCS#9
  contentType:             "1.2.840.113549.1.9.3",
  messageDigest:           "1.2.840.113549.1.9.4",
  signingTime:             "1.2.840.113549.1.9.5",
  signingCertificateV2:    "1.2.840.113549.1.9.16.2.47",
  // GOST
  DIGEST_256:              "1.2.643.7.1.1.2.2",   // Стрибог-256
  SIGN_2012_256:           "1.2.643.7.1.1.3.2",   // ГОСТ 34.10-2012 (256)
};

/* ====== DER/ASN.1 утилиты ====== */
const concat = (...arr: Uint8Array[]) => {
  const len = arr.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arr) { out.set(a, off); off += a.length; }
  return out;
};

const derLen = (n: number) => {
  if (n < 0x80) return Uint8Array.of(n);
  const bytes: number[] = [];
  let x = n;
  while (x) { bytes.push(x & 0xff); x >>>= 8; }
  bytes.reverse();
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
};

const tlv = (tag: number, val: Uint8Array) => {
  const L = derLen(val.length);
  const out = new Uint8Array(1 + L.length + val.length);
  out[0] = tag; out.set(L, 1); out.set(val, 1 + L.length);
  return out;
};

const SEQ  = (...x: Uint8Array[]) => tlv(0x30, concat(...x));
const SET  = (...x: Uint8Array[]) => tlv(0x31, concat(...x));
const OID_DER = (s: string) => tlv(0x06, encodeOID(s));
const NULL = () => tlv(0x05, new Uint8Array());
const OCTET = (b: Uint8Array) => tlv(0x04, b);
const BITSTR = (payload: Uint8Array, unused = 0) => tlv(0x03, new Uint8Array([unused, ...payload]));
const IA5 = (s: string) => tlv(0x16, new TextEncoder().encode(s));
const UTCTime = (d: Date) => {
  const yy = String(d.getUTCFullYear() % 100).padStart(2, "0");
  const MM = String(d.getUTCMonth() + 1).padStart(2, "0");
  const DD = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return tlv(0x17, new TextEncoder().encode(`${yy}${MM}${DD}${hh}${mm}${ss}Z`));
};

// OID encoder
function encodeOID(oid: string): Uint8Array {
  const p = oid.split(".").map(n => parseInt(n, 10));
  const out = [40 * p[0] + p[1]];
  for (const v0 of p.slice(2)) {
    let v = v0 >>> 0;
    const stack = [v & 0x7f];
    v >>>= 7;
    while (v) { stack.push(0x80 | (v & 0x7f)); v >>>= 7; }
    stack.reverse().forEach(b => out.push(b));
  }
  return new Uint8Array(out);
}

/* ====== целые/байты ====== */
const hexToBytesBE = (hex: string, size?: number) => {
  let h = hex.trim().replace(/^0x/i, "").replace(/[\s:_-]/g, "");
  if (!/^[0-9a-fA-F]*$/.test(h)) throw new Error("bad hex");
  if (h.length % 2) h = "0" + h;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0, j = 0; i < h.length; i += 2, j++) out[j] = (parseInt(h[i], 16) << 4) | parseInt(h[i + 1], 16);
  if (size !== undefined) {
    if (out.length > size) throw new Error("hex too long");
    if (out.length < size) {
      const pad = new Uint8Array(size); pad.set(out, size - out.length); return pad;
    }
  }
  return out;
};

const bytesToBigInt = (b: Uint8Array) => { let x = 0n; for (const v of b) x = (x << 8n) + BigInt(v); return x; };
const bigIntToBE = (x: bigint, size?: number) => {
  let hex = x.toString(16); if (hex.length % 2) hex = "0" + hex;
  let b = hexToBytesBE(hex);
  if (!size && b.length > 0 && (b[0] & 0x80)) { const p = new Uint8Array(b.length + 1); p[0] = 0; p.set(b, 1); b = p; }
  if (size !== undefined) {
    if (b.length > size) { if (b.length === size + 1 && b[0] === 0) b = b.slice(1); else throw new Error("int too long"); }
    if (b.length < size) { const o = new Uint8Array(size); o.set(b, size - b.length); b = o; }
  }
  return b;
};
const beToLe = (b: Uint8Array) => b.slice().reverse();
const bigIntToLEfix32 = (x: bigint) => beToLe(bigIntToBE(x, 32));

/* ====== Мини-TLV парсер для выборки полей из сертификата ====== */
type TLV = { tag: number; len: number; head: number; valOff: number; end: number };
function parseTLV(buf: Uint8Array, off: number): TLV {
  if (off >= buf.length) throw new Error("EOF");
  const tag = buf[off];
  let i = off + 1;
  const b0 = buf[i++];

  let len = 0;
  if (b0 < 0x80) {
    len = b0;
  } else {
    const n = b0 & 0x7f;
    if (i + n > buf.length) throw new Error("len OOR");
    len = Number(bytesToBigInt(buf.slice(i, i + n)));
    i += n;
  }
  const head = i - off;
  const valOff = i;
  const end = valOff + len;
  if (end > buf.length) throw new Error("len OOR");
  return { tag, len, head, valOff, end };
}

/** Извлечь issuer Name (полный TLV) и serialNumber (INTEGER → bigint). */
function extractIssuerAndSerial(certDer: Uint8Array): { issuerNameTLV: Uint8Array; serial: bigint } {
  const cert = parseTLV(certDer, 0);                     // Certificate ::= SEQUENCE
  const certVal = certDer.slice(cert.valOff, cert.end);

  const tbs = parseTLV(certVal, 0);                      // tbsCertificate ::= SEQUENCE
  const tbsVal = certVal.slice(tbs.valOff, tbs.end);

  let p = 0;

  // [0] Version (optional)
  const first = parseTLV(tbsVal, p);
  if (first.tag === 0xA0) p += first.head + first.len;

  const serialTLV = parseTLV(tbsVal, p); p += serialTLV.head + serialTLV.len;  // serialNumber INTEGER
  const serialBytes = tbsVal.slice(serialTLV.valOff, serialTLV.end);
  let si = 0; while (si < serialBytes.length && serialBytes[si] === 0x00) si++;
  const serial = bytesToBigInt(serialBytes.slice(si));

  const sigAlg = parseTLV(tbsVal, p); p += sigAlg.head + sigAlg.len;           // signature (skip)
  const issuer = parseTLV(tbsVal, p);                                           // issuer Name (SEQUENCE)
  const issuerNameTLV = tbsVal.slice(p, p + issuer.head + issuer.len);
  // no advance needed

  return { issuerNameTLV, serial };
}

/** Попробовать вычитать SubjectKeyIdentifier из сертификата. Вернёт undefined, если расширения нет. */
function tryExtractSKI(certDer: Uint8Array): Uint8Array | undefined {
  const cert = parseTLV(certDer, 0);               // Certificate
  const certVal = certDer.slice(cert.valOff, cert.end);
  const tbs = parseTLV(certVal, 0);                // TBSCertificate
  const tbsVal = certVal.slice(tbs.valOff, tbs.end);

  // пройти до Extensions [3] EXPLICIT (контейнер A3)
  let p = 0;
  const first = parseTLV(tbsVal, p);               // [0] Version ?
  if (first.tag === 0xA0) p += first.head + first.len;
  const serial = parseTLV(tbsVal, p); p += serial.head + serial.len;
  const sigAlg = parseTLV(tbsVal, p); p += sigAlg.head + sigAlg.len;
  const issuer = parseTLV(tbsVal, p); p += issuer.head + issuer.len;
  const validity = parseTLV(tbsVal, p); p += validity.head + validity.len;
  const subject = parseTLV(tbsVal, p); p += subject.head + subject.len;
  const spki = parseTLV(tbsVal, p); p += spki.head + spki.len;

  // опциональные уникальные ID и т.д. пропустим, ищем [3] (0xA3)
  while (p < tbsVal.length) {
    const t = parseTLV(tbsVal, p);
    if (t.tag === 0xA3) {
      const extSeq = tbsVal.slice(t.valOff, t.end); // Extensions ::= SEQUENCE OF Extension
      // итерируем по Extension
      let q = 0;
      while (q < extSeq.length) {
        const ext = parseTLV(extSeq, q); q += ext.head + ext.len; // Extension ::= SEQUENCE
        const body = extSeq.slice(ext.valOff, ext.end);
        // extnID
        const ext_oid = parseTLV(body, 0);
        if (ext_oid.tag !== 0x06) continue;
        const oid = decodeOID(body.slice(ext_oid.valOff, ext_oid.end));
        // critical? (optional)
        let r = ext_oid.head + ext_oid.len;
        const maybe = parseTLV(body, r);
        let extnValueTLV: TLV;
        if (maybe.tag === 0x01) { // BOOLEAN critical
          r += maybe.head + maybe.len;
          extnValueTLV = parseTLV(body, r);
        } else {
          extnValueTLV = maybe;
        }
        if (oid === "2.5.29.14") { // SKI
          // extnValue ::= OCTET STRING( OCTET STRING(ski) )
          const outer = body.slice(extnValueTLV.valOff, extnValueTLV.end);
          const inner = parseTLV(outer, 0);
          if (inner.tag === 0x04) {
            return outer.slice(inner.valOff, inner.end);
          }
        }
      }
    }
    p += t.head + t.len;
  }
  return undefined;
}

function decodeOID(b: Uint8Array): string {
  if (!b.length) return "";
  const first = b[0];
  const a = Math.floor(first / 40);
  const y = first % 40;
  const parts: number[] = [a, y];
  let v = 0;
  for (let i = 1; i < b.length; i++) {
    const c = b[i];
    v = (v << 7) | (c & 0x7f);
    if ((c & 0x80) === 0) { parts.push(v); v = 0; }
  }
  return parts.join(".");
}

/* ====== Attribute helpers ====== */
const attr = (oid: string, valueDer: Uint8Array) =>
  SEQ(OID_DER(oid), SET(valueDer)); // Attribute ::= SEQUENCE { type OID, values SET OF ANY }

const attr_contentType = () => attr(OID.contentType, OID_DER(OID.id_data));
const attr_messageDigest = (md: Uint8Array) => attr(OID.messageDigest, OCTET(md));
const attr_signingTime = (d: Date) => attr(OID.signingTime, UTCTime(d));

async function attr_signingCertificateV2(certDer: Uint8Array, streebog256: Hash256) {
  const h = await Promise.resolve(streebog256(certDer)); // 32 bytes
  // ESSCertIDv2 ::= SEQUENCE { hashAlgorithm [0] ... OPTIONAL, hash OCTET STRING, issuerSerial OPTIONAL }
  const ess = SEQ(
    SEQ(OID_DER(OID.DIGEST_256)),  // DigestAlgorithmIdentifier (только OID)
    OCTET(h)
  );
  // SigningCertificateV2 ::= SEQUENCE OF ESSCertIDv2
  const seqOf = tlv(0x30, ess);
  return attr(OID.signingCertificateV2, SEQ(seqOf));
}

/* ====== сортировка элементов в SET по DER-байтам ====== */
const sortSetEls = (elements: Uint8Array[]) => elements.slice().sort((a, b) => {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
});

/* ====== Построение SignedData (attached/detached) ====== */
export async function buildCadesBesSignedData(opts: BuildCadesOptions): Promise<Uint8Array> {
  const { content, detached = true, certDer, privKeyHex, curve, streebog256, gost3410_2012_256_sign, signingTime = new Date() } = opts;

  // --- digestAlgorithms: SET OF AlgorithmIdentifier (ГОСТ-256, без параметров)
  const digestAlgs = SET(SEQ(OID_DER(OID.DIGEST_256)));

  // --- encapContentInfo
  const eci_type = OID_DER(OID.id_data);
  let eci: Uint8Array;
  if (detached) {
    // detached: eContent отсутствует, НО content мы всё равно используем для messageDigest
    eci = SEQ(eci_type);
  } else {
    // attached
    if (!content) throw new Error("attached: content is required");
    eci = SEQ(eci_type, tlv(0xA0, OCTET(content)));
  }

  // 2) message-digest ОБЯЗАТЕЛЬНО от реального содержимого
  if (!content) throw new Error("For CAdES-BES you must provide 'content' to compute messageDigest (even if detached).");
  // --- сертификаты: [0] IMPLICIT SET OF CertificateChoices
  // У нас один обычный X.509 Certificate → кладём его как есть.
  const certs_content = certDer; // один элемент (DER)
  const certificates = tlv(0xA0, certs_content); // IMPLICIT: содержимое = конкат DER-элементов без SET-тэга (валидно для одного)

  // --- подписанные атрибуты
  console.log('streebog256(content)', streebog256(content))
  console.log(content)
  const md = await Promise.resolve(streebog256(content ?? new Uint8Array())); // message-digest = H(content)
  
  console.log(md)
  
  const at_contentType = attr_contentType();
  const at_messageDigest = attr_messageDigest(md);
  const at_signingTime = attr_signingTime(signingTime);
  const at_signingCertV2 = await attr_signingCertificateV2(certDer, streebog256);

  // Сформируем SET подписанных атрибутов (с сортировкой)
  const signedAttrsSet = SET(...sortSetEls([at_contentType, at_messageDigest, at_signingTime, at_signingCertV2]));

  // Для вставки в SignerInfo нужно [0] IMPLICIT SET OF Attribute → т.е. заменить тег 0x31 на 0xA0 и оставить только контент.
  // Но для хэширования CMS нужно хэшировать **полный DER SET** (с тегом 0x31)!
  // Поэтому сохраним обе формы:
  const signedAttrs_fullDER = signedAttrsSet; // TLV 0x31...
  // Вырезаем контент SET:
  const sa_lenByte = signedAttrs_fullDER[1];
  let sa_len = 0, sa_len_ofs = 2, hdr_len = 0;
  if (sa_lenByte < 0x80) { sa_len = sa_lenByte; hdr_len = 2; }
  else {
    const n = sa_lenByte & 0x7f;
    sa_len = Number(bytesToBigInt(signedAttrs_fullDER.slice(2, 2 + n)));
    sa_len_ofs = 2 + n; hdr_len = sa_len_ofs;
  }
  const signedAttrs_contentOnly = signedAttrs_fullDER.slice(hdr_len, hdr_len + sa_len);
  const signedAttrs_tagged = tlv(0xA0, signedAttrs_contentOnly); // [0] IMPLICIT

  // --- SignerIdentifier: SKI если есть, иначе issuer+serial
  let sid: Uint8Array;
  const ski = tryExtractSKI(certDer);
  if (ski && ski.length) {
    // subjectKeyIdentifier ::= [0] IMPLICIT OCTET STRING
    sid = tlv(0x80, ski);
  } else {
    // issuerAndSerialNumber ::= SEQUENCE { issuer Name, serialNumber INTEGER }
    const { issuerNameTLV, serial } = extractIssuerAndSerial(certDer);
    const serialInt = integerFromUnsigned(serial);
    sid = SEQ(issuerNameTLV, serialInt);
  }

  // --- digestAlgorithm & signatureAlgorithm
  const digestAlgorithm = SEQ(OID_DER(OID.DIGEST_256));     // без параметров
  const signatureAlgorithm = SEQ(OID_DER(OID.SIGN_2012_256)); // без параметров

  // --- Подпись: e = H(der(SET signedAttrs))
  const H = await Promise.resolve(streebog256(signedAttrs_fullDER));
  if (H.length !== 32) throw new Error("streebog256 must return 32 bytes");
  const e = bytesToBigInt(H.slice().reverse()) || 1n; // LE-интерпретация (ГОСТ)

  const d = BigInt("0x" + privKeyHex.replace(/^0x/i, ""));
  const { r, s } = await Promise.resolve(gost3410_2012_256_sign(e, d, curve));
  // CryptoPro: signature = OCTET STRING( R||S в LE )
  const sig = OCTET(concat(bigIntToLEfix32(r), bigIntToLEfix32(s)));

  // --- SignerInfo
  const signerInfo = SEQ(
    INTEGER(1n),               // version = v1
    sid,                       // sid
    digestAlgorithm,
    signedAttrs_tagged,        // [0] IMPLICIT SET OF Attribute
    signatureAlgorithm,
    sig                        // OCTET STRING
    // unsignedAttrs отсутствуют
  );

  // --- SignedData
  const signerInfos = SET(signerInfo);
  const signedData = SEQ(
    INTEGER(1n),            // version
    digestAlgs,             // digestAlgorithms
    eci,                    // encapContentInfo
    certificates,           // [0] IMPLICIT CertificateSet
    // crls отсутствуют
    signerInfos             // signerInfos
  );

  // ContentInfo
  const contentInfo = SEQ(
    OID_DER(OID.id_signedData),
    tlv(0xA0, signedData)   // EXPLICIT [0]
  );

  return contentInfo;
}

/* ====== INTEGER helpers ====== */
function INTEGER(x: bigint): Uint8Array {
  // положительное целое (подписи/версии/серийники) — как беззнаковое с ведущим 0 при необходимости
  let b = bigIntToBE(x);
  if (b.length === 0) b = new Uint8Array([0]);
  // Если старший бит установлен — добавляем 0x00
  if (b[0] & 0x80) b = Uint8Array.of(0x00, ...b);
  return tlv(0x02, b);
}
function integerFromUnsigned(x: bigint): Uint8Array {
  // кодируем беззнаковое значение x минимально; при необходимости добавляем 0x00
  let b = bigIntToBE(x);
  if (b.length === 0) b = new Uint8Array([0]);
  if (b[0] & 0x80) b = Uint8Array.of(0x00, ...b);
  return tlv(0x02, b);
}

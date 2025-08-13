// lib/gost-x509.ts
// Minimal X.509 builder for GOST R 34.10-2012 (256) + Streebog-256
// - No ASN.1 deps; manual DER
// - Hash/sign are injected via callbacks so you can plug your libs
// Next.js/Node/browser-compatible

/* ===================== Types & Interfaces ===================== */

import {
  CryptoProA_2012_256,
  gostSigner256,
  derivePublicQ,
  type Curve as EcCurve
} from "@/lib/crypto/espoint";

import { streebog256 as streebog256Sync } from "@/lib/crypto/streebog";

const streebog256 = async (data: Uint8Array) =>
  Promise.resolve(streebog256Sync(data));


export type Bigish = bigint | number | string; // hex string or decimal

export type Gost256CurveParams = {
  p: bigint; a: bigint; b: bigint;
  q: bigint; gx: bigint; gy: bigint;
};

export type Signer256 = (e: bigint, dPriv: bigint, params: Gost256CurveParams) => Promise<{ r: bigint; s: bigint }>|{ r: bigint; s: bigint };

export type Hash256 = (data: Uint8Array) => Promise<Uint8Array>|Uint8Array; // Streebog-256 -> 32 bytes

export type IssueOptions = {
  // issuer inputs
  issuerCertDerOrPem: Uint8Array | string;    // DER bytes or PEM string
  issuerPrivateKeyHex: string;               // hex (big-endian) of d_issuer

  // subject inputs (either pass subjectPrivHex, or let lib generate)
  subjectPrivateKeyHex?: string;             // hex (big-endian), optional
  subjectPublicQxHex?: string;               // optional, if you already have Qx/Qy
  subjectPublicQyHex?: string;               // optional

  // Subject DN & validity
  subjectEmail: string;
  subjectCN: string;
  notBefore: Date;                           // absolute times (UTC)
  notAfter: Date;
  serialNumber?: Bigish;                     // certificate serial (default random)

  // Crypto & helpers
  curve: Gost256CurveParams;                 // e.g., CryptoPro-A
  streebog256: Hash256;                      // injected ГОСТ Р 34.11-2012 (256)
  gost3410_2012_256_sign: Signer256;        // injected signer (returns r,s)

  // RNG for subject private key if not provided
  rng?: (nBytes: number) => Uint8Array;
};

export type IssueResult = {
  der: Uint8Array;
  pem: string;
  tbs: Uint8Array;
  subjectPrivHex?: string;
  subjectPubQxHex: string;
  subjectPubQyHex: string;
};

/* ===================== OIDs we need ===================== */

const OID = {
  SIGNWITHDIGEST_256: "1.2.643.7.1.1.3.2",   // GOST3410-2012 with GOST3411-2012-256
  PUBKEY_2012_256:    "1.2.643.7.1.1.1.1",
  CPRO_XCHA:          "1.2.643.2.2.36.0",
  DIGEST_256:         "1.2.643.7.1.1.2.2",
  EMAIL:              "1.2.840.113549.1.9.1",
  CN:                 "2.5.4.3",
  SKI:                "2.5.29.14",
  KU:                 "2.5.29.15",
  BC:                 "2.5.29.19",
  AKI:                "2.5.29.35",
};

/* ===================== Utils: hex, bigint, bytes ===================== */

function hexToBytesBE(hex: string): Uint8Array {
  const h = hex.replace(/^0x/,"").replace(/\s+/g,"");
  if (h.length % 2) return hexToBytesBE("0"+h);
  const out = new Uint8Array(h.length/2);
  for (let i=0;i<out.length;i++) out[i] = parseInt(h.slice(2*i,2*i+2),16);
  return out;
}

function bytesToHexBE(b: Uint8Array): string {
  return [...b].map(x=>x.toString(16).padStart(2,"0")).join("");
}

function beToLe(b: Uint8Array): Uint8Array {
  const out = b.slice().reverse();
  return out;
}

function bn(v: Bigish): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(v);
  const s = (v as string).trim();
  return s.startsWith("0x") ? BigInt(s) : BigInt(s);
}

function bigIntToBE(x: bigint, size?: number): Uint8Array {
  let hex = x.toString(16);
  if (hex.length % 2) hex = "0"+hex;
  let b = hexToBytesBE(hex);
  // two's complement positive INTEGER: if high bit set, prefix 00
  if (!size && b.length>0 && (b[0] & 0x80)) {
    const pref = new Uint8Array(b.length+1); pref[0]=0; pref.set(b,1); b=pref;
  }
  if (size !== undefined) {
    if (b.length > size) {
      // allow truncation if exactly one leading 0 byte due to INTEGER sign padding
      if (b.length === size+1 && b[0]===0) b = b.slice(1);
      else throw new Error(`bigIntToBE: value longer than size ${size}`);
    }
    if (b.length < size) {
      const out = new Uint8Array(size);
      out.set(b, size - b.length);
      b = out;
    }
  }
  return b;
}

/* ===================== DER builders ===================== */

function derLen(n: number): Uint8Array {
  if (n < 0x80) return new Uint8Array([n]);
  const s = bigIntToBE(BigInt(n));
  const out = new Uint8Array(1 + s.length);
  out[0] = 0x80 | s.length;
  out.set(s, 1);
  return out;
}
function tlv(tag: number, val: Uint8Array): Uint8Array {
  const len = derLen(val.length);
  const out = new Uint8Array(1 + len.length + val.length);
  out[0] = tag; out.set(len,1); out.set(val, 1+len.length);
  return out;
}
const SEQ = ( ...items: Uint8Array[] ) => tlv(0x30, concat(...items));
const SET = ( ...items: Uint8Array[] ) => tlv(0x31, concat(...items.sort((a,b)=>lexCmp(a,b))));
const INTEGER = (x: bigint) => tlv(0x02, bigIntToBE(x));
const OID_DER = (oid: string) => tlv(0x06, encodeOID(oid));
const UTCTime = (d: Date) => tlv(0x17, utcBytes(d));
const PrintableString = (s: string) => tlv(0x13, utf8(s)); // permissive
const IA5String = (s: string) => tlv(0x16, utf8(s));
const BIT_STRING = (payload: Uint8Array, unusedBits=0) => tlv(0x03, new Uint8Array([unusedBits, ...payload]));
const OCTET_STRING = (b: Uint8Array) => tlv(0x04, b);
const BOOLEAN = (v: boolean) => tlv(0x01, new Uint8Array([v?0xFF:0x00]));

function concat(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((n,a)=>n+a.length,0);
  const out = new Uint8Array(total);
  let off=0; for (const a of arrs){ out.set(a,off); off+=a.length; }
  return out;
}
function lexCmp(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length,b.length);
  for (let i=0;i<n;i++){ if (a[i]!==b[i]) return a[i]-b[i]; }
  return a.length - b.length;
}
function utcBytes(d: Date): Uint8Array {
  // YYMMDDHHMMSSZ
  const yy = String(d.getUTCFullYear()%100).padStart(2,"0");
  const MM = String(d.getUTCMonth()+1).padStart(2,"0");
  const DD = String(d.getUTCDate()).padStart(2,"0");
  const hh = String(d.getUTCHours()).padStart(2,"0");
  const mm = String(d.getUTCMinutes()).padStart(2,"0");
  const ss = String(d.getUTCSeconds()).padStart(2,"0");
  return utf8(`${yy}${MM}${DD}${hh}${mm}${ss}Z`);
}
function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
function encodeOID(oid: string): Uint8Array {
  const parts = oid.split(".").map(x=>parseInt(x,10));
  if (parts.length<2) throw new Error("bad OID");
  const first = 40*parts[0] + parts[1];
  const out: number[] = [first];
  for (const p0 of parts.slice(2)) {
    let p = p0 >>> 0;
    const stack: number[] = [p & 0x7F];
    p >>= 7;
    while (p) { stack.push(0x80 | (p & 0x7F)); p >>= 7; }
    stack.reverse().forEach(v=>out.push(v));
  }
  return new Uint8Array(out);
}

/* ===================== Minimal DER parser (just enough) ===================== */

type TLV = { tag: number; len: number; head: number; valOff: number; end: number };
function parseTLV(buf: Uint8Array, off: number): TLV {
  if (off>=buf.length) throw new Error("EOF");
  const tag = buf[off];
  let i = off+1;
  if (i>=buf.length) throw new Error("EOF length");
  let b = buf[i++], len=0;
  if (b < 0x80) len = b; else {
    const n = b & 0x7F;
    if (i+n>buf.length) throw new Error("bad length");
    len = Number(bytesToBigInt(buf.slice(i,i+n))); i+=n;
  }
  const head = i-off;
  const valOff = i;
  const end = valOff + len;
  if (end>buf.length) throw new Error("len OOR");
  return { tag, len, head, valOff, end };
}
function* iterChildren(seqVal: Uint8Array): Generator<{slice:Uint8Array, tlv: TLV}> {
  let off=0;
  while (off < seqVal.length) {
    const tlv = parseTLV(seqVal, off);
    yield { slice: seqVal.slice(off, tlv.end), tlv };
    off = tlv.end;
  }
}
function bytesToBigInt(b: Uint8Array): bigint {
  let x = 0n;
  for (const v of b) x = (x<<8n) + BigInt(v);
  return x;
}

/* ===================== Public API ===================== */

export const CryptoProA_2001_like_2012_256: Gost256CurveParams = {
  p:  BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD97"),
  a:  BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD94"),
  b:  BigInt(0xA6),
  q:  BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF6C611070995AD10045841B09B761B893"),
  gx: BigInt(0x01),
  gy: BigInt("0x8D91E471E0989CDA27DF505A453F2B7635294F2DDF23E3B122ACC99C9E9F1E14"),
};


export async function issueCertificateUsingGostEc(args: Omit<IssueOptions,
  "curve" | "gost3410_2012_256_sign" | "subjectPublicQxHex" | "subjectPublicQyHex"> & {
    // обязателен только Стрибог; хэш верни 32 байта
    streebog256: Hash256;
    // опционально можно сменить кривую
    curve?: EcCurve;
    // можно явно передать Qx/Qy; если нет — выведем из subjectPrivateKeyHex
    subjectPublicQxHex?: string;
    subjectPublicQyHex?: string;
  }) {

  const curve = (args.curve ?? CryptoProA_2012_256) as unknown as Gost256CurveParams;

  // Если Qx/Qy не передали — выводим из приватного субъекта
  let QxHex = args.subjectPublicQxHex;
  let QyHex = args.subjectPublicQyHex;

  if ((!QxHex || !QyHex)) {
    if (!args.subjectPrivateKeyHex)
      throw new Error("Нужно либо subjectPublicQxHex/subjectPublicQyHex, либо subjectPrivateKeyHex для derivePublicQ");
    const d = args.subjectPrivateKeyHex.replace(/^0x/, "");
    const q = derivePublicQ(d, curve as unknown as EcCurve); // совместим типы
    QxHex = q.QxHex;
    QyHex = q.QyHex;
  }

  return issueGost256Certificate({
    ...args,
    curve,
    streebog256: args.streebog256,
    gost3410_2012_256_sign: (e, d) => gostSigner256(e, d, curve as unknown as EcCurve),
    subjectPublicQxHex: QxHex,
    subjectPublicQyHex: QyHex,
  });
}


export async function issueGost256Certificate(opts: IssueOptions): Promise<IssueResult> {
  const {
    issuerCertDerOrPem, issuerPrivateKeyHex,
    subjectPrivateKeyHex, subjectPublicQxHex, subjectPublicQyHex,
    subjectEmail, subjectCN, notBefore, notAfter, serialNumber,
    curve, streebog256, gost3410_2012_256_sign, rng
  } = opts;

  // 1) Decode issuer cert DER, extract issuer Name (TLV) and serial (INTEGER)
  const issuerDER = typeof issuerCertDerOrPem === "string"
    ? pemToDer(issuerCertDerOrPem)
    : issuerCertDerOrPem;

  const { issuerNameTLV, issuerSerialInt } = extractIssuerNameAndSerial(issuerDER);

  // 2) Subject keys
  const q = curve.q;
  let dSub: bigint;
  if (subjectPrivateKeyHex) {
    dSub = bn("0x"+subjectPrivateKeyHex.replace(/^0x/,""));
  } else {
    const rd = (rng ?? defaultRng)(64); // 512-bit random
    dSub = (bytesToBigInt(rd) % (q-1n)) + 1n;
  }

  let QxHex = subjectPublicQxHex?.replace(/^0x/,"");
  let QyHex = subjectPublicQyHex?.replace(/^0x/,"");

  // If public not provided — require caller to compute it or provide a hook.
  // (Keeping lib independent from EC math; many projects already have ECPoint)
  if (!QxHex || !QyHex) {
    throw new Error("subjectPublicQxHex/subjectPublicQyHex not provided. Compute Q=d*G externally and pass here.");
  }

  // 3) Build SPKI for GOST2012-256 + (CryptoPro-A, Streebog-256)
  const QxBE = hexToBytesBE(QxHex);
  const QyBE = hexToBytesBE(QyHex);
  if (QxBE.length!==32 || QyBE.length!==32) throw new Error("Qx/Qy must be 32-byte hex for 256-bit curve");

  // public key payload (note: GOST encoding uses LE concatenation inside OCTET STRING)
  const pubkeyOctet = OCTET_STRING(concat(beToLe(QxBE), beToLe(QyBE)));

  const spkiAlgo = SEQ(
    OID_DER(OID.PUBKEY_2012_256),
    SEQ(OID_DER(OID.CPRO_XCHA), OID_DER(OID.DIGEST_256))
  );
  const spki = SEQ(spkiAlgo, BIT_STRING(pubkeyOctet, 0));

  // 4) Subject Name & Validity
  const subjectName = SEQ(
    SET(SEQ(OID_DER(OID.EMAIL), IA5String(subjectEmail))),
    SET(SEQ(OID_DER(OID.CN),    PrintableString(subjectCN))),
  );
  const validity = SEQ(UTCTime(notBefore), UTCTime(notAfter));

  // 5) Extensions: SKI, KU(digitalSignature), BC(cA=false), AKI(from issuer)
  // SKI = SHA1(pubkeyOctet) like in your code (you can swap to GOST hash if you want)
  const ski = sha1(pubkeyOctet); // small local SHA-1 impl (below)
  const ext_ski = SEQ(OID_DER(OID.SKI), OCTET_STRING(OCTET_STRING(ski)));

  const kuBits = new Uint8Array([0x80]); // digitalSignature
  const ext_ku = SEQ(OID_DER(OID.KU), BOOLEAN(true), OCTET_STRING(BIT_STRING(kuBits, 1)));

  const bc_inner = SEQ(BOOLEAN(false));
  const ext_bc = SEQ(OID_DER(OID.BC), BOOLEAN(true), OCTET_STRING(bc_inner));

  const aki_value = SEQ(
    // keyIdentifier omitted; use issuer name+serial (AuthorityCertIssuer/SerialNumber)
    tlv(0xA1, tlv(0xA4, issuerNameTLV)), // [1] GeneralNames -> [4] directoryName(Name)
    tlv(0x82, intToUnsigned(issuerSerialInt)) // [2] certificateSerialNumber (INTEGER bytes, no tag)
  );
  const ext_aki = SEQ(OID_DER(OID.AKI), OCTET_STRING(aki_value));

  const extensions = tlv(0xA3, SEQ(ext_ski, ext_ku, ext_bc, ext_aki));

  // 6) TBSCertificate
  const version = tlv(0xA0, INTEGER(2n)); // v3
  const serial = INTEGER(serialNumber != null ? bn(serialNumber) : randomSerial());
  const sigAlg = SEQ(OID_DER(OID.SIGNWITHDIGEST_256));
  const tbs = SEQ(
    version,
    serial,
    sigAlg,
    issuerNameTLV,
    validity,
    subjectName,
    spki,
    extensions,
  );

  // 7) e = Streebog-256(TBS) as little-endian integer (per your code e=hash[::-1])
  const h = await Promise.resolve(streebog256(tbs));
  if (h.length !== 32) throw new Error("streebog256 must return 32 bytes");
  const e = bytesToBigInt(h.slice().reverse()); // LE integer

  // 8) Sign with issuer private key
  const dIssuer = bn("0x"+issuerPrivateKeyHex.replace(/^0x/,""));
  const { r, s } = await Promise.resolve(gost3410_2012_256_sign(e, dIssuer, curve));

  // Signature value is s||r (big-endian), 32+32
  const sigBytes = concat(bigIntToBE(s,32), bigIntToBE(r,32));

  const cert = SEQ(
    tbs,
    sigAlg,
    BIT_STRING(sigBytes, 0)
  );

  const pem = derToPem(cert, "CERTIFICATE");

  return {
    der: cert,
    pem,
    tbs,
    subjectPrivHex: subjectPrivateKeyHex ? undefined : dSub.toString(16).padStart(64,"0"),
    subjectPubQxHex: QxHex,
    subjectPubQyHex: QyHex,
  };
}

/* ===================== Helpers: issuer parse, PEM/DER, serial ===================== */

function pemToDer(pem: string): Uint8Array {
  const m = pem.replace(/-----BEGIN[^-]+-----/g,"")
               .replace(/-----END[^-]+-----/g,"")
               .replace(/\s+/g,"");
  const bin = typeof atob !== "undefined"
    ? atob(m)
    : Buffer.from(m, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}
function derToPem(der: Uint8Array, label: string): string {
  const b64 = typeof btoa !== "undefined"
    ? btoa(String.fromCharCode(...der))
    : Buffer.from(der).toString("base64");
  const lines = b64.replace(/(.{64})/g,"$1\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}

function extractIssuerNameAndSerial(der: Uint8Array): { issuerNameTLV: Uint8Array; issuerSerialInt: bigint } {
  const top = parseTLV(der,0);
  if (top.tag !== 0x30) throw new Error("cert: not SEQUENCE");
  const certVal = der.slice(top.valOff, top.end);
  const children = [...iterChildren(certVal)];
  const tbsChild = children[0];
  if (!tbsChild || tbsChild.tlv.tag !== 0x30) throw new Error("cert: no TBS");
  const tbsTLV = parseTLV(der, top.valOff);
  const tbsVal = der.slice(tbsTLV.valOff, tbsTLV.end);
  const tbsItems = [...iterChildren(tbsVal)];

  let idx = 0;
  if (tbsItems[0]?.tlv.tag === 0xA0) idx = 1; // version
  const serialTLV = tbsItems[idx++]; // INTEGER
  if (!serialTLV || serialTLV.tlv.tag !== 0x02) throw new Error("cert: serial not found");
  // Skip signature algorithm
  idx++;
  const issuerTLV = tbsItems[idx++];
  if (!issuerTLV || issuerTLV.tlv.tag !== 0x30) throw new Error("cert: issuer Name not found");

  // Parse INTEGER value (unsigned)
  const intVal = der.slice(serialTLV.tlv.valOff, serialTLV.tlv.end);
  const serialInt = integerBytesToBigInt(intVal);

  return { issuerNameTLV: issuerTLV.slice, issuerSerialInt: serialInt };
}

// integer bytes may have leading 00
function integerBytesToBigInt(v: Uint8Array): bigint {
  let i=0; while (i<v.length && v[i]===0) i++;
  return bytesToBigInt(v.slice(i));
}

// Raw INTEGER content for AKI serial
function intToUnsigned(x: bigint): Uint8Array {
  let b = bigIntToBE(x);
  if (b.length>0 && b[0]===0) b = b.slice(1);
  return b;
}

function randomSerial(): bigint {
  // 64-bit random positive
  const r = (defaultRng(8));
  return bytesToBigInt(r);
}

function defaultRng(n: number): Uint8Array {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint8Array(n); crypto.getRandomValues(buf); return buf;
  }
  // Node fallback
  return require("crypto").randomBytes(n);
}

/* ===================== Tiny SHA-1 (for SKI only, matches your python code) ===================== */
// If you prefer Streebog-based SKI, replace this with streebog256(pubkeyOctet) and trim.
// Keeping SHA-1 for parity with your sample.
function sha1(msg: Uint8Array): Uint8Array {
  // minimal, not constant-time; OK for SKI
  const w = new Uint32Array(80);
  const ml = msg.length * 8;
  const withOne = new Uint8Array(((msg.length+9+63)>>6)<<6);
  withOne.set(msg,0); withOne[msg.length]=0x80;
  const dv = new DataView(withOne.buffer);
  dv.setUint32(withOne.length-4, ml>>>0, false);
  dv.setUint32(withOne.length-8, Math.floor(ml/2**32)>>>0, false);
  let h0=0x67452301|0, h1=0xEFCDAB89|0, h2=0x98BADCFE|0, h3=0x10325476|0, h4=0xC3D2E1F0|0;
  for (let i=0;i<withOne.length;i+=64){
    for (let j=0;j<16;j++) w[j]=dv.getUint32(i+4*j,false);
    for (let j=16;j<80;j++){ const v = (w[j-3]^w[j-8]^w[j-14]^w[j-16]); w[j]=(v<<1)|(v>>>31); }
    let a=h0,b=h1,c=h2,d=h3,e=h4;
    for (let j=0;j<80;j++){
      const f = j<20 ? ((b&c)|((~b)&d))
              : j<40 ? (b^c^d)
              : j<60 ? ((b&c)|(b&d)|(c&d))
                     : (b^c^d);
      const k = j<20 ? 0x5A827999 : j<40 ? 0x6ED9EBA1 : j<60 ? 0x8F1BBCDC : 0xCA62C1D6;
      const temp = (((a<<5)|(a>>>27)) + f + e + k + w[j])|0;
      e=d; d=c; c=((b<<30)|(b>>>2))|0; b=a; a=temp;
    }
    h0=(h0+a)|0; h1=(h1+b)|0; h2=(h2+c)|0; h3=(h3+d)|0; h4=(h4+e)|0;
  }
  const out = new Uint8Array(20);
  new DataView(out.buffer).setUint32(0, h0>>>0, false);
  new DataView(out.buffer).setUint32(4, h1>>>0, false);
  new DataView(out.buffer).setUint32(8, h2>>>0, false);
  new DataView(out.buffer).setUint32(12, h3>>>0, false);
  new DataView(out.buffer).setUint32(16, h4>>>0, false);
  return out;
}

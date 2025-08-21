// lib/gost-x509.ts
// ГОСТ Р 34.10-2012 (256) + Стрибог-256 — генерация X.509 (деревянный DER, без внешних зависимостей)

import {
  CryptoProA_2012_256,
  gostSigner256,
  derivePublicQ,
  type Curve as EcCurve
} from "@/lib/crypto/espoint";
import { streebog256 as streebog256Sync } from "@/lib/crypto/streebog";

/* ====== ХЭШ/СИГНАТУРА ТИПЫ ====== */
export type Bigish = bigint | number | string;
export type Gost256CurveParams = { p: bigint; a: bigint; b: bigint; q: bigint; gx: bigint; gy: bigint; };
export type Signer256 = (e: bigint, dPriv: bigint, params: Gost256CurveParams) =>
  Promise<{ r: bigint; s: bigint }>|{ r: bigint; s: bigint };
export type Hash256 = (data: Uint8Array) => Promise<Uint8Array>|Uint8Array;

export type IssueOptions = {
  issuerCertDerOrPem: Uint8Array | string; // сертификат ИЗДАТЕЛЯ (может быть самоподписанный)
  issuerPrivateKeyHex: string;             // приватный ключ ИЗДАТЕЛЯ (hex)
  subjectPrivateKeyHex?: string;           // приватный ключ субъекта (если нет Qx/Qy)
  subjectPublicQxHex?: string;             // публичные координаты субъекта (если нет приватного)
  subjectPublicQyHex?: string;

  subjectEmail: string;
  subjectCN: string;
  notBefore: Date;
  notAfter: Date;
  serialNumber?: Bigish;

  /* Профиль сертификата */
  isCA?: boolean;                 // если true: KU=keyCertSign|cRLSign, BC.cA=TRUE; иначе EE-профиль
  publicKeyParamSetOid?: string;  // OID TC26 paramSet (по умолчанию A)
  crlDpUrls?: string[];           // куда положен CRL издателя (для проверки отзыва)
  ocspUrl?: string;               // OCSP URL (не критичный AIA)
  includeAIAForEE?: boolean;      // по умолчанию true для EE

  /* Низкоуровневые */
  curve: Gost256CurveParams;
  streebog256: Hash256;
  gost3410_2012_256_sign: Signer256;
  rng?: (nBytes: number) => Uint8Array;
};

export type IssueResult = {
  der: Uint8Array; pem: string; tbs: Uint8Array;
  subjectPrivHex?: string; subjectPubQxHex: string; subjectPubQyHex: string;
};

/* =============== OIDs =============== */
const OID = {
  // алгоритмы
  SIGNWITHDIGEST_256: "1.2.643.7.1.1.3.2", // id-tc26-signwithdigest-gost3410-12-256
  PUBKEY_2012_256:    "1.2.643.7.1.1.1.1", // id-tc26-gost3410-12-256
  DIGEST_256:         "1.2.643.7.1.1.2.2", // id-tc26-gost3411-12-256

  // TC26 256-bit param sets
  TC26_256_A:         "1.2.643.7.1.2.1.1.1",
  TC26_256_B:         "1.2.643.7.1.2.1.1.2",
  TC26_256_C:         "1.2.643.7.1.2.1.1.3",
  TC26_256_D:         "1.2.643.7.1.2.1.1.4",

  // имена/расширения
  EMAIL:              "1.2.840.113549.1.9.1",
  CN:                 "2.5.4.3",
  SKI:                "2.5.29.14",
  KU:                 "2.5.29.15",
  BC:                 "2.5.29.19",
  AKI:                "2.5.29.35",
  CRLDP:              "2.5.29.31",
  AIA:                "1.3.6.1.5.5.7.1.1",
  PKIX_OCSP:          "1.3.6.1.5.5.7.48.1",
};

/* =============== bytes/bigint/DER =============== */
function hexToBytesBE(hex: string, size?: number): Uint8Array {
  let h = hex.trim().replace(/^0x/i, "").replace(/[\s:_-]/g, "");
  if (!/^[0-9a-fA-F]*$/.test(h)) throw new Error(`Invalid hex string: ${hex}`);
  if (h.length % 2) h = "0" + h;

  const out = new Uint8Array(h.length / 2);
  for (let i = 0, j = 0; i < h.length; i += 2, j++) {
    out[j] = (parseInt(h[i], 16) << 4) | parseInt(h[i + 1], 16);
  }

  if (size !== undefined) {
    if (out.length > size) throw new Error(`Hex too long: expected ≤${size}B, got ${out.length}B`);
    if (out.length < size) {
      const pad = new Uint8Array(size);
      pad.set(out, size - out.length);
      return pad;
    }
  }
  return out;
}
function beToLe(b: Uint8Array): Uint8Array { return b.slice().reverse(); }
function bytesToBigInt(b: Uint8Array): bigint { let x=0n; for (const v of b) x = (x<<8n)+BigInt(v); return x; }
function bigIntToBE(x: bigint, size?: number): Uint8Array {
  let hex = x.toString(16); if (hex.length%2) hex="0"+hex;
  let b = hexToBytesBE(hex);
  if (!size && b.length>0 && (b[0]&0x80)) { const p = new Uint8Array(b.length+1); p[0]=0; p.set(b,1); b=p; }
  if (size!==undefined){
    if (b.length>size){ if (b.length===size+1 && b[0]===0) b=b.slice(1); else throw new Error("int too long"); }
    if (b.length<size){ const o=new Uint8Array(size); o.set(b,size-b.length); b=o; }
  }
  return b;
}
function derLen(n: number){
  if (n < 0x80) return Uint8Array.of(n);
  const bytes:number[] = [];
  let x = n;
  while (x > 0){ bytes.push(x & 0xff); x = Math.floor(x/256); }
  bytes.reverse();
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}
function tlv(tag:number,val:Uint8Array){
  const L=derLen(val.length); const o=new Uint8Array(1+L.length+val.length);
  o[0]=tag; o.set(L,1); o.set(val,1+L.length); return o;
}
const SEQ=(...x:Uint8Array[])=>tlv(0x30, concat(...x));
const SET=(...x:Uint8Array[])=>tlv(0x31, concat(...x.sort((a,b)=>lexCmp(a,b))));
const INTEGER=(x:bigint)=>tlv(0x02, bigIntToBE(x));
const OID_DER=(oid:string)=>tlv(0x06, encodeOID(oid));
const UTCTime=(d:Date)=>tlv(0x17, utcBytes(d));
const PrintableString=(s:string)=>tlv(0x13, asciiBytes(s));
const UTF8String=(s:string)=>tlv(0x0C, utf8(s));
const IA5String=(s:string)=>tlv(0x16, asciiBytes(s));
const BIT_STRING=(payload:Uint8Array,unused=0)=>tlv(0x03,new Uint8Array([unused,...payload]));
const OCTET_STRING=(b:Uint8Array)=>tlv(0x04,b);
const BOOLEAN=(v:boolean)=>tlv(0x01,new Uint8Array([v?0xFF:0x00]));

function concat(...arrs:Uint8Array[]){ const t=arrs.reduce((n,a)=>n+a.length,0); const o=new Uint8Array(t);
  let off=0; for(const a of arrs){ o.set(a,off); off+=a.length; } return o; }
function lexCmp(a:Uint8Array,b:Uint8Array){ const n=Math.min(a.length,b.length);
  for(let i=0;i<n;i++){ if(a[i]!==b[i]) return a[i]-b[i]; } return a.length-b.length; }
function utf8(s:string){ return new TextEncoder().encode(s); }
function asciiBytes(s:string){ return new TextEncoder().encode(s); }
function utcBytes(d:Date){ const yy=String(d.getUTCFullYear()%100).padStart(2,"0");
  const MM=String(d.getUTCMonth()+1).padStart(2,"0"); const DD=String(d.getUTCDate()).padStart(2,"0");
  const hh=String(d.getUTCHours()).padStart(2,"0"); const mm=String(d.getUTCMinutes()).padStart(2,"0");
  const ss=String(d.getUTCSeconds()).padStart(2,"0"); return utf8(`${yy}${MM}${DD}${hh}${mm}${ss}Z`); }
function encodeOID(oid:string){
  const p=oid.split(".").map(x=>parseInt(x,10));
  const out:number[]=[40*p[0]+p[1]];
  for(const q0 of p.slice(2)){ let q=q0>>>0; const st=[q&0x7F]; q>>=7; while(q){ st.push(0x80|(q&0x7F)); q>>=7; } st.reverse().forEach(v=>out.push(v)); }
  return new Uint8Array(out);
}

type TLV = { tag:number; len:number; head:number; valOff:number; end:number };
function parseTLV(buf:Uint8Array, off:number):TLV{
  if(off>=buf.length) throw new Error("EOF");
  const tag=buf[off]; let i=off+1; if(i>=buf.length) throw new Error("EOF len");
  let b=buf[i++], len=0;
  if(b<0x80) len=b; else { const n=b&0x7F; if(i+n>buf.length) throw new Error("bad len");
    len=Number(bytesToBigInt(buf.slice(i,i+n))); i+=n; }
  const head=i-off; const valOff=i; const end=valOff+len; if(end>buf.length) throw new Error("len OOR");
  return {tag,len,head,valOff,end};
}

/* ====== Вспомогательное ====== */
function* iterChildren(seqVal:Uint8Array){
  let off=0; while(off<seqVal.length){ const t=parseTLV(seqVal,off); yield {slice:seqVal.slice(off,t.end), tlv:t}; off=t.end; }
}

function pemToDer(pem:string):Uint8Array{
  const m=pem.replace(/-----BEGIN[^-]+-----/g,"").replace(/-----END[^-]+-----/g,"").replace(/\s+/g,"");
  const bin=typeof atob!=="undefined"? atob(m): Buffer.from(m,"base64").toString("binary");
  const out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out;
}
function derToPem(der:Uint8Array,label:string):string{
  const b64=typeof btoa!=="undefined"? btoa(String.fromCharCode(...der)): Buffer.from(der).toString("base64");
  const lines=b64.replace(/(.{64})/g,"$1\n"); return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}

/** Жёстко вытаскиваем issuer.Name, issuer.serialNumber, а также его subjectPublicKey (payload из BIT STRING) */
function extractIssuerBasics(der: Uint8Array){
  const cert = parseTLV(der, 0);
  if (cert.tag !== 0x30) throw new Error("issuer cert: not SEQUENCE");
  const certVal = der.slice(cert.valOff, cert.end);

  const tbsTLV = parseTLV(certVal, 0);
  if (tbsTLV.tag !== 0x30) throw new Error("issuer cert: no TBS");
  const tbsVal = certVal.slice(tbsTLV.valOff, tbsTLV.end);

  let off = 0;

  // [0] EXPLICIT Version (optional)
  const first = parseTLV(tbsVal, off);
  if (first.tag === 0xA0) { off += first.head + first.len; }

  // serialNumber
  const serial = parseTLV(tbsVal, off);
  if (serial.tag !== 0x02) throw new Error("issuer cert: serial INTEGER not found");
  const serialBytes = tbsVal.slice(serial.valOff, serial.end);
  let si = 0; while (si < serialBytes.length && serialBytes[si] === 0x00) si++;
  const issuerSerialInt = bytesToBigInt(serialBytes.slice(si));
  off += serial.head + serial.len;

  // signature (skip)
  const sigAlg = parseTLV(tbsVal, off);
  if (sigAlg.tag !== 0x30) throw new Error("issuer cert: signature AlgorithmIdentifier not found");
  off += sigAlg.head + sigAlg.len;

  // issuer Name (save TLV slice)
  const issuerName = parseTLV(tbsVal, off);
  if (issuerName.tag !== 0x30) throw new Error("issuer cert: issuer Name not found");
  const issuerNameTLV = tbsVal.slice(off, off + issuerName.head + issuerName.len);
  off += issuerName.head + issuerName.len;

  // validity, subject (skip)
  const validity = parseTLV(tbsVal, off); off += validity.head + validity.len;
  const subject  = parseTLV(tbsVal, off); off += subject.head + subject.len;

  // subjectPublicKeyInfo
  const spki = parseTLV(tbsVal, off);
  if (spki.tag !== 0x30) throw new Error("issuer cert: spki not found");
  const spkiVal = tbsVal.slice(spki.valOff, spki.end);

  // spki ::= SEQUENCE { algo, BIT STRING }
  const spkiAlgo = parseTLV(spkiVal, 0);
  const spkiBitS = parseTLV(spkiVal, spkiAlgo.head + spkiAlgo.len);
  if (spkiBitS.tag !== 0x03) throw new Error("issuer cert: spki.bitstring not found");
  const bitPayload = spkiVal.slice(spkiBitS.valOff, spkiBitS.end); // [unused, ...payload]
  if (!bitPayload.length) throw new Error("issuer cert: empty subjectPublicKey bitstring");
  const spkiPayload = bitPayload.slice(1); // skip 'unused' byte

  return { issuerNameTLV, issuerSerialInt, issuerSpkiSubjectPublicKey: spkiPayload };
}

/* разные мелочи */
function intContentForDER(x: bigint){ // содержимое INTEGER с ведущим 0x00 при установленном старшем бите
  let b = bigIntToBE(x);
  if (b.length === 0) b = new Uint8Array([0]);
  if (b[0] & 0x80) b = Uint8Array.of(0x00, ...b);
  return b;
}
function intToUnsigned(x:bigint){ let b=bigIntToBE(x); if(b.length>0 && b[0]===0) b=b.slice(1); return b; }
function randomSerial():bigint{ const r=defaultRng(8); return bytesToBigInt(r); }
function defaultRng(n:number){
  if(typeof crypto!=="undefined" && (crypto as any).getRandomValues){
    const b=new Uint8Array(n); (crypto as any).getRandomValues(b); return b;
  }
  // @ts-ignore
  return require("crypto").randomBytes(n);
}

/* ====== BIT STRING helper для KeyUsage ====== */
function bitStringFromBits(indices: number[]): {bytes: Uint8Array, unused: number} {
  if (!indices.length) return { bytes: new Uint8Array([0]), unused: 7 };
  const maxBit = Math.max(...indices);
  const numBits = maxBit + 1;
  const numBytes = Math.ceil(numBits / 8);
  const out = new Uint8Array(numBytes);
  for (const i of indices) {
    const byteIndex = Math.floor(i / 8);
    const bitInByte = i % 8;
    out[byteIndex] |= (1 << (7 - bitInByte));
  }
  const unused = numBytes * 8 - numBits;
  return { bytes: out, unused };
}

/* ====== Расширения CRLDP / AIA ====== */
function extCRLDistributionPoints(urls: string[]) {
  // DistributionPointName ::= CHOICE { fullName [0] GeneralNames }
  // GeneralName ::= uniformResourceIdentifier [6] IA5String(uri)
  const dps: Uint8Array[] = [];
  for (const uri of urls) {
    const gnURI = tlv(0x86, IA5String(uri).slice(2));   // 0x86 + raw IA5 (без тега/длины IA5)
    const fullName = tlv(0xA0, SEQ(gnURI));             // [0] GeneralNames
    const dp = SEQ(fullName);                           // DistributionPoint
    dps.push(dp);
  }
  const seqOf = SEQ(...dps);
  return SEQ(OID_DER(OID.CRLDP), OCTET_STRING(seqOf));  // extnValue = OCTET STRING(...)
}

function extAuthorityInfoAccessOcsp(uri: string) {
  // AccessDescription ::= SEQUENCE { accessMethod OID(ocsp), accessLocation GeneralName(URI) }
  const ad = SEQ(OID_DER(OID.PKIX_OCSP), tlv(0x86, IA5String(uri).slice(2)));
  const aiaSeq = SEQ(ad);
  return SEQ(OID_DER(OID.AIA), OCTET_STRING(aiaSeq));
}

/* маленький SHA-1 (для SKI/AKI.keyIdentifier) */
function sha1(msg: Uint8Array): Uint8Array {
  const w=new Uint32Array(80); const ml=msg.length*8;
  const withOne=new Uint8Array(((msg.length+9+63)>>6)<<6); withOne.set(msg,0); withOne[msg.length]=0x80;
  const dv=new DataView(withOne.buffer);
  dv.setUint32(withOne.length-4, ml>>>0, false);
  dv.setUint32(withOne.length-8, Math.floor(ml/2**32)>>>0, false);
  let h0=0x67452301|0,h1=0xEFCDAB89|0,h2=0x98BADCFE|0,h3=0x10325476|0,h4=0xC3D2E1F0|0;
  for(let i=0;i<withOne.length;i+=64){
    for(let j=0;j<16;j++) w[j]=dv.getUint32(i+4*j,false);
    for(let j=16;j<80;j++){ const v=(w[j-3]^w[j-8]^w[j-14]^w[j-16]); w[j]=(v<<1)|(v>>>31); }
    let a=h0,b=h1,c=h2,d=h3,e=h4;
    for(let j=0;j<80;j++){
      const f=j<20?((b&c)|((~b)&d)): j<40?(b^c^d): j<60?((b&c)|(b&d)|(c&d)):(b^c^d);
      const k=j<20?0x5A827999: j<40?0x6ED9EBA1: j<60?0x8F1BBCDC: 0xCA62C1D6;
      const t=(((a<<5)|(a>>>27)) + f + e + k + w[j])|0;
      e=d; d=c; c=((b<<30)|(b>>>2))|0; b=a; a=t;
    }
    h0=(h0+a)|0; h1=(h1+b)|0; h2=(h2+c)|0; h3=(h3+d)|0; h4=(h4+e)|0;
  }
  const out=new Uint8Array(20); const d2=new DataView(out.buffer);
  d2.setUint32(0,h0>>>0,false); d2.setUint32(4,h1>>>0,false); d2.setUint32(8,h2>>>0,false); d2.setUint32(12,h3>>>0,false); d2.setUint32(16,h4>>>0,false);
  return out;
}

/* ===================== Утилита выпуска под ГОСТ-EC ===================== */
export async function issueCertificateUsingGostEc(args: Omit<IssueOptions,
  "curve" | "gost3410_2012_256_sign" | "subjectPublicQxHex" | "subjectPublicQyHex"> & {
    streebog256: Hash256; curve?: EcCurve; subjectPublicQxHex?: string; subjectPublicQyHex?: string;
  }){
  const curve = (args.curve ?? CryptoProA_2012_256) as unknown as Gost256CurveParams;
  let QxHex=args.subjectPublicQxHex, QyHex=args.subjectPublicQyHex;
  if((!QxHex||!QyHex)){
    if(!args.subjectPrivateKeyHex) throw new Error("Нужен subjectPrivateKeyHex или Qx/Qy");
    const d=args.subjectPrivateKeyHex.replace(/^0x/,"");
    const q=derivePublicQ(d, curve as unknown as EcCurve);
    QxHex=q.QxHex; QyHex=q.QyHex;
  }
  return issueGost256Certificate({
    ...args, curve, streebog256: args.streebog256,
    gost3410_2012_256_sign: (e,d)=>gostSigner256(e,d, curve as unknown as EcCurve),
    subjectPublicQxHex: QxHex!, subjectPublicQyHex: QyHex!
  });
}

/* ===================== Основная функция выпуска ===================== */
export async function issueGost256Certificate(opts: IssueOptions): Promise<IssueResult>{
  const {
    issuerCertDerOrPem, issuerPrivateKeyHex,
    subjectPrivateKeyHex, subjectPublicQxHex, subjectPublicQyHex,
    subjectEmail, subjectCN, notBefore, notAfter, serialNumber,
    isCA = false, publicKeyParamSetOid,
    crlDpUrls = [], ocspUrl, includeAIAForEE = true,
    curve, streebog256, gost3410_2012_256_sign, rng
  } = opts;

  const issuerDER = typeof issuerCertDerOrPem==="string" ? pemToDer(issuerCertDerOrPem) : issuerCertDerOrPem;
  const { issuerNameTLV, issuerSerialInt, issuerSpkiSubjectPublicKey } = extractIssuerBasics(issuerDER);

  const q = curve.q;
  let dSub: bigint;
  if (subjectPrivateKeyHex) dSub = BigInt("0x"+subjectPrivateKeyHex.replace(/^0x/,""));
  else {
     const rd=(rng??defaultRng)(64);
     dSub=(bytesToBigInt(rd)%(q-1n))+1n;
  }

  // Qx/Qy (BE hex) → LE bytes (ГОСТ)
  const QxBE = hexToBytesBE(subjectPublicQxHex!);
  const QyBE = hexToBytesBE(subjectPublicQyHex!);
  const QxLE = beToLe(QxBE);
  const QyLE = beToLe(QyBE);

  // subjectPublicKey: BIT STRING { OCTET STRING(QxLE||QyLE) } — совместимо с твоей python-версией
  const pubkeyOctet = OCTET_STRING(concat(QxLE, QyLE));

  // === SPKI.algorithm (ГОСТ-2012-256 с TC26-параметрами) ===
  const pkParamSet = publicKeyParamSetOid ?? OID.TC26_256_A; // по умолчанию paramSetA
  const spkiAlgo = SEQ(
    OID_DER(OID.PUBKEY_2012_256),
    SEQ(OID_DER(pkParamSet), OID_DER(OID.DIGEST_256)) // SEQUENCE { publicKeyParamSet, digestParamSet }
  );
  const spki = SEQ(spkiAlgo, BIT_STRING(pubkeyOctet, 0));

  // === Subject / Validity (CN: Printable для ASCII, иначе UTF8) ===
  const isAscii = /^[\x20-\x7E]*$/.test(subjectCN);
  const cnValue = isAscii ? PrintableString(subjectCN) : UTF8String(subjectCN);
  const subjectName = SEQ(
    SET(SEQ(OID_DER(OID.EMAIL), IA5String(subjectEmail))),
    SET(SEQ(OID_DER(OID.CN),    cnValue))
  );
  const validity = SEQ(UTCTime(notBefore), UTCTime(notAfter));

  /* ----------------- Extensions ----------------- */

  // SKI: SHA-1 от subjectPublicKey (используем DER OCTET внутри BIT STRING — как в твоём пайтон-коде)
  const ski = sha1(pubkeyOctet);
  const ext_ski = SEQ(
    OID_DER(OID.SKI),
    OCTET_STRING(OCTET_STRING(ski)) // extnValue ::= OCTET STRING( OCTET STRING(ski) )
  );

  // AKI: keyIdentifier + authorityCertIssuer(directoryName) + authorityCertSerialNumber
  const aki_keyid = sha1(issuerSpkiSubjectPublicKey[0]===0x04 ? issuerSpkiSubjectPublicKey : issuerSpkiSubjectPublicKey);
  const authorityKeyIdentifier = (() => {
    const parts: Uint8Array[] = [];
    parts.push(tlv(0x80, aki_keyid));                           // [0] keyIdentifier
    const authorityCertIssuer = tlv(0xA1, SEQ( tlv(0xA4, issuerNameTLV) )); // [1] GeneralNames(directoryName)
    parts.push(authorityCertIssuer);
    const authorityCertSerial  = tlv(0x82, intContentForDER(issuerSerialInt)); // [2] INTEGER контент
    parts.push(authorityCertSerial);
    return SEQ(...parts);
  })();
  const ext_aki = SEQ(OID_DER(OID.AKI), OCTET_STRING(authorityKeyIdentifier));

  // KeyUsage + BasicConstraints (зависят от isCA)
  let ext_ku: Uint8Array;
  if (isCA) {
    // keyCertSign(5), cRLSign(6)
    const {bytes, unused} = bitStringFromBits([5,6]);
    ext_ku = SEQ(OID_DER(OID.KU), BOOLEAN(true), OCTET_STRING(BIT_STRING(bytes, unused)));
  } else {
    // digitalSignature(0)
    const {bytes, unused} = bitStringFromBits([0]);
    ext_ku = SEQ(OID_DER(OID.KU), BOOLEAN(true), OCTET_STRING(BIT_STRING(bytes, unused)));
  }
  const bc_inner = isCA ? SEQ(BOOLEAN(true)) : SEQ(BOOLEAN(false));
  const ext_bc = SEQ(OID_DER(OID.BC), BOOLEAN(true), OCTET_STRING(bc_inner));

  // CRL Distribution Points (не критич.)
  const ext_crldp = (crlDpUrls && crlDpUrls.length>0) ? extCRLDistributionPoints(crlDpUrls) : undefined;

  // AIA (OCSP) — обычно только в конечных сертификатах
  const needAIA = !isCA && (includeAIAForEE !== false) && !!ocspUrl;
  const ext_aia = needAIA ? extAuthorityInfoAccessOcsp(ocspUrl!) : undefined;

  // Extensions контейнер [3] EXPLICIT
  const extList = [ext_ski, ext_ku, ext_bc, ext_aki, ext_crldp, ext_aia].filter(Boolean) as Uint8Array[];
  const extensions = tlv(0xA3, SEQ(...extList));

  // === TBS ===
  const version = tlv(0xA0, INTEGER(2n)); // v3
  const serial  = INTEGER(serialNumber!=null ? BigInt(String(serialNumber)) : randomSerial());
  const sigAlg = SEQ(OID_DER(OID.SIGNWITHDIGEST_256));

  const tbs = SEQ(version, serial, sigAlg, issuerNameTLV, validity, subjectName, spki, extensions);

  // === Подпись TBS (ГОСТ: e = (H mod q); if 0 -> 1; H = Стрибог-256) ===
  const h = await Promise.resolve(streebog256(tbs));
  if (h.length!==32) throw new Error("streebog256 must return 32 bytes");
  let e = bytesToBigInt(h.slice().reverse()) % curve.q;
  if (e === 0n) e = 1n;

  const dIssuer = BigInt("0x"+issuerPrivateKeyHex.replace(/^0x/,""));
  const { r, s } = await Promise.resolve(gost3410_2012_256_sign(e, dIssuer, curve));

  // signatureValue: BIT STRING с "сырыми" 64B (s||r в BE) — как в RFC 9215 для X.509 (в CMS другая упаковка)
  const sigBytes = concat(bigIntToBE(s,32), bigIntToBE(r,32));
  const cert = SEQ(tbs, sigAlg, BIT_STRING(sigBytes, 0));
  const pem  = derToPem(cert, "CERTIFICATE");

  return {
    der: cert,
    pem,
    tbs,
    subjectPrivHex: subjectPrivateKeyHex ? undefined : dSub.toString(16).padStart(64,"0"),
    subjectPubQxHex: subjectPublicQxHex!, subjectPubQyHex: subjectPublicQyHex!
  };
}

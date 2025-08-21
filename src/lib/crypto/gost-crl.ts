// lib/gost-crl.ts
// ГОСТ Р 34.10-2012 (256) + Стрибог-256 — генерация CRL (v2, DER)
//
// Совместимо с твоей логикой: подпись как в X.509 (BIT STRING(s||r, BE)),
// хеш Стрибог-256, AKI.keyIdentifier = SHA-1(subjectPublicKey issuer'a).

export type Gost256CurveParams = { p: bigint; a: bigint; b: bigint; q: bigint; gx: bigint; gy: bigint; };
export type Signer256 = (e: bigint, dPriv: bigint, params: Gost256CurveParams) =>
  Promise<{ r: bigint; s: bigint }>|{ r: bigint; s: bigint };
export type Hash256 = (data: Uint8Array) => Promise<Uint8Array>|Uint8Array;

const OID = {
  SIGNWITHDIGEST_256: "1.2.643.7.1.1.3.2", // id-tc26-signwithdigest-gost3410-12-256
  // CRL extensions:
  CRLNumber:          "2.5.29.20",
  AKI:                "2.5.29.35",
  CRLReason:          "2.5.29.21",
};

const TEXT = new TextEncoder();

/* ===== DER utils ===== */
function derLen(n: number){ if(n<0x80) return Uint8Array.of(n);
  const a:number[]=[]; for(let x=n; x>0; x>>>=8) a.push(x&0xff); a.reverse(); return Uint8Array.of(0x80|a.length, ...a); }
function tlv(tag:number,val:Uint8Array){ const L=derLen(val.length); const o=new Uint8Array(1+L.length+val.length);
  o[0]=tag; o.set(L,1); o.set(val,1+L.length); return o; }
const SEQ=(...x:Uint8Array[])=>tlv(0x30, concat(...x));
const SET=(...x:Uint8Array[])=>tlv(0x31, concat(...x));
const INTEGER=(x:bigint)=>tlv(0x02, bigIntToBE(x));
const ENUMERATED=(x:number)=>tlv(0x0A, bigIntToBE(BigInt(x)));
const OID_DER=(s:string)=>tlv(0x06, encodeOID(s));
const OCTET_STRING=(b:Uint8Array)=>tlv(0x04,b);
const BIT_STRING=(payload:Uint8Array,unused=0)=>tlv(0x03, new Uint8Array([unused, ...payload]));
const UTCTime=(d:Date)=>tlv(0x17, utcBytes(d));

function concat(...arrs:Uint8Array[]){ const t=arrs.reduce((n,a)=>n+a.length,0); const o=new Uint8Array(t);
  let off=0; for(const a of arrs){ o.set(a,off); off+=a.length; } return o; }
function utf8(s:string){ return TEXT.encode(s); }
function utcBytes(d:Date){ const yy=String(d.getUTCFullYear()%100).padStart(2,"0");
  const MM=String(d.getUTCMonth()+1).padStart(2,"0");
  const DD=String(d.getUTCDate()).padStart(2,"0");
  const hh=String(d.getUTCHours()).padStart(2,"0");
  const mm=String(d.getUTCMinutes()).padStart(2,"0");
  const ss=String(d.getUTCSeconds()).padStart(2,"0");
  return utf8(`${yy}${MM}${DD}${hh}${mm}${ss}Z`);
}
function encodeOID(oid:string){
  const p=oid.split(".").map(v=>parseInt(v,10));
  const out:number[]=[40*p[0]+p[1]];
  for(const v0 of p.slice(2)){ let v=v0>>>0; const s=[v&0x7f]; v>>>=7; while(v){ s.push(0x80|(v&0x7f)); v>>>=7; } s.reverse().forEach(b=>out.push(b)); }
  return new Uint8Array(out);
}
function hexToBytesBE(hex:string){ let h=hex.replace(/^0x/i,"").replace(/[\s:_-]/g,"");
  if(h.length%2) h="0"+h; const out=new Uint8Array(h.length/2);
  for(let i=0,j=0;i<h.length;i+=2,j++) out[j]=(parseInt(h[i],16)<<4)|parseInt(h[i+1],16);
  return out;
}
function bigIntToBE(x:bigint, size?: number): Uint8Array {
  let hex = x.toString(16); if(hex.length%2) hex="0"+hex;
  let b = hexToBytesBE(hex);
  if(!size && b.length>0 && (b[0]&0x80)){ const p=new Uint8Array(b.length+1); p[0]=0; p.set(b,1); b=p; }
  if(size!==undefined){
    if(b.length>size){ if(b.length===size+1 && b[0]===0) b=b.slice(1); else throw new Error("int too long"); }
    if(b.length<size){ const o=new Uint8Array(size); o.set(b,size-b.length); b=o; }
  }
  return b;
}
function bytesToBigInt(b:Uint8Array){ let x=0n; for(const v of b) x=(x<<8n)+BigInt(v); return x; }
function beToLe(b:Uint8Array){ return b.slice().reverse(); }
function derToPem(der:Uint8Array,label:string){ const b64=Buffer.from(der).toString("base64").replace(/(.{64})/g,"$1\n");
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`; }

/* === Мини парсер, чтобы достать issuer.Name и subjectPublicKey payload у издателя === */
type TLV = { tag:number; len:number; head:number; valOff:number; end:number };
function parseTLV(buf:Uint8Array, off:number):TLV{
  if(off>=buf.length) throw new Error("EOF");
  const tag=buf[off]; let i=off+1; if(i>=buf.length) throw new Error("EOF len");
  let b=buf[i++], len=0; if(b<0x80) len=b; else { const n=b&0x7F; len=Number(bytesToBigInt(buf.slice(i,i+n))); i+=n; }
  const head=i-off, valOff=i, end=valOff+len; if(end>buf.length) throw new Error("len OOR");
  return {tag,len,head,valOff,end};
}
function extractIssuerBasics(certDer: Uint8Array){
  const cert = parseTLV(certDer,0); const certVal=certDer.slice(cert.valOff, cert.end);
  const tbs = parseTLV(certVal,0);  const tbsVal = certVal.slice(tbs.valOff, tbs.end);
  let p=0;
  const first=parseTLV(tbsVal,p); if(first.tag===0xA0) p+=first.head+first.len; // [0] version
  const serial=parseTLV(tbsVal,p); p+=serial.head+serial.len;
  const sigAlg=parseTLV(tbsVal,p); p+=sigAlg.head+sigAlg.len;
  const issuer=parseTLV(tbsVal,p); const issuerNameTLV=tbsVal.slice(p,p+issuer.head+issuer.len); p+=issuer.head+issuer.len;
  const validity=parseTLV(tbsVal,p); p+=validity.head+validity.len;
  const subject=parseTLV(tbsVal,p); p+=subject.head+subject.len;
  const spki=parseTLV(tbsVal,p); const spkiVal=tbsVal.slice(spki.valOff, spki.end);
  const spkiAlgo=parseTLV(spkiVal,0);
  const spkiBit = parseTLV(spkiVal, spkiAlgo.head+spkiAlgo.len);
  const bitPayload = spkiVal.slice(spkiBit.valOff, spkiBit.end);
  if(!bitPayload.length) throw new Error("issuer spki: empty");
  const subjectPublicKeyPayload = bitPayload.slice(1); // skip 'unused'
  return { issuerNameTLV, subjectPublicKeyPayload };
}

/* === SHA-1 для AKI/SKI === */
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

/* ====== Публичный API ====== */
export type RevokedCert = { serial: bigint|string|number; revocationDate?: Date; reason?: number };

export async function buildGost256Crl(opts: {
  issuerCertDerOrPem: Uint8Array|string;   // CA cert (DER или PEM)
  issuerPrivateKeyHex: string;             // priv key of CA (hex)
  curve: Gost256CurveParams;
  streebog256: Hash256;
  gost3410_2012_256_sign: Signer256;

  thisUpdate?: Date;
  nextUpdate?: Date;
  crlNumber?: bigint|string|number;

  revoked?: RevokedCert[]; // список отозванных
}): Promise<{ der: Uint8Array; pem: string }> {
  const {
    issuerCertDerOrPem, issuerPrivateKeyHex,
    curve, streebog256, gost3410_2012_256_sign,
    thisUpdate = new Date(),
    nextUpdate = new Date(Date.now() + 7*24*3600*1000),
    crlNumber = 1,
    revoked = [],
  } = opts;

  // --- 1) Достаём issuer.Name и его subjectPublicKey payload (для AKI.keyId)
  const issuerDER = typeof issuerCertDerOrPem === "string"
    ? pemToDer(issuerCertDerOrPem)
    : issuerCertDerOrPem;
  const { issuerNameTLV, subjectPublicKeyPayload } = extractIssuerBasics(issuerDER);

  // --- 2) TBSCertList
  // version v2 => INTEGER(1)
  const version = INTEGER(1n);

  // signature AlgorithmIdentifier
  const sigAlg = SEQ(OID_DER(OID.SIGNWITHDIGEST_256)); // без параметров

  // issuer Name (берём TLV из сертификата)
  const issuer = issuerNameTLV;

  // thisUpdate/nextUpdate
  const tUpdate = UTCTime(thisUpdate);
  const nUpdate = UTCTime(nextUpdate);

  // revokedCertificates (опционально)
  const revokedSeqs: Uint8Array[] = [];
  for (const r of revoked) {
    const serialInt = BigInt(String(r.serial));
    const serial = INTEGER(serialInt);
    const when = UTCTime(r.revocationDate ?? thisUpdate);

    let entryExts: Uint8Array|undefined;
    if (typeof r.reason === "number") {
      const ext_reason = SEQ(
        OID_DER(OID.CRLReason),
        OCTET_STRING(ENUMERATED(r.reason))
      );
      entryExts = SEQ(ext_reason);
    }
    const entry = entryExts
      ? SEQ(serial, when, entryExts)
      : SEQ(serial, when);
    revokedSeqs.push(entry);
  }
  const revokedList = revokedSeqs.length ? SEQ(...revokedSeqs) : undefined;

  // crlExtensions [0] EXPLICIT: CRLNumber + AKI(keyId)
  const aki_keyid = sha1(subjectPublicKeyPayload); // SHA-1 от subjectPublicKey (payload из BIT STRING)
  const ext_crlNumber = SEQ(
    OID_DER(OID.CRLNumber),
    OCTET_STRING(INTEGER(BigInt(String(crlNumber))))
  );
  const ext_aki = SEQ(
    OID_DER(OID.AKI),
    OCTET_STRING( SEQ( tlv(0x80, aki_keyid) ) ) // [0] keyIdentifier
  );
  const crlExts = tlv(0xA0, SEQ(ext_crlNumber, ext_aki)); // [0] EXPLICIT Extensions

  const tbs = revokedList
    ? SEQ(version, sigAlg, issuer, tUpdate, nUpdate, revokedList, crlExts)
    : SEQ(version, sigAlg, issuer, tUpdate, nUpdate, crlExts);

  // --- 3) Подпись TBSCertList
  const h = await Promise.resolve(streebog256(tbs));
  if (h.length !== 32) throw new Error("streebog256 must return 32 bytes");
  let e = bytesToBigInt(h.slice().reverse()) % curve.q; // ГОСТ: e = (H mod q); if zero => 1
  if (e === 0n) e = 1n;

  const d = BigInt("0x" + issuerPrivateKeyHex.replace(/^0x/i,""));
  const { r, s } = await Promise.resolve(gost3410_2012_256_sign(e, d, curve));

  // signatureValue для CRL (как и в X.509 cert): BIT STRING(s||r, BE)
  const sigValue = BIT_STRING(concat(bigIntToBE(s,32), bigIntToBE(r,32)), 0);

  const crl = SEQ(tbs, sigAlg, sigValue);
  const pem = derToPem(crl, "X509 CRL");

  return { der: crl, pem };
}

/* === утилиты PEM/bytes === */
function pemToDer(pem:string):Uint8Array{
  const m=pem.replace(/-----BEGIN[^-]+-----/g,"").replace(/-----END[^-]+-----/g,"").replace(/\s+/g,"");
  return Uint8Array.from(Buffer.from(m,"base64"));
}

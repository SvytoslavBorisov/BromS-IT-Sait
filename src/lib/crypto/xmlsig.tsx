// src/lib/crypto/xmlsig-gost2012.ts
// XMLDSig (detached) для CryptoPro XML: ГОСТ Р 34.10-2012 (256) + ГОСТ Р 34.11-2012 (256)
// Подписывается C14N(SignedInfo); Digest для файла кладется в <DigestValue>; SignatureValue = Base64(R||S_LE).

import { streebog256 } from "@/lib/crypto/streebog";
import { DSGOST } from "@/lib/crypto/dsgost";

// --- Константы XMLDSig / CryptoPro URIs ---
const DSIG_NS = "http://www.w3.org/2000/09/xmldsig#";
// C14N 1.0 без комментариев
const C14N_METHOD = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
// CryptoPro/TC26 URIs
const URI_GOST12_256_SIG =
  "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102012-gostr34112012-256";
const URI_GOST12_256_DIGEST =
  "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr3411-2012-256";

// ---------- Утилиты ----------
const cleanHex = (h: string) => h.replace(/^0x/i, "").replace(/\s+/g, "");
const bytesToHex = (u8: Uint8Array) =>
  Array.from(u8, b => b.toString(16).padStart(2, "0")).join("");

function hexToBytes(hex: string): Uint8Array {
  const s0 = cleanHex(hex);
  const s = s0.length % 2 ? "0" + s0 : s0;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < s.length; i += 2) out[i / 2] = parseInt(s.slice(i, i + 2), 16);
  return out;
}

function utf8Encode(s: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s);
  // Node.js < 11 fallback
  // @ts-ignore
  return Uint8Array.from(Buffer.from(s, "utf8"));
}

function b64encode(u8: Uint8Array): string {
  // В браузере/Node
  if (typeof Buffer !== "undefined") return Buffer.from(u8).toString("base64");
  // @ts-ignore
  let bin = "";
  for (const b of u8) bin += String.fromCharCode(b);
  // @ts-ignore
  return btoa(bin);
}

export function pemToDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  if (typeof Buffer !== "undefined") return Uint8Array.from(Buffer.from(b64, "base64"));
  // @ts-ignore
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Извлечь Q из сертификата ГОСТ (битовая строка, внутри OCTET STRING(Qx||Qy) в LE)
function extractQ_LE_fromCertDER(certDER: Uint8Array): Uint8Array | null {
  // Мини ASN.1-парс: найдём BIT STRING SubjectPublicKey и снимем первый «unused bits» байт.
  // Мы не тянем огромные ASN.1 либы: CryptoPro не требует, чтобы мы тут валидировали всё X.509,
  // нам нужен только SPKI.publicKey.
  // Этот минималистичный парсер ожидает стандартный порядок структур (как в обычных ГОСТ-сертах).
  try {
    // Очень грубо: найдём первое вхождение тега BIT STRING (0x03) достаточно длинного.
    const buf = certDER;
    for (let i = 0; i < buf.length - 2; i++) {
      if (buf[i] === 0x03 /* BIT STRING */) {
        // считываем длину
        let j = i + 1;
        let len = buf[j++];
        if (len & 0x80) {
          const n = len & 0x7f;
          if (n === 0 || n > 4) continue;
          len = 0;
          for (let k = 0; k < n; k++) len = (len << 8) | buf[j++];
        }
        // теперь j — начало контента битовой строки: первый байт — unused bits (обычно 0)
        if (j + 1 >= buf.length) continue;
        const unused = buf[j++];
        const bitstr = buf.slice(j, j + len - 1);
        // В ГОСТ‑сертах внутри часто лежит DER OCTET STRING(Qx||Qy), попробуем распаковать 0x04/len/...
        if (bitstr.length >= 2 && bitstr[0] === 0x04 /* OCTET STRING */) {
          let p = 1;
          let L = bitstr[p++];
          if (L & 0x80) {
            const n = L & 0x7f;
            if (n === 0 || n > 4) continue;
            L = 0;
            for (let k = 0; k < n; k++) L = (L << 8) | bitstr[p++];
          }
          const oct = bitstr.slice(p, p + L);
          return oct.length === 64 ? oct : null;
        }
        return bitstr.length === 64 ? bitstr : null;
      }
    }
  } catch { /* ignore */ }
  return null;
}

// ---------- ГОСТ-подпись ----------

const BYTE_LEN = 32; // 2012-256

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

// Сборка C14N(SignedInfo) как детерминированной строки.
// Мы сами строим XML без лишних пробелов/атрибутов — это и будет канонизованная форма.
function buildSignedInfoC14N(opts: {
  referenceUri: string;       // что подписываем (например, "file.xlsx" или "#id")
  digestB64: string;          // Base64(H(content))
  c14nMethod?: string;        // по умолчанию C14N 1.0
  sigMethod?: string;         // по умолчанию CryptoPro GOST12-256
  digestMethod?: string;      // по умолчанию GOST12-256
}): string {
  const c14n = opts.c14nMethod ?? C14N_METHOD;
  const sigm = opts.sigMethod ?? URI_GOST12_256_SIG;
  const digm = opts.digestMethod ?? URI_GOST12_256_DIGEST;

  // NB: ноль лишних пробелов/переводов строк внутри тегов, предсказуемый порядок атрибутов
  // xmlns задаём только на корне <Signature>, а в SignedInfo не дублируем — это допустимо,
  // так как при C14N пространство имён наследуется, а мы создаём точную строку.
  // Чтобы SignedInfo стал самостоятельным при C14N, обычно объявляют xmlns и на нём;
  // Сделаем именно так (чтобы CryptoPro не спотыкался на контексте).
  return (
    `<SignedInfo xmlns="${DSIG_NS}">` +
      `<CanonicalizationMethod Algorithm="${c14n}"/>` +
      `<SignatureMethod Algorithm="${sigm}"/>` +
      `<Reference URI="${escapeXmlAttr(opts.referenceUri)}">` +
        `<DigestMethod Algorithm="${digm}"/>` +
        `<DigestValue>${opts.digestB64}</DigestValue>` +
      `</Reference>` +
    `</SignedInfo>`
  );
}

function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
}

function buildXmlDetachedSignature(opts: {
  signedInfoC14N: string;     // готовая C14N(SignedInfo)
  signatureValueB64: string;  // Base64(R||S_LE)
  certDER: Uint8Array;        // DER сертификат
}): string {
  const certB64 = b64encode(opts.certDER);
  // Корневой xmlns объявляем на <Signature>
  return (
    `<Signature xmlns="${DSIG_NS}">` +
      opts.signedInfoC14N +
      `<SignatureValue>${opts.signatureValueB64}</SignatureValue>` +
      `<KeyInfo>` +
        `<X509Data>` +
          `<X509Certificate>${certB64}</X509Certificate>` +
        `</X509Data>` +
      `</KeyInfo>` +
    `</Signature>`
  );
}

// ---------- Публичный API ----------

/**
 * Сформировать DETACHED XML-подпись для бинарного файла (CryptoPro XML).
 * @param gost           экземпляр DSGOST, сконфигурированный под 2012-256 (та же кривая, что в сертификате)
 * @param fileBytes      содержимое файла, который подписываем
 * @param referenceUri   как ссылаемся на файл в XML (например, "file.xlsx" или "file.bin")
 * @param signerCertPEM  сертификат (PEM), соответствующий ключу
 * @param privD_Hex      приватный ключ d (hex, BE, 32 байта)
 * @param publicQHex     (необяз.) публичный ключ (hex X||Y, 64 байта = 128 hex) — поможет авто-подбору порядка
 * @returns              XML-строка <Signature> … </Signature>
 */
export function signDetachedXML_GOST2012(
  gost: DSGOST,
  fileBytes: Uint8Array,
  referenceUri: string,
  signerCertPEM: string,
  privD_Hex: string,
  publicQHex?: string
): string {
  // 1) Digest файла → Base64 в <DigestValue>
  const digest = streebog256(fileBytes);
  const digestB64 = b64encode(digest);

  // 2) Собираем C14N(SignedInfo) как точную строку
  const siC14N = buildSignedInfoC14N({
    referenceUri,
    digestB64,
  });

  // 3) e = Streebog256( bytes(C14N(SignedInfo)) )
  const e = streebog256(utf8Encode(siC14N));

  // 4) ГОСТ-подпись e (DSGOST.signHex ожидает e в 0xBEhex)
  const { r, s } = gost.signHex("0x" + bytesToHex(e), privD_Hex);

  // 5) Укладка подписи: по умолчанию RS(LE) — как в CryptoPro XML
  let sig = packRS_LE(r, s);

  // 6) Если доступна verifyHex — подберём RS/SR и вариант Q (BE/LE, X/Y)
  const anyG: any = gost as any;
  if (typeof anyG.verifyHex === "function") {
    const qCandidates: { Qx_be: string, Qy_be: string }[] = [];
    const certDER = pemToDer(signerCertPEM);
    const qLE = extractQ_LE_fromCertDER(certDER);
    if (qLE && qLE.length === 64) {
      qCandidates.push(
        { Qx_be: bytesToHex(qLE.slice(0, 32).slice().reverse()), Qy_be: bytesToHex(qLE.slice(32).slice().reverse()) },
        { Qx_be: bytesToHex(qLE.slice(32).slice().reverse()), Qy_be: bytesToHex(qLE.slice(0, 32).slice().reverse()) }
      );
    }
    if (publicQHex) {
      const q = hexToBytes(publicQHex);
      if (q.length === 64) {
        const X = q.slice(0, 32), Y = q.slice(32);
        const be = (u: Uint8Array) => bytesToHex(u);
        const le = (u: Uint8Array) => bytesToHex(u.slice().reverse());
        const add = (Qx_be: string, Qy_be: string) => {
          if (!qCandidates.some(v => v.Qx_be.toLowerCase()===Qx_be.toLowerCase() && v.Qy_be.toLowerCase()===Qy_be.toLowerCase()))
            qCandidates.push({ Qx_be, Qy_be });
        };
        add(be(X), be(Y));
        add(le(X), le(Y));
        add(be(Y), be(X));
        add(le(Y), le(X));
      }
    }

    const tryV = (Qx_be: string, Qy_be: string, useRS: boolean) =>
      useRS ? anyG.verifyHex("0x" + bytesToHex(e), Qx_be, Qy_be, r, s)
            : anyG.verifyHex("0x" + bytesToHex(e), Qx_be, Qy_be, s, r);

    let matched = false;
    for (const cand of qCandidates) {
      if (tryV(cand.Qx_be, cand.Qy_be, true))  { sig = packRS_LE(r, s); matched = true; break; }
      if (tryV(cand.Qx_be, cand.Qy_be, false)) { sig = packSR_LE(r, s); matched = true; break; }
    }
    if (!matched) {
      // не падаем — CryptoPro всё равно проглотит RS(LE), если ключ/сертификат корректны
      console.warn("WARN(xmlsig): Local verify failed — оставляю R||S(LE) по умолчанию.");
    }
  }

  // 7) Собираем финальный <Signature>
  const certDER = pemToDer(signerCertPEM);
  const signatureValueB64 = b64encode(sig);
  const xml = buildXmlDetachedSignature({
    signedInfoC14N: siC14N,
    signatureValueB64,
    certDER,
  });

  return xml;
}

// ---------- Пример использования ----------
// import { DSGOST } from "@/lib/crypto/dsgost";
// import { readFileSync, writeFileSync } from "fs";
// const gost = new DSGOST(/* кривая 2012-256 */);
// const file = new Uint8Array(readFileSync("file.xlsx"));
// const certPEM = readFileSync("cert.pem", "utf8");
// const d = "3f0f1e3dc254c1ebbc93488798e90fd7c645ee25854e8ce1f0b7accf389edf82";
// const xml = signDetachedXML_GOST2012(gost, file, "file.xlsx", certPEM, d);
// writeFileSync("file.xlsx.xmlsig", xml, "utf8");

/*
Заметки:

1) DETACHED vs ENVELOPED
   - Здесь собран DETACHED: <Reference URI="file.xlsx"> без Transforms.
   - Для ENVELOPED внутри XML-документа:
        <Reference URI="#yourElementId">
          <Transforms>
            <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          </Transforms>
          <DigestMethod .../><DigestValue>...</DigestValue>
        </Reference>
     и нужно вставить <Signature> внутрь исходного XML-пакета, навесив @Id и т.п.

2) C14N
   - Мы формируем SignedInfo как детерминированную строку: это фактически уже C14N.
   - Если у тебя сложный SignedInfo с пространствами имён/несколькими ссылками — подключай полноценную C14N‑библиотеку.

3) CryptoPro URIs
   - Для ГОСТ-2012-256 используются:
        SignatureMethod: urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102012-gostr34112012-256
        DigestMethod:    urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr3411-2012-256
     Если твой валидатор ждёт другие URI — подставь их в константы.

4) Формат SignatureValue
   - В российских реализациях CryptoPro XML ожидает «сырую» подпись как две половины фиксированной длины.
     Здесь — R||S (LE), 64 байта → Base64.

5) Проверка соответствия ключа и сертификата
   - Функция подбирает порядок подписи по verifyHex, если она есть.
   - Рекомендую убедиться, что сертификат действительно выпущен для пары (d,Q), и кривая в DSGOST совпадает с той, что в сертификате.
*/

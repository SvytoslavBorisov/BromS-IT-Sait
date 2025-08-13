// app/api/issue-cert/route.ts
import { NextResponse } from "next/server";
import { issueCertificateUsingGostEc } from "@/lib/crypto/generate_sertificate";
import { streebog256 } from "@/lib/crypto/streebog";



export async function POST(req: Request) {
  const b = await req.json();

  const res = await issueCertificateUsingGostEc({
    issuerCertDerOrPem: b.issuerCertPemOrDer,   // PEM строка или DER bytes/base64
    issuerPrivateKeyHex: b.issuerPrivHex,       // hex без 0x
    subjectPrivateKeyHex: b.subjectPrivHex,     // можно не передавать Q — выведем
    // subjectPublicQxHex: b.subjectQxHex,      // опционально, если хочешь задать явно
    // subjectPublicQyHex: b.subjectQyHex,
    subjectEmail: b.email,
    subjectCN: b.cn,
    notBefore: new Date(b.notBefore),
    notAfter:  new Date(b.notAfter),
    serialNumber: b.serial,                     // опционально
    streebog256,
    // curve: CryptoProA_2012_256,              // опционально, по умолчанию уже так
  });

  return NextResponse.json({
    pem: res.pem,
    derBase64: Buffer.from(res.der).toString("base64"),
    tbsBase64: Buffer.from(res.tbs).toString("base64"),
    subjectPrivHex: res.subjectPrivHex ?? null,
    QxHex: res.subjectPubQxHex,
    QyHex: res.subjectPubQyHex,
  });
}

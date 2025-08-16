// src/app/api/document/crypto/encryptFile/route.ts

import { NextRequest, NextResponse } from "next/server";
import forge from 'node-forge';
import { promises as fs } from "fs";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import path from "path";
import nodeCrypto from 'crypto';  
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { log } from "@/lib/logger"
import { authOptions }       from "@/lib/auth";
import { decodeCiphertext }      from "@/lib/crypto/keys";
import { verifyShare, reconstructSecretVSS }      from "@/lib/crypto/shamir";
import { DSGOST }      from "@/lib/crypto/dsgost";
import { saveGostSigFile, signFileStreebog256 }      from "@/lib/crypto/create_sig";
import { signFileToCMS_DER }      from "@/lib/crypto/cms-gost";
import { fileToBitString }      from "@/lib/crypto/file_to_bits";
import { loadPrivateJwk }   from "@/lib/crypto/secure-storage";
import asn1 from "asn1.js";
import { streebog256, streebog512 } from "@/lib/crypto/streebog"; // твой модуль
export const runtime = 'nodejs';  // убедитесь, что это nodejs роут


interface Asn1DefinitionContext {
  seq(): any;
  obj(items: Record<string, any>): any;
  key(name: string): {
    int(): void;
    // Добавьте другие методы по необходимости
  };
}

// вспомогалки
const bytesToHex = (u8: Uint8Array) => Array.from(u8, b => b.toString(16).padStart(2,"0")).join("");
const toU8 = (b: Buffer) => new Uint8Array(b);

// DER -> PEM
function derToPem(type: "CERTIFICATE", der: Uint8Array): string {
  const b64 = Buffer.from(der).toString("base64");
  const body = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN ${type}-----\n${body}\n-----END ${type}-----\n`;
}
async function readCertAsPEM(relPath: string): Promise<string> {
  const abs = path.join(process.cwd(), relPath);
  const buf = await fs.readFile(abs);
  const txt = buf.toString("utf8");
  return txt.includes("-----BEGIN CERTIFICATE-----")
    ? txt
    : derToPem("CERTIFICATE", new Uint8Array(buf));
}

export async function makeSig(privDHex: string, dataPath: string) {
  // параметры кривой
  const p  = 115792089237316195423570985008687907853269984665640564039457584007913129639319n;
  const a  = 115792089237316195423570985008687907853269984665640564039457584007913129639316n;
  const b  = 166n;
  const xG = 1n;
  const yG = 64033881142927202683649881450433473985931760268884941288852745803908878638612n;
  const q  = 115792089237316195423570985008687907853073762908499243225378155805079068850323n;
  const gost = new DSGOST(p, a, b, q, xG, yG);

  const fileBytes = new Uint8Array(await fs.readFile(dataPath));
  const certPem = await readCertAsPEM("public/1508.cer");

  const cmsDER = signFileToCMS_DER(gost, fileBytes, certPem, privDHex, '45841419bb673b29d974853dbb5a3a504ced44d57de7acf8883685b1590aaac02a97a4a5597110e746e13880403e1cfe712bb936396c142cc33c2e085a21451c');
  const out = path.join(process.cwd(), "signature.sig");
  await fs.writeFile(out, cmsDER);
//     console.log(privDHex)
//   const xml = signFileToCMS_DER(gost, fileBytes, certPem, privDHex);
//   writeFileSync("file.xlsx.xmlsig", xml, "utf8");

  return out;
}

export async function POST(req: NextRequest) {
  // 1) Авторизация
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
    }

    // 2) Параметры
    const { documentId, sessionId, privJwk } = await req.json();
    console.log('privKeyRef', privJwk);

    const recovery = await prisma.recoverySession.findUnique({
        where: { id: sessionId },
        include: {
            shareSession: {
                select: {
                    p: true,
                    q: true,
                    g: true,
                    commitments: true,
                    threshold: true,
                    publicKey: {
                        select: {
                            id: true,
                            publicKey: true
                        }
                    },
                    shares: {
                        select: {
                            x:      true,
                            userId: true,
                        }
                    }
                }
            },
            receipts: {
                where: { ciphertext: { not: [] as any } },
                select: { shareholderId: true, ciphertext: true },
            }
        },
    });

    console.log(recovery, documentId, sessionId, privJwk)

    if (recovery!.status != 'DONE') {
        return NextResponse.json({ error: "Сессия не готова" }, { status: 404 });
    }
    else {

        const shares = recovery!.receipts.map((r) => {
            const point = recovery!.shareSession.shares.find(
                (sh) => sh.userId === r.shareholderId
                  );
            if (!point) {
                throw new Error(`Не найдена исходная доля для пользователя ${r.shareholderId}`);
            }
            return {
                x:          point.x,
                ciphertext: r.ciphertext as string,
            };
        });

        // Дешифруем и собираем (x,y)
        const points: [bigint, bigint][] = [];

        const privateKey: CryptoKey = await nodeCrypto.subtle.importKey(
            "jwk",               // формат
            privJwk,             // сам JWK-объект
            { 
                name: "RSA-OAEP",  // алгоритм
                hash: "SHA-256" 
            },
            false,               // extractable: ключ нельзя экспортировать обратно
            ["decrypt"]          // какие операции разрешены
        );

        for (const { x, ciphertext } of shares) {

            const cipherBuf = decodeCiphertext(ciphertext);
            const plainBuf = await nodeCrypto.subtle.decrypt(
                { name: "RSA-OAEP" },
                privateKey,
                cipherBuf
            );

            const hex = new TextDecoder().decode(plainBuf).replace(/^0x/i, "");
            points.push([BigInt(x), BigInt(hex)]);
        }
                
        const rawCommitments = recovery!.shareSession.commitments as (string | number)[];

        // 2. Теперь map есть
        const commitmentsBigInt: bigint[] = rawCommitments.map(item =>
            BigInt(item)
        );

        const valid = points.filter(pt =>
            verifyShare(pt, BigInt(recovery!.shareSession.p), BigInt(recovery!.shareSession.g), commitmentsBigInt, BigInt(recovery!.shareSession.q))
        );

        if (valid.length < recovery!.shareSession.threshold) {
        throw new Error(
            `Найдены только ${valid.length} валидных долей из ${recovery!.shareSession.threshold}`
        );

        }
        console.log("ℹ️ Используемый модуль q:", recovery!.shareSession.q);
        // Восстановление секретa по модулю q
        const secretInt = reconstructSecretVSS(valid, BigInt(recovery!.shareSession.q));

        console.log("secretInt:", recovery!.shareSession.q);
        // bigint → hex → Uint8Array → строка
        let hex = secretInt.toString(16);
        console.log("hex:", recovery!.shareSession.q);
        if (hex.length % 2) hex = "0" + hex;
        const bytes = Uint8Array.from(
            hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16))
        );
        console.log("bytes:", recovery!.shareSession.q);
        console.log();

        const original = await prisma.document.findUnique({
            where: { id: documentId },
            select: { filePath: true, fileName: true, fileType: true },
        });
        
        if (!original) {
            return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
        }

        const absPath = path.join(process.cwd(), original.filePath);

        const hexData = await fileToBitString(absPath)
        const privPem = new TextDecoder().decode(bytes);

        const p  = 115792089237316195423570985008687907853269984665640564039457584007913129639319n;
        const a  = 115792089237316195423570985008687907853269984665640564039457584007913129639316n;
        const b  = 166n;
        const xG = 1n;
        const yG = 64033881142927202683649881450433473985931760268884941288852745803908878638612n;
        const q  = 115792089237316195423570985008687907853073762908499243225378155805079068850323n;

        const gost = new DSGOST(p, a, b, q, xG, yG);

        // // console.log(privPem, recovery!.shareSession.publicKey?.publicKey!)

        // // const { r, s } = gost.signHex("0x7b", privPem);

        // // console.log(r, s)

        // // console.log(gost.verifyHex(123n, r, s, recovery!.shareSession.publicKey?.publicKey!))

        // //  // пример; 0x7b == 123
        // // saveGostSigFile(r, s, q, "/Users/SvyTo/test.sig");


        // const { r, s, sigPath } = await signFileStreebog256(
        //     gost,
        //     absPath,
        //     privPem,                 // приватный ключ как hex d (не PEM!)
        //     "/Users/SvyTo/signature.sig"
        // );

        // // 2) Проверить своим кодом (тот же digest):
        // const data = await fs.readFile(absPath);
        // const digest = streebog256(new Uint8Array(data));
        // const ok = gost.verifyHex("0x" + bytesToHex(digest), r, s, recovery!.shareSession.publicKey?.publicKey!);
        // console.log("verify by code:", ok);

        const privDHex = new TextDecoder().decode(bytes); // это d в hex!
        const sigPath = await makeSig(privDHex, absPath);
        console.log(privDHex)
        return {  };
    }

}
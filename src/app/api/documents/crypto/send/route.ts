// src/app/api/document/crypto/encryptFile/route.ts

import { NextRequest, NextResponse } from "next/server";
import forge from 'node-forge';
import { promises as fs } from "fs";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import path from "path";
import nodeCrypto from 'crypto';
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { log } from "@/lib/logger";
import { authOptions } from "@/lib/auth";
import { decodeCiphertext } from "@/lib/crypto/keys";
import { verifyShare, reconstructSecretVSS } from "@/lib/crypto/shamir";
import { DSGOST } from "@/lib/crypto/dsgost";
// import { saveGostSigFile, signFileStreebog256 } from "@/lib/crypto/create_sig"; // не используем здесь
// import { signFileToCMS_DER } from "@/lib/crypto/cms-gost";                      // не используем здесь
import { fileToBitString } from "@/lib/crypto/file_to_bits";
import { loadPrivateJwk } from "@/lib/crypto/secure-storage";
import asn1 from "asn1.js";
import { streebog256, streebog512 } from "@/lib/crypto/streebog";

// === используем ТВОЙ сборщик CMS ===
import { buildCadesBesSignedData, type Gost256CurveParams } from "@/lib/crypto/cms-gost";

export const runtime = 'nodejs';

interface Asn1DefinitionContext {
  seq(): any;
  obj(items: Record<string, any>): any;
  key(name: string): {
    int(): void;
  };
}

// вспомогалки
const bytesToHex = (u8: Uint8Array) => Array.from(u8, b => b.toString(16).padStart(2,"0")).join("");
const toU8 = (b: Buffer) => new Uint8Array(b);

// DER -> PEM (оставляю на случай, если понадобится)
function derToPem(type: "CERTIFICATE", der: Uint8Array): string {
  const b64 = Buffer.from(der).toString("base64");
  const body = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN ${type}-----\n${body}\n-----END ${type}-----\n`;
}
async function readCertAsDER(relPath: string): Promise<Uint8Array> {
  const abs = path.join(process.cwd(), relPath);
  const buf = await fs.readFile(abs);
  const txt = buf.toString("utf8");
  if (txt.includes("-----BEGIN CERTIFICATE-----")) {
    const b64 = txt.replace(/-----BEGIN[^-]+-----/g,"").replace(/-----END[^-]+-----/g,"").replace(/\s+/g,"");
    return new Uint8Array(Buffer.from(b64, "base64"));
    }
  return new Uint8Array(buf);
}

export async function POST(req: NextRequest) {
  // 1) Авторизация — НЕ МЕНЯЮ
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  // 2) Параметры — НЕ МЕНЯЮ
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
            select: { id: true, publicKey: true }
          },
          shares: {
            select: { x: true, userId: true }
          }
        }
      },
      receipts: {
        where: { ciphertext: { not: [] as any } },
        select: { shareholderId: true, ciphertext: true },
      }
    },
  });

  console.log(recovery, documentId, sessionId, privJwk);

  if (recovery!.status != 'DONE') {
    return NextResponse.json({ error: "Сессия не готова" }, { status: 404 });
  } else {

    // -------------------- СОЕДИНЕНИЕ ДОЛЕЙ (НЕ ТРОГАЮ) --------------------
    const shares = recovery!.receipts.map((r) => {
      const point = recovery!.shareSession.shares.find(
        (sh) => sh.userId === r.shareholderId
      );
      if (!point) {
        throw new Error(`Не найдена исходная доля для пользователя ${r.shareholderId}`);
      }
      return { x: point.x, ciphertext: r.ciphertext as string };
    });

    // Дешифруем и собираем (x,y)
    const points: [bigint, bigint][] = [];

    const privateKey: CryptoKey = await nodeCrypto.subtle.importKey(
      "jwk",
      privJwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"]
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
    const commitmentsBigInt: bigint[] = rawCommitments.map(item => BigInt(item));

    const valid = points.filter(pt =>
      verifyShare(
        pt,
        BigInt(recovery!.shareSession.p),
        BigInt(recovery!.shareSession.g),
        commitmentsBigInt,
        BigInt(recovery!.shareSession.q)
      )
    );

    if (valid.length < recovery!.shareSession.threshold) {
      throw new Error(`Найдены только ${valid.length} валидных долей из ${recovery!.shareSession.threshold}`);
    }

    console.log("ℹ️ Используемый модуль q:", recovery!.shareSession.q);

    // Восстановление секрета по модулю q
    const secretInt = reconstructSecretVSS(valid, BigInt(recovery!.shareSession.q));

    console.log("secretInt:", recovery!.shareSession.q);

    // bigint → hex → bytes
    let hex = secretInt.toString(16);
    console.log("hex:", recovery!.shareSession.q);
    if (hex.length % 2) hex = "0" + hex;
    const bytes = Uint8Array.from(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
    console.log("bytes:", recovery!.shareSession.q);

    // -------------------- ДАЛЬШЕ: СБОРКА CMS (Только здесь меняем логику) --------------------

    const original = await prisma.document.findUnique({
      where: { id: documentId },
      select: { filePath: true, fileName: true, fileType: true },
    });

    if (!original) {
      return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
    }

    const absPath = path.join(process.cwd(), original.filePath);

    // читаем файл и сертификат
    const fileBytes = new Uint8Array(await fs.readFile(absPath));
    const certDer = await readCertAsDER("public/1508.cer");

    // d в hex
    const privDHex = new TextDecoder().decode(bytes);

    // параметры кривой (как у тебя)
    const p  = 115792089237316195423570985008687907853269984665640564039457584007913129639319n;
    const a  = 115792089237316195423570985008687907853269984665640564039457584007913129639316n;
    const b  = 166n;
    const xG = 1n;
    const yG = 64033881142927202683649881450433473985931760268884941288852745803908878638612n;
    const q  = 115792089237316195423570985008687907853073762908499243225378155805079068850323n;

    const gost = new DSGOST(p, a, b, q, xG, yG);
    const curveParams: Gost256CurveParams = { p, a, b, q, gx: xG, gy: yG };

    // адаптер подписи под интерфейс Signer256 из cms-gost2012
    const gostSigner = (e: bigint, d: bigint) => {
      if ((gost as any).sign) {
        return (gost as any).sign(e, d) as { r: bigint; s: bigint };
      } else {
        const { r, s } = (gost as any).signHex("0x" + e.toString(16), "0x" + d.toString(16));
        return { r, s };
      }
    };

    try {
      const cmsDer = await buildCadesBesSignedData({
        content: fileBytes,                                    // ATTACHED
        certDer,
        privKeyHex: privDHex.startsWith("0x") ? privDHex.slice(2) : privDHex,
        curve: curveParams,
        streebog256,
        gost3410_2012_256_sign: gostSigner,
        // signingTime: new Date(),                            // опционально
      });

        const { dir, name } = path.parse(absPath);       // absPath — путь к исходному файлу
        const outSigPath = path.join(dir, `${name}.sig`);

        // 2) (опционально) Если старый .sig существует — удалим, чтобы не мешал
        try { await fs.stat(outSigPath); await fs.unlink(outSigPath); } catch { /* нет файла — ок */ }

        // 3) Пишем подпись
        await fs.writeFile(outSigPath, cmsDer);

        // 4) Отдаём результат
        const cmsB64 = Buffer.from(cmsDer).toString("base64");
        return NextResponse.json({
            ok: true,
            signaturePath: outSigPath,        // теперь тут путь к "<оригинал>.sig"
            signatureBase64: cmsB64
        });
    } catch (err: any) {
      return NextResponse.json(
        { error: "Ошибка при сборке CAdES-BES", details: String(err?.message || err) },
        { status: 500 }
      );
    }
  }
}

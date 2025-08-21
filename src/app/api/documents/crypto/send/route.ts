// src/app/api/document/crypto/encryptFile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import nodeCrypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { decodeCiphertext } from "@/lib/crypto/keys";
import { verifyShare, reconstructSecretVSS } from "@/lib/crypto/shamir";
import { DSGOST } from "@/lib/crypto/dsgost";
import { streebog256 } from "@/lib/crypto/streebog";
import { buildCadesBesSignedData, type Gost256CurveParams } from "@/lib/crypto/cms-gost";

export const runtime = "nodejs";
 
// вспомогалки
const bytesToHex = (u8: Uint8Array) =>
  Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");

async function readCertAsDER(relPath: string): Promise<Uint8Array> {
  const abs = path.join(process.cwd(), relPath);
  const buf = await fs.readFile(abs);
  const txt = buf.toString("utf8");
  if (txt.includes("-----BEGIN CERTIFICATE-----")) {
    const b64 = txt
      .replace(/-----BEGIN[^-]+-----/g, "")
      .replace(/-----END[^-]+-----/g, "")
      .replace(/\s+/g, "");
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  return new Uint8Array(buf);
}

export async function POST(req: NextRequest) {
  // 1) Авторизация
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session?.user?.id) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  // 2) Параметры
  const { documentId, sessionId, privJwk } = await req.json();

  // 3) Берём recovery + нужные связи
  const recovery = await prisma.recoverySession.findUnique({
    where: { id: sessionId },
    include: {
      shareSession: {
        select: {
          id: true,
          p: true,
          q: true,
          g: true,
          commitments: true,
          threshold: true,
          publicKey: { select: { id: true, publicKey: true } },
          shares: { select: { x: true, userId: true } },
        },
      },
      receipts: {
        // считаем реально ПОЛУЧЕННЫЕ доли: ciphertext != []
        where: { ciphertext: { not: [] as any } },
        select: { shareholderId: true, ciphertext: true },
      },
      documentSignSession: true,
    },
  });

  if (!recovery) {
    return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
  }
  if (recovery.status !== "DONE") {
    return NextResponse.json({ error: "Сессия не готова" }, { status: 409 });
  }

  // -------------------- СОЕДИНЕНИЕ ДОЛЕЙ --------------------
  const sharesEncrypted = recovery.receipts.map((r) => {
    const point = recovery.shareSession.shares.find((sh) => sh.userId === r.shareholderId);
    if (!point) {
      throw new Error(`Не найдена исходная доля для пользователя ${r.shareholderId}`);
    }
    return { x: point.x, ciphertext: r.ciphertext as string };
  });

  // RSA-OAEP private key из JWK
  const privateKey: CryptoKey = await nodeCrypto.subtle.importKey(
    "jwk",
    privJwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  );

  // Дешифруем доли -> точки (x, y)
  const points: [bigint, bigint][] = [];
  for (const { x, ciphertext } of sharesEncrypted) {
    const cipherBuf = decodeCiphertext(ciphertext);
    const plainBuf = await nodeCrypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, cipherBuf);
    const hex = new TextDecoder().decode(plainBuf).replace(/^0x/i, "");
    points.push([BigInt(x), BigInt(hex)]);
  }

  const rawCommitments = recovery.shareSession.commitments as (string | number)[];
  const commitmentsBigInt: bigint[] = rawCommitments.map((item) => BigInt(item));

  const valid = points.filter((pt) =>
    verifyShare(
      pt,
      BigInt(recovery.shareSession.p),
      BigInt(recovery.shareSession.g),
      commitmentsBigInt,
      BigInt(recovery.shareSession.q)
    )
  );

  if (valid.length < recovery.shareSession.threshold) {
    return NextResponse.json(
      {
        error: `Найдены только ${valid.length} валидных долей из ${recovery.shareSession.threshold}`,
      },
      { status: 400 }
    );
  }

  // Восстановление секрета по модулю q
  const secretInt = reconstructSecretVSS(valid, BigInt(recovery.shareSession.q));

  // bigint → hex → bytes → privDHex (без 0x)
  let dHex = secretInt.toString(16);
  if (dHex.length % 2) dHex = "0" + dHex;
  const dBytes = Uint8Array.from(dHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const privDHex = new TextDecoder().decode(dBytes); // это строка hex без 0x

  // -------------------- СБОРКА CMS --------------------
  const original = await prisma.document.findUnique({
    where: { id: documentId },
    select: { filePath: true, fileName: true, fileType: true },
  });
  if (!original) {
    return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
  }

  // filePath у нас веб-путь "/uploads/...", чтобы прочитать файл с диска — идём через public/
  const publicDir = path.join(process.cwd());
  const absPath = path.join(publicDir, original.filePath.replace(/^\/+/, ""));

  // читаем файл и сертификат
  const fileBytes = new Uint8Array(await fs.readFile(absPath));
  const certDer = await readCertAsDER("public/1508.cer");

  // параметры кривой (как у тебя)
  const p =
    115792089237316195423570985008687907853269984665640564039457584007913129639319n;
  const a =
    115792089237316195423570985008687907853269984665640564039457584007913129639316n;
  const b = 166n;
  const xG = 1n;
  const yG =
    64033881142927202683649881450433473985931760268884941288852745803908878638612n;
  const q =
    115792089237316195423570985008687907853073762908499243225378155805079068850323n;

  const gost = new DSGOST(p, a, b, q, xG, yG);
  const curveParams: Gost256CurveParams = { p, a, b, q, gx: xG, gy: yG };

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
      content: fileBytes, // ATTACHED
      certDer,
      privKeyHex: privDHex.startsWith("0x") ? privDHex.slice(2) : privDHex,
      curve: curveParams,
      streebog256,
      gost3410_2012_256_sign: gostSigner,
    });

    // 1) Сохраняем .sig рядом с исходным файлом
    const { dir, name } = path.parse(absPath);
    const outSigPath = path.join(dir, `${name}.sig`);

    // если старый .sig есть — уберём
    try {
      await fs.stat(outSigPath);
      await fs.unlink(outSigPath);
    } catch {
      /* ignore */
    }

    await fs.writeFile(outSigPath, cmsDer);

    // 2) Веб‑путь для .sig (нужен для скачивания/показа)
    const webSigPath =
      "/" + path.relative(publicDir, outSigPath).replace(/\\/g, "/");

    // 3) Пишем запись в БД (Signatures)
    const signatureRec = await prisma.signatures.create({
      data: {
        type: "CAdES-BES",
        filePath: webSigPath, // веб-путь; сам файл лежит в public
        document: { connect: { id: documentId } },
        user: { connect: { id: session.user.id } },
        shamirSession: { connect: { id: recovery.shareSessionId } },
      },
      select: { id: true, filePath: true, type: true },
    });

    // 4) Отдаём результат
    const cmsB64 = Buffer.from(cmsDer).toString("base64");
    return NextResponse.json({
      ok: true,
      signatureId: signatureRec.id,
      signatureType: signatureRec.type,
      signaturePath: signatureRec.filePath, // веб-путь вида /uploads/xxx.sig
      signatureBase64: cmsB64,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Ошибка при сборке CAdES-BES", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}

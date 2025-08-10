// src/app/api/document/crypto/encryptFile/route.ts

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { log } from "@/lib/logger"
import { authOptions }       from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1) Авторизация
  const session = await getServerSession(authOptions);
  console.log('sessionSADADASDASD', session);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  // 2) Параметры
  const { documentId, sessionId } = await req.json();

  if (!documentId) {
    return NextResponse.json({ error: "Неверные параметры" }, { status: 400 });
  }

  const original = await prisma.document.findUnique({
    where: { id: documentId },
    select: { filePath: true, fileName: true, fileType: true },
  });
  
  if (!original) {
    return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
  }

  const absPath = path.join(process.cwd(), original.filePath);
  let plainBuffer: Buffer;
  try {
    plainBuffer = await fs.readFile(absPath);
  } catch (e) {
    console.error("Ошибка чтения файла:", e);
    return NextResponse.json({ error: "Не удалось прочитать файл" }, { status: 500 });
  }

  if (!sessionId) {

    // 5) SHA-256
    const sha256 = crypto.createHash("sha256").update(plainBuffer).digest("hex");

    // 6) Шифрование AES-256-GCM
    const keyHex = process.env.FILE_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      return NextResponse.json({ error: "Неверный ключ шифрования" }, { status: 500 });
    }
    const key = Buffer.from(keyHex, "hex");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    const outBuffer = Buffer.concat([iv, tag, encrypted]);

    // 7) Сохранение файла на диск
    const outName = `${path.parse(original.fileName).name}.enc${path.parse(original.fileName).ext}`;
    const outRelPath = path.join("uploads", outName);
    const outAbsPath = path.join(process.cwd(), "public", outRelPath);
    await fs.mkdir(path.dirname(outAbsPath), { recursive: true });
    await fs.writeFile(outAbsPath, outBuffer);

    // 8) Создание записи в БД
    const newDoc = await prisma.document.create({
      data: {
        user: { connect: { email: session.user.email } },
        fileName: outName,
        fileType: original.fileType,            // сохраняем тот же тип или меняем на application/octet-stream
        fileSize: outBuffer.length,
        filePath: `public/${outRelPath}`,       // или без public, в зависимости от вашей схемы
        description: `Encrypted version of ${original.fileName}`,
        type: 'ECRYPT',
        metadata: { sha256 },
      },
    });

    // 9) Ответ
    return NextResponse.json({
      originalId: documentId,
      encryptedId: newDoc.id,
      sha256,
      encryptedFilePath: newDoc.filePath,
    });
  }
  else {

    try {

        const hexData = plainBuffer.toString('hex');

        // 3) Проверяем, что сессия разделения (VSS) существует и вы — её дилер
        const sessionRec = await prisma.shamirSession.findUnique({
          where: { id: sessionId },
          select: { id: true, dealerId: true },
        });

        console.log('sessionRec', sessionRec);

        if (!sessionRec) {
          return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
        }
      
        // 4) Собираем из Share все userId, кому мы когда-то отправили доли
        const shares = await prisma.share.findMany({
          where: { sessionId: sessionId },
          select: { userId: true },
        });

        console.log('shares', shares);

        const shareholderIds = shares.map((s) => s.userId);

        if (shareholderIds.length === 0) {
          return NextResponse.json(
            { error: "В этой сессии нет ни одной доли" },
            { status: 400 }
          );
        }
      
        const existing = await prisma.recoverySession.findFirst({
          where: {
            shareSessionId: sessionId,
            dealerId:       sessionRec.dealerId,
          }
        });
        // if (existing) {
        //     console.log('ВСЁ РАБОТАЕТ', existing.id);
        //     return NextResponse.json({ recoveryId: existing.id });
        // }
      
        // 5) Создаём RecoverySession и создаём все записи receipt
        // src/app/api/recovery/route.ts (POST)
        const recovery = await prisma.recoverySession.create({
          data: {
            dealerId:       sessionRec.dealerId,
            shareSessionId: sessionId
          },
        });
        
        await prisma.shareReceipt.createMany({
          data: shareholderIds.map((userId) => ({
            recoveryId:     recovery.id,     // связываем с только что созданной сессией
            shareholderId:  userId,          // каждый из переданных идентификаторов
            shareSessionId : sessionId,
            status: 'AWAIT',
            senderId: session?.user.id                 // если в модели оно есть
          })),
        });
      
        log({
          event:      "recovery_started",
          recoveryId: recovery.id,
          sessionId,
          participants: shareholderIds,
          timestamp:  new Date().toISOString(),
        });
        
        // 8) Создание записи в БД
        const newDoc = await prisma.documentSignSession.create({
          data: {
            dealerId: session?.user.id,
            documentId: documentId,            // сохраняем тот же тип или меняем на application/octet-stream
            hash: hexData,
            status: 'PENDING',
            recoveryId: recovery.id
          },
        });

        return NextResponse.json({
          originalId: documentId,
          encryptedId: newDoc.id
        });
  
    } catch (e) {
      console.error("Network error calling /api/recovery:", e);
    }

  }

  
}
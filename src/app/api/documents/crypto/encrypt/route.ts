// src/app/api/document/crypto/encryptFile/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { logger, ensureRequestId } from "@/lib/logger";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  // ---- корреляция и контекст ----
  const requestId = ensureRequestId(req.headers.get("x-request-id"));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  const log = logger.child({ requestId, module: "api/document/encryptFile" });

  try {
    // 1) Авторизация
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(session.user as any)?.id) {
      log.warn({
        event: "docs.encrypt_failed",
        reason: "unauthorized",
        ip,
        ua,
      });
      return NextResponse.json({ error: "Неавторизован" }, { status: 401, headers: { "x-request-id": requestId } });
    }
    const userId = (session.user as any).id as string;

    // 2) Параметры
    let payload: { documentId?: string; sessionId?: string };
    try {
      payload = await req.json();
    } catch {
      log.warn({
        event: "docs.encrypt_failed",
        reason: "bad_json",
        ip,
        ua,
      });
      return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400, headers: { "x-request-id": requestId } });
    }

    const { documentId, sessionId } = payload || {};
    if (!documentId) {
      log.warn({
        event: "docs.encrypt_failed",
        reason: "missing_documentId",
        ip,
        ua,
      });
      return NextResponse.json({ error: "Неверные параметры" }, { status: 400, headers: { "x-request-id": requestId } });
    }

    log.info({
      event: "docs.encrypt_start",
      documentId,
      mode: sessionId ? "recovery" : "local-aes",
      userId,
      ip,
      ua,
    });

    // 3) Оригинальный документ
    const original = await prisma.document.findUnique({
      where: { id: documentId },
      select: { filePath: true, fileName: true, fileType: true, id: true },
    });

    if (!original) {
      log.warn({
        event: "docs.encrypt_failed",
        reason: "document_not_found",
        documentId,
        userId,
      });
      return NextResponse.json({ error: "Документ не найден" }, { status: 404, headers: { "x-request-id": requestId } });
    }

    // filePath может быть относительным к /public — нормализуем
    const absPath = path.isAbsolute(original.filePath)
      ? original.filePath
      : path.join(process.cwd(), original.filePath);

    let plainBuffer: Buffer;
    try {
      plainBuffer = await fs.readFile(absPath);
    } catch (e) {
      log.error({
        event: "docs.encrypt_failed",
        reason: "fs_read_error",
        documentId,
        filePath: absPath,
      });
      return NextResponse.json({ error: "Не удалось прочитать файл" }, { status: 500, headers: { "x-request-id": requestId } });
    }

    // ---- ВЕТКА А: локальное шифрование AES‑256‑GCM (без sessionId) ----
    if (!sessionId) {
      // 4) Хэш содержимого (SHA‑256) — для целостности/аудита
      const sha256 = crypto.createHash("sha256").update(plainBuffer).digest("hex");

      // 5) Шифрование AES‑256‑GCM
      const keyHex = process.env.FILE_ENCRYPTION_KEY;
      if (!keyHex || keyHex.length !== 64) {
        log.error({
          event: "docs.encrypt_failed",
          reason: "bad_encryption_key",
          keyLen: keyHex?.length ?? 0,
        });
        return NextResponse.json({ error: "Неверный ключ шифрования" }, { status: 500, headers: { "x-request-id": requestId } });
      }
      const key = Buffer.from(keyHex, "hex");
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

      const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
      const tag = cipher.getAuthTag();
      const outBuffer = Buffer.concat([iv, tag, encrypted]);

      // 6) Сохранение зашифрованного файла
      const parsed = path.parse(original.fileName);
      const outName = `${parsed.name}.enc${parsed.ext}`;
      const outRelPath = path.join("uploads", outName);
      const outAbsPath = path.join(process.cwd(), "public", outRelPath);

      await fs.mkdir(path.dirname(outAbsPath), { recursive: true });
      await fs.writeFile(outAbsPath, outBuffer);

      // 7) Запись в БД
      const newDoc = await prisma.document.create({
        data: {
          user: { connect: { email: session.user.email } },
          fileName: outName,
          fileType: original.fileType,
          fileSize: outBuffer.length,
          // сохраняем путь как в твоей схеме (при необходимости убери "public/")
          filePath: `public/${outRelPath}`,
          description: `Encrypted version of ${original.fileName}`,
          type: "ECRYPT",
          metadata: { sha256 },
        },
      });

      log.info({
        event: "docs.encrypt_success",
        documentId,
        encryptedId: newDoc.id,
        bytesIn: plainBuffer.length,
        bytesOut: outBuffer.length,
        latencyMs: Date.now() - t0,
        userId,
      });

      return NextResponse.json(
        {
          originalId: documentId,
          encryptedId: newDoc.id,
          sha256,
          encryptedFilePath: newDoc.filePath,
          requestId,
        },
        { headers: { "x-request-id": requestId } }
      );
    }

    // ---- ВЕТКА B: запуск recovery/подписи через сессию (есть sessionId) ----

    // 8) Проверяем, что VSS‑сессия существует и что текущий пользователь — дилер
    const sessionRec = await prisma.shamirSession.findUnique({
      where: { id: sessionId },
      select: { id: true, dealerId: true },
    });

    if (!sessionRec) {
      log.warn({
        event: "recovery.start_failed",
        reason: "session_not_found",
        sessionId,
        userId,
      });
      return NextResponse.json({ error: "Сессия не найдена" }, { status: 404, headers: { "x-request-id": requestId } });
    }

    if (sessionRec.dealerId !== userId) {
      log.warn({
        event: "recovery.start_failed",
        reason: "forbidden_not_dealer",
        sessionId,
        dealerId: sessionRec.dealerId,
        userId,
      });
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403, headers: { "x-request-id": requestId } });
    }

    // 9) Список акционеров/получателей долей
    const shares = await prisma.share.findMany({
      where: { sessionId },
      select: { userId: true },
    });
    const participantIds = shares.map((s) => s.userId);

    if (participantIds.length === 0) {
      log.warn({
        event: "recovery.start_failed",
        reason: "no_participants",
        sessionId,
        userId,
      });
      return NextResponse.json({ error: "В этой сессии нет ни одной доли" }, { status: 400, headers: { "x-request-id": requestId } });
    }

    // 10) Подготовим «хэш документа» для подписи (для совместимости — hex контента)
    const docHex = plainBuffer.toString("hex");

    // 11) Создаём RecoverySession + все receipts (AWAIT)
    const recovery = await prisma.recoverySession.create({
      data: {
        dealerId: sessionRec.dealerId,
        shareSessionId: sessionId,
      },
    });

    await prisma.shareReceipt.createMany({
      data: participantIds.map((shareholderId) => ({
        recoveryId: recovery.id,
        shareholderId,
        shareSessionId: sessionId,
        status: "AWAIT",
        senderId: userId,
      })),
    });

    log.info({
      event: "recovery.started",
      sessionId,
      recoveryId: recovery.id,
      participantsCount: participantIds.length,
      participants: participantIds, // можно убрать, если шумно
      userId,
    });

    // 12) Создаём запись на подпись документа (PENDING)
    const signSession = await prisma.documentSignSession.create({
      data: {
        dealerId: userId,
        documentId,
        hash: docHex,
        status: "PENDING",
        recoveryId: recovery.id,
      },
    });

    log.info({
      event: "signsession.created",
      documentId,
      signSessionId: signSession.id,
      recoveryId: recovery.id,
      latencyMs: Date.now() - t0,
      userId,
    });

    return NextResponse.json(
      {
        originalId: documentId,
        encryptedId: signSession.id, // id сессии подписи
        recoveryId: recovery.id,
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (err) {
    // финальная ловушка
    const e = err as Error;
    logger.child({ requestId, module: "api/document/encryptFile" }).error({
      event: "docs.encrypt_failed",
      reason: "exception",
      message: e.message,
      stack: e.stack,
    });
    return NextResponse.json(
      { error: "Внутренняя ошибка", requestId },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}

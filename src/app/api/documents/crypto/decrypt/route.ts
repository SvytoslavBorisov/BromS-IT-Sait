// src/app/api/document/crypto/decryptFile/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

export const runtime = "nodejs";


export async function POST(req: NextRequest) {
  // 1) Авторизация
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  // 2) Параметры запроса
  const { documentId } = await req.json();
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
  let encBuffer: Buffer;
  try {
    encBuffer = await fs.readFile(absPath);
  } catch (e) {
    console.error("Ошибка чтения зашифрованного файла:", e);
    return NextResponse.json({ error: "Не удалось прочитать зашифрованный файл" }, { status: 500 });
  }

  // 4) Декодирование ключа из env
  const keyHex = process.env.FILE_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    return NextResponse.json({ error: "Некорректный ключ для дешифрования" }, { status: 500 });
  }
  const key = Buffer.from(keyHex, "hex");

  // 5) Извлечение iv и tag
  const iv = encBuffer.slice(0, 12);         // первые 12 байт
  const tag = encBuffer.slice(12, 28);       // следующие 16 байт
  const ciphertext = encBuffer.slice(28);    // остальное

  // 6) Дешифрование AES-256-GCM
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  let decrypted: Buffer;
  try {
    decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (e) {
    console.error("Ошибка при дешифровании:", e);
    return NextResponse.json({ error: "Не удалось расшифровать файл" }, { status: 400 });
  }

  // 7) Сохранение результата
  const outName = path.basename(original.fileName).replace(/\.enc$/i, ".dec");
  const outPath = path.join(process.cwd(), "public", "uploads", outName);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, decrypted);

  // 8) Ответ
  return NextResponse.json({
    decryptedFilePath: path.relative(process.cwd(), outPath),
  });
}
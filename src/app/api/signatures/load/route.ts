import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

function extFromName(name: string) {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
}

function guessTypeByExt(ext: string): string {
  // подстрой по своим типам
  if (["p7s", "pkcs7", "cms"].includes(ext)) return "CMS";
  if (["pem", "cer", "crt"].includes(ext)) return "PEM";
  if (["sig"].includes(ext)) return "RAW";
  return "FILE";
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const providedType = (form.get("type") as string | null) ?? undefined;

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  // читаем файл в память и сохраняем в public
  const arrayBuffer = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "signatures");
  await fs.mkdir(uploadsDir, { recursive: true });

  const orig = file.name || "upload.bin";
  const ext = extFromName(orig);
  const basename = `${randomUUID()}_${orig.replace(/[^\w.\-]/g, "_")}`;
  const diskPath = path.join(uploadsDir, basename);

  await fs.writeFile(diskPath, bytes);

  // публичный путь для скачивания
  const publicPath = `/uploads/signatures/${basename}`;

  // тип подписи
  const inferredType = providedType ?? guessTypeByExt(ext);

  // создаём Document под файл (имя/тип/размер). Поля подстрой под свою схему.
  // Важно: ниже пример, подкорректируй поля модели Document под свой проект.
  const doc = await prisma.document.create({
    data: {
      fileName: orig,
      fileType: file.type || ext || "application/octet-stream",
      fileSize: bytes.length,
      filePath: publicPath,
      // если в вашей модели есть поле path/storage — добавьте его:
      // <-- ПРИМЕР: переименуйте или уберите, если нет такого поля
      // если Document должен принадлежать пользователю:
      userId:  session.user.id,
    },
  });

  // создаём Signatures, привязываем и пользователя, и документ (checked create)
  const sig = await prisma.signatures.create({
    data: {
      type: inferredType,
      path: `public${publicPath}`, // сохраняем физический путь в модель (как в вашем UI)
      pem: null,
      filePath: publicPath,
      user: { connect: { id: session.user.id } },
      document: { connect: { id: doc.id } },
    },
    include: {
      user: true,
      document: true,
    },
  });

  return NextResponse.json(sig);
}

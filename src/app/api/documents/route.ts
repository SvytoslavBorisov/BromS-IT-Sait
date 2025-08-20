import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const config = {
  api: {
    bodyParser: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");


export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  // 1) Берём FormData из запроса
  const formData = await req.formData();
  const fileField = formData.get("file");
  if (!(fileField instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }

  // 2) Преобразуем в ArrayBuffer и записываем на диск
  const arrayBuffer = await fileField.arrayBuffer();
  // Генерируем своё имя, чтобы избежать коллизий
  const ext = path.extname(fileField.name);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePathOnFs = path.join(UPLOAD_DIR, fileName);
  // Убедитесь, что папка public/uploads существует!
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(filePathOnFs, Buffer.from(arrayBuffer));

  // 3) Сохраняем метаданные в базе
  const doc = await prisma.document.create({
    data: {
      user: { connect: { email: session.user.email } },
      fileName: fileField.name,
      fileType: fileField.type,
      fileSize: fileField.size,
      filePath: path.relative(process.cwd(), filePathOnFs),
    },
  });

  return NextResponse.json(doc);
}


export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  const docs = await prisma.document.findMany({
    where: { user: { email: session.user.email } }, // фильтр по владельцу
    include: {
      documentSignSession: {
        take: 1,
        include: {
          recovery: {
            include: {
              receipts: true,
              shareSession: { select: { threshold: true } },
            },
          },
          publicKey: {
            include: { privateKeySharing: { select: { threshold: true } } },
          },
        },
      },
    }
  })

  return NextResponse.json(docs);
}
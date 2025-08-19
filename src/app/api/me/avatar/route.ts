// src/app/api/me/avatar/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // <-- поправь под свой путь
import { prisma } from "@/lib/prisma";    // <-- поправь под свой путь
import { randomUUID } from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

export const runtime = "nodejs"; // нужен доступ к fs

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function extByMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    default:
      return "";
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = extByMime(file.type);
    if (!ext) {
      return NextResponse.json({ error: "Unknown file type" }, { status: 415 });
    }

    // путь сохранения
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await writeFile(filePath, buf, { flag: "wx" }); // не перезаписывать существующие

    // public URL (от корня сайта)
    const publicUrl = `/uploads/avatars/${filename}`;

    // обновляем user.image
    await prisma.user.update({
      where: { id: String(session.user.id) },
      data: { image: publicUrl },
    });

    return NextResponse.json({ image: publicUrl }, { status: 200 });
  } catch (err: any) {
    console.error("avatar upload error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}

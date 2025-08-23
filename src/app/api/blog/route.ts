import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const url = `${base}/crypto/blog/${encodeURIComponent(slug)}?print=1`;

  const browser = await puppeteer.launch({
    headless: true,                     // <-- фикс
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({ format: "A4", printBackground: true });

    // создаём новую копию байт → у неё .buffer гарантированно ArrayBuffer (не SharedArrayBuffer)
    const ab = new Uint8Array(pdf).buffer;

    return new Response(ab, {
    headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${slug}.pdf"`,
    },
    });
  } finally {
    await browser.close();
  }
}

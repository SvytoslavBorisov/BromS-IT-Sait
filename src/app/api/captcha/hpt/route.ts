// src/app/api/captcha/hpt/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const raw = (request.headers as any).get?.("cookie") || "";
  const match = raw.split(/;\s*/).find((c: string) => c.startsWith("hpt="));
  if (!match) return NextResponse.json({ ok: false });
  return NextResponse.json({ ok: true, hpt: match.split("=")[1] });
}

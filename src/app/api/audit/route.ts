// src/app/api/audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // поправь путь при необходимости
import { logger, ensureRequestId } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const rid = ensureRequestId(req.headers.get("x-request-id"));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }

  // нормализуем событие
  const event = typeof body?.event === "string" ? body.event : "audit.event";
  delete body.event;

  logger.child({ requestId: rid, module: "ui/audit" }).info({
    event,
    outcome: "success",
    userId: (session.user as any)?.id,
    ip,
    ua,
    ...body,
  });

  return NextResponse.json({ ok: true }, { headers: { "x-request-id": rid } });
}

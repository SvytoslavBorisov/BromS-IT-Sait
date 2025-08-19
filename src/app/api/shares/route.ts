// src/app/api/shares/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger, ensureRequestId } from "@/lib/logger";

export const runtime = "nodejs";

type ShareInput = {
  recipientId: string;
  x: string;
  ciphertext: number[];
  status: "ACTIVE" | "USED" | "EXPIRED";
  comment: string;
  encryptionAlgorithm: string;
  expiresAt: string | null;
};

type Body = {
  p: string;
  q: string;
  g: string;
  // параметры для ASYMMETRIC-ключа
  p_as_key?: string;
  a_as_key?: string;
  b_as_key?: string;
  m_as_key?: string;
  q_as_key?: string;
  xp_as_key?: string;
  yp_as_key?: string;
  Q_as_key?: string;

  commitments: string[];
  title: string;
  threshold: number;
  type: "CUSTOM" | "ASYMMETRIC";
  publicKey?: string;
  shares: ShareInput[];
};

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const requestId = ensureRequestId(req.headers.get("x-request-id"));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  const log = logger.child({ requestId, module: "api/shares" });

  try {
    // 1) Авторизация
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn({ event: "vss.create_failed", reason: "unauthorized", ip, ua });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "x-request-id": requestId } });
    }
    const dealerId = session.user.id;

    // 2) Парсим тело
    let body: Body;
    try {
      body = await req.json();
    } catch {
      log.warn({ event: "vss.create_failed", reason: "bad_json", userId: dealerId, ip, ua });
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: { "x-request-id": requestId } });
    }

    const {
      p, q, g,
      p_as_key, a_as_key, b_as_key, q_as_key, xp_as_key, yp_as_key, Q_as_key,
      commitments, title, threshold, type, publicKey, shares,
    } = body;

    // 3) Валидация базовых полей
    if (!p || !q || !g || !Array.isArray(commitments) || !title || !threshold || !type || !Array.isArray(shares)) {
      log.warn({ event: "vss.create_failed", reason: "validation_error", userId: dealerId });
      return NextResponse.json({ error: "Invalid params" }, { status: 400, headers: { "x-request-id": requestId } });
    }

    if (type === "ASYMMETRIC" && (!publicKey || !p_as_key || !a_as_key || !b_as_key || !q_as_key || !xp_as_key || !yp_as_key || !Q_as_key)) {
      log.warn({ event: "vss.create_failed", reason: "missing_asymmetric_params", userId: dealerId });
      return NextResponse.json({ error: "Missing asymmetric key params" }, { status: 400, headers: { "x-request-id": requestId } });
    }

    log.info({
      event: "vss.create_start",
      userId: dealerId,
      type,
      threshold,
      sharesCount: shares.length,
      ip,
      ua,
    });

    // 4) Создаём VSS-сессию
    const vssSession = await prisma.shamirSession.create({
      data: {
        dealerId,
        p, q, g,
        commitments,
        threshold,
        title,
        type,
      },
    });

    // 5) Если ASYMMETRIC — сохраняем параметры ключа
    if (type === "ASYMMETRIC") {
      await prisma.asymmetricKey.create({
        data: {
          privateKeySharingId: vssSession.id,
          publicKey: publicKey!, // уже проверили
          p: p_as_key!,
          a: a_as_key!,
          b: b_as_key!,
          q: q_as_key!,
          xp: xp_as_key!,
          yp: yp_as_key!,
          Q: Q_as_key!,
        },
      });
    }

    // 6) Сохраняем все доли
    if (shares.length > 0) {
      await prisma.share.createMany({
        data: shares.map((s) => ({
          sessionId: vssSession.id,
          userId: s.recipientId,
          x: s.x,
          ciphertext: s.ciphertext,
          status: s.status,
          comment: s.comment,
          encryptionAlgorithm: s.encryptionAlgorithm,
          expiresAt: s.expiresAt ? new Date(s.expiresAt) : null,
        })),
      });

      // детальные логи по долям — info
      for (const s of shares) {
        log.info({
          event: "vss.share_saved",
          sessionId: vssSession.id,
          recipient: s.recipientId,
          x: s.x,
          status: s.status,
          userId: dealerId,
        });
      }
    }

    log.info({
      event: "vss.create_success",
      sessionId: vssSession.id,
      userId: dealerId,
      type,
      threshold,
      sharesCount: shares.length,
      latencyMs: Date.now() - t0,
    });

    return NextResponse.json(
      { ok: true, sessionId: vssSession.id, requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (err) {
    const e = err as Error;
    logger.child({ requestId, module: "api/shares" }).error({
      event: "vss.create_failed",
      reason: "exception",
      message: e.message,
      stack: e.stack,
    });
    return NextResponse.json(
      { error: "Internal error", requestId },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}

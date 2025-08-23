import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DkgSessionStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// маленький хелпер для чисел
function toInt(v: unknown, def: number): number {
  const n = typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? Math.trunc(v) : NaN;
  return Number.isFinite(n) ? n : def;
}

/**
 * GET /api/dkg/sessions
 * Возвращает список активных/ожидающих комнат.
 * Формат ответа: { ok: true, items: Array<{ id, n, t, epoch, status, participantsCount? }> }
 */
export async function GET() {
  try {
    const rows = await prisma.dkgSession.findMany({
      // при желании можно фильтровать по статусу:
      // where: { status: { in: [DkgSessionStatus.LOBBY, DkgSessionStatus.RUNNING] } },
      orderBy: { id: "desc" },
      include: {
        _count: {
          select: {
            // предполагаем связь DkgSession -> DkgParticipant[] называется 'participants'
            participants: true,
          },
        },
      },
      take: 100,
    });

    const items = rows.map((s) => ({
      id: s.id,
      n: s.n,
      t: s.t,
      epoch: s.epoch,
      status: s.status,
      // если связи нет в схеме — просто убери этот ключ
      participantsCount: (s as any)._count?.participants ?? 0,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "GET failed" }, { status: 500 });
  }
}

/**
 * POST /api/dkg/sessions
 * Тело: { n: number, t: number, epoch?: string }
 * Ответ: { ok: true, id, item }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const n = toInt(body?.n, 3);
    const t = toInt(body?.t, 2);
    const epochInput = typeof body?.epoch === "string" ? body.epoch.trim() : "";
    const epoch = epochInput || new Date().toISOString();

    // валидация новой логики
    if (!Number.isInteger(n) || n < 2) {
      return NextResponse.json({ ok: false, error: "n должно быть ≥ 2" }, { status: 400 });
    }
    if (!Number.isInteger(t) || t < 2) {
      return NextResponse.json({ ok: false, error: "t должно быть ≥ 2" }, { status: 400 });
    }
    if (t > n) {
      return NextResponse.json({ ok: false, error: "t не может быть больше n" }, { status: 400 });
    }

    const ses = await prisma.dkgSession.create({
      data: {
        n,
        t,
        epoch,
        status: DkgSessionStatus.LOBBY, // новая логика: создаём в лобби
      },
    });

    return NextResponse.json({
      ok: true,
      id: ses.id,
      item: {
        id: ses.id,
        n: ses.n,
        t: ses.t,
        epoch: ses.epoch,
        status: ses.status,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "POST failed" }, { status: 500 });
  }
}

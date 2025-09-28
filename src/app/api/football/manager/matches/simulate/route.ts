import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { resolveShot } from "../../domain/engines/shot";

// Стабильный 32-битный хэш строки -> число (для PlayerSnapshot.id: number)
function hashToInt32(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0; // 32-bit
  }
  // Приведём к положительному диапазону, чтобы не было отрицательных id
  return h >>> 0;
}

type SimEvent = {
  team: "home" | "away";
  playerId: string; // в событиях храним исходный строковый id из БД
  xg: number;
  goal: boolean;
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const matchId: unknown = body?.matchId;

  if (typeof matchId !== "string" || !matchId.trim()) {
    return NextResponse.json({ error: "matchId (string) is required" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const homeSquad = match.homeTeam.players;
  const awaySquad = match.awayTeam.players;
  if (!homeSquad.length || !awaySquad.length) {
    return NextResponse.json({ error: "One of the teams has no players" }, { status: 409 });
  }

  let homeGoals = 0;
  let awayGoals = 0;
  const events: SimEvent[] = [];

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // 10 ударов домашней
  for (let i = 0; i < 10; i++) {
    const s = pick(homeSquad);
    const shot = resolveShot({
      shooter: {
        id: hashToInt32(s.id), // <-- доменный number
        name: s.name ?? "Unnamed",
        position: s.position ?? "ST",
        stats: {
          pace: s.pace ?? 50,
          pass: s.pass ?? 50,
          shot: s.shot ?? 50,
          dribble: s.dribble ?? 50,
          defense: s.defense ?? 50,
          stamina: s.stamina ?? 50,
        },
      },
      distance: 12 + Math.random() * 20,
      angle: Math.random(),
      pressure: Math.random() * 0.8,
    });
    if (shot.isGoal) homeGoals++;
    events.push({ team: "home", playerId: s.id, xg: shot.xg, goal: shot.isGoal });
  }

  // 10 ударов гостевой
  for (let i = 0; i < 10; i++) {
    const s = pick(awaySquad);
    const shot = resolveShot({
      shooter: {
        id: hashToInt32(s.id), // <-- доменный number
        name: s.name ?? "Unnamed",
        position: s.position ?? "ST",
        stats: {
          pace: s.pace ?? 50,
          pass: s.pass ?? 50,
          shot: s.shot ?? 50,
          dribble: s.dribble ?? 50,
          defense: s.defense ?? 50,
          stamina: s.stamina ?? 50,
        },
      },
      distance: 12 + Math.random() * 20,
      angle: Math.random(),
      pressure: Math.random() * 0.8,
    });
    if (shot.isGoal) awayGoals++;
    events.push({ team: "away", playerId: s.id, xg: shot.xg, goal: shot.isGoal });
  }

  const result = { homeGoals, awayGoals, events };

  await prisma.match.update({
    where: { id: match.id },
    data: { status: MatchStatus.finished, result },
  });

  return NextResponse.json({ ok: true, result });
}

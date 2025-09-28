import { prisma } from "@/lib/prisma";
import { roundRobin } from "../../domain/league/schedule";
import { NextResponse } from "next/server";

export async function POST() {
  // строковые cuid
  const teams = await prisma.teams.findMany({ select: { id: true } });
  const teamIds = teams.map((t) => t.id); // string[]

  // Сопоставим индекс <-> string id
  // RR будет работать по индексам [0..n-1]
  const indexes = teamIds.map((_, i) => i); // number[]

  // Твой roundRobin ожидает number[] -> Array<Array<[number, number]>>
  const roundsIdx = roundRobin(indexes);

  const now = new Date();
  const toCreate: Array<{ homeId: string; awayId: string; scheduledAt: Date }> = [];

  for (let i = 0; i < roundsIdx.length; i++) {
    for (const [homeIdx, awayIdx] of roundsIdx[i]) {
      const homeId = teamIds[homeIdx]; // string cuid
      const awayId = teamIds[awayIdx]; // string cuid
      const when = new Date(now.getTime() + i * 7 * 24 * 3600 * 1000); // раз в неделю
      toCreate.push({ homeId, awayId, scheduledAt: when });
    }
  }

  if (toCreate.length > 0) {
    await prisma.match.createMany({ data: toCreate });
  }

  return NextResponse.json({ rounds: roundsIdx.length, matches: toCreate.length });
}

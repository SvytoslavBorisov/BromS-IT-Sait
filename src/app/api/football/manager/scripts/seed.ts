import { prisma } from "@/lib/prisma";

async function main() {
  const teamA = await prisma.team.create({ data: { name: "Broms United" } });
  const teamB = await prisma.team.create({ data: { name: "Sofa City" } });

  const mk = (name: string, position: string, teamId: number, s: Partial<{pace:number, pass:number, shot:number, dribble:number, defense:number, stamina:number}> = {}) => ({
    name, position, teamId, pace: 50, pass: 50, shot: 50, dribble: 50, defense: 50, stamina: 50, ...s
  });

  await prisma.player.createMany({ data: [
    mk("A. Ivanov", "ST", teamA.id, { shot: 78, pace: 72 }),
    mk("B. Petrov", "CM", teamA.id, { pass: 75, stamina: 70 }),
    mk("C. Sidorov", "CB", teamA.id, { defense: 80 }),
    mk("D. Smirnov", "RW", teamB.id, { dribble: 77, pace: 76 }),
    mk("E. Egorov", "CM", teamB.id, { pass: 74 }),
    mk("F. Frolov", "GK", teamB.id, { defense: 82 }),
  ]});

  const match = await prisma.match.create({ data: { homeId: teamA.id, awayId: teamB.id, scheduledAt: new Date() } });

  console.log("Seed done. Match id:", match.id);
}

main().finally(() => prisma.$disconnect());

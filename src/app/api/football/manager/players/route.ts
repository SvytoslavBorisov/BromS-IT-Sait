import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const players = await prisma.players_fifa.findMany({ include: { team: true } });
  return NextResponse.json(players);
}

export async function POST(req: Request) {
  const body = await req.json();
  const created = await prisma.players_fifa.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}

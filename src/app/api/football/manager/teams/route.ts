import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const teams = await prisma.team.findMany({ include: { players: true } });
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const body = await req.json();
  const created = await prisma.team.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}

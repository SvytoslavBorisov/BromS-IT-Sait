// app/api/players/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const id = params.id; // cuid-строка
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const player = await prisma.players_fifa.findUnique({
    where: { id },
    include: { team: true },
  });

  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(player);
}

export async function PATCH(req: Request, { params }: Params) {
  const id = params.id; // cuid-строка
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const body = await req.json();

  // При желании можешь отфильтровать разрешённые поля
  // const { name, position, pace, pass, shot, dribble, defense, stamina, teamId } = body;

  const updated = await prisma.players_fifa.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(updated);
}

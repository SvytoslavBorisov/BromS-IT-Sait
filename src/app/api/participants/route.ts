import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions }       from "@/lib/auth";

// 1) тип для записи «как пришло» из БД
export interface RawParticipant {
  id: string;
  name: string | null;
  publicKey: unknown;
  managerId: string | null;
}

// 2) тип для узла уже с children
export interface ParticipantNode {
  id: string;
  name: string;
  publicKey: unknown;
  children: ParticipantNode[];
}

// 3) buildTree c аннотацией возвращаемого типа
function buildTree(
  nodes: RawParticipant[],
  parentId: string | null = null
): ParticipantNode[] {
  return nodes
    .filter((u) => u.managerId === parentId)
    .map((u) => ({
      id: u.id,
      // гарантируем, что name — всегда string
      name: u.name ?? u.id,
      publicKey: u.publicKey,
      // рекурсивно строим потомков
      children: buildTree(nodes, u.id),
    }));
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Просто плоский список участников
  const participants = await prisma.user.findMany({
    where: { publicKey: { not: undefined } },
    select: {
      id: true,
      name: true,
      publicKey: true,
      managerId: true,
    },
  });

  // Ни о каких дочерних узлах здесь не думаем
  return NextResponse.json(participants);
}
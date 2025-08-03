// src/app/participants/page.tsx
import { prisma } from "@/lib/prisma";
import ParticipantTree, { TreeNode } from "@/components/ParticipantTree";
import OrgChart from "@/components/OrgChart";

export default async function ParticipantsPage() {
  // 1) Получаем всех участников
  const participants = await prisma.user.findMany({
    where: { publicKey: { not: undefined } },
    select: {
      id: true,
      name: true,
      publicKey: true,
      managerId: true,
    },
  });

  // 2) Собираем дерево (можно вынести в общую утилиту)
  function buildTree(
    nodes: typeof participants,
    parentId: string | null = null
  ): TreeNode[] {
    return nodes
      .filter((u) => u.managerId === parentId)
      .map((u) => ({
        id: u.id,
        name: u.name ?? u.id,
        publicKey: u.publicKey,
        children: buildTree(nodes, u.id),
      }));
  }

  const tree = buildTree(participants, null);

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-6">Оргструктура участников</h1>
      <ParticipantTree data={tree} />
      <h1 className="text-3xl font-bold mb-4">Оргструктура участников</h1>
      <OrgChart data={tree} />
    </div>
  );
}

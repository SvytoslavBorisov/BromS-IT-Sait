import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = await prisma.teams.findMany({ include: { players: true } });
  return (
    <div className="space-y-4">
      {teams.map(t => (
        <div key={t.id} className="card p-4">
          <div className="h2 mb-2">{t.title}</div>
          <div className="muted text-sm mb-2">Игроков: {t.players.length}</div>
          <ul className="list-disc pl-6 text-sm">
            {t.players.map(p => (<li key={p.id}>{p.name} — {p.position}</li>))}
          </ul>
        </div>
      ))}
    </div>
  );
}

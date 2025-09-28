// app/(whatever)/players/page.tsx
import { prisma } from "@/lib/prisma";
import { PlayerCard } from "../components/PlayerCard";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await prisma.players_fifa.findMany({
    include: { team: true },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {players.map((p) => (
        <PlayerCard
          key={p.id}
          name={p.name ?? p.full_name ?? p.first_name ?? "Unnamed"}
          position={p.position ?? "ST"}
          team={p.team?.title ?? null}
          stats={{
            pace: p.pace ?? 50,
            pass: p.pass ?? 50,
            shot: p.shot ?? 50,
            dribble: p.dribble ?? 50,
            defense: p.defense ?? 50,
            stamina: p.stamina ?? 50,
          }}
        />
      ))}
    </div>
  );
}

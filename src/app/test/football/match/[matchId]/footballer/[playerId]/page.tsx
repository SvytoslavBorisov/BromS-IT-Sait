import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerInMatchClient from "./PlayerInMatchClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({
  params,
}: {
  params: Promise<{ matchId?: string | string[]; playerId?: string | string[] }>;
}) {
  const p = await params;
  const rawMatchId = Array.isArray(p.matchId) ? p.matchId[0] : p.matchId;
  const rawPlayerId = Array.isArray(p.playerId) ? p.playerId[0] : p.playerId;

  const matchId = (rawMatchId ?? "").trim();
  const playerId = (rawPlayerId ?? "").trim();
  if (!matchId || !playerId) notFound();

  return (
    <main className="mx-auto max-w-7xl px-4 md:px-8 py-6">
      <div className="mb-5 flex items-center justify-between">
        <Link href={`/test/football/match/${encodeURIComponent(matchId)}`} className="text-sm text-sky-700 hover:underline">
          ← к матчу #{encodeURIComponent(matchId)}
        </Link>
        <Link href={`/test/football/footballer/${encodeURIComponent(playerId)}`} className="text-sm text-sky-700 hover:underline">
          Полный профиль игрока →
        </Link>
      </div>

      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-6">
        Игрок #{encodeURIComponent(playerId)} в матче #{encodeURIComponent(matchId)}
      </h1>

      <PlayerInMatchClient matchId={matchId} playerId={playerId} />
    </main>
  );
}

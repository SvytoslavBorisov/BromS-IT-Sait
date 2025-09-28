import Link from "next/link";
import { notFound } from "next/navigation";
import ClientApp from "../ClientApp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MatchPage({
  params,
}: {
  params: Promise<{ matchId?: string | string[] }>;
}) {
  const p = await params; // Next 15: params — Promise
  const rawId = Array.isArray(p.matchId) ? p.matchId[0] : p.matchId;
  const id = (rawId ?? "").trim();

  if (!id) notFound();

  return (
    <main className="max-w-8xl mx-auto px-4 md:px-8 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/test/football/footballer" className="text-sm text-blue-600 hover:underline">
          ← ко всем футболистам
        </Link>
        <div className="text-sm text-neutral-500">Матч #{encodeURIComponent(id)}</div>
      </div>

      <ClientApp matchId={id} />
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerDetails from "./PlayerDetails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FootballerPage({
  params,
}: {
  params: Promise<{ id?: string | string[] }>;
}) {
  const p = await params;
  const rawId = Array.isArray(p.id) ? p.id[0] : p.id;
  const id = (rawId ?? "").trim();
  if (!id) notFound();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4">
        <Link href="/test/football/footballer" className="text-sm text-blue-600 hover:underline">
          ← ко всем футболистам
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-4">Игрок #{encodeURIComponent(id)}</h1>
      <PlayerDetails id={id} />
    </main>
  );
}

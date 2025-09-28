// app/test/football/footballer/page.tsx
import Link from "next/link";
import { getIndexTop } from "@/app/test/football/lib/loadPlayersIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIMIT = 100;

export default async function FootballersPage({
  // 👇 ВАЖНО: Promise и потом await внутри
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;                           // ✅ await
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";  // аккуратно с массивами
  const club = (Array.isArray(sp.club) ? sp.club[0] : sp.club) ?? "";
  const sortBy = (Array.isArray(sp.sortBy) ? sp.sortBy[0] : sp.sortBy) ?? "name";

  const { items, total } = await getIndexTop({
    q: q.trim(),
    club: club.trim(),
    sortBy: sortBy as any,
    limit: LIMIT,
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Все футболисты</h1>

      <form className="flex flex-wrap items-center gap-2 mb-4" action="/test/football/footballer" method="get">
        <input name="q" defaultValue={q} placeholder="Поиск по имени" className="px-3 py-2 border rounded-md" />
        <input name="club" defaultValue={club} placeholder="Клуб" className="px-3 py-2 border rounded-md" />
        <select name="sortBy" defaultValue={sortBy} className="px-3 py-2 border rounded-md">
          <option value="name">Имя</option>
          <option value="club">Клуб</option>
          <option value="goals">Голы</option>
          <option value="xg">xG</option>
          <option value="minutes">Минуты</option>
        </select>
        <button className="px-4 py-2 rounded-md border">Применить</button>
      </form>

      <p className="text-sm text-neutral-500 mb-3">
        Показано: {items.length} (макс. {LIMIT}). В индексе (по срезу): {total}.
      </p>

      <ul className="space-y-2">
        {items.map((p) => {
          const id = String(p.id);
          return (
            <li key={id} className="border rounded-xl p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">
                    <Link className="hover:underline" href={`/test/football/footballer/${encodeURIComponent(id)}`}>
                      {p.name || `#${id}`}
                    </Link>
                  </div>
                  <div className="text-sm text-neutral-500">
                    {p.club || "—"} · {p.position || "—"} · матчи: {Number(p.matches_count ?? 0)} · минуты:{" "}
                    {Math.round(Number(p.minutes_sum ?? 0))}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div>Голы: <b>{Number(p.goals_sum ?? 0)}</b></div>
                  <div>xG: <b>{Number(p.xg_sum ?? 0).toFixed(2)}</b></div>
                  <div>Final 1/3: <b>{Number(p.passes_final_third_sum ?? 0)}</b></div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

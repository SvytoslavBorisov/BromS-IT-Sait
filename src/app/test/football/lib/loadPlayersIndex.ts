// app/test/football/lib/loadPlayersIndex.ts
import "server-only";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";

export type PlayerIndex = {
  id: number | string;
  name?: string | null;
  club?: string | null;
  position?: string | null;
  matches_count: number;
  minutes_sum: number;
  goals_sum: number;
  xg_sum: number;
  passes_final_third_sum: number;
};

// .env.local:
// PLAYERS_INDEX_PATH=D:\football-data\players_index.json
// или пусть валяется в .data рядом с проектом
const DEFAULT_DIR = path.join(process.cwd(), ".data");
const DEFAULT_FILE = path.join(DEFAULT_DIR, "players_index.json");

async function resolveIndexFile(): Promise<string> {
  const envPath = process.env.PLAYERS_INDEX_PATH;
  const candidate = envPath ? envPath : DEFAULT_FILE;

  // если передали папку — добавим имя файла
  let stat: fs.Stats | null = null;
  try { stat = await fsp.stat(candidate); } catch {}

  if (stat?.isDirectory()) {
    const fixed = path.join(candidate, "players_index.json");
    const st2 = await fsp.stat(fixed).catch(() => null);
    if (!st2?.isFile()) throw new Error(`PLAYERS_INDEX_PATH указывает на папку, а файла ${fixed} нет`);
    return fixed;
  }

  if (!stat?.isFile()) {
    throw new Error(`Не найден файл индекса игроков: ${candidate}`);
  }

  return candidate;
}

// маленький кэш на 100
let smallCache: PlayerIndex[] | null = null;

type SortKey = "name" | "club" | "goals" | "xg" | "minutes";

function sortPlayers(arr: PlayerIndex[], sortBy: SortKey) {
  const a = arr.slice();
  switch (sortBy) {
    case "name": a.sort((x, y) => (x.name || "").localeCompare(y.name || "")); break;
    case "club": a.sort((x, y) => (x.club || "").localeCompare(y.club || "")); break;
    case "goals":
      a.sort((x,y) =>
        Number(y.goals_sum ?? 0) - Number(x.goals_sum ?? 0) ||
        Number(y.xg_sum ?? 0)    - Number(x.xg_sum ?? 0)
      );
      break;
    case "xg": a.sort((x,y)=>Number(y.xg_sum ?? 0)-Number(x.xg_sum ?? 0)); break;
    case "minutes": a.sort((x,y)=>Number(y.minutes_sum ?? 0)-Number(x.minutes_sum ?? 0)); break;
  }
  return a;
}

async function readFirstPlayers(limit: number): Promise<PlayerIndex[]> {
  const file = await resolveIndexFile(); // ✅ теперь точно файл
  return new Promise((resolve, reject) => {
    const out: PlayerIndex[] = [];
    const pipeline = chain([
      fs.createReadStream(file, { encoding: "utf8", highWaterMark: 1 << 20 }),
      parser(),
      pick({ filter: "players" }),
      streamArray(),
    ]);

    const done = (err?: any) => { try { pipeline.destroy(); } catch {} err ? reject(err) : resolve(out); };

    pipeline.on("data", (data: { key: number; value: PlayerIndex }) => {
      out.push(data.value);
      if (out.length >= limit) done();
    });
    pipeline.on("end", () => done());
    pipeline.on("error", (e) => done(e));
  });
}

export async function getIndexTop(opts: {
  q?: string; club?: string; sortBy?: SortKey; limit?: number;
} = {}) {
  const limit = Math.max(1, Math.min(opts.limit ?? 100, 100));
  const sortBy: SortKey = opts.sortBy ?? "name";
  const q = (opts.q ?? "").trim().toLowerCase();
  const club = (opts.club ?? "").trim().toLowerCase();

  if (!smallCache || smallCache.length < limit) {
    smallCache = await readFirstPlayers(limit);
  }

  let arr = smallCache;
  if (q)    arr = arr.filter(p => ((p.name || String(p.id))).toLowerCase().includes(q));
  if (club) arr = arr.filter(p => (p.club || "").toLowerCase() === club);

  const items = sortPlayers(arr, sortBy).slice(0, limit);
  return { items, total: items.length };
}

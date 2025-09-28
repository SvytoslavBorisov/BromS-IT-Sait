// src/app/test/football/lib/loadPlayers.ts
import 'server-only';
import fs from 'fs/promises';
import path from 'path';

export type PlayerTotal = {
  id: number | string;
  name?: string | null;
  club?: string | null;
  position?: string | null;
  positions?: Record<string, number>;
  clubs?: Record<string, number>;
  match_ids: string[];
  matches_count: number;

  // --- суммы по времени/основные
  minutes_sum: number;
  shots_sum: number;
  goals_sum: number;
  xg_sum: number;

  // --- пасы (общие и продвинутые)
  passes_att_sum: number;
  passes_cmp_sum: number;
  key_passes_sum: number;
  assists_sum: number;
  xa_sum: number;                      // expected assists (сумма xG по ассистированным ударам)

  // --- география/качество пасов
  passes_final_third_sum: number;      // пасы в финальную треть
  passes_into_box_sum: number;         // пасы в штрафную
  progressive_passes_sum: number;      // прогрессивные пасы

  // --- типы пасов
  crosses_sum: number;
  switches_sum: number;
  through_balls_sum: number;
  cutbacks_sum: number;

  // --- длины пасов
  passes_short_sum: number;
  passes_medium_sum: number;
  passes_long_sum: number;

  // --- приёмы/переносы мяча
  ball_receipts_sum: number;
  carries_sum: number;
  carries_distance_sum: number;
  progressive_carries_sum: number;

  // --- оборона/давление
  pressures_sum: number;
  clearances_sum: number;
  interceptions_sum: number;
  tackles_sum: number;

  // --- дриблинг
  dribbles_sum: number;
  dribbles_complete_sum: number;

  // --- единоборства/фолы
  duels_sum: number;
  duels_won_sum: number;
  fouls_committed_sum: number;
  fouls_won_sum: number;

  // --- предрасчитанные средние (генерируются скриптом)
  // на матч:
  [k: `${string}_avg_per_match`]: number | undefined;
  // на 90:
  [k2: `${string}_per90`]: number | undefined;

  // --- проценты/коэффициенты
  pass_completion_pct?: number | null;
  duels_win_pct?: number | null;
  dribbles_success_pct?: number | null;
};

const PLAYERS_JSON_PATH = path.join(process.cwd(), 'src','app','test','football','players_agg.json');

type PlayersFile = { players: PlayerTotal[] };

let cache: PlayersFile | null = null;

export async function loadPlayers(): Promise<PlayersFile> {
  if (cache) return cache;
  const raw = await fs.readFile(PLAYERS_JSON_PATH, 'utf8');
  const json = JSON.parse(raw);
  if (!json || !Array.isArray(json.players)) throw new Error('Bad players_agg.json');
  cache = json;
  return json;
}

export type ListOpts = {
  q?: string;             // поиск по имени
  club?: string;
  sortBy?: 'name'|'club'|'goals'|'xg'|'minutes';
  page?: number;          // 1-based
  perPage?: number;       // по умолчанию 100
};

export async function getPagedPlayers(opts: ListOpts = {}) {
  const { players } = await loadPlayers();
  const perPage = Math.min(Math.max(opts.perPage ?? 10, 1), 100); // защита
  const page = Math.max(opts.page ?? 1, 1);

  let arr = players;

  if (opts.q) {
    const needle = opts.q.toLowerCase();
    arr = arr.filter(p => (p.name || String(p.id)).toLowerCase().includes(needle));
  }
  if (opts.club) {
    arr = arr.filter(p => (p.club || '').toLowerCase() === opts.club!.toLowerCase());
  }

  switch (opts.sortBy) {
    case 'name': arr = arr.toSorted((a,b)=>(a.name||'').localeCompare(b.name||'')); break;
    case 'club': arr = arr.toSorted((a,b)=>(a.club||'').localeCompare(b.club||'')); break;
    case 'goals': arr = arr.toSorted((a,b)=> (b.goals_sum - a.goals_sum) || (b.xg_sum - a.xg_sum)); break;
    case 'xg': arr = arr.toSorted((a,b)=> b.xg_sum - a.xg_sum); break;
    case 'minutes': arr = arr.toSorted((a,b)=> b.minutes_sum - a.minutes_sum); break;
    default: break;
  }

  const total = arr.length;
  const from = (page-1)*perPage;
  const pageItems = arr.slice(from, from+perPage);

  return { items: pageItems, total, page, perPage, pages: Math.max(1, Math.ceil(total/perPage)) };
}

export async function getPlayerById(id: string) {
  const { players } = await loadPlayers();
  const byStr = players.find(p => String(p.id) === id);
  if (byStr) return byStr;
  const asNum = Number(id);
  if (!Number.isNaN(asNum)) return players.find(p => Number(p.id) === asNum) || null;
  return null;
}

// scripts/aggregatePlayers.ts
// Node 18+, TypeScript
import * as fs from "fs";
import * as path from "path";

const INPUT_GLOB_EXT = ".json";               // читаем все *.json из текущей папки
const OUTPUT_JSON = "players_agg.json";
const DEFAULT_MATCH_LENGTH = 90;              // min, если по событиям меньше
const PITCH_W = 120;                          // StatsBomb
const PITCH_H = 80;

// --- Типы (частичные под StatsBomb v4) ---
type SBIdName = { id?: number | string; name?: string };
type SBEvent = {
  id?: string;
  type?: SBIdName;
  team?: SBIdName;
  player?: SBIdName;
  minute?: number;
  second?: number;
  location?: number[]; // [x,y]
  pass?: {
    outcome?: SBIdName; // Incomplete и т.п.
    assisted_shot_id?: string;
    end_location?: number[];
    length?: number;
    height?: SBIdName; // High/Ground etc
    cross?: boolean;
    switch?: boolean;
    shot_assist?: boolean;   // бывает
    cut_back?: boolean;
    through_ball?: boolean;
  };
  shot?: {
    outcome?: SBIdName; // Goal
    statsbomb_xg?: number;
  };
  dribble?: {
    outcome?: SBIdName; // Complete
    overrun?: boolean;
    nutmeg?: boolean;
  };
  duel?: {
    outcome?: SBIdName; // Won/Lost
    type?: SBIdName;    // Aerial double etc
  };
  carry?: {
    end_location?: number[];
  };
  tactics?: {
    lineup?: Array<{
      player?: SBIdName;
      position?: SBIdName;
      jersey_number?: number;
    }>;
  };
  position?: SBIdName; // иногда есть у событий
  substitution?: { replacement?: SBIdName };
};

type PlayerMatchAgg = {
  team_id?: number | string | null;
  team_name?: string | null;
  name?: string | null;
  minutes: number;

  // --- СУММЫ ---
  shots: number;
  goals: number;
  xg: number;

  // Пасы общие
  passes_att: number;
  passes_cmp: number;
  key_passes: number; // shot assist
  assists: number;    // фактические ассисты (по assisted_shot_id)
  xa: number;         // xA — сумма xG по ассистированным ударам

  // География пасов
  passes_final_third: number;   // в финальную треть (end_x>=80)
  passes_into_box: number;      // в штрафную (прямоугольник у ворот)
  progressive_passes: number;   // прогрессивные (эвристика Δx>=15 или в штрафную)

  // Типы пасов
  crosses: number;
  switches: number;
  through_balls: number;
  cutbacks: number;

  // Длины пасов
  passes_short: number;   // <15м
  passes_medium: number;  // 15-30м
  passes_long: number;    // >=30м

  // Приёмы, владение, переносы
  ball_receipts: number;
  carries: number;
  carries_distance: number;     // по евклиду
  progressive_carries: number;  // эвристика Δx>=10

  // Давление/оборона
  pressures: number;
  clearances: number;
  interceptions: number;
  tackles: number;

  // Дриблинги
  dribbles: number;
  dribbles_complete: number;

  // Единоборства/фолы
  duels: number;
  duels_won: number;
  fouls_committed: number;
  fouls_won: number;

  // Карточки (если понадобятся, можно расширить)
  yellow_cards?: number;
  red_cards?: number;

  // Позиция из стартового состава/замен (для матча)
  positions_seen: string[];
};

type PlayerTotal = {
  id: number | string;
  name?: string | null;
  club?: string | null;           // модальный клуб
  clubs: Record<string, number>;  // счётчик матчей по клубам
  position?: string | null;       // модальная позиция
  positions: Record<string, number>;
  match_ids: string[];
  matches_count: number;

  // --- суммы ---
  minutes_sum: number;
  shots_sum: number;
  goals_sum: number;
  xg_sum: number;

  passes_att_sum: number;
  passes_cmp_sum: number;
  key_passes_sum: number;
  assists_sum: number;
  xa_sum: number;

  passes_final_third_sum: number;
  passes_into_box_sum: number;
  progressive_passes_sum: number;

  crosses_sum: number;
  switches_sum: number;
  through_balls_sum: number;
  cutbacks_sum: number;

  passes_short_sum: number;
  passes_medium_sum: number;
  passes_long_sum: number;

  ball_receipts_sum: number;
  carries_sum: number;
  carries_distance_sum: number;
  progressive_carries_sum: number;

  pressures_sum: number;
  clearances_sum: number;
  interceptions_sum: number;
  tackles_sum: number;

  dribbles_sum: number;
  dribbles_complete_sum: number;

  duels_sum: number;
  duels_won_sum: number;
  fouls_committed_sum: number;
  fouls_won_sum: number;

  yellow_cards_sum?: number;
  red_cards_sum?: number;

  // --- средние ---
  // per match:
  [k: `${string}_avg_per_match`]: number | undefined;
  // per 90:
  [k2: `${string}_per90`]: number | undefined;

  // проценты:
  pass_completion_pct?: number | null;
  duels_win_pct?: number | null;
  dribbles_success_pct?: number | null;
};

// --- Утилиты ---
const mtime = (e: SBEvent) =>
  (e.minute ?? 0) + (e.second ?? 0) / 60;

const dist = (a?: number[], b?: number[]) => {
  if (!a || !b || a.length < 2 || b.length < 2) return 0;
  const dx = (b[0] ?? 0) - (a[0] ?? 0);
  const dy = (b[1] ?? 0) - (a[1] ?? 0);
  return Math.hypot(dx, dy);
};

const get = (o: any, path: (string | number)[], def?: any) => {
  let cur = o;
  for (const k of path) {
    if (cur == null) return def;
    cur = cur[k as any];
  }
  return cur ?? def;
};

// финальная треть — x >= 80
const isFinalThird = (end?: number[]) => !!end && end[0] >= 80;
// штрафная соперника — x>=102, 18<=y<=62 (по сетке 120×80)
const isIntoBox = (end?: number[]) => !!end && end[0] >= 102 && end[1] >= 18 && end[1] <= 62;
// прогрессивный пас — эвристика: значимо продвинул вперёд или доставил в штрафную
const isProgressivePass = (start?: number[], end?: number[]) => {
  if (!start || !end) return false;
  const dx = (end[0] ?? 0) - (start[0] ?? 0);
  return dx >= 15 || isIntoBox(end);
};
// прогрессивное ведение — эвристика: Δx>=10
const isProgressiveCarry = (start?: number[], end?: number[]) => {
  if (!start || !end) return false;
  return (end[0] ?? 0) - (start[0] ?? 0) >= 10;
};

// длина паса
const passLengthBucket = (len?: number) => {
  const L = len ?? 0;
  if (L < 15) return "short";
  if (L < 30) return "medium";
  return "long";
};

// --- Парс одного файла матча ---
function parseMatch(filePath: string) {
  const match_id = path.basename(filePath, path.extname(filePath));
  const raw = fs.readFileSync(filePath, "utf-8");
  const events: SBEvent[] = JSON.parse(raw);

  let match_end = 0;
  for (const ev of events) match_end = Math.max(match_end, mtime(ev));
  if (match_end < DEFAULT_MATCH_LENGTH) match_end = DEFAULT_MATCH_LENGTH;

  // стартовые составы + позиции
  const startingByTeam = new Map<string | number, Map<string | number, {name?: string|null; pos?: string|null; start: number; end: number}>>();
  const teamNames = new Map<string | number, string>();
  for (const ev of events) {
    if (get(ev, ["type","name"]) === "Starting XI") {
      const tid = get(ev, ["team","id"]);
      const tname = get(ev, ["team","name"]);
      if (tid == null) continue;
      teamNames.set(tid, tname);
      const lu = get(ev, ["tactics","lineup"], []) as any[];
      if (!startingByTeam.has(tid)) startingByTeam.set(tid, new Map());
      const roster = startingByTeam.get(tid)!;
      for (const item of lu || []) {
        const pid = get(item, ["player","id"]);
        if (pid == null) continue;
        const pname = get(item, ["player","name"]);
        const ppos = get(item, ["position","name"]);
        roster.set(pid, { name: pname, pos: ppos, start: 0, end: match_end });
      }
    }
  }

  // замены
  for (const ev of events) {
    if (get(ev, ["type","name"]) === "Substitution") {
      const t = mtime(ev);
      const tid = get(ev, ["team","id"]);
      if (tid == null) continue;
      const roster = startingByTeam.get(tid) ?? new Map();

      const outId = get(ev, ["player","id"]);
      const inId  = get(ev, ["substitution","replacement","id"]);
      const inName = get(ev, ["substitution","replacement","name"]);
      const inPos = get(ev, ["position","name"]);

      if (outId != null && roster.has(outId)) {
        roster.get(outId)!.end = Math.min(roster.get(outId)!.end, t);
      }
      if (inId != null) {
        if (!roster.has(inId)) {
          roster.set(inId, { name: inName, pos: inPos, start: t, end: match_end });
        } else {
          roster.get(inId)!.start = Math.min(roster.get(inId)!.start, t);
        }
      }
      startingByTeam.set(tid, roster);
    }
  }

  // shot_id -> xG, ассистент по assisted_shot_id
  const shotXg = new Map<string, number>();
  const shotAssistById = new Map<string, number | string>();
  for (const ev of events) {
    if (get(ev, ["type","name"]) === "Shot" && ev.id) {
      const xg = Number(get(ev, ["shot","statsbomb_xg"], 0)) || 0;
      shotXg.set(ev.id, xg);
    }
    if (get(ev, ["type","name"]) === "Pass") {
      const asid = get(ev, ["pass","assisted_shot_id"]);
      if (asid) {
        const passer = get(ev, ["player","id"]);
        if (passer != null) shotAssistById.set(String(asid), passer);
      }
    }
  }

  // итог по игрокам в матче
  const perPlayer = new Map<number|string, PlayerMatchAgg>();

  // инициализация из стартов/замен
  for (const [tid, roster] of startingByTeam) {
    for (const [pid, info] of roster) {
      perPlayer.set(pid, {
        team_id: tid, team_name: teamNames.get(tid) ?? null, name: info.name ?? null,
        minutes: Math.max(0, info.end - info.start),
        shots: 0, goals: 0, xg: 0,
        passes_att: 0, passes_cmp: 0, key_passes: 0, assists: 0, xa: 0,
        passes_final_third: 0, passes_into_box: 0, progressive_passes: 0,
        crosses: 0, switches: 0, through_balls: 0, cutbacks: 0,
        passes_short: 0, passes_medium: 0, passes_long: 0,
        ball_receipts: 0, carries: 0, carries_distance: 0, progressive_carries: 0,
        pressures: 0, clearances: 0, interceptions: 0, tackles: 0,
        dribbles: 0, dribbles_complete: 0,
        duels: 0, duels_won: 0, fouls_committed: 0, fouls_won: 0,
        positions_seen: info.pos ? [info.pos] : [],
      });
    }
  }

  // проход по событиям
  for (const ev of events) {
    const type = get(ev, ["type","name"]);
    const pid = get(ev, ["player","id"]);
    if (pid == null) continue;

    if (!perPlayer.has(pid)) {
      perPlayer.set(pid, {
        team_id: get(ev, ["team","id"]), team_name: get(ev, ["team","name"]) ?? null,
        name: get(ev, ["player","name"]) ?? null,
        minutes: 0,
        shots: 0, goals: 0, xg: 0,
        passes_att: 0, passes_cmp: 0, key_passes: 0, assists: 0, xa: 0,
        passes_final_third: 0, passes_into_box: 0, progressive_passes: 0,
        crosses: 0, switches: 0, through_balls: 0, cutbacks: 0,
        passes_short: 0, passes_medium: 0, passes_long: 0,
        ball_receipts: 0, carries: 0, carries_distance: 0, progressive_carries: 0,
        pressures: 0, clearances: 0, interceptions: 0, tackles: 0,
        dribbles: 0, dribbles_complete: 0,
        duels: 0, duels_won: 0, fouls_committed: 0, fouls_won: 0,
        positions_seen: [],
      });
    }
    const R = perPlayer.get(pid)!;

    // позиция, если встречается у события
    const ppos = get(ev, ["position","name"]);
    if (ppos && !R.positions_seen.includes(ppos)) R.positions_seen.push(ppos);

    if (type === "Shot") {
      R.shots++;
      const xg = Number(get(ev, ["shot","statsbomb_xg"], 0)) || 0;
      R.xg += xg;
      if (get(ev, ["shot","outcome","name"]) === "Goal") R.goals++;
    }
    else if (type === "Pass") {
      R.passes_att++;
      const outcome = get(ev, ["pass","outcome","name"]);
      if (!outcome || outcome === "Complete") R.passes_cmp++; // считаем complete если не Incomplete
      const start = ev.location;
      const end = get(ev, ["pass","end_location"]);

      // география
      if (isFinalThird(end)) R.passes_final_third++;
      if (isIntoBox(end)) R.passes_into_box++;
      if (isProgressivePass(start, end)) R.progressive_passes++;

      // типы
      if (get(ev, ["pass","cross"])) R.crosses++;
      if (get(ev, ["pass","switch"])) R.switches++;
      if (get(ev, ["pass","through_ball"])) R.through_balls++;
      if (get(ev, ["pass","cut_back"])) R.cutbacks++;
      if (get(ev, ["pass","shot_assist"])) R.key_passes++;

      // длина
      const L = Number(get(ev, ["pass","length"], 0)) || 0;
      const b = passLengthBucket(L);
      if (b === "short") R.passes_short++;
      else if (b === "medium") R.passes_medium++;
      else R.passes_long++;
    }
    else if (type === "Ball Receipt*") {
      R.ball_receipts++;
    }
    else if (type === "Pressure") {
      R.pressures++;
    }
    else if (type === "Clearance") {
      R.clearances++;
    }
    else if (type === "Interception") {
      R.interceptions++;
    }
    else if (type === "Tackle") {
      R.tackles++;
    }
    else if (type === "Dribble") {
      R.dribbles++;
      const out = get(ev, ["dribble","outcome","name"]);
      if (!out || out === "Complete" || out === "Completed") R.dribbles_complete++;
    }
    else if (type === "Duel") {
      R.duels++;
      const won = get(ev, ["duel","outcome","name"]) === "Won";
      if (won) R.duels_won++;
    }
    else if (type === "Foul Committed") {
      R.fouls_committed++;
    }
    else if (type === "Foul Won") {
      R.fouls_won++;
    }
    // карточки можно добавить тут, если в данных присутствуют (Bad Behaviour/Card)
  }

  // ассисты и xA (по shot_id -> assisted_shot_id)
  for (const ev of events) {
    if (get(ev, ["type","name"]) === "Shot" && ev.id) {
      const assister = shotAssistById.get(ev.id);
      if (assister != null && perPlayer.has(assister)) {
        const xg = shotXg.get(ev.id) ?? 0;
        const R = perPlayer.get(assister)!;
        R.assists++;              // фактический ассист
        R.key_passes++;           // любой shot_assist — ключевой пас
        R.xa += xg;               // ожидаемая результативность паса
      }
    }
  }

  // вернуть на верх
  return { match_id, perPlayer, startingByTeam, teamNames };
}

// --- Главная агрегация по множеству файлов ---
function main() {
  const dir = process.cwd();
  const files = fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith(INPUT_GLOB_EXT))
    .sort();

  const players = new Map<number|string, PlayerTotal>();
  const positionCounter = new Map<number|string, Map<string, number>>();
  const clubCounter = new Map<number|string, Map<string, number>>();

  for (const f of files) {
    const fp = path.join(dir, f);
    try {
      const { match_id, perPlayer } = parseMatch(fp);

      for (const [pid, r] of perPlayer) {
        if (!players.has(pid)) {
          players.set(pid, {
            id: pid,
            name: r.name ?? null,
            club: r.team_name ?? null,
            clubs: {},
            position: null,
            positions: {},
            match_ids: [],
            matches_count: 0,
            minutes_sum: 0,
            shots_sum: 0,
            goals_sum: 0,
            xg_sum: 0,
            passes_att_sum: 0,
            passes_cmp_sum: 0,
            key_passes_sum: 0,
            assists_sum: 0,
            xa_sum: 0,
            passes_final_third_sum: 0,
            passes_into_box_sum: 0,
            progressive_passes_sum: 0,
            crosses_sum: 0,
            switches_sum: 0,
            through_balls_sum: 0,
            cutbacks_sum: 0,
            passes_short_sum: 0,
            passes_medium_sum: 0,
            passes_long_sum: 0,
            ball_receipts_sum: 0,
            carries_sum: 0,
            carries_distance_sum: 0,
            progressive_carries_sum: 0,
            pressures_sum: 0,
            clearances_sum: 0,
            interceptions_sum: 0,
            tackles_sum: 0,
            dribbles_sum: 0,
            dribbles_complete_sum: 0,
            duels_sum: 0,
            duels_won_sum: 0,
            fouls_committed_sum: 0,
            fouls_won_sum: 0,
          });
        }
        const P = players.get(pid)!;

        // имя/клуб (модальный)
        if (r.team_name) {
          if (!clubCounter.has(pid)) clubCounter.set(pid, new Map());
          const cc = clubCounter.get(pid)!;
          cc.set(r.team_name, (cc.get(r.team_name) ?? 0) + 1);
          // обновим snapshot
          P.clubs[r.team_name] = cc.get(r.team_name)!;
          // модальный клуб
          P.club = [...cc.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] ?? P.club;
        }
        if (r.name && !P.name) P.name = r.name;

        // позиция — модальная по встреченным
        if (r.positions_seen?.length) {
          if (!positionCounter.has(pid)) positionCounter.set(pid, new Map());
          const pc = positionCounter.get(pid)!;
          for (const pos of r.positions_seen) {
            pc.set(pos, (pc.get(pos) ?? 0) + 1);
            P.positions[pos] = pc.get(pos)!;
          }
          P.position = [...pc.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] ?? P.position;
        }

        // матчи
        if (!P.match_ids.includes(match_id)) {
          P.match_ids.push(match_id);
          P.matches_count++;
        }

        // суммы
        P.minutes_sum += r.minutes;
        P.shots_sum += r.shots;
        P.goals_sum += r.goals;
        P.xg_sum += r.xg;

        P.passes_att_sum += r.passes_att;
        P.passes_cmp_sum += r.passes_cmp;
        P.key_passes_sum += r.key_passes;
        P.assists_sum += r.assists;
        P.xa_sum += r.xa;

        P.passes_final_third_sum += r.passes_final_third;
        P.passes_into_box_sum += r.passes_into_box;
        P.progressive_passes_sum += r.progressive_passes;

        P.crosses_sum += r.crosses;
        P.switches_sum += r.switches;
        P.through_balls_sum += r.through_balls;
        P.cutbacks_sum += r.cutbacks;

        P.passes_short_sum += r.passes_short;
        P.passes_medium_sum += r.passes_medium;
        P.passes_long_sum += r.passes_long;

        P.ball_receipts_sum += r.ball_receipts;
        P.carries_sum += r.carries;
        P.carries_distance_sum += r.carries_distance;
        P.progressive_carries_sum += r.progressive_carries;

        P.pressures_sum += r.pressures;
        P.clearances_sum += r.clearances;
        P.interceptions_sum += r.interceptions;
        P.tackles_sum += r.tackles;

        P.dribbles_sum += r.dribbles;
        P.dribbles_complete_sum += r.dribbles_complete;

        P.duels_sum += r.duels;
        P.duels_won_sum += r.duels_won;
        P.fouls_committed_sum += r.fouls_committed;
        P.fouls_won_sum += r.fouls_won;
      }
    } catch (e:any) {
      console.warn(`[WARN] ${fp}: ${e?.message || e}`);
    }
  }

  // средние per match / per 90 + проценты
  const results: PlayerTotal[] = [];
  for (const P of players.values()) {
    const m = Math.max(1, P.matches_count);
    const mins = Math.max(1e-9, P.minutes_sum);
    const perMatch = (x:number)=> x / m;
    const per90 = (x:number)=> (x / mins) * 90;

    const addAvg = (field: keyof PlayerTotal) => {
      const base = (P[field] as unknown as number) || 0;
      (P as any)[`${String(field).replace(/_sum$/,'')}_avg_per_match`] = perMatch(base);
      (P as any)[`${String(field).replace(/_sum$/,'')}_per90`] = per90(base);
    };

    // основные поля для средних
    [
      "shots_sum","goals_sum","xg_sum",
      "passes_att_sum","passes_cmp_sum","key_passes_sum","assists_sum","xa_sum",
      "passes_final_third_sum","passes_into_box_sum","progressive_passes_sum",
      "crosses_sum","switches_sum","through_balls_sum","cutbacks_sum",
      "passes_short_sum","passes_medium_sum","passes_long_sum",
      "ball_receipts_sum","carries_sum","carries_distance_sum","progressive_carries_sum",
      "pressures_sum","clearances_sum","interceptions_sum","tackles_sum",
      "dribbles_sum","dribbles_complete_sum",
      "duels_sum","duels_won_sum","fouls_committed_sum","fouls_won_sum",
    ].forEach((k)=> addAvg(k as keyof PlayerTotal));

    // проценты
    P.pass_completion_pct = P.passes_att_sum ? (P.passes_cmp_sum / P.passes_att_sum * 100) : null;
    P.duels_win_pct = P.duels_sum ? (P.duels_won_sum / P.duels_sum * 100) : null;
    P.dribbles_success_pct = P.dribbles_sum ? (P.dribbles_complete_sum / P.dribbles_sum * 100) : null;

    results.push(P);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ players: results }, null, 2), "utf-8");
  console.log(`Saved: ${OUTPUT_JSON} (players: ${results.length})`);
}

main();

// Простая локальная таблица рекордов (per seed + difficulty)
export type LeaderboardEntry = {
  length: number;      // чем меньше, тем лучше
  ms: number;          // время прохождения (тай-брейк)
  name?: string;       // опционально - ник игрока
  at: number;          // timestamp сохранения
};

const KEY_PREFIX = "luch_lb";

function keyFor(difficulty: string, seed: string | number) {
  return `${KEY_PREFIX}:${difficulty}:${seed}`;
}

export function getLeaderboard(difficulty: string, seed: string | number): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(keyFor(difficulty, seed));
    return raw ? JSON.parse(raw) as LeaderboardEntry[] : [];
  } catch {
    return [];
  }
}

export function submitScore(
  difficulty: string,
  seed: string | number,
  entry: LeaderboardEntry,
  maxSize = 10
) {
  if (typeof window === "undefined") return;
  const list = getLeaderboard(difficulty, seed);
  list.push(entry);
  // Сортировка: по длине ASC, тай-брейк по времени ASC
  list.sort((a, b) => (a.length - b.length) || (a.ms - b.ms));
  const trimmed = list.slice(0, maxSize);
  localStorage.setItem(keyFor(difficulty, seed), JSON.stringify(trimmed));
}

export function clearLeaderboard(difficulty: string, seed: string | number) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(keyFor(difficulty, seed));
}

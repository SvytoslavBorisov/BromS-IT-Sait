/** Нормализация названий позиций (StatsBomb + аббревиатуры из гида) */
export function normPos(p?: string): string {
  if (!p) return "";
  const s = p.trim().toLowerCase();

  // GK
  if (/(^|\s)(goal\s*keeper|goalkeeper|gk)(\s|$)/.test(s)) return "GK";

  // Бэки
  if (/^rb$|right\s*back/.test(s)) return "RB";
  if (/^lb$|left\s*back/.test(s)) return "LB";
  if (/^rwb$|right\s*wing\s*back/.test(s)) return "RWB";
  if (/^lwb$|left\s*wing\s*back/.test(s)) return "LWB";

  // Центр обороны
  if (/^rcb$|right\s*center\s*back/.test(s)) return "RCB";
  if (/^lcb$|left\s*center\s*back/.test(s)) return "LCB";
  if (/^cb$|^cb\s$|center\s*back/.test(s)) return "CB";

  // Опорники/центр
  if (/^cdm$|center\s*defensive\s*midfield/.test(s)) return "CDM";
  if (/^rdm$|right\s*defensive\s*midfield/.test(s)) return "RDM";
  if (/^ldm$|left\s*defensive\s*midfield/.test(s)) return "LDM";

  if (/^rcm$|right\s*center\s*midfield/.test(s)) return "RCM";
  if (/^lcm$|left\s*center\s*midfield/.test(s)) return "LCM";
  if (/^cm$|center\s*midfield(?!er)/.test(s)) return "CM";

  // Атака из полузащиты
  if (/^cam$|center\s*attacking\s*midfield/.test(s)) return "CAM";
  if (/^ram$|right\s*attacking\s*midfield/.test(s)) return "RAM";
  if (/^lam$|left\s*attacking\s*midfield/.test(s)) return "LAM";

  // Кромки
  if (/^rm$|right\s*midfield(er)?/.test(s)) return "RM";
  if (/^lm$|left\s*midfield(er)?/.test(s)) return "LM";
  if (/^rw$|right\s*wing(er)?/.test(s)) return "RW";
  if (/^lw$|left\s*wing(er)?/.test(s)) return "LW";

  // Нападающие
  if (/^rcf$|right\s*center\s*forward/.test(s)) return "RCF";
  if (/^lcf$|left\s*center\s*forward/.test(s)) return "LCF";
  if (/^st$|striker|centre\s*forward|center\s*forward/.test(s)) return "ST";
  if (/^ss$|secondary\s*striker/.test(s)) return "SS";

  return p;
}

/** Координаты тренерских позиций в системе 120×80 (StatsBomb). */
export const POS: Record<string, [number, number]> = {
  // Ворота
  GK: [11, 40],

  // Линия защиты
  RB: [35, 12], RCB: [30, 30], CB: [30, 40], LCB: [30, 50], LB: [35, 68],
  RWB: [45, 12], LWB: [45, 68],

  // Опорная тройка
  RDM: [53, 27], CDM: [50, 40], LDM: [53, 53],

  // Центр поля
  RCM: [67, 28], CM: [65, 40], LCM: [67, 52],

  // Атакующие полузащитники
  RAM: [87, 32], CAM: [81, 40], LAM: [87, 48],

  // Кромки
  RM: [75, 15], LM: [75, 65], RW: [92, 15], LW: [92, 65],

  // Форварды
  RCF: [98, 30], ST: [105, 40], LCF: [98, 50], SS: [100, 40],
};

/** Проекция позиции в проценты контейнера (с учётом стороны) */
export function posToXY(position?: string, side: "left" | "right" = "left") {
  const key = normPos(position);
  const fallback: [number, number] = [60, 40];
  let [x, y] = POS[key] || fallback;
  if (side === "right") x = 120 - x; // зеркалим по оси X для правой команды
  return { xPct: (x / 120) * 100, yPct: (y / 80) * 100 };
}

/** Типы составов */
export type LineupEntry = { id: number; name: string; position?: string; jersey?: number | null };
export type TeamLineup = { teamName: string; formation?: number; players: LineupEntry[] };

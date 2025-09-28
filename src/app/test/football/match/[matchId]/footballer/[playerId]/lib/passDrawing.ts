// Общие настройки рисования пасов
export const HIT_STROKE = 6; // «невидимый» хитбокс для наведения

export const STYLES = {
  key:   { stroke: "#059669", width: 0.6, markerId: "arr-emerald" },
  succ:  { stroke: "#0ea5e9", width: 0.5, markerId: "arr-sky" },
  fail:  { stroke: "#94a3b8", width: 0.4, markerId: "arr-neutral" },
} as const;

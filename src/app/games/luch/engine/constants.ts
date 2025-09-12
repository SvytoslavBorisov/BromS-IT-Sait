// Общие константы игры

export const MOBILE_BREAKPOINT = 860;
export const MAX_BOUNCES = 64;

// Битовые маски для цветов луча
// R = 1, G = 2, B = 4 — аддитивная модель
export const COLOR_R = 1 << 0; // 1
export const COLOR_G = 1 << 1; // 2
export const COLOR_B = 1 << 2; // 4
export const RGB_BITS = [COLOR_R, COLOR_G, COLOR_B] as const;

// Геометрия фильтров
export const FILTER_RADIUS_MIN = 0.035; // в долях от min(width,height)
export const FILTER_RADIUS_MAX = 0.055;

// Попытки подбора позиции без пересечений
export const PLACE_TRIES = 64;

// Отступы от рамки поля (в процентах)
export const BORDER_PAD_PCT = 0.06;

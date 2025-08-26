export const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const roundMoney = (v: number) => Math.round(v);

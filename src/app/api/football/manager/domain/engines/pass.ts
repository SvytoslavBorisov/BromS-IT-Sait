import { PassContext } from "../types";

// Простая вероятностная модель точности паса
export function passSuccessProb(ctx: PassContext): number {
  const p = ctx.passer.stats.pass;
  const dr = ctx.passer.stats.dribble;
  const stamina = ctx.passer.stats.stamina;
  const base = 0.35 + 0.0035 * p + 0.0015 * dr + 0.002 * stamina;
  const distPenalty = Math.min(0.02 * Math.max(0, ctx.distance - 10), 0.35);
  const pressurePenalty = 0.4 * ctx.pressure;
  const prob = Math.max(0.02, Math.min(0.98, base - distPenalty - pressurePenalty));
  return prob;
}

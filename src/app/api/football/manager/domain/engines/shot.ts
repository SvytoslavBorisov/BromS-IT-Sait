import { ShotContext, ShotOutcome } from "../types";

export function shotXG(ctx: ShotContext): number {
  const s = ctx.shooter.stats.shot;
  const pace = ctx.shooter.stats.pace;
  const base = 0.05 + 0.004 * s + 0.002 * pace;
  const distPenalty = Math.min(0.015 * Math.max(0, ctx.distance - 8), 0.6);
  const angleBoost = 0.25 * ctx.angle;
  const pressurePenalty = 0.35 * ctx.pressure;
  const xg = Math.max(0.01, Math.min(0.95, base - distPenalty + angleBoost - pressurePenalty));
  return xg;
}

export function resolveShot(ctx: ShotContext, rng: () => number = Math.random): ShotOutcome {
  const xg = shotXG(ctx);
  const isGoal = rng() < xg;
  return { xg, isGoal };
}

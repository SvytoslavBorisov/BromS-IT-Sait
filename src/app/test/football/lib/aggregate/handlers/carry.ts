import type { EventHandler } from "../types";

export const carryHandler: EventHandler = (ev, p, ctx) => {
  p.carries += 1;
  p.carryDistance += ctx.helpers.dist(ev.location, ev.carry?.end_location);

  const dir = ctx.teamDir.get(p.teamId) ?? 1;
  const x0 = ev.location?.[0];
  const xe = ev.carry?.end_location?.[0];
  const ye = ev.carry?.end_location?.[1];

  if (typeof xe === "number" && typeof ye === "number") {
    if (ctx.helpers.isFinalThird(xe, dir)) p.carriesIntoFinalThird += 1;
    if (ctx.helpers.isPenaltyArea(xe, ye, dir)) p.carriesIntoBox += 1;
  }
  if (typeof x0 === "number" && typeof xe === "number") {
    if (ctx.helpers.isProgressive(x0, xe, dir)) p.progressiveCarries += 1;
  }
};

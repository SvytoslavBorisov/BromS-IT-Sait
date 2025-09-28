import type { EventHandler } from "../types";

export const passHandler: EventHandler = (ev, p, ctx) => {
  p.passesTotal += 1;
  const pb: any = ev.pass || {};
  const outName = pb.outcome?.name as string | undefined;

  if (!outName) p.passesComplete += 1;
  if (pb.shot_assist) p.keyPasses += 1;
  if (pb.goal_assist) p.assists += 1;

  if (pb.cross) {
    p.crosses += 1;
    if (!outName) p.crossesComplete += 1;
  }
  if (typeof pb.length === "number" && pb.length >= 30) p.longPasses += 1;
  if (pb.through_ball || pb.technique?.name === "Through Ball") p.throughBalls += 1;
  if (pb.switch) p.switches += 1;

  // производные метрики
  const dir = ctx.teamDir.get(p.teamId) ?? 1;
  const x0 = ev.location?.[0];
  const xe = pb.end_location?.[0];
  const ye = pb.end_location?.[1];

  if (typeof xe === "number" && typeof ye === "number") {
    if (ctx.helpers.isFinalThird(xe, dir) && !outName) p.passesIntoFinalThird += 1;
    if (ctx.helpers.isPenaltyArea(xe, ye, dir) && !outName) p.entriesPenaltyArea += 1;
  }
  if (typeof x0 === "number" && typeof xe === "number") {
    if (ctx.helpers.isProgressive(x0, xe, dir) && !outName) p.progressivePasses += 1;
  }
};

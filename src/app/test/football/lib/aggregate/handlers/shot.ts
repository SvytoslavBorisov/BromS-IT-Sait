import type { EventHandler } from "../types";

export const shotHandler: EventHandler = (ev, p) => {
  p.shotsTotal += 1;
  const sh: any = ev.shot || {};
  if ((sh.outcome?.name || "").toLowerCase().startsWith("saved") || sh.outcome?.name === "Goal") p.shotsOnTarget += 1;
  if (sh.outcome?.name === "Goal") p.goals += 1;
  if (typeof sh.statsbomb_xg === "number") p.xG += sh.statsbomb_xg;

  if (sh.type?.name === "Penalty") {
    p.pensTaken += 1;
    if (sh.outcome?.name === "Goal") p.pensScored += 1;
  }
};

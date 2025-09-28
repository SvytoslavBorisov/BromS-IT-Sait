import type { EventHandler } from "../types";

export const duelHandler: EventHandler = (ev, p) => {
  p.duelsTotal += 1;
  const dn = ev.duel?.outcome?.name as string | undefined;
  if (dn === "Won" || dn === "Success" || dn === "Success In Play" || dn === "Success Out") p.duelsWon += 1;

  if (ev.duel?.type?.name === "Tackle") {
    p.tackles += 1;
    if (dn && (dn.includes("Success") || dn === "Won")) p.tacklesWon += 1;
  }
};

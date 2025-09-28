import type { EventHandler } from "../types";

export const interceptionHandler: EventHandler = (_, p) => { p.interceptions += 1; };
export const blockHandler: EventHandler = (_, p) => { p.blocks += 1; };
export const pressureHandler: EventHandler = (_, p) => { p.pressures += 1; };
export const foulCommittedHandler: EventHandler = (_, p) => { p.foulsCommitted += 1; };
export const foulWonHandler: EventHandler = (_, p) => { p.foulsWon += 1; };

export const badBehaviourHandler: EventHandler = (ev, p) => {
  const card = ev.bad_behaviour?.card?.name as string | undefined;
  if (card === "Yellow Card" || card === "Second Yellow") p.yellow += 1;
  if (card === "Red Card") p.red += 1;
};

export const recoveryHandler: EventHandler = (_, p) => { p.recoveries += 1; };
export const clearanceHandler: EventHandler = (_, p) => { p.clearances += 1; };
export const offsideHandler: EventHandler = (_, p) => { p.offsides += 1; };
export const miscontrolHandler: EventHandler = (_, p) => { p.losses += 1; };
export const dispossessedHandler: EventHandler = (_, p) => { p.losses += 1; };
export const ballReceiptHandler: EventHandler = (_, p) => { p.receptions += 1; };

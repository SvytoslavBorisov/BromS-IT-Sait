import type { EventHandler } from "../types";

export const dribbleHandler: EventHandler = (ev, p) => {
  p.dribblesAttempted += 1;
  if (ev.dribble?.outcome?.name === "Complete") p.dribblesComplete += 1;
};

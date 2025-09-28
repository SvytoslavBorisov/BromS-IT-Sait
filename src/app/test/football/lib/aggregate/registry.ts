import type { EventHandler } from "./types";
import { passHandler } from "./handlers/pass";
import { shotHandler } from "./handlers/shot";
import { carryHandler } from "./handlers/carry";
import { dribbleHandler } from "./handlers/dribble";
import { duelHandler } from "./handlers/duel";
import {
  interceptionHandler,
  blockHandler,
  pressureHandler,
  foulCommittedHandler,
  foulWonHandler,
  badBehaviourHandler,
  recoveryHandler,
  clearanceHandler,
  offsideHandler,
  miscontrolHandler,
  dispossessedHandler,
  ballReceiptHandler,
} from "./handlers/misc";

/**
 * Единая точка регистрации «плагинов». Добавить новую метрику = дописать
 * обработчик и включить его здесь по имени события.
 */
export function getDefaultRegistry(): Record<string, EventHandler> {
  return {
    Pass: passHandler,
    Shot: shotHandler,
    Carry: carryHandler,
    Dribble: dribbleHandler,
    Duel: duelHandler,
    Interception: interceptionHandler,
    Block: blockHandler,
    Pressure: pressureHandler,
    "Foul Committed": foulCommittedHandler,
    "Foul Won": foulWonHandler,
    "Bad Behaviour": badBehaviourHandler,
    "Ball Recovery": recoveryHandler,
    Clearance: clearanceHandler,
    Offside: offsideHandler,
    Miscontrol: miscontrolHandler,
    Dispossessed: dispossessedHandler,
    "Ball Receipt": ballReceiptHandler,
  };
}

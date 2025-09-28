export type PosGroup = "GK" | "DEF" | "MID" | "FWD" | "Bench";

export function groupByPosition(raw?: string): PosGroup {
  const pos = (raw || "").toUpperCase();

  // вратарь
  if (/\b(GK|KEEPER|GOAL|GOALKEEPER)\b/.test(pos)) return "GK";

  // линии защиты
  if (/\b(CB|RCB|LCB|RB|LB|RWB|LWB|BACK|DEF)\b/.test(pos)) return "DEF";

  // полузащита
  if (/\b(DM|CDM|CM|LCM|RCM|AM|CAM|MID|MEZZ|REGI|MIDFIELD)\b/.test(pos)) return "MID";

  // нападение / фланги в атаке
  if (/\b(FW|CF|ST|SS|LW|RW|WING|FORWARD|STRIKER)\b/.test(pos)) return "FWD";

  return "Bench";
}

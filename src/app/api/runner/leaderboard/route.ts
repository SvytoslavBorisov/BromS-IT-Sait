import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const file = path.join(process.cwd(), ".runner_data", "leaderboard.json");
    const arr = JSON.parse(fs.readFileSync(file, "utf8") || "[]");
    return Response.json({ ok:true, items: arr.slice(0, 50) });
  } catch {
    return Response.json({ ok:true, items: [] });
  }
}

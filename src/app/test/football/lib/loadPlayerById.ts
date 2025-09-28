import 'server-only';
import fs from 'fs/promises';
import path from 'path';

const BYID_DIR = path.join(process.cwd(),'src','app','test','football','events','players','byId');

export async function getPlayerByIdSharded(id: string) {
  const file = path.join(BYID_DIR, `${encodeURIComponent(id)}.json`);
  try {
    const raw = await fs.readFile(file,'utf8');
    return JSON.parse(raw);
  } catch {
    // fallback: попробуем как число
    const asNum = Number(id);
    if (!Number.isNaN(asNum)) {
      const f2 = path.join(BYID_DIR, `${encodeURIComponent(String(asNum))}.json`);
      try {
        const raw2 = await fs.readFile(f2,'utf8');
        return JSON.parse(raw2);
      } catch {
        return null;
      }
    }
    return null;
  }
}

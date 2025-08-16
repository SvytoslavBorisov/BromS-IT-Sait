import { promises as fs } from "fs";
import { streebog256, streebog512 } from "@/lib/crypto/streebog"; // твой модуль
import { DSGOST }      from "@/lib/crypto/dsgost";


const cleanHex = (h: string) => h.replace(/0x/gi, "").replace(/\s+/g, "");

export function hexToBytes(hex: string): Uint8Array {
  const s = cleanHex(hex);
  const bytes = new Uint8Array(Math.ceil(s.length / 2));
  let i = 0, j = 0;
  if (s.length % 2 === 1) { // ведущий полубайт
    bytes[j++] = parseInt(s[0], 16);
    i = 1;
  }
  for (; i < s.length; i += 2) bytes[j++] = parseInt(s.slice(i, i + 2), 16);
  return bytes.subarray(0, j);
}
export function bytesToHex(u8: Uint8Array): string {
  let out = "";
  for (const b of u8) out += b.toString(16).padStart(2, "0");
  return out;
}

// e = H(data) mod q, e!=0
function eFromDigest(digest: Uint8Array, q: bigint): bigint {
  const e0 = BigInt("0x" + bytesToHex(digest));
  let e = e0 % q;
  if (e === 0n) e = 1n;
  return e;
}

// сохранить .sig как S||R (raw, big-endian)
export function saveGostSigFile(rHex: string, sHex: string, q: bigint, path: string) {
  const byteLen = Math.ceil(q.toString(2).length / 8); // для 256-бит — 32
  const pad = (h: string) => cleanHex(h).padStart(byteLen * 2, "0").slice(-byteLen * 2);
  const r = hexToBytes(pad(rHex));
  const s = hexToBytes(pad(sHex));
  const sig = new Uint8Array(byteLen * 2);
  sig.set(s, 0);            // сначала S
  sig.set(r, byteLen);      // затем R
  fs.writeFile(path, sig);
  return path;
}

export async function signFileStreebog256(
  gost: DSGOST,
  filePath: string,
  privHex: string,
  sigPath: string
) {
  const data = await fs.readFile(filePath);
  const digest = streebog256(new Uint8Array(data));   // 32 байта
  // Можно просто передать digest как hex в твой signHex — он сам сделает mod q:
  const { r, s } = gost.signHex("0x" + bytesToHex(digest), privHex);
  await saveGostSigFile(r, s, gost.q, sigPath);       // S||R
  return { r, s, sigPath };
}
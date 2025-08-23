export const appendLog = (setLog: (updater: (p: string) => string) => void, s: string) =>
  setLog(p => (p ? p + "\n" : "") + s);

export function parseCiphertextCombined(s: string) {
  const [ctHex, tagHex, rHex] = s.split("|");
  const Rjson = JSON.parse(new TextDecoder().decode(hexToBytes(rHex)));
  const R = { x: BigInt("0x" + Rjson.Rx), y: BigInt("0x" + Rjson.Ry) };
  return { R, ct: hexToBytes(ctHex), tag: hexToBytes(tagHex) };
}

export function hexToBytes(h: string): Uint8Array {
  const n = h.length;
  const out = new Uint8Array(n / 2);
  for (let i = 0; i < n; i += 2) out[i / 2] = parseInt(h.slice(i, i + 2), 16);
  return out;
}

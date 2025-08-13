import {
  streebog256 as _streebog256,
  streebog512 as _streebog512,
  Streebog256,
  Streebog512,
} from "@li0ard/streebog";

/** Хэш Стрибог‑256. Возвращает ровно 32 байта. */
export function streebog256(data: Uint8Array): Uint8Array {
  // либра синхронная — сразу отдаём результат
  const out = _streebog256(data);
  if (out.length !== 32) throw new Error("streebog256: digest length != 32");
  return out;
}

/** Хэш Стрибог‑512. Возвращает ровно 64 байта. */
export function streebog512(data: Uint8Array): Uint8Array {
  const out = _streebog512(data);
  if (out.length !== 64) throw new Error("streebog512: digest length != 64");
  return out;
}

/** Пригодится, если нужен инкрементальный режим (update/digest). */
export function createStreebog256() {
  return new Streebog256();
}
export function createStreebog512() {
  return new Streebog512();
}
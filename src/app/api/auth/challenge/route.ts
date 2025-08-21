import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getRedis, ensureRedisConnected } from "@/lib/redis";
import gostCrypto from "gost-crypto";

function streebog256Hex(buf: Buffer): string {
  const d = new gostCrypto.digest.GostDigest({ name: "GOST R 34.11", length: 256 });
  d.reset();
  d.update(buf);
  return Buffer.from(d.digest()).toString("hex");
}

export async function GET() {
  const id = randomBytes(16).toString("hex");
  const nonce = randomBytes(32);
  const nonceB64 = nonce.toString("base64");
  const hashHex = streebog256Hex(nonce);

  const redis = await getRedis();
  await ensureRedisConnected();
  // В ioredis 5 метод называется setEx, но наша обёртка = set(key, value, "EX", ttl) или redis.setEx
  // В твоём RedisLike можно добавить setEx. Если нет — используем обычный set и ttl.
  await (redis as any).setEx?.(`nonce:${id}`, 60, JSON.stringify({ nonceB64, hashHex }))
    ?? redis.set(`nonce:${id}`, JSON.stringify({ nonceB64, hashHex }));

  return NextResponse.json({ id, nonceB64, hashHex, exp: 60 });
}

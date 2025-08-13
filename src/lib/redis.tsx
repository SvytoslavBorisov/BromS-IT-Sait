// lib/redis.ts
// Работает без Redis (мок), а при наличии REDIS_URL переключается на ioredis+redlock.

type RedisLike = {
  get(k: string): Promise<string | null>
  set(k: string, v: any): Promise<any>
  sadd(k: string, v: string): Promise<number>
  smembers(k: string): Promise<string[]>
}

let redis: RedisLike
let redlock: any

// --- ин-мемори мок для dev ---
const mem = new Map<string, any>()
function memGet(k: string) { return mem.has(k) ? mem.get(k) : null }
function memSet(k: string, v: any) { mem.set(k, v); return "OK" }
function memSAdd(k: string, v: string) {
  const key = `__s:${k}`
  if (!mem.has(key)) mem.set(key, new Set<string>())
  const S: Set<string> = mem.get(key)
  const before = S.size
  S.add(v)
  return S.size - before
}
function memSMembers(k: string) {
  const S: Set<string> | undefined = mem.get(`__s:${k}`)
  return S ? Array.from(S) : []
}

if (!process.env.REDIS_URL) {
  // без Redis — мок и «пустой» redlock
  redis = {
    async get(k) { return memGet(k) },
    async set(k, v) { return memSet(k, v) },
    async sadd(k, v) { return memSAdd(k, v) },
    async smembers(k) { return memSMembers(k) },
  }
  redlock = { async acquire() { return { async release() {} } } }
} else {
  // ESM‑импорты (ВАЖНО: default!)
  const { default: IORedis } = await import("ioredis")
  const { default: Redlock } = await import("redlock")

  const client = new IORedis(process.env.REDIS_URL!)
  client.on("error", (e: any) => console.error("[redis] error", e))

  redis = {
    async get(k) { return client.get(k) },
    async set(k, v) { return client.set(k, typeof v === "string" ? v : JSON.stringify(v)) },
    async sadd(k, v) { return client.sadd(k, v) },
    async smembers(k) { return client.smembers(k) },
  }

  // теперь это точно конструктор
  redlock = new Redlock([client], { retryCount: 3, retryDelay: 80 })
}

export { redis, redlock }

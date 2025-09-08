// lib/redis.ts
// НОЛЬ побочных эффектов при импорте (важно для билда/SSG).
// При отсутствии REDIS_URL или при SKIP_REDIS_DURING_BUILD=1 — всегда используем in‑memory мок.

export type RedisLike = {
  get(k: string): Promise<string | null>;
  set(k: string, v: any): Promise<any>;
  sadd(k: string, v: string): Promise<number>;
  smembers(k: string): Promise<string[]>;
};

export type RedlockLike = {
  acquire(resource: string | string[], ttl: number): Promise<{ release(): Promise<void> }>;
};

// ---- env/флаги ----
const SKIP = process.env.SKIP_REDIS_DURING_BUILD === "1";
const REDIS_URL = process.env.REDIS_URL ?? "";

// ---- in‑memory mock (для билда/дев) ----
const mem = new Map<string, any>();
function memGet(k: string) { return mem.has(k) ? mem.get(k) : null; }
function memSet(k: string, v: any) { mem.set(k, v); return "OK"; }
function memSAdd(k: string, v: string) {
  const key = `__s:${k}`;
  if (!mem.has(key)) mem.set(key, new Set<string>());
  const S: Set<string> = mem.get(key);
  const before = S.size; S.add(v);
  return S.size - before;
}
function memSMembers(k: string) {
  const S: Set<string> | undefined = mem.get(`__s:${k}`);
  return S ? Array.from(S) : [];
}
const memRedis: RedisLike = {
  async get(k) { return memGet(k); },
  async set(k, v) { return memSet(k, typeof v === "string" ? v : JSON.stringify(v)); },
  async sadd(k, v) { return memSAdd(k, v); },
  async smembers(k) { return memSMembers(k); },
};
const memRedlock: RedlockLike = {
  async acquire() { return { async release() {} }; }
};

// ---- ленивые синглтоны для прод‑клиента ----
let _client: any /* IORedis */ | null = null;
let _clientPromise: Promise<any> | null = null;
let _redlock: any /* Redlock */ | null = null;

/**
 * Возвращает RedisLike: мок (если SKIP/нет REDIS_URL) или обёртку над ioredis.
 * Никаких коннектов на этапе импорта. Импорты ioredis/redlock — только здесь.
 */
export async function getRedis(): Promise<RedisLike> {
  if (SKIP || !REDIS_URL) return memRedis;

  // ленивый импорт ioredis
  if (!_clientPromise && !_client) {
    _clientPromise = (async () => {
      const { default: IORedis } = await import("ioredis");
      const c = new IORedis(REDIS_URL, {
        lazyConnect: true,          // не коннектимся сразу
        enableOfflineQueue: false,  // без очередей
        maxRetriesPerRequest: 1,
        reconnectOnError: () => false,
      });
      c.on("error", (e: any) => console.error("[redis] error", e));
      return c;
    })();
  }

  if (!_client) _client = await _clientPromise;

  // обёртка под наш интерфейс
  const r: RedisLike = {
    async get(k) { return _client.get(k); },
    async set(k, v) { return _client.set(k, typeof v === "string" ? v : JSON.stringify(v)); },
    async sadd(k, v) { return _client.sadd(k, v); },
    async smembers(k) { return _client.smembers(k); },
  };
  return r;
}

/** Безопасный connect: вызывай в рантайме перед первой командой (на билде не нужен). */
export async function ensureRedisConnected(): Promise<void> {
  if (SKIP || !REDIS_URL) return;
  if (!_client) await getRedis();
  // у ioredis v5 статус доступен как .status
  if (_client.status !== "ready") {
    try { await _client.connect(); } catch { /* молча: пусть функционал деградирует */ }
  }
}

/** Возвращает Redlock или мок в дев/на билде. Конструируется лениво. */
export async function getRedlock(): Promise<RedlockLike> {
  if (SKIP || !REDIS_URL) return memRedlock;
  if (!_client) await getRedis();
  if (!_redlock) {
    const { default: Redlock } = await import("redlock");
    _redlock = new Redlock([_client], { retryCount: 3, retryDelay: 80 });
  }
  return _redlock as RedlockLike;
}


export { memRedis as redis };
export { memRedlock as memRedlock };
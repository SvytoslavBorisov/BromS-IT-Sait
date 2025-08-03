// lib/crypto/secure-storage.ts

const DB_NAME = 'secureStorage';
const STORE_NAME = 'store';

// Ключи внутри objectStore
const PRIVATE_JWK_PREFIX = 'private_jwk';      // для приватных ключей: PRIVATE_JWK_PREFIX + '_' + userId
const SECRET_RECORD_KEY = 'encrypted_secret';  // остаётся глобально, если так нужно

// Старый store для миграции
const OLD_STORE = 'secrets';
// При переходе версии increment на 2
const DB_VERSION = 2;

/**
 * Открывает IndexedDB, создаёт/мигрирует хранилище.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // 1) создаём новый store, если ещё нет
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }

      // 2) миграция: если есть старый store, переносим из него все ключи
      if (db.objectStoreNames.contains(OLD_STORE)) {
        const oldStore = request.transaction!.objectStore(OLD_STORE);
        const tempData: Record<string, any> = {};

        oldStore.openCursor().onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result;
          if (cursor) {
            tempData[cursor.key as string] = cursor.value;
            cursor.continue();
          } else {
            // когда всё прочитали — переносим в новый
            const newStore = request.transaction!.objectStore(STORE_NAME);
            for (const [key, val] of Object.entries(tempData)) {
              newStore.put(val, key);
            }
            // и удаляем старый store
            db.deleteObjectStore(OLD_STORE);
          }
        };
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror   = () => reject(request.error);
  });
}

/**
 * Записывает произвольное значение по ключу в IndexedDB
 */
async function putValue(key: string, value: any): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * Читает значение из IndexedDB по ключу
 */
async function getValue<T = any>(key: string): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Удаляет запись по ключу
 */
async function deleteValue(key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/** Собирает ключ в objectStore для конкретного пользователя */
function privateJwkKey(userId: string): string {
  return `${PRIVATE_JWK_PREFIX}_${userId}`;
}

/** Сохраняет приватный JWK под userId */
export async function storePrivateJwk(
  userId: string,
  jwk: JsonWebKey
): Promise<void> {
  const key = privateJwkKey(userId);
  await putValue(key, jwk);
}

/** Загружает приватный JWK для userId */
export async function loadPrivateJwk(
  userId: string
): Promise<JsonWebKey | null> {
  const key = privateJwkKey(userId);
  return getValue<JsonWebKey>(key);
}

/** Опционально: удаляет приватный JWK при необходимости */
export async function clearPrivateJwk(
  userId: string
): Promise<void> {
  const key = privateJwkKey(userId);
  await deleteValue(key);
}

/** Шифрует и сохраняет секрет паролем (осталось без изменений) */
export async function encryptAndStore(
  secret: string,
  password: string
): Promise<void> {
  const SALT_BYTES = 16;
  const IV_BYTES = 12;
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  console.debug('encryptAndStore salt:', salt, 'iv:', iv);

  const key = await deriveKey(password, salt);
  const data = new TextEncoder().encode(secret);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

  const record = {
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ct)),
  };
  await putValue(SECRET_RECORD_KEY, record);
}

/** Загружает и расшифровывает секрет паролем (осталось без изменений) */
export async function loadAndDecrypt(
  password: string
): Promise<string | null> {
  const record = await getValue<{
    salt: number[];
    iv: number[];
    ciphertext: number[];
  }>(SECRET_RECORD_KEY);

  if (!record) return null;

  const salt = new Uint8Array(record.salt);
  const iv = new Uint8Array(record.iv);
  const ct = new Uint8Array(record.ciphertext).buffer;

  const key = await deriveKey(password, salt);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/** Деривация ключа из пароля и соли (осталась без изменений) */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const pwData = new TextEncoder().encode(password);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    pwData,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

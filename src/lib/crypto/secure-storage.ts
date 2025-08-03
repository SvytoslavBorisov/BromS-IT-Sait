// lib/crypto/secure-storage.ts

const DB_NAME = 'secureStorage';
const STORE_NAME = 'store';

// Записи ключей
const PRIVATE_JWK_KEY = 'private_jwk';
const SECRET_RECORD_KEY = 'encrypted_secret';

// AES-GCM параметры
const SALT_BYTES = 16;
const IV_BYTES = 12;

// старый стор, где лежала AES-ги́пер-структура
const OLD_STORE = 'secrets';
// версия БД увеличена на 1
const DB_VERSION = 2;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;

      // 1) если нет нового стора — создаём его
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }

      // 2) для миграции: если ещё есть старый стор 'secrets', забираем из него данные
      if (db.objectStoreNames.contains(OLD_STORE)) {
        const oldStore = request.transaction!.objectStore(OLD_STORE);
        const tempData: any = {};
        oldStore.openCursor().onsuccess = e => {
          const cursor = (e.target as IDBRequest).result;
          if (cursor) {
            tempData[cursor.key] = cursor.value;
            cursor.continue();
          } else {
            // как только прочитали всё из старого стор, кладём в новый
            const newStore = request.transaction!.objectStore(STORE_NAME);
            for (const [key, val] of Object.entries(tempData)) {
              newStore.put(val, key);
            }
            // и затем удаляем старый стор
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
 * Записывает значение по ключу в IndexedDB
 */
async function putValue(key: string, value: any): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Получает значение по ключу из IndexedDB
 */
async function getValue<T = any>(key: string): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** Сохраняет приватный JWK-ключ */
export async function storePrivateJwk(jwk: JsonWebKey): Promise<void> {
  await putValue(PRIVATE_JWK_KEY, jwk);
}

/** Получает приватный JWK-ключ */
export async function loadPrivateJwk(): Promise<JsonWebKey | null> {
  return getValue<JsonWebKey>(PRIVATE_JWK_KEY);
}

/** Шифрует и сохраняет секрет паролем */
export async function encryptAndStore(
  secret: string,
  password: string
): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  // Выводим данные в консоль (debug)
  console.debug('encryptAndStore salt:', salt, 'iv:', iv);

  const key = await deriveKey(password, salt);
  const data = new TextEncoder().encode(secret);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const record = {
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ct)),
  };
  await putValue(SECRET_RECORD_KEY, record);
}

/** Загружает и расшифровывает секрет паролем */
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
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ct
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/** Выводит CryptoKey из пароля и соли */
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

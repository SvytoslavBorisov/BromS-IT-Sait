// Утилиты для шифрования и хранения зашифрованного секрета в IndexedDB

const DB_NAME = 'secureStorage';
const STORE_NAME = 'secrets';
const RECORD_KEY = 'encrypted_secret';

/** Открывает IndexedDB и возвращает DB */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Сохраняет запись в IndexedDB */
export async function idbPut(value: any): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, RECORD_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Получает запись из IndexedDB */
export async function idbGet(): Promise<any | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(RECORD_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Crypto utilities
const SALT_BYTES = 16;
const IV_BYTES = 12;

// Генерация случайной соли
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

/** Выводит ключ из пароля и соли PBKDF2->AES-GCM */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const pwData = new TextEncoder().encode(password);
  const baseKey = await crypto.subtle.importKey(
    'raw', pwData, 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Шифрует текст и сохраняет его в IndexedDB */
export async function encryptAndStore(
  secret: string,
  password: string
): Promise<void> {
  const salt = generateSalt();
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new TextEncoder().encode(secret);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, data
  );
  const record = {
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ct)),
  };
  await idbPut(record);
}

/** Загружает и расшифровывает секрет из IndexedDB */
export async function loadAndDecrypt(
  password: string
): Promise<string | null> {
  const record = await idbGet();
  if (!record) return null;
  const salt = new Uint8Array(record.salt);
  const iv = new Uint8Array(record.iv);
  const ct = new Uint8Array(record.ciphertext).buffer;
  const key = await deriveKey(password, salt);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, key, ct
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

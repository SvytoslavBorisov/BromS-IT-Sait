import { getSession } from "next-auth/react";
import { idbPut } from "@/lib/crypto/secure-storage";

export async function generateAndUploadKey() {
  // 1) Генерируем пару RSA-OAEP
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  // 2) Экспортируем публичный JWK
  const pubJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  // 3) Отправляем на сервер
  const session = await getSession();
  await fetch("/api/me/pubkey", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // передаём токен авторизации, если нужно
    },
    body: JSON.stringify({ jwk: pubJwk }),
  });

  // 4) Храним приватный ключ локально (IndexedDB)
  const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  await idbPut(privJwk);
}

export async function encryptWithPubkey(share: string, jwkPub: JsonWebKey) {
  const pub = await crypto.subtle.importKey(
    "jwk",
    jwkPub,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
  const data = new TextEncoder().encode(share);
  const ct = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, data);
  return new Uint8Array(ct);
}
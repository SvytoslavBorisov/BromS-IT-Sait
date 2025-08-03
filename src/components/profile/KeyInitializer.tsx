"use client";

import { useSession } from "next-auth/react";
import { useEffect }  from "react";
import { jwkFingerprint } from "@/lib/crypto/fingerprint";
import { storePrivateJwk, loadPrivateJwk } from "@/lib/crypto/secure-storage";

export default function KeyInitializer() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    (async () => {
      // 1) Если приватного ещё нет — создаём пару
      const existing = await loadPrivateJwk();
      if (existing) return;

      // 2) Генерация RSA-OAEP
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

      // 3) Экспорт и отправка публичного JWK
      const pubJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
      await fetch("/api/me/pubkey", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ jwk: pubJwk }),
      });

      // 4) По желанию — логируем отпечаток публичного
      console.log("PUB fingerprint:", await jwkFingerprint(pubJwk));

      // 5) Экспорт приватного JWK, лог и сохранение
      const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
      console.log("PRIV fingerprint:", await jwkFingerprint(privJwk));
      await storePrivateJwk(privJwk);
    })();
  }, [status]);

  return null;
}
"use client";

import { useEffect }  from "react";
import { useSession } from "next-auth/react";
import { jwkFingerprint } from "@/lib/crypto/fingerprint";
import {
  storePrivateJwk,
  loadPrivateJwk,
  // clearPrivateJwk,  // теперь используем только по запросу в Settings
} from "@/lib/crypto/secure-storage";

export default function KeyInitializer() {
  const { status, data: session } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    (async () => {
      const userId = session.user.id;

      // 1) Попытаться загрузить локальный приватный ключ
      const localPriv = await loadPrivateJwk(userId);
      if (localPriv) {
        console.log("🔑 локальный приватный ключ найден");
        return;
      }

      // 2) Проверить, есть ли у пользователя публичный ключ на сервере
      const resp = await fetch("/api/me/pubkey");
      if (resp.ok) {
        // публичный ключ есть, а приватного нет — значит мы на новом браузере
        // **Нельзя просто перегенерировать**, иначе потеряем все зашифрованные данные!
        console.warn("⚠️ У вас есть публичный ключ на сервере, но нет приватного локально.");
        // Здесь как минимум нужно предложить загрузить резервную копию приватного ключа
        // или пройти процедуру восстановления через Shamir-доли.
        return;
      }

      // 3) Ни локального, ни на сервере публичного нет — генерируем новую пару
      console.log("🚀 Генерируем новую пару ключей...");
      const keyPair = await crypto.subtle.generateKey(
        { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: "SHA-256" },
        true,
        ["encrypt", "decrypt"]
      );

      // Экспорт и отправка public JWK на сервер
      const pubJwk  = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
      await fetch("/api/me/pubkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jwk: pubJwk }),
      });
      console.log("PUB fingerprint:", await jwkFingerprint(pubJwk));

      // Экспорт и сохранение private JWK
      const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
      await storePrivateJwk(userId, privJwk);
      console.log("PRIV fingerprint:", await jwkFingerprint(privJwk));
    })();
  }, [status, session]);

  return null;
}

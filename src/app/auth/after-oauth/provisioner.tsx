// app/auth/after-oauth/provisioner.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { loadPrivateJwk, storePrivateJwk } from "@/lib/crypto/secure-storage";
import { jwkFingerprint } from "@/lib/crypto/fingerprint";
import { generateGostKeyPair } from "@/lib/crypto/generateGostKeyPair"; 
// ⬆️ Файл, который я ранее предложил на базе ТВОЕГО crypto-кода (gost/ec.ts).
// Если у тебя другое имя/путь — просто поправь импорт на твой генератор ГОСТ-пары.

export default function AfterOAuthProvisioner() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const qs = useSearchParams();
  const next = qs.get("next") || "/profile";
  const once = useRef(false);

  useEffect(() => {
    (async () => {
      if (once.current) return;
      if (status !== "authenticated" || !session?.user?.id) return;
      once.current = true;

      const userId = session.user.id;

      // 1) Проверка локального приватного
      const localPriv = await loadPrivateJwk(userId);

      // 2) Проверка публичного на сервере
      // РЕКОМЕНДАЦИЯ: сделай так, чтобы /api/me/pubkey возвращал 200 если ключ есть, 404 если нет
      const resp = await fetch("/api/me/pubkey", { method: "GET", cache: "no-store" });
      const pubExists = resp.ok; // ok==true => ключ есть

      if (pubExists) {
        // Публичный есть. Если локального приватного нет — это новый браузер → восстановление.
        if (!localPriv) {
          // Не генерируем новый ключ, иначе потеряются зашифрованные ранее данные!
          router.replace(`/keys/restore?next=${encodeURIComponent(next)}`);
          return;
        }
        // Всё ок, идём дальше
        router.replace(next);
        return;
      }

      // 3) Публичного на сервере НЕТ → это первый вход через Яндекс (создался User без ключа).
      //    Генерим долговременную транспортную пару ГОСТ (ECIES-GOST-2012-256) на клиенте:
      const { publicJwk, privateJwk } = await generateGostKeyPair();

      // Нормализуем метаданные (если твой генератор их уже выставляет — не изменится)
      (publicJwk  as any).alg     = (publicJwk  as any).alg ?? "ECIES-GOST-2012-256";
      (privateJwk as any).alg     = (privateJwk as any).alg ?? "ECIES-GOST-2012-256";
      (publicJwk  as any).key_ops = (publicJwk  as any).key_ops ?? ["encrypt","wrapKey"];
      (privateJwk as any).key_ops = (privateJwk as any).key_ops ?? ["decrypt","unwrapKey"];

      // 4) Считаем отпечаток публичного (Стрибог-256 по твоей функции)
      const fp = await jwkFingerprint(publicJwk);

      // 5) Отправляем публичный на сервер
      const save = await fetch("/api/me/pubkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jwk: publicJwk,
          fingerprint: fp,
          alg: "ECIES-GOST-2012-256",
        }),
      });

      if (!save.ok) {
        // Если сервер отклонил (например, гонка вкладок) — просто уйдём дальше.
        // Можно также показать тост/ошибку по желанию.
        router.replace(next);
        return;
      }

      // 6) Сохраняем приватный JWK ЛОКАЛЬНО (ВАЖНО: secure-storage должен шифровать at-rest)
      await storePrivateJwk(userId, privateJwk);

      // 7) Готово
      router.replace(next);
    })();
  }, [status, session, router, qs, next]);

  return null;
}

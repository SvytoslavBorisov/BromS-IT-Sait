// app/auth/after-oauth/provisioner.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { loadPrivateJwk, storePrivateJwk } from "@/lib/crypto/secure-storage";
import { jwkFingerprint } from "@/lib/crypto/fingerprint";
import { generateGostKeyPair } from "@/lib/crypto/generateGostKeyPair";

export default function AfterOAuthProvisioner() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const qs = useSearchParams();
  const next = qs.get("next") || "/profile";
  const once = useRef(false);

  useEffect(() => {
    (async () => {
      if (once.current) return;
      // ждём валидную сессию и наличие user.id в ней
      if (status !== "authenticated" || !session?.user?.id) return;
      once.current = true;

      try {
        const userId = session.user.id;

        // 1) Локальный приватный ключ
        const localPriv = await loadPrivateJwk(userId);

        // 2) Проверка публичного ключа на сервере
        // Ожидаем: 200 — ключ ЕСТЬ; 404 — ключа НЕТ; 401 — нет доступа (сессия/куки)
        const resp = await fetch("/api/me/pubkey", { method: "GET", cache: "no-store" });
        if (resp.status === 401) {
          // сессия умерла или куки не пришли — уводим на логин
          router.replace(`/auth?next=${encodeURIComponent(next)}`);
          return;
        }

        const pubExists = resp.status === 200;

        if (pubExists) {
          // Публичный есть. Если приватного локально нет — это новый браузер → восстановление
          if (!localPriv) {
            router.replace(`/keys/restore?next=${encodeURIComponent(next)}`);
            return;
          }
          // Всё ок — вперёд
          router.replace(next);
          return;
        }

        // 3) Публичного на сервере НЕТ → первый вход через OAuth без пары
        const { publicJwk, privateJwk } = await generateGostKeyPair();

        // Нормализация метаданных (на случай «немого» генератора)
        (publicJwk  as any).alg     = (publicJwk  as any).alg ?? "ECIES-GOST-2012-256";
        (privateJwk as any).alg     = (privateJwk as any).alg ?? "ECIES-GOST-2012-256";
        (publicJwk  as any).key_ops = (publicJwk  as any).key_ops ?? ["encrypt","wrapKey"];
        (privateJwk as any).key_ops = (privateJwk as any).key_ops ?? ["decrypt","unwrapKey"];

        // 4) Отпечаток (клиентом — для UX), на сервере пересчитайте и проверьте
        const fp = await jwkFingerprint(publicJwk);

        // 5) Сохраняем публичный на сервере
        const save = await fetch("/api/me/pubkey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jwk: publicJwk,
            fingerprint: fp,
            alg: "ECIES-GOST-2012-256",
          }),
        });

        // Если гонка вкладок/конфликт — не валимся, просто идём дальше
        // 409/422/500 — трактуем как «не сохранили», но не блокируем UX
        if (!save.ok && save.status !== 409) {
          // опционально: показать тост/лог
          // console.warn("Failed to save pubkey", save.status);
        }

        // 6) Сохраняем приватный JWK локально (шифрование в secure-storage — must)
        await storePrivateJwk(userId, privateJwk);

        // 7) Готово
        router.replace(next);
      } catch (err) {
        // Сеть/исключение — не зависаем в промежуточном состоянии
        console.error("Provisioning failed:", err);
        router.replace(next);
      }
    })();
    // deps: next зависит от qs, session/status зависят от next-auth; once — ref
  }, [status, session, router, next]);

  return null;
}

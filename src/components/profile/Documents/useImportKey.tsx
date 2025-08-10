// components/DealerRecovery/useImportKey.ts
"use client";

import { useEffect, useRef } from "react";
import { loadPrivateJwk }    from "@/lib/crypto/secure-storage";
import { useSession }        from "next-auth/react";

export function useImportKey(
  session: ReturnType<typeof useSession>["data"],
  status:  ReturnType<typeof useSession>["status"]
) {
  const ref = useRef<CryptoKey | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (status !== "authenticated" || !session) return;
        const jwk = await loadPrivateJwk(session.user.id);
        if (!jwk) throw new Error("Приватный ключ не найден");
        ref.current = await crypto.subtle.importKey(
          "jwk", jwk,
          { name: "RSA-OAEP", hash: "SHA-256" },
          false, ["decrypt"]
        );
      } catch {
        /* ignore errors here — UI будет показывать */
      }
    })();
  }, [session, status]);

  return ref;
}

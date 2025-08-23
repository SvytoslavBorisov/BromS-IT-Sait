"use client";

import { useEffect, useState } from "react";
import { ensureE2EKeypair } from "@/lib/dkg/client-crypto";

export function useE2EAndMe() {
  const [me, setMe] = useState<{ userId: string } | null>(null);
  const [authErr, setAuthErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        ensureE2EKeypair(); // создаст/оставит как есть
        const meResp = await fetch("/api/me", { cache: "no-store" });
        if (!meResp.ok) throw new Error("not authenticated");
        const meJson = await meResp.json();
        if (!meJson?.ok || !meJson.user?.id) throw new Error("/api/me invalid");
        setMe({ userId: meJson.user.id });
      } catch (e: any) {
        setAuthErr(e?.message || String(e));
      }
    })();
  }, []);

  return { me, authErr };
}

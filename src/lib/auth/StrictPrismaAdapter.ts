import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { getOAuthCtx, clearOAuthCtx } from "./oauthCtx";

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function StrictPrismaAdapter(): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,

    async createUser(user) {
      // Сформируем отпечаток ИМЕННО СЕЙЧАС, до INSERT
      const { provider, providerAccountId, email: emailFromCtx } = getOAuthCtx();
      const basis = `${provider ?? "unknown"}:${providerAccountId ?? "na"}:${user.email ?? emailFromCtx ?? ""}`;
      const fp = sha256Hex(basis); // 64 hex

      const created = await prisma.user.create({
        data: {
          name: user.name ?? null,
          email: user.email ?? emailFromCtx ?? null,
          image: user.image ?? null,
          emailVerified: user.emailVerified ?? null,

          // ← ОБЯЗАТЕЛЬНОЕ поле: заполняем здесь
          e2ePublicKeyFingerprint: fp,
        },
      });

      // На всякий случай очистим карман, чтобы не «потекло» в другие запросы
      clearOAuthCtx();

      return created as unknown as AdapterUser;
    },
  };
}

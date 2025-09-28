// src/lib/auth/nextauth.ts (или твой текущий путь)
import { getSession } from "next-auth/react";
import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import YandexProvider from "next-auth/providers/yandex";


import { logger, ensureRequestId } from "@/lib/logger";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials, req) {
        const t0 = Date.now();

        const requestId = ensureRequestId(
          req?.headers?.get?.("x-request-id") ?? (req as any)?.headers?.["x-request-id"]
        );
        const ip =
          (req as any)?.headers?.["x-forwarded-for"]?.split?.(",")?.[0]?.trim?.() ||
          req?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
          (req as any)?.socket?.remoteAddress ||
          "unknown";
        const ua =
          (req as any)?.headers?.["user-agent"] ||
          req?.headers?.get?.("user-agent") ||
          "unknown";

        const authLog = logger.child({ requestId, module: "auth/credentials" });

        if (!credentials?.email || !credentials?.password) {
          authLog.warn({
            event: "auth.login",
            method: "password",
            outcome: "failure",
            reason: "bad_credentials",
            login: credentials?.email ?? "",
            ip,
            ua,
            latencyMs: Date.now() - t0,
          });
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email },
        });
        
        if (!user) {
          authLog.error({
            event: "auth.login",
            method: "password",
            outcome: "failure",
            reason: "internal_error",
            login: email,
            ip,
            ua,
            latencyMs: Date.now() - t0,
          });
          return null;
        }

        if (!user?.passwordHash) {
          authLog.warn({
            event: "auth.login",
            method: "password",
            outcome: "failure",
            reason: "bad_credentials",
            login: email,
            ip,
            ua,
            latencyMs: Date.now() - t0,
          });
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          authLog.warn({
            event: "auth.login",
            method: "password",
            outcome: "failure",
            reason: "bad_credentials",
            login: email,
            ip,
            ua,
            latencyMs: Date.now() - t0,
          });
          return null;
        }

        // Успех
        authLog.info({
          event: "auth.login",
          method: "password",
          outcome: "success",
          userId: user.id,
          login: email,
          ip,
          ua,
          latencyMs: Date.now() - t0,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    YandexProvider({
      clientId: process.env.YANDEX_CLIENT_ID!,
      clientSecret: process.env.YANDEX_CLIENT_SECRET!,
      authorization: { params: { scope: "login:email login:info" } },
      profile(profile) {
        return {
          id: profile.id?.toString(),
          name:
            profile.display_name ||
            profile.real_name ||
            profile.login ||
            "Yandex User",
          email:
            (profile.default_email as string | undefined) ||
            (Array.isArray(profile.emails) ? profile.emails[0] : undefined) ||
            null,
          image: profile.default_avatar_id
            ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
            : null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/login" },
  callbacks: {
    async redirect({ baseUrl }) {
      return `${baseUrl}/profile`;
    },
    async session({ session, token }) {
      session.user = { ...session.user, id: token.sub! };
      return session;
    },

    async jwt({ token, user, trigger }) {

      if (trigger === "signIn" && user) {
        const authLog = logger.child({ module: "auth/jwt" });
        authLog.debug({
          event: "auth.jwt_issued",
          outcome: "success",
          userId: user.id,
        });
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
};

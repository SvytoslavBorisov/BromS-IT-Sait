// src/lib/auth/index.ts
import { getServerSession, type NextAuthOptions } from "next-auth";
// ЗАМЕНА: используем кастомный адаптер, который проставляет e2ePublicKeyFingerprint ДО INSERT
import { StrictPrismaAdapter } from "@/lib/auth/StrictPrismaAdapter";
import { prisma } from "@/lib/prisma";

import credentialsProvider from "./providers/credentials";
import yandexProvider from "./providers/yandex";
import callbacksFromFile from "./callbacks";

// контекст OAuth, чтобы передать provider/provAccId адаптеру
import { setOAuthCtxProvider } from "@/lib/auth/oauthCtx";

function normEmail(e?: string | null) {
  return (e ?? "").trim().toLowerCase() || null;
}

export const authOptions: NextAuthOptions = {
  // БЫЛО: adapter: PrismaAdapter(prisma),
  adapter: StrictPrismaAdapter(), // ← этот адаптер гарантированно кладёт e2ePublicKeyFingerprint

  providers: [credentialsProvider(), yandexProvider()],

  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },

  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },

  secret: process.env.NEXTAUTH_SECRET!, // не оставляй пустым

  callbacks: {
    // если в callbacksFromFile есть свои коллбэки — они подтянутся через spread ниже
    // ВАЖНО: linkAccount должен сработать до createUser — сохраняем provider/id в "карман"
    async linkAccount({ account }) {
      if (account?.provider && account?.providerAccountId) {
        setOAuthCtxProvider(account.provider, account.providerAccountId);
      }
      // если у тебя в callbacksFromFile тоже есть linkAccount — вызовём его
      const maybe = (callbacksFromFile as any)?.linkAccount;
      if (typeof maybe === "function") {
        const r = await maybe({ account } as any);
        if (typeof r === "boolean") return r;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) (token as any).uid = user.id;
      if (user?.email || token.email) {
        const em = normEmail(user?.email ?? (token.email as string | undefined)) ?? undefined;
        if (em !== undefined) token.email = em;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // user.id в типах NextAuth отсутствует по умолчанию — добавляем через any
        (session.user as any).id = (token as any).uid ?? undefined;

        const em = normEmail(session.user.email ?? (token.email as string | undefined));
        if (typeof em === "string") {
          session.user.email = em;
        }
      }
      return session;
    },

    // Подмешиваем остальные коллбэки (если есть), НО наш linkAccount уже определён выше
    ...(() => {
      const { linkAccount, ...rest } = (callbacksFromFile as any) ?? {};
      return rest;
    })(),
  },
};

export const getServerAuthSession = () => getServerSession(authOptions);

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const email = normEmail(session?.user?.email);
  if (!email) return null;
  return prisma.user.findUnique({ where: { email } });
}

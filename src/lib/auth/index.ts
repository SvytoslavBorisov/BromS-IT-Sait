// src/lib/auth/index.ts
import { getServerSession, type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

import credentialsProvider from "./providers/credentials";
import yandexProvider from "./providers/yandex";
import callbacksFromFile from "./callbacks";

function normEmail(e?: string | null) {
  return (e ?? "").trim().toLowerCase() || null;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [credentialsProvider(), yandexProvider()],

  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },

  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },

  secret: process.env.NEXTAUTH_SECRET!, // не оставляй пустым

  callbacks: {
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
        // чтобы не ловить "string | undefined -> string", присваиваем только если строка
        if (typeof em === "string") {
          session.user.email = em;
        } else {
          // оставим как есть (обычно NextAuth допускает undefined|null)
          // session.user.email = undefined as any; // не обязательно
        }
      }
      return session;
    },

    ...callbacksFromFile,
  },
};

export const getServerAuthSession = () => getServerSession(authOptions);

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const email = normEmail(session?.user?.email);
  if (!email) return null;
  return prisma.user.findUnique({ where: { email } });
}

// src/app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs';

import NextAuth from "next-auth/next";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger"; 

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) {
          return null;
        }
        if (!user.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (valid) {
          log({ event: "auth_success", userId: user.id, email: user.email });
          return { id: user.id, email: user.email, name: user.name };
        } else {
          log({ event: "auth_failure", email: credentials.email });
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth",    // ваша страница с формой логина
  },
  callbacks: {
    async redirect({ baseUrl }) {
      return `${baseUrl}/profile`;  // после логина идём в профиль
    },
    async session({ session, token }) {
      session.user = { ...session.user, id: token.sub! };
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
  // НЕ НАДО менять path куки, пусть будет по умолчанию "/"
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

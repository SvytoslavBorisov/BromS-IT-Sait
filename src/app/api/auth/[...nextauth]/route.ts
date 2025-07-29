export const runtime = 'nodejs';

import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GitHubProvider  from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId:     process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!
    })
  ],
  session: {
    strategy: "database"
  },
  callbacks: {
    // здесь гарантируем, что после успешного входа
    // NextAuth всегда будет редиректить на "/"
    async redirect({ url, baseUrl }) {
      return "/";
    },

    // сохраняем id в сессии
    async session({ session, user }) {
      return {
        ...session,
        user: {
          ...session.user!,
          id: user.id
        }
      };
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

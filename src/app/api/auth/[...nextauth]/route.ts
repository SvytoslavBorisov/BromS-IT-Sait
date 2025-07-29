export const runtime = 'nodejs';

import NextAuth from "next-auth/next";
import GitHubProvider  from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const handler = NextAuth({
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
    // всегда редиректим на корень
    async redirect({ baseUrl }) {
      return baseUrl;
    },
    // кладём id пользователя в session.user
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
});

// Единственные разрешённые экспорты — методы HTTP
export { handler as GET, handler as POST };

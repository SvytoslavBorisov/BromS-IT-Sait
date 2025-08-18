import { getSession } from 'next-auth/react';
import { prisma } from '@/lib/prisma';
import { NextApiRequest } from 'next'
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import { log } from "@/lib/logger";


export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ 
    where: { email: session.user.email }});
}

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

        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({ 
        where: { email: credentials.email },
        include: {
          company: { 
            select: {
              id: true, title: true
            }
          },
          department: { 
            select: {
              id: true, title: true
            }
          },
          manager: {
            select: {
              id: true, name: true
            }
          }
        }})

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          log({ event: "auth_failure", email: credentials.email });
          return null;
        }

        log({ event: "auth_success", userId: user.id, email: user.email });
        return { id: user.id,
           email: user.email,
           name: user.name,
           image: user.image };
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
  },
  secret: process.env.NEXTAUTH_SECRET!,
};
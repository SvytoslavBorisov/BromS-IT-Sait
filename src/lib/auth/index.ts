// src/lib/auth/index.ts
import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

import credentialsProvider from "./providers/credentials";
import yandexProvider from "./providers/yandex";
import callbacks from "./callbacks";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        credentialsProvider(),
        yandexProvider(),
    ],
    session: { strategy: "jwt" },
    pages: { signIn: "/auth/login" },
    callbacks,
    secret: process.env.NEXTAUTH_SECRET!,
};

// Удобный хелпер для серверного кода (App Router)
export const getServerAuthSession = () => getServerSession(authOptions);

export async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return prisma.user.findUnique({
        where: { email: session.user.email },
    });
}

// Если тебе где-то нужен сам обработчик для маршрута:
// export const { handlers: { GET, POST } } = NextAuth(authOptions);

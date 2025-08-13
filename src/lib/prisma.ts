import { PrismaClient } from "@prisma/client";

declare global {
  // Это нужно для hot-reload в development, чтобы не создавать нового клиента при каждом изменении
  // @ts-ignore
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient();

// @ts-ignore
if (process.env.NODE_ENV === "development") global.prisma = prisma;
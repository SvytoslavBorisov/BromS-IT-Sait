import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { logger, ensureRequestId } from "@/lib/logger";
import { extractIpUa } from "../utils";

export default function credentialsProvider() {
  return CredentialsProvider({
    name: "Email & Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, req) {
      const t0 = Date.now();

      const requestId = ensureRequestId(
        (req as any)?.headers?.get?.("x-request-id") ??
        (req as any)?.headers?.["x-request-id"]
      );

      const { ip, ua } = extractIpUa(req);
      const authLog = logger.child({ requestId, module: "auth/credentials" });

      if (!credentials?.email || !credentials?.password) {
        authLog.warn({
          event: "auth.login",
          method: "password",
          outcome: "failure",
          reason: "bad_credentials",
          login: credentials?.email ?? "",
          ip, ua,
          latencyMs: Date.now() - t0,
        });
        return null;
      }

      const email = String(credentials.email).trim().toLowerCase();
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.passwordHash) {
        authLog.warn({
          event: "auth.login",
          method: "password",
          outcome: "failure",
          reason: "bad_credentials",
          login: email,
          ip, ua,
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
          ip, ua,
          latencyMs: Date.now() - t0,
        });
        return null;
      }

      authLog.info({
        event: "auth.login",
        method: "password",
        outcome: "success",
        userId: user.id,
        login: email,
        ip, ua,
        latencyMs: Date.now() - t0,
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  });
}

export const runtime = "nodejs";

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { runWithOAuthCtx } from "@/lib/auth/oauthCtx";

const nextAuthHandler = NextAuth(authOptions);

const handler = (...args: Parameters<typeof nextAuthHandler>) =>
  runWithOAuthCtx(() => nextAuthHandler(...args));

export { handler as GET, handler as POST };

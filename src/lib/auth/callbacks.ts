import type { NextAuthOptions } from "next-auth";
import { logger } from "@/lib/logger";

const callbacks: NextAuthOptions["callbacks"] = {
  async redirect({ baseUrl }) {
    return `${baseUrl}/profile`;
  },
  async session({ session, token }) {
    session.user = { ...session.user, id: token.sub! };
    return session;
  },
  async jwt({ token, user, trigger }) {
    if (trigger === "signIn" && user) {
      const authLog = logger.child({ module: "auth/jwt" });
      authLog.debug({
        event: "auth.jwt_issued",
        outcome: "success",
        userId: (user as any).id,
      });
    }
    return token;
  },
};

export default callbacks;

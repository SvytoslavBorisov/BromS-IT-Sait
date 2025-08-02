import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Вариант: при неаутентифицированных редиректим на /auth
export default withAuth(
  function middleware(req: NextRequest) {
    // Здесь можно добавить логику, но withAuth сам редиректит на signIn
  },
  {
    pages: {
      signIn: "/auth/login",
    },
  }
);

export const config = {
  matcher: ["/profile/:path*"],
};
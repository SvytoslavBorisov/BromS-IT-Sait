import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.SOCKETS_JWT_SECRET!);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = {
    sub: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    picture: session.user.image ?? "",
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("10m") // короткий срок жизни токена
    .sign(SECRET);

  return NextResponse.json({ token });
}

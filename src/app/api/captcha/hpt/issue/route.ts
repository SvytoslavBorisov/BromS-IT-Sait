// src/app/api/captcha/hpt/issue/route.ts
import { NextResponse } from "next/server";
import { issueHPT } from "@/lib/captcha/hpt";
import { extractIpUa } from "@/lib/auth/utils";

export async function POST(request: Request) {
  try {
    const { scope = "auth:resend" } = await request.json().catch(() => ({}));
    const { ip, ua } = extractIpUa(request);
    const token = issueHPT({ scope, ua, ip });

    const res = NextResponse.json({ ok: true, token });
    res.headers.append(
      "Set-Cookie",
      [
        `hpt=${encodeURIComponent(token)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        process.env.NODE_ENV === "production" ? "Secure" : "",
        "Max-Age=600",
      ].filter(Boolean).join("; "),
    );
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

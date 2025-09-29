// src/lib/captcha/turnstile-server.ts
type VerifyResp = {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

export async function verifyTurnstileServer({
  token,
  remoteIp,
}: {
  token: string;
  remoteIp?: string;
}): Promise<{ ok: true; data: VerifyResp } | { ok: false; reason: string; data?: VerifyResp }> {
  if (!token) return { ok: false, reason: "missing_token" };
  const form = new URLSearchParams();
  form.set("secret", process.env.TURNSTILE_SECRET!);
  form.set("response", token);
  if (remoteIp) form.set("remoteip", remoteIp);

  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const data = (await resp.json().catch(() => ({}))) as VerifyResp;

  if (!data?.success) return { ok: false, reason: "provider_failed", data };

  // hostname (если задан)
  const expectedHost = process.env.TURNSTILE_EXPECTED_HOST;
  if (expectedHost && data.hostname && data.hostname !== expectedHost) {
    return { ok: false, reason: "bad_hostname", data };
  }

  // возраст челленджа
  if (data.challenge_ts && Date.now() - Date.parse(data.challenge_ts) > 120_000) {
    return { ok: false, reason: "too_old", data };
  }

  return { ok: true, data };
}

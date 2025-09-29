import crypto from "crypto";

export function generateVerificationToken(ttlHours = 24) {
    const token = crypto.randomBytes(32).toString("hex"); // 64 hex-символа
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    return { token, hashedToken, expires };
}

export function hashToken(raw: string) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}

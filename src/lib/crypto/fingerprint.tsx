export async function jwkFingerprint(jwk: JsonWebKey): Promise<string> {
  if (!jwk.n) throw new Error("JWK без поля n");

  // base64url → Uint8Array
  const bytes = Uint8Array.from(
    atob(jwk.n.replace(/-/g, "+").replace(/_/g, "/")),
    c => c.charCodeAt(0)
  );

  // SHA-256 → hex
  const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
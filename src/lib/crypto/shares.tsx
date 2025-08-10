// lib/crypto/shares.ts
import { shareSecretVSS } from "@/lib/crypto/shamir";
import { encryptWithPubkey } from "@/lib/crypto/keys";
import { generateGostKeyPair } from "@/lib/crypto/gost3410";

export type FileType = "CUSTOM" | "ASYMMETRIC";

interface Participant {
  id: string;
  name: string;
  publicKey: JsonWebKey;
}

export async function createCustomShares(
  secret: string,
  participants: Participant[],
  selectedIds: string[],
  threshold: number,
  comment: string,
  expiresAt: string | null
) {
  const { p, q, g, commitments, sharesList } = shareSecretVSS(
    new TextEncoder().encode(secret),
    threshold,
    selectedIds.length
  );

  const payload = await Promise.all(
    selectedIds.map(async (recipientId, idx) => {
      const x = sharesList[idx][0].toString();
      const y = sharesList[idx][1].toString();
      const part = participants.find((p) => p.id === recipientId)!;
      const ct = await encryptWithPubkey(y, part.publicKey);

      return {
        recipientId,
        x,
        ciphertext: Array.from(ct),
        status: "ACTIVE",
        comment,
        encryptionAlgorithm: "RSA-OAEP-SHA256",
        expiresAt,
      };
    })
  );

  return {
    p: p.toString(),
    q: q.toString(),
    g: g.toString(),
    threshold,
    commitments: commitments.map((c) => c.toString()),
    shares: payload,
  };
}

export async function createAsymmetricShares(
  participants: Participant[],
  selectedIds: string[],
  threshold: number,
  comment: string,
  expiresAt: string | null
) {
  const {
    privateKey: privKey,
    publicKey: pubKey,
    p: p_as_key,
    a: a_as_key,
    b: b_as_key,
    m: m_as_key,
    q: q_as_key,
    xp: xp_as_key,
    yp: yp_as_key,
    Q: Q_as_key,
  } = generateGostKeyPair();

  const { p, q, g, commitments, sharesList } = shareSecretVSS(
    new TextEncoder().encode(privKey),
    threshold,
    selectedIds.length
  );

  const payload = await Promise.all(
    selectedIds.map(async (recipientId, idx) => {
      const x = sharesList[idx][0].toString();
      const y = sharesList[idx][1].toString();
      const part = participants.find((p) => p.id === recipientId)!;
      const ct = await encryptWithPubkey(y, part.publicKey);

      return {
        recipientId,
        x,
        ciphertext: Array.from(ct),
        status: "ACTIVE",
        comment,
        encryptionAlgorithm: "RSA-OAEP-SHA256",
        expiresAt,
      };
    })
  );

  return {
    p: p.toString(),
    q: q.toString(),
    g: g.toString(),
    p_as_key,
    a_as_key,
    b_as_key,
    m_as_key,
    q_as_key,
    xp_as_key,
    yp_as_key,
    Q_as_key,
    threshold,
    commitments: commitments.map((c) => c.toString()),
    publicKey: pubKey,
    shares: payload,
  };
}

// lib/crypto/shares.ts
import { shareSecretVSS } from "@/lib/crypto/shamir";
import { encryptWithPubkey } from "@/lib/crypto/keys";
import { generateGostKeyPair } from "@/lib/crypto/dsgost";
import { issueCertificateUsingGostEc } from "@/lib/crypto/generate_sertificate";
import { streebog256 } from "@/lib/crypto/streebog";

export type FileType = "CUSTOM" | "ASYMMETRIC";

export interface Participant {
  id: string;
  email: string;
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
  expiresAt: string | null,
  issuerCertPemOrDer: string,
  issuerPrivHex: string,
  email: string,
  cn: string,
  notBefore: string,
  notAfter: string,
  serial: string 
) {

  const {
    privateKey: privKey,
    publicKey: pubKey,
    p: p_as_key,
    a: a_as_key,
    b: b_as_key,
    q: q_as_key,
    xp: xp_as_key,
    yp: yp_as_key,
    Q: Q_as_key,
    Qx,
    Qy
  } = generateGostKeyPair();

  const { p, q, g, commitments, sharesList } = shareSecretVSS(
    new TextEncoder().encode(privKey),
    threshold,
    selectedIds.length
  );

  console.log('pubKey_create', privKey, new TextEncoder().encode(privKey))
  console.log('pubKey_create', pubKey)
  console.log('pubKey_create', Q_as_key)
  console.log('pubKey_create', Qx)
  console.log('pubKey_create', Qy)
  

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

console.log(cn, new Date(notBefore), new Date(notAfter), serial)


  const res = await issueCertificateUsingGostEc({
    issuerCertDerOrPem: issuerCertPemOrDer,   // PEM строка или DER bytes/base64
    issuerPrivateKeyHex: issuerPrivHex,       // hex без 0x
    subjectPrivateKeyHex: privKey,     // можно не передавать Q — выведем
    subjectPublicQxHex: Qx,      // опционально, если хочешь задать явно
    subjectPublicQyHex: Qy,
    subjectEmail: email,
    subjectCN: cn,
    notBefore: new Date(notBefore),
    notAfter:  new Date(notAfter),
    serialNumber: serial,                     // опционально
    streebog256,
    // curve: CryptoProA_2012_256,              // опционально, по умолчанию уже так
  });


  return {
    p: p.toString(),
    q: q.toString(),
    g: g.toString(),
    p_as_key,
    a_as_key,
    b_as_key,
    m_as_key: '',
    q_as_key,
    xp_as_key,
    yp_as_key,
    Q_as_key,
    threshold,
    commitments: commitments.map((c) => c.toString()),
    publicKey: pubKey,
    shares: payload,
    pem: res.pem
  };
}

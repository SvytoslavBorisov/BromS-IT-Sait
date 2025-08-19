// types/shares.ts
export type ShareStatus = "ACTIVE" | "USED" | "EXPIRED";

export type ShareRaw = {
  id: number;
  x: string;
  ciphertext: unknown;                // сырой JSON из БЭКа
  status: ShareStatus;
  comment: string;
  encryptionAlgorithm: string;
  createdAt: string;                  // ISO
  expiresAt: string | null;           // ISO | null
  session: {
    id: string;
    dealerId: string;
    p: string;
    q: string;
    g: string;
    commitments: unknown;             // сырой JSON из БЭКа
    threshold: number;
    type: "CUSTOM" | "ASYMMETRIC";
    title?: string | null;
  };
};

/** Узко типизируем перед использованием */
export function asNumberArray(v: unknown): number[] {
  if (Array.isArray(v)) return v.map(Number).filter(n => Number.isFinite(n));
  return [];
}
export function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  return [];
}

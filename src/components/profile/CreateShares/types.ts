import { FileType, Participant } from "@/lib/crypto/shares";

export type CreateSharesState = {
  secret: string;
  selected: Set<string>;
  threshold: number;
  comment: string;
  title: string;
  expiresAt: string | null;
  type: FileType;
};

// components/DealerRecovery/types.ts

export interface IncomingShare {
  x: string;
  ciphertext: unknown;
}

export interface VSSShare {
  x: string;
  ciphertext: number[] | JSON;
  userId: string;
}

export interface DealerRecoveryProps {
  sessionId:      string;
  p:              bigint;
  q:              bigint;
  g:              bigint;
  commitments:    bigint[];
  threshold:      number;
  shares:         VSSShare[];
}

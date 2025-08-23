export type RecoveryStatus = "OPEN" | "VERIFYING" | "DONE" | "FAILED";

export type RecoverySessionDTO = {
  id: string;
  sourceSessionId: string;
  qHash: string;
  n: number;
  t: number;
  epoch: string;
  requesterUserId: string;
  requesterPubKey: string;
  status: RecoveryStatus;
  resultCiphertext?: string;
  resultMeta?: string;
  participantsCount?: number;
  sharesCount?: number;
};

export type CreateRecoveryBody = {
  sourceSessionId: string; // id исходной DKG
  requesterPubKey: string; // hex: на кого шифруем результат
};

export type SubmitRecoveryShareBody = {
  sHex: string;  // доля участника в hex (LE/BE — как валидация ожидает)
  // опционально можно включить подписи/доказательства владения
};

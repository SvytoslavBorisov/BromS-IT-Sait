// types.ts (клиентские типы для UI)

// Для выпадающего списка «сессий подписи»
export type ShareSession = {
  id: string;
  title: string;
  dealerId: string;
  status: string;
};

// Возможные статусы документа и сессии (по схеме)
export type DocumentStatus = "NOTECRYPT" | "ECRYPT";
export type RecoveryStatus = "PENDING" | "DONE" | "CANCELED";

// Минимум, что нужно для показа прогресса «долей»
type ThresholdHolder = { threshold: number };

type DocumentSignSessionClient = {
  id: string;
  status: RecoveryStatus;
  recoveryId: string;

  // Для прогресса: сколько долей собрано и t
  recovery?: {
    receipts: { id: string }[];               // только длина нужна
    shareSession?: ThresholdHolder | null;    // t из ShamirSession
  } | null;

  // Альтернативный источник t: publicKey.privateKeySharing.threshold
  publicKey?: {
    privateKeySharing?: ThresholdHolder | null;
  } | null;
};

// Документ (filePath теперь web‑путь вида `/uploads/...`)
export type Document = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;      // "/uploads/..."
  createdAt: string;     // ISO
  type: DocumentStatus;
  documentSignSession: DocumentSignSessionClient[]; // берём [0] как активную
};

// Если где‑то нужен короткий тип
export type DocumentSign = {
  id: string;
  recoveryId: string;
};

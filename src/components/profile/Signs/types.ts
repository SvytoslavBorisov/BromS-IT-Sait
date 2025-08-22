export type SignatureRow = {
  id: string;
  type: string;
  filePath?: string | null;
  pem?: string | null;

  documentId: string;
  document: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  };

  userId: string;
  user: {
    id: string;
    name?: string | null;
    surname?: string | null;
    email: string;
    image?: string | null;
  };

  shamirSessionId?: string | null;
};

export type VerifyResult = {
  ok: boolean;
  status: "OK" | "WARN" | "ERROR" | "NOT_IMPLEMENTED";
  message: string;
  details?: Record<string, any>;
};

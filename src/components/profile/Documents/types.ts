import { documentSignSession } from '@prisma/client';


export type ShareSession = {
  id: string;
  title: string;
  dealerId: string;
  status: string;
};

export type Document = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  createdAt: string;
  type: string
  documentSignSession: documentSignSession[];
};

export type DocumentSign = {
  id: string;
  recoveryId: string;
};

/*

  id          String    @id @default(cuid())
  dealerId    String
  p           String    @default("")        // пустая строка
  q           String    @default("")
  g           String    @default("")
  commitments Json      @default("[]")      // пустой JSON-массив
  threshold   Int
  createdAt   DateTime  @default(now())
  status      String    @default("")

  shares      Share[]   @relation("SessionShares")
  recoveries  RecoverySession[]

 */
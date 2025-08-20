// services/documentsApi.ts
import type { Document, ShareSession } from "@/components/profile/Documents/types";

export async function fetchDocuments(): Promise<Document[]> {
  const res = await fetch("/api/documents");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function uploadDocument(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/documents", { method: "POST", body: fd });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function encryptDocument(documentId: string) {
  const res = await fetch("/api/documents/crypto/encrypt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function decryptDocument(documentId: string) {
  const res = await fetch("/api/documents/crypto/decrypt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function fetchShareSessions(): Promise<ShareSession[]> {
  const res = await fetch("/api/shareSessions");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function signDocument(documentId: string, sessionId: string) {
  // оставляю как в твоём исходнике (подпись у тебя идёт через encrypt‑endpoint)
  const res = await fetch("/api/documents/crypto/encrypt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, sessionId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function sendDocument(documentId: string, recoveryId: string, privJwk: any) {
  const res = await fetch("/api/documents/crypto/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, sessionId: recoveryId, privJwk }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

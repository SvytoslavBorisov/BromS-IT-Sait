// hooks/useDocuments.ts
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Document, ShareSession } from "@/components/profile/Documents/types";
import { loadPrivateJwk } from "@/lib/crypto/secure-storage";
import { audit } from "@/services/audit";
import {
  fetchDocuments, uploadDocument,
  encryptDocument, decryptDocument,
  fetchShareSessions, signDocument, sendDocument
} from "@/services/documentsApi";

export type Notice = { type: "success" | "error"; text: string } | null;

export function useDocuments() {
  const { data: session } = useSession();
  const [docs, setDocs] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingEncrypt, setLoadingEncrypt] = useState<Record<string, boolean>>({});
  const [loadingDecrypt, setLoadingDecrypt] = useState<Record<string, boolean>>({});

  const [sessions, setSessions] = useState<ShareSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [showDropdownId, setShowDropdownId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Record<string, string>>({});

  const [notice, setNotice] = useState<Notice>(null);

  const showSuccess = (text: string) => setNotice({ type: "success", text });
  const showError   = (text: string) => setNotice({ type: "error", text });
  const closeNotice = () => setNotice(null);

  useEffect(() => {
    if (session) void listDocs();
  }, [session]);

  async function listDocs() {
    try {
      const data = await fetchDocuments();
      setDocs(data);
      await audit("docs.list_success", { count: data.length });
    } catch (e) {
      console.error(e);
      await audit("docs.list_failure");
      showError("Не удалось загрузить список документов");
    }
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoadingUpload(true);
    await audit("docs.upload_start", { fileName: file.name, size: file.size });
    try {
      await uploadDocument(file);
      await audit("docs.upload_success", { fileName: file.name });
      showSuccess("Файл загружен");
      setFile(null);
      await listDocs();
    } catch (e) {
      console.error(e);
      await audit("docs.upload_failure", { fileName: file.name });
      showError("Ошибка загрузки файла");
    } finally {
      setLoadingUpload(false);
    }
  }

  async function onEncrypt(id: string) {
    setLoadingEncrypt((p) => ({ ...p, [id]: true }));
    await audit("docs.encrypt_start", { documentId: id });
    try {
      await encryptDocument(id);
      await audit("docs.encrypt_success", { documentId: id });
      showSuccess("Файл зашифрован");
      await listDocs();
    } catch (e) {
      console.error(e);
      await audit("docs.encrypt_failure", { documentId: id });
      showError("Ошибка шифрования");
    } finally {
      setLoadingEncrypt((p) => ({ ...p, [id]: false }));
    }
  }

  async function onDecrypt(id: string) {
    setLoadingDecrypt((p) => ({ ...p, [id]: true }));
    await audit("docs.decrypt_start", { documentId: id });
    try {
      await decryptDocument(id);
      await audit("docs.decrypt_success", { documentId: id });
      showSuccess("Файл расшифрован");
      await listDocs();
    } catch (e) {
      console.error(e);
      await audit("docs.decrypt_failure", { documentId: id });
      showError("Ошибка дешифрования");
    } finally {
      setLoadingDecrypt((p) => ({ ...p, [id]: false }));
    }
  }

  async function ensureSessionsLoaded() {
    if (sessions.length) return;
    setLoadingSessions(true);
    await audit("sharesessions.list_start");
    try {
      const data = await fetchShareSessions();
      setSessions(data);
      await audit("sharesessions.list_success", { count: data.length });
    } catch (e) {
      console.error(e);
      await audit("sharesessions.list_failure");
      showError("Не удалось загрузить сессии");
    } finally {
      setLoadingSessions(false);
    }
  }

  async function onSign(docId: string, sessionId: string) {
    if (!sessionId) return;
    await audit("docs.sign_start", { documentId: docId, sessionId });
    try {
      await signDocument(docId, sessionId);
      await audit("docs.sign_success", { documentId: docId, sessionId });
      showSuccess("Файл подписан");
      setShowDropdownId(null);
      await listDocs();
    } catch (e) {
      console.error(e);
      await audit("docs.sign_failure", { documentId: docId, sessionId });
      showError("Ошибка при подписании");
    }
  }

  async function onSend(docId: string, recoveryId: string) {
    await audit("docs.send_start", { documentId: docId, recoveryId });
    try {
      const userId = (session?.user as any)?.id;
      if (!userId) throw new Error("No userId in session");
      const privJwk = await loadPrivateJwk(userId);
      if (!privJwk) throw new Error("Private JWK not found");

      await sendDocument(docId, recoveryId, privJwk);
      await audit("docs.send_success", { documentId: docId, recoveryId });
      showSuccess("Документ отправлен");
      setShowDropdownId(null);
    } catch (e) {
      console.error(e);
      await audit("docs.send_failure", { documentId: docId, recoveryId });
      showError("Ошибка при отправке");
    }
  }

  return {
    // данные
    docs, sessions,
    // состояния
    file, setFile,
    loadingUpload, loadingEncrypt, loadingDecrypt,
    loadingSessions,
    showDropdownId, setShowDropdownId,
    selectedSession, setSelectedSession,
    notice, showSuccess, showError, closeNotice,
    // экшены
    listDocs, onUpload, onEncrypt, onDecrypt,
    ensureSessionsLoaded, onSign, onSend,
  };
}

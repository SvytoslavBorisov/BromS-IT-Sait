/* components/profile/DocumentsPage.tsx */
"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { Document, ShareSession } from "./types";
import { loadPrivateJwk } from "@/lib/crypto/secure-storage"; 

// ---------- маленький helper для аудита ----------
async function audit(event: string, data: Record<string, any> = {}) {
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...data }),
    });
  } catch {
    // молча игнорим, UI не должен падать из‑за аудита
  }
}

export default function DocumentsPage() {
  const { status, data: session } = useSession();

  const [docs, setDocs] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loadingUpload, setLoadingUpload] = useState(false);

  const [loadingEncrypt, setLoadingEncrypt] = useState<Record<string, boolean>>({});
  const [loadingDecrypt, setLoadingDecrypt] = useState<Record<string, boolean>>({});

  const [sessions, setSessions] = useState<ShareSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [showDropdownId, setShowDropdownId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ----------- helpers -----------
  const showSuccess = (text: string) => setNotice({ type: "success", text });
  const showError = (text: string) => setNotice({ type: "error", text });

  const closeNotice = () => setNotice(null);

  // ----------- data -----------
  useEffect(() => {
    if (session) fetchDocs();
  }, [session]);

  async function fetchDocs() {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Document[] = await res.json();
      setDocs(data);
      await audit("docs.list_success", { count: data.length });
    } catch (e) {
      console.error(e);
      await audit("docs.list_failure");
      showError("Не удалось загрузить список документов");
    }
  }

  // ----------- actions -----------
  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoadingUpload(true);
    await audit("docs.upload_start", { fileName: file.name, size: file.size });

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await audit("docs.upload_success", { fileName: file.name });
      showSuccess("Файл загружен");
      setFile(null);
      fetchDocs();
    } catch (e) {
      console.error(e);
      await audit("docs.upload_failure", { fileName: file.name });
      showError("Ошибка загрузки файла");
    } finally {
      setLoadingUpload(false);
    }
  };

  const encryptFile = async (id: string) => {
    setLoadingEncrypt((p) => ({ ...p, [id]: true }));
    await audit("docs.encrypt_start", { documentId: id });

    try {
      const res = await fetch("/api/documents/crypto/encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await audit("docs.encrypt_success", { documentId: id });
      showSuccess("Файл зашифрован");
    } catch (e) {
      console.error(e);
      await audit("docs.encrypt_failure", { documentId: id });
      showError("Ошибка шифрования");
    } finally {
      setLoadingEncrypt((p) => ({ ...p, [id]: false }));
    }
  };

  const decryptFile = async (id: string) => {
    setLoadingDecrypt((p) => ({ ...p, [id]: true }));
    await audit("docs.decrypt_start", { documentId: id });

    try {
      const res = await fetch("/api/documents/crypto/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await audit("docs.decrypt_success", { documentId: id });
      showSuccess("Файл расшифрован");
    } catch (e) {
      console.error(e);
      await audit("docs.decrypt_failure", { documentId: id });
      showError("Ошибка дешифрования");
    } finally {
      setLoadingDecrypt((p) => ({ ...p, [id]: false }));
    }
  };

  const loadShareSessions = async () => {
    if (sessions.length) return;
    setLoadingSessions(true);
    await audit("sharesessions.list_start");

    try {
      const res = await fetch("/api/shareSessions");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ShareSession[] = await res.json();
      setSessions(data);
      await audit("sharesessions.list_success", { count: data.length });
    } catch (e) {
      console.error(e);
      await audit("sharesessions.list_failure");
      showError("Не удалось загрузить сессии");
    } finally {
      setLoadingSessions(false);
    }
  };

  const signFile = async (docId: string, sessionId: string) => {
    if (!sessionId) return;
    await audit("docs.sign_start", { documentId: docId, sessionId });

    try {
      const res = await fetch("/api/documents/crypto/encrypt", {
        // здесь может быть твой эндпоинт подписи; оставляю как в исходнике
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, sessionId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await audit("docs.sign_success", { documentId: docId, sessionId });
      showSuccess("Файл подписан");
      setShowDropdownId(null);
    } catch (e) {
      console.error(e);
      await audit("docs.sign_failure", { documentId: docId, sessionId });
      showError("Ошибка при подписании");
    }
  };

const sendFile = async (docId: string, recoveryId: string) => {
  await audit("docs.send_start", { documentId: docId, recoveryId });

  try {
    // 1) Берём JWK из твоего secure storage (по userId)
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error("No userId in session");
    const privJwk = await loadPrivateJwk(userId);
    if (!privJwk) throw new Error("Private JWK not found");

    // 2) Отправляем вместе с запросом
    const res = await fetch("/api/documents/crypto/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId, sessionId: recoveryId, privJwk }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await audit("docs.send_success", { documentId: docId, recoveryId });
    showSuccess("Документ отправлен");
    setShowDropdownId(null);
  } catch (e) {
    console.error(e);
    await audit("docs.send_failure", { documentId: docId, recoveryId });
    showError("Ошибка при отправке");
  }
};

  // ----------- UI -----------
  return (
    
    <div className="relative">
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-9 w-9 rounded-2xl border flex items-center justify-center shadow-sm">
                <span className="text-sm font-semibold">SSS</span>
              </div>
              <div className="truncate">
                <h1 className="text-lg md:text-xl font-semibold leading-6 truncate">
                  Документы
                </h1>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Ваши документы
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      {/* Уведомление */}
      {notice && (
        <div
          className={`w-full rounded-xl border p-3 ${
            notice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
          role="alert"
        >
          <div className="flex items-start justify-between">
            <span className="text-sm">{notice.text}</span>
            <button onClick={closeNotice} className="text-xs opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Загрузка файла — полноширинный блок */}
      <section className="w-full rounded-2xl border bg-card">
        <form onSubmit={upload} className="p-5 md:p-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium">Выберите файл</label>
            <input
              type="file"
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-muted-foreground">Поддерживаются любые типы. Размер — по настройкам сервера.</p>
          </div>
          <div className="flex-shrink-0">
            <button
              type="submit"
              disabled={!file || loadingUpload}
              className="w-full md:w-auto rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingUpload ? "Загрузка..." : "Загрузить"}
            </button>
          </div>
        </form>
      </section>

      {/* Список документов — карточки на всю ширину */}
      <section className="w-full space-y-3">
        {docs.map((d) => {
          const isDone = d.documentSignSession?.[0]?.status === "DONE";
          const sizeKb = (d.fileSize / 1024).toFixed(1);

          return (
            <article key={d.id} className="w-full rounded-2xl border bg-card p-4 md:p-5">
              {/* Верхняя строка: имя + мета + быстрые действия */}
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <a
                    href={`/${d.filePath}`}
                    target="_blank"
                    className="line-clamp-1 break-all text-base font-semibold hover:underline"
                  >
                    {d.fileName}
                  </a>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{new Date(d.createdAt).toLocaleString()}</span>
                    <span>•</span>
                    <span>{d.fileType}</span>
                    <span>•</span>
                    <span>{sizeKb} KB</span>
                    <span>•</span>
                    <span
                      className={`inline-flex items-center rounded-lg px-2 py-0.5 ring-1 ${
                        isDone
                          ? "bg-emerald-50 ring-emerald-200 text-emerald-900"
                          : "bg-amber-50 ring-amber-200 text-amber-900"
                      }`}
                    >
                      {isDone ? "Готов к отправке" : "Требуется подпись"}
                    </span>
                  </div>
                </div>

                {/* быстрые действия: шифровать / расшифровать */}
                <div className="flex gap-2">
                  {d.type === "NOTECRYPT" ? (
                    <button
                      onClick={() => encryptFile(d.id)}
                      disabled={!!loadingEncrypt[d.id]}
                      className="rounded-xl bg-yellow-600 px-3 py-2 text-xs font-medium text-white shadow hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {loadingEncrypt[d.id] ? "Шифрование…" : "Зашифровать"}
                    </button>
                  ) : (
                    <button
                      onClick={() => decryptFile(d.id)}
                      disabled={!!loadingDecrypt[d.id]}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {loadingDecrypt[d.id] ? "Дешифрование…" : "Расшифровать"}
                    </button>
                  )}
                </div>
              </div>

              {/* Низ: действия «Подписать» и «Отправить» */}
              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div
                  onMouseEnter={() => {
                    loadShareSessions();
                    setShowDropdownId(d.id);
                  }}
                  onMouseLeave={() => setShowDropdownId(null)}
                  className="relative"
                >
                  <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700">
                    Подписать файл
                  </button>

                  {/* выпадающий выбор сессии */}
                  {showDropdownId === d.id && (
                    <div className="absolute z-10 mt-2 w-64 rounded-xl border bg-popover p-2 shadow">
                      {loadingSessions ? (
                        <div className="px-2 py-1 text-sm text-muted-foreground">Загрузка сессий…</div>
                      ) : (
                        <select
                          value={selectedSession[d.id] || ""}
                          onChange={(e) => {
                            const sid = e.target.value;
                            setSelectedSession((prev) => ({ ...prev, [d.id]: sid }));
                            signFile(d.id, sid);
                          }}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        >
                          <option value="">— выберите сессию —</option>
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {isDone && (
                  <button
                    onClick={() => sendFile(d.id, d.documentSignSession[0].recoveryId)}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700"
                  >
                    Отправить документ
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
    </div>
  );
}

// components/profile/documents/DocumentCard.tsx
"use client";

import type { Document, ShareSession } from "@/components/profile/Documents/types";
import { useRef } from "react";

export default function DocumentCard({
  doc,
  loadingEncrypt, loadingDecrypt,
  onEncrypt, onDecrypt,
  isDropdownOpen, setDropdownOpen,
  ensureSessionsLoaded, loadingSessions,
  sessions, selected, setSelected, onSign,
  onSend,
}: {
  doc: Document;
  loadingEncrypt: boolean;
  loadingDecrypt: boolean;
  onEncrypt: (id: string) => void;
  onDecrypt: (id: string) => void;

  isDropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;

  ensureSessionsLoaded: () => void;
  loadingSessions: boolean;
  sessions: ShareSession[];
  selected: string | undefined;
  setSelected: (v: string) => void;
  onSign: (docId: string, sessionId: string) => void;

  onSend: (docId: string, recoveryId: string) => void;
}) {
  const isDone = doc.documentSignSession?.[0]?.status === "DONE";
  const sizeKb = (doc.fileSize / 1024).toFixed(1);

  // ─── Прогресс по долям: считаем ТОЛЬКО реально полученные (ciphertext != пусто) ───
  const dss = doc.documentSignSession?.[0];
  const receipts = (dss?.recovery?.receipts ?? []) as Array<{ ciphertext?: unknown }>;

  const collectedShares = receipts.filter((r) => {
    const c = r?.ciphertext as any;
    if (Array.isArray(c)) return c.length > 0;
    if (c && typeof c === "object") return Object.keys(c).length > 0;
    return !!c;
  }).length;

  const threshold =
    dss?.recovery?.shareSession?.threshold ??
    dss?.publicKey?.privateKeySharing?.threshold ??
    null;

  const hasSession = !!dss;
  const showCollected = !isDone && hasSession && (threshold !== null || receipts.length > 0);

  // ─── Логика hover с задержкой ───
  const closeTimer = useRef<number | null>(null);

  const openNow = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    ensureSessionsLoaded();
    setDropdownOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setDropdownOpen(false);
      closeTimer.current = null;
    }, 150);
  };

  return (
    <article className="w-full rounded-2xl border bg-white p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <a
            href={doc.filePath} // теперь это уже web-путь вида /uploads/...
            target="_blank"
            className="line-clamp-1 break-all text-base font-semibold hover:underline"
          >
            {doc.fileName}
          </a>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>{new Date(doc.createdAt).toLocaleString()}</span>
            <span>•</span>
            <span>{doc.fileType}</span>
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

        <div className="flex gap-2">
          {doc.type === "NOTECRYPT" ? (
            <button
              onClick={() => onEncrypt(doc.id)}
              disabled={loadingEncrypt}
              className="rounded-xl bg-yellow-600 px-3 py-2 text-xs font-medium text-white shadow hover:bg-yellow-700 disabled:opacity-50"
            >
              {loadingEncrypt ? "Шифрование…" : "Зашифровать"}
            </button>
          ) : (
            <button
              onClick={() => onDecrypt(doc.id)}
              disabled={loadingDecrypt}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50"
            >
              {loadingDecrypt ? "Дешифрование…" : "Расшифровать"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          className="relative flex items-center gap-3"
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
        >
          <button
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
            onMouseEnter={openNow}
          >
            Подписать файл
          </button>

          {showCollected && (
            <span
              className="inline-flex items-center rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
              title="Прогресс сбора долей для восстановления подписи"
            >
              {threshold !== null
                ? <>Собрано {collectedShares} из {threshold} долей</>
                : <>Собрано {collectedShares} долей</>}
            </span>
          )}

          {isDropdownOpen && (
            <div
              className="absolute left-0 top-full z-10 w-64 translate-y-2 rounded-xl border bg-white p-2 shadow"
              onMouseEnter={openNow}
              onMouseLeave={scheduleClose}
            >
              {loadingSessions ? (
                <div className="px-2 py-1 text-sm text-gray-500">Загрузка сессий…</div>
              ) : (
                <select
                  value={selected || ""}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setSelected(sid);
                    if (sid) onSign(doc.id, sid);
                  }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">— выберите сессию —</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {isDone && dss?.recoveryId && (
          <button
            onClick={() => onSend(doc.id, dss.recoveryId)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700"
          >
            Отправить документ
          </button>
        )}
      </div>
    </article>
  );
}

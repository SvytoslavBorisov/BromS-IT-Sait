"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FileInput } from "./fileInput";
import { SignButton } from "./signButton";
import { Document, ShareSession } from "./types";
import { useImportKey } from "./useImportKey";
import { loadPrivateJwk } from "@/lib/crypto/secure-storage";
import * as asn1js from 'asn1js';
import path from "path";
import asn1 from "asn1.js";


export default function DocumentsPage() {
  const { status, data: session } = useSession();
  const [docs, setDocs] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEncrypt, setLoadingEncrypt] = useState<Record<string, boolean>>({});
  const [loadingDecrypt, setLoadingDecrypt] = useState<Record<string, boolean>>({});

  const [sessions, setSessions] = useState<ShareSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [showDropdownId, setShowDropdownId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Record<string, string>>({});
  const [selectedRecoverySession, setSelectedRecoverySession] = useState<Record<string, string>>({});

  const privateKeyRef = useImportKey(session, status);

  // Fetch documents on session
  useEffect(() => {
    if (session) fetchDocs();
  }, [session]);

  async function fetchDocs() {
    const res = await fetch("/api/documents");
    if (res.ok) setDocs(await res.json());
  }

  // Encrypt / Decrypt handlers
  const encryptFile = async (id: string) => {
    setLoadingEncrypt(prev => ({ ...prev, [id]: true }));
    try {
      await fetch("/api/documents/crypto/encrypt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: id }) });
      alert("Файл зашифрован");
    } catch (e) {
      console.error(e);
      alert("Ошибка шифрования");
    } finally {
      setLoadingEncrypt(prev => ({ ...prev, [id]: false }));
    }
  };

  const decryptFile = async (id: string) => {
    setLoadingDecrypt(prev => ({ ...prev, [id]: true }));
    try {
      await fetch("/api/documents/crypto/decrypt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: id }) });
      alert("Файл расшифрован");
    } catch (e) {
      console.error(e);
      alert("Ошибка дешифрования");
    } finally {
      setLoadingDecrypt(prev => ({ ...prev, [id]: false }));
    }
  };

  // Load share sessions once
  const loadShareSessions = async () => {
    if (sessions.length) return;
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/shareSessions");
      const data: ShareSession[] = await res.json();
      setSessions(data);
    } catch (e) {
      console.error(e);
      alert("Не удалось загрузить сессии");
    } finally {
      setLoadingSessions(false);
    }
  };

  // Sign handler
  const signFile = async (docId: string, sessionId: string) => {
    try {
      await fetch("/api/documents/crypto/encrypt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: docId, sessionId }) });
      alert("Файл подписан");
      setShowDropdownId(null);
    } catch (e) {
      console.error(e);
      alert("Ошибка при подписании");
    }
  };

  // Send handler (only when DONE)
  const sendFile = async (docId: string, recoveryId: string) => {
    const privJwk = await loadPrivateJwk(session!.user.id);
    if (!privJwk) throw new Error("Приватный ключ не найден");
    privateKeyRef.current = await crypto.subtle.importKey("jwk", privJwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
    try {
      const pem = await fetch("/api/documents/crypto/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: docId, sessionId: recoveryId, privJwk }) });
      alert(await pem.json());
      setShowDropdownId(null);
        
      const tmpKeyPath = path.join('C:\\Users\\svyto', `gostkey-${Date.now()}.pem`);
      console.log(`Готово: ${tmpKeyPath}`);

       const GOST_ALGO = {
          name:       'GOST R 34.10',
          version:    2001,
          namedCurve: 'id-GostR3410-2001-CryptoPro-A-ParamSet'
      };

    } catch (e) {
      console.error(e);
      alert("Ошибка при отправке");
    }
  };

  // UI
  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Мои документы</h1>
      <form onSubmit={async e => {
        e.preventDefault();
        if (!file) return;
        setLoading(true);
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch("/api/documents", { method: "POST", body: fd });
        setLoading(false);
        if (res.ok) { setFile(null); fetchDocs(); } else alert("Ошибка загрузки");
      }} className="space-y-2">
        <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <button type="submit" disabled={!file || loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {loading ? "Загрузка..." : "Загрузить"}
        </button>
      </form>

      <ul className="space-y-4">
        {docs.map(d => {
          const isDone = d.documentSignSession[0]?.status === "DONE";
          return (
            <li key={d.id} className="border p-4 rounded relative">
              <div className="flex justify-between items-start">
                <div>
                  <a href={`/${d.filePath}`} target="_blank" className="font-medium block">{d.fileName}</a>
                  <div className="text-sm text-gray-600">
                    {new Date(d.createdAt).toLocaleString()} &middot; {d.fileType} &middot; {(d.fileSize/1024).toFixed(1)} KB
                  </div>
                </div>
                {d.type === "NOTECRYPT" ? (
                  <button onClick={() => encryptFile(d.id)} disabled={loadingEncrypt[d.id]} className="ml-4 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50">
                    {loadingEncrypt[d.id] ? "Шифрование..." : "Зашифровать файл"}
                  </button>
                ) : (
                  <button onClick={() => decryptFile(d.id)} disabled={loadingDecrypt[d.id]} className="ml-4 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">
                    {loadingDecrypt[d.id] ? "Дешифрование..." : "Расшифровать файл"}
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2">
                <div
                  onMouseEnter={() => { loadShareSessions(); setShowDropdownId(d.id); }}
                  onMouseLeave={() => setShowDropdownId(null)}
                >
                  <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Подписать файл
                  </button>

                  {showDropdownId === d.id && (
                    <div className="mt-2">
                      {loadingSessions
                        ? <div>Загрузка...</div>
                        : (
                          <select
                            value={selectedSession[d.id] || ""}
                            onChange={e => {
                              const sid = e.target.value;
                              setSelectedSession(prev => ({ ...prev, [d.id]: sid }));
                              signFile(d.id, sid);
                            }}
                            className="border rounded p-1"
                          >
                            <option value="">-- выберите --</option>
                            {sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                          </select>
                        )
                      }
                    </div>
                  )}
                </div>

                {isDone && (
                  <button onClick={() => sendFile(d.id, d.documentSignSession[0].recoveryId)} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    Отправить
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

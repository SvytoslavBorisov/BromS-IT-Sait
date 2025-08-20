/* components/profile/documents/DocumentsPage.tsx */
"use client";

import React from "react";
import DocumentsHeader from "./DocumentsHeader";
import Notice from "./Notice";
import UploadSection from "./UploadSection";
import DocumentCard from "./DocumentCard";
import { useDocuments } from "@/hooks/useDocuments";

export default function DocumentsPage() {
  const {
    // данные
    docs, sessions,
    // состояния
    file, setFile,
    loadingUpload, loadingEncrypt, loadingDecrypt,
    loadingSessions,
    showDropdownId, setShowDropdownId,
    selectedSession, setSelectedSession,
    notice, closeNotice,
    // экшены
    onUpload, onEncrypt, onDecrypt,
    ensureSessionsLoaded, onSign, onSend,
  } = useDocuments();

  return (
    <div className="relative">
      <DocumentsHeader />

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <Notice notice={notice} onClose={closeNotice} />

        <UploadSection
          file={file}
          setFile={setFile}
          onUpload={onUpload}
          loading={loadingUpload}
        />

        <section className="w-full space-y-3">
          {docs.map((d) => (
            <DocumentCard
              key={d.id}
              doc={d}
              loadingEncrypt={!!loadingEncrypt[d.id]}
              loadingDecrypt={!!loadingDecrypt[d.id]}
              onEncrypt={onEncrypt}
              onDecrypt={onDecrypt}
              isDropdownOpen={showDropdownId === d.id}
              setDropdownOpen={(open) => setShowDropdownId(open ? d.id : null)}
              ensureSessionsLoaded={ensureSessionsLoaded}
              loadingSessions={loadingSessions}
              sessions={sessions}
              selected={selectedSession[d.id]}
              setSelected={(sid) => setSelectedSession((p) => ({ ...p, [d.id]: sid }))}
              onSign={onSign}
              onSend={onSend}
            />
          ))}
        </section>
      </div>
    </div>
  );
}

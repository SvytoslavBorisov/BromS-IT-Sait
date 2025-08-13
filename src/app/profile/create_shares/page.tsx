// app/page.tsx
"use client";

import { useState } from "react";

export default function HomePage() {
  const [email, setEmail] = useState("sv_borisov03@mail.ru");
  const [cn, setCn] = useState("Slava");
  const [issuerCertPem, setIssuerCertPem] = useState("");
  const [issuerPrivHex, setIssuerPrivHex] = useState("");
  const [subjectPrivHex, setSubjectPrivHex] = useState("");
  const [result, setResult] = useState<null | any>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreateCert() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/create/sertification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          cn,
          issuerCertPemOrDer: issuerCertPem,
          issuerPrivHex,
          subjectPrivHex,
          notBefore: new Date().toISOString(),
          notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 год
        }),
      });

      if (!res.ok) {
        throw new Error(`Ошибка ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({ error: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>Создание сертификата</h1>

      <div style={{ marginBottom: 10 }}>
        <label>Email субъекта: </label>
        <input value={email} onChange={e => setEmail(e.target.value)} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>CN субъекта: </label>
        <input value={cn} onChange={e => setCn(e.target.value)} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Issuer Cert (PEM): </label>
        <textarea
          rows={5}
          value={issuerCertPem}
          onChange={e => setIssuerCertPem(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Issuer Private Key (hex): </label>
        <input value={issuerPrivHex} onChange={e => setIssuerPrivHex(e.target.value)} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Subject Private Key (hex, опционально): </label>
        <input value={subjectPrivHex} onChange={e => setSubjectPrivHex(e.target.value)} />
      </div>

      <button onClick={handleCreateCert} disabled={loading}>
        {loading ? "Создаю..." : "Создать сертификат"}
      </button>

      {result && (
        <div style={{ marginTop: 20 }}>
          <h2>Результат</h2>
          {result.error ? (
            <pre style={{ color: "red" }}>{result.error}</pre>
          ) : (
            <>
              <p><strong>PEM:</strong></p>
              <pre>{result.pem}</pre>
              <p><strong>Subject Priv Key:</strong> {result.subjectPrivHex}</p>
              <p><strong>Qx:</strong> {result.QxHex}</p>
              <p><strong>Qy:</strong> {result.QyHex}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

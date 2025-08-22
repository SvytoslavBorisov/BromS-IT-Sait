"use client";

import { useEffect, useState } from "react";
import type { SignatureRow } from "./types";

export function useSignatures(enabled: boolean) {
  const [rows, setRows] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchRows(signal?: AbortSignal) {
    setLoading(true);
    try {
      const res = await fetch("/api/signatures", { signal, cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as SignatureRow[];
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    fetchRows(ctrl.signal).catch((e) => {
      if (e?.name !== "AbortError") console.error(e);
    });
    return () => ctrl.abort();
  }, [enabled]);

  return {
    rows,
    loading,
    refresh: () => fetchRows().catch(console.error),
    setRows,
  };
}

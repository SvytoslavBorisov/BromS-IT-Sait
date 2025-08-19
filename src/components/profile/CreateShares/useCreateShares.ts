"use client";

import { useEffect, useState } from "react";
import {
  createCustomShares,
  createAsymmetricShares,
  FileType,
  Participant,
} from "@/lib/crypto/shares";
import { clientLog } from "@/lib/client-log";

export default function useCreateShares() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [fileContent, setFileContent] = useState<string>("");

  const [state, setStateFull] = useState({
    secret: "",
    selected: new Set<string>(),
    threshold: 2,
    comment: "",
    title: "Разделение",
    expiresAt: null as string | null,
    type: "CUSTOM" as FileType,
  });

  function setState(partial: Partial<typeof state>) {
    setStateFull((prev) => ({ ...prev, ...partial }));
  }

  useEffect(() => {
    clientLog("info", "participants.fetch.start");
    fetch("/api/participants", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setParticipants(data);
        clientLog("info", "participants.fetch.success", { count: data.length });
      })
      .catch((err) => {
        console.error(err);
        clientLog("error", "participants.fetch.error", { message: String(err) });
      });
  }, []);

  useEffect(() => {
    fetch("broms.cer")
      .then((response) => response.arrayBuffer())
      .then((data) => {
        const text = new TextDecoder().decode(data);
        setFileContent(text);
      });
  }, []);

  const toggle = (id: string) => {
    setStateFull((s) => {
      const copy = new Set(s.selected);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      const newThreshold = s.threshold > copy.size ? copy.size : s.threshold;
      return { ...s, selected: copy, threshold: newThreshold };
    });
  };

  function downloadAsFile(data: string | Uint8Array, fileName: string, mimeType: string) {
    const blob = new Blob([typeof data === "string" ? data : new Uint8Array(data)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  const handleCreate = async () => {
    const { type, secret, threshold, selected, comment, expiresAt, title } = state;

    clientLog("info", "shares.create.start", { type, threshold, selectedCount: selected.size, title });

    if (type === "CUSTOM" && !secret) {
      clientLog("warn", "shares.create.cancel.no_secret");
      return;
    }
    if (selected.size < threshold) {
      clientLog("warn", "shares.create.cancel.not_enough_selected");
      return;
    }

    try {
      let payload;

      if (type === "CUSTOM") {
        payload = await createCustomShares(secret, participants, Array.from(selected), threshold, comment, expiresAt);
        await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, title, type }),
        });
      } else {
        payload = await createAsymmetricShares(
          participants,
          Array.from(selected),
          threshold,
          comment,
          expiresAt,
          fileContent,
          "f1f1205a8f0bab12aff2a5ed08296c9894686aa62ec0e131c20cafa71c59b9f1",
          "sv_borisov03@mail.ru",
          "SvyTo",
          new Date().toISOString(),
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          "3"
        );

        downloadAsFile(payload.pem, title + ".cer", "application/x-x509-ca-cert");

        await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, title, type }),
        });
      }

      alert("Доли созданы и отправлены!");
      setStateFull({ secret: "", selected: new Set(), threshold: 1, comment: "", title, expiresAt: null, type });
    } catch (err) {
      console.error(err);
      clientLog("error", "shares.create.error", { message: String(err) });
    }
  };

  return { state, setState, participants, toggle, handleCreate };
}

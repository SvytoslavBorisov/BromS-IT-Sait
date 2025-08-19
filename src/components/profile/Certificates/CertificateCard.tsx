"use client";

import { CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { ChevronUp, Download, Info, ShieldCheck } from "lucide-react";
import { Certification, ParsedCert } from "./types";
import { parsePem, downloadCert } from "./cert-utils";

export default function CertificateCard({
  cert,
  expanded,
  onToggle,
}: {
  cert: Certification;
  expanded: ParsedCert | null;
  onToggle: (cert: Certification, parsed: ParsedCert | null) => void;
}) {
  async function toggleDetails() {
    if (expanded) {
      onToggle(cert, null);
    } else {
      const parsed = await parsePem(cert.pem);
      onToggle(cert, parsed);
    }
  }

  return (
    <>
      <CardContent>
        <div className="flex flex-row justify-between items-center">
          <div>
            <h2 className="font-semibold">{cert.title}</h2>
            <p className="text-xs text-gray-500 truncate">{cert.id}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={toggleDetails}>
              {expanded ? (
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <ChevronUp className="w-4 h-4" />
                  Скрыть
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <Info className="w-4 h-4" />
                  Подробнее
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadCert(cert.pem, cert.title)}
            >
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <Download className="w-4 h-4" />
                Скачать
              </span>
            </Button>
            <Button variant="outline">
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <ShieldCheck className="w-4 h-4" />
                Проверить
              </span>
            </Button>
          </div>
        </div>
      </CardContent>

      {expanded && (
        <CardContent>
          <div className="space-y-1 text-sm">
            <p>
              <b>Subject:</b> {expanded.subject}
            </p>
            <p>
              <b>Issuer:</b> {expanded.issuer}
            </p>
            <p>
              <b>Serial:</b> {expanded.serialNumber}
            </p>
            <p>
              <b>Not Before:</b> {expanded.notBefore}
            </p>
            <p>
              <b>Not After:</b> {expanded.notAfter}
            </p>
          </div>
        </CardContent>
      )}
    </>
  );
}

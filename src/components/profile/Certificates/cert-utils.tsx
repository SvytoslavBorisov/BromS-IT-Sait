// src/components/certificates/cert-utils.ts
import type { ParsedCert } from "./types";

export async function parsePem(pem: string): Promise<ParsedCert> {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const asn1 = (await import("asn1js")).fromBER(raw.buffer);
  const { Certificate } = await import("pkijs");
  const cert = new Certificate({ schema: asn1.result });

  return {
    subject: cert.subject.typesAndValues
      .map((t) => `${t.type}=${t.value.valueBlock.value}`)
      .join(", "),
    issuer: cert.issuer.typesAndValues
      .map((t) => `${t.type}=${t.value.valueBlock.value}`)
      .join(", "),
    serialNumber: cert.serialNumber.valueBlock.toString(),
    notBefore: cert.notBefore.value.toString(),
    notAfter: cert.notAfter.value.toString(),
  };
}

export function downloadCert(pem: string, title: string) {
  const blob = new Blob([pem], { type: "application/x-x509-ca-cert" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.cer`;
  a.click();
  URL.revokeObjectURL(url);
}
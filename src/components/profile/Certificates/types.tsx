export interface Certification {
  id: string;
  title: string;
  pem: string;
}

export type ParsedCert = {
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
};
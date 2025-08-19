export type UserSettings = {
  // Security
  twoFA: boolean;
  requireReauthForSign: boolean;
  sessionTimeoutMin: number;
  loginAlerts: boolean;
  lockPolicy: { attempts: number; banMinutes: number };
  // Access
  ipAllowlist: string;
  geoAllowed: string;
  // Crypto
  defaultHash: "streebog256" | "sha256";
  defaultSignAlgo: "gost2012_256" | "rsa_pss" | "ecdsa_p256";
  cadesProfile: "cades_bes";
  signatureMode: "attached" | "detached";
  tsaEnabled: boolean;
  ocspEnabled: boolean;
  // Keys/Quorum
  keyRotationDays: number;
  requireHardwareKey: boolean;
  quorumT: number; quorumN: number;
  // Documents
  autoEncryptUploads: boolean;
  defaultClassification: "Public" | "Internal" | "Confidential" | "Restricted";
  watermarkPreview: boolean;
  restrictExternalShare: boolean;
  // Logs
  logLevel: "error" | "warn" | "info" | "debug";
  piiMaskFields: string;
  logRetentionDays: number;
  // Alerts
  anomalyThreshold: number; // 0..100
  notifyEmail: boolean;
  notifyWebhookUrl: string;
  panicReadOnly: boolean;
  // API
  apiAllowIPs: string;
  webhookSecretSet: boolean;

  telegramAllowsWrite: boolean; // <— НОВОЕ
  // Misc
  timezone: string;
  locale: string;
};

export const defaults: UserSettings = {
  twoFA: false,
  requireReauthForSign: true,
  sessionTimeoutMin: 30,
  loginAlerts: true,
  lockPolicy: { attempts: 5, banMinutes: 15 },
  ipAllowlist: "",
  geoAllowed: "",
  defaultHash: "streebog256",
  defaultSignAlgo: "gost2012_256",
  cadesProfile: "cades_bes",
  signatureMode: "attached",
  tsaEnabled: true,
  ocspEnabled: true,
  keyRotationDays: 180,
  requireHardwareKey: false,
  quorumT: 3, quorumN: 5,
  autoEncryptUploads: true,
  defaultClassification: "Internal",
  watermarkPreview: true,
  restrictExternalShare: true,
  logLevel: "info",
  piiMaskFields: "password,token,secret,authorization,cookie",
  logRetentionDays: 30,
  anomalyThreshold: 80,
  notifyEmail: true,
  notifyWebhookUrl: "",
  panicReadOnly: false,
  apiAllowIPs: "",
  webhookSecretSet: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Warsaw",
  locale: "ru-RU",
  telegramAllowsWrite: false, // <— НОВОЕ
};

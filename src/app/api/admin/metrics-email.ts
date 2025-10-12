// src/pages/api/admin/metrics-email.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { emailMetrics } from "@/lib/metrics/email-mail";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // await requireAdmin(req, res); // 401/403 если не админ
    res.status(200).json(emailMetrics.snapshot());
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Internal error" });
  }
}

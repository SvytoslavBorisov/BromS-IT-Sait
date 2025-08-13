import type { NextApiRequest, NextApiResponse } from "next"
import { redis } from "@/lib/redis"


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tableId } = req.query
  if (!tableId || typeof tableId !== "string") {
    return res.status(400).json({ error: "tableId required" })
  }

  const players = await redis.smembers(`table:${tableId}:players`)
  res.json({ players })
}
// src/bot/middlewares/utils.ts
import { Context } from "telegraf";

export const typing = () => async (ctx: Context, next: () => Promise<void>) => {
  try { await ctx.sendChatAction("typing"); } catch {}
  await next();
};

export function safeJsonParse<T = unknown>(v: string): T | string {
  try { return JSON.parse(v) as T; } catch { return v; }
}

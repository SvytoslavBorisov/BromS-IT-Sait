// src/bot/index.ts
import { Telegraf, Markup } from "telegraf";
import { logger } from "@/lib/logger";

declare global {
  // чтобы переживать хот-reload в dev
  // eslint-disable-next-line no-var
  var __BROM_BOT__: Telegraf | undefined;
}

function createBot(): Telegraf {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is required");

  const bot = new Telegraf(token);

  bot.catch((err, ctx) => {
    logger.errorEx(err, { scope: "tg-bot-catch", from: ctx?.update?.update_id });
  });

  bot.start(async (ctx) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://example.com";
    await ctx.reply(
      "Бот запущен ✅ Жми, чтобы открыть мини-приложение:",
      Markup.inlineKeyboard([
        Markup.button.webApp("Открыть мини-апп", `${appUrl}/game`) // замените путь при необходимости
      ])
    );
  });

  // простое эхо и демо web_app_data
  bot.on("message", async (ctx) => {
    const wad = (ctx.message as any)?.web_app_data?.data;
    if (wad) {
      try {
        const payload = JSON.parse(wad);
        await ctx.reply(`Принял из WebApp: ${JSON.stringify(payload)}`);
      } catch {
        await ctx.reply(`Принял web_app_data (строка): ${wad}`);
      }
      return;
    }

    if ("text" in ctx.message) {
      await ctx.reply(`Эхо: ${(ctx.message as any).text}`);
    }
  });

  logger.info({ msg: "Telegram bot instance created" });
  return bot;
}

export function getBot(): Telegraf {
  if (!global.__BROM_BOT__) {
    global.__BROM_BOT__ = createBot();
  }
  return global.__BROM_BOT__!;
}

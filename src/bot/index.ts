import { Telegraf, Markup, Scenes, session } from "telegraf";
import { logger } from "@/lib/logger";
import rateLimit from "telegraf-ratelimit";
// ✅ типы для inline-query берём отсюда (а не telegraf/typings/...)
import type { InlineQueryResultArticle } from "telegraf/types";

import { profileScene } from "./scenes/profile.scene";
import { feedbackScene } from "./scenes/feedback.scene";
import { safeJsonParse, typing } from "./middlewares/utils";
import type { MyContext, MySession } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __BROM_BOT__: Telegraf<MyContext> | undefined;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://example.com";
const BOT_NAME = process.env.BOT_PUBLIC_NAME || "Broms IT";
const BOT_ENV  = process.env.NODE_ENV || "development";

function createBot(): Telegraf<MyContext> {
  const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN!);

  // telegraf-ratelimit типизирован под базовый Context — мягкий каст
  bot.use(rateLimit({
    window: 2000,
    limit: 5,
    onLimitExceeded: (ctx) => ctx.reply("⏳ Слишком быстро. Небольшая пауза…"),
  }) as unknown as Parameters<Telegraf<MyContext>["use"]>[0]);

  // ⬇️ ПАРАМЕТРИЗУЕМ session ОБОИМИ ТИПАМИ и отдаём пустую глобальную сессию
  bot.use(session<MySession, MyContext>({
    defaultSession: () => ({} as MySession),
  }));

  const stage = new Scenes.Stage<MyContext>([profileScene, feedbackScene]);
  bot.use(stage.middleware());

  bot.catch((err, ctx) => {
    logger.errorEx?.(err, { scope: "tg-bot-catch", update: ctx?.update?.update_id });
  });

  bot.start(async (ctx) => {
    const payload = (ctx.startPayload || "").trim();
    if (payload) ctx.session.startPayload = payload;

    const intro =
      `<b>Привет!</b> Это <b>${BOT_NAME}</b> — мини-приложение и бот, созданные с любовью к деталям.\n` +
      `Открой Mini App, оцени дизайн и возможности.`;

    await ctx.reply(intro, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.webApp("🎮 Открыть Mini-App", `${APP_URL}/game`)],
        [
          Markup.button.callback("👤 Профиль", "menu:profile"),
          Markup.button.callback("💬 Обратная связь", "menu:feedback"),
        ],
        [
          Markup.button.callback("⚙️ Настройки", "menu:settings"),
          Markup.button.url("ℹ️ О проекте", `${APP_URL}`),
        ],
      ]),
    });

    await ctx.reply(
      "✨ Подсказка: используй inline — набери <code>@ваш_бот запрос</code>.",
      { parse_mode: "HTML" }
    );
  });

  bot.action("menu:profile", (ctx) => ctx.scene.enter("profile"));
  bot.action("menu:feedback", (ctx) => ctx.scene.enter("feedback"));
  bot.action("menu:settings", async (ctx) => {
    await ctx.editMessageText(
      "⚙️ <b>Настройки</b>\n\nСкоро — темы и кастомизация.",
      { parse_mode: "HTML", ...Markup.inlineKeyboard([[Markup.button.callback("⬅️ Назад", "menu:home")]])}
    );
  });
  bot.action("menu:home", async (ctx) => {
    await ctx.editMessageText("Главное меню:", {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.webApp("🎮 Открыть Mini-App", `${APP_URL}/game`)],
        [
          Markup.button.callback("👤 Профиль", "menu:profile"),
          Markup.button.callback("💬 Обратная связь", "menu:feedback"),
        ],
        [Markup.button.callback("⚙️ Настройки", "menu:settings")],
      ]),
    });
  });

  bot.on("message", async (ctx) => {
    const wad = (ctx.message as any)?.web_app_data?.data;
    if (wad) {
      const data = safeJsonParse(wad);
      await ctx.reply(`✅ Получил данные из Mini-App:\n<code>${JSON.stringify(data)}</code>`, { parse_mode: "HTML" });
      return;
    }

    if ("text" in (ctx.message ?? {})) {
      const text = (ctx.message as any).text as string;
      if (/^help$/i.test(text)) {
        await ctx.replyWithHTML(
          "🆘 <b>Помощь</b>\n• /start — стартовое меню\n• /profile — профиль\n• /feedback — обратная связь\n• Inline: <code>@ваш_бот запрос</code>"
        );
        return;
      }
      await ctx.replyWithHTML(`🔁 <b>Эхо</b>: <code>${text}</code>`);
    }
  });

  bot.command("profile", (ctx) => ctx.scene.enter("profile"));
  bot.command("feedback", (ctx) => ctx.scene.enter("feedback"));

  bot.on("inline_query", async (ctx) => {
    const q = (ctx.inlineQuery?.query || "").trim();
    const results: InlineQueryResultArticle[] = [
    {
        type: "article",
        id: "open-app",
        title: "Открыть Mini-App",
        description: "Запусти современное мини-приложение",
        input_message_content: {
        message_text: `Открываем Mini-App: ${APP_URL}/game`,
        parse_mode: "HTML",
        },
        // ❌ было: reply_markup: Markup.inlineKeyboard([Markup.button.webApp("🎮 Запустить", `${APP_URL}/game`)]),
        // ✅ нужно отдать «сырой» InlineKeyboardMarkup:
        reply_markup: Markup
        .inlineKeyboard([Markup.button.webApp("🎮 Запустить", `${APP_URL}/game`)])
        .reply_markup,
    },
    ];
    if (q) {
        results.push({
        type: "article",
        id: `search-${Date.now()}`,
        title: `Поиск: “${q}”`,
        description: "Демонстрация inline-режима",
        input_message_content: { message_text: `🔎 Запрос: <b>${q}</b>`, parse_mode: "HTML" },
        // пример, если нужен клавиатурный блок:
        // reply_markup: Markup.inlineKeyboard([[Markup.button.url("Открыть сайт", APP_URL)]]).reply_markup,
        });
    }
    await ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true });
  });

  logger.info({ msg: "Telegram bot instance created", env: BOT_ENV });
  return bot;
}

export function getBot(): Telegraf<MyContext> {
  if (!global.__BROM_BOT__) global.__BROM_BOT__ = createBot();
  return global.__BROM_BOT__!;
}

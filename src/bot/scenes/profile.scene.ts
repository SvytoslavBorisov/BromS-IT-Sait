import { Scenes, Markup } from "telegraf";
import type { MyContext } from "../types";

export const profileScene = new Scenes.WizardScene<MyContext>(
  "profile",
  async (ctx) => {
    await ctx.replyWithHTML(
      "👤 <b>Профиль</b>\nКак к вам обращаться?",
      Markup.inlineKeyboard([[Markup.button.callback("Отмена", "profile:cancel")]])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const name = ctx.message.text;
      // храним итоговые данные в ГЛОБАЛЬНОЙ сессии
      ctx.session.profile = { ...(ctx.session.profile || {}), name };
      await ctx.reply(
        "Выберите любимый цвет:",
        Markup.inlineKeyboard([
          [Markup.button.callback("🔴 Красный", "color:red")],
          [Markup.button.callback("🟢 Зелёный", "color:green")],
          [Markup.button.callback("🔵 Синий", "color:blue")],
        ])
      );
      return ctx.wizard.next();
    }
    await ctx.reply("Введите имя текстом.");
  },
  async () => { /* ждём выбор цвета */ }
);

profileScene.action(/^color:(.+)$/, async (ctx) => {
  const [, color] = ctx.match as RegExpExecArray;
  ctx.session.profile = { ...(ctx.session.profile || {}), color };
  await ctx.editMessageText(`✅ Профиль сохранён: ${ctx.session.profile?.name} (${color})`);
  return ctx.scene.leave();
});

profileScene.action("profile:cancel", async (ctx) => {
  await ctx.editMessageText("Отменено.");
  return ctx.scene.leave();
});

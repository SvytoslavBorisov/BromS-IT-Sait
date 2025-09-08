import { Scenes, Markup } from "telegraf";
import type { MyContext } from "../types";

export const feedbackScene = new Scenes.WizardScene<MyContext>(
  "feedback",
  async (ctx) => {
    await ctx.replyWithHTML(
      "💬 <b>Обратная связь</b>\nНапишите сообщение, мы всё читаем:",
      Markup.inlineKeyboard([[Markup.button.callback("Отмена", "feedback:cancel")]])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const text = ctx.message.text;
      // TODO: отправить в лог/БД/почту
      await ctx.reply("Спасибо! Сообщение отправлено ✅");
      return ctx.scene.leave();
    }
    await ctx.reply("Пожалуйста, текстом 🙏");
  }
);

feedbackScene.action("feedback:cancel", async (ctx) => {
  await ctx.editMessageText("Отменено.");
  return ctx.scene.leave();
});

import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { Telegraf } from 'telegraf';

const { BOT_TOKEN, PORT = 3010, WEBHOOK_DOMAIN, WEBHOOK_PATH = '/tg/webhook' } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required');

const bot = new Telegraf(BOT_TOKEN);
bot.start((ctx) => ctx.reply('Бот на VPS запущен ✅'));
bot.on('text', (ctx) => ctx.reply(`Эхо: ${ctx.message.text}`));

const app = express();
app.use(express.json());

// Вебхук-роут (должен совпасть с тем, что зарегистрируете)
app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

app.get('/health', (_, res) => res.send('ok'));

app.listen(PORT, async () => {
  console.log(`Bot HTTP on :${PORT} -> ${WEBHOOK_PATH}`);
  // Разовая регистрация вебхука при старте
  if (WEBHOOK_DOMAIN) {
    const url = `https://${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ url, drop_pending_updates: true })
    }).then(r => console.log('setWebhook:', r.status)).catch(console.error);
  }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
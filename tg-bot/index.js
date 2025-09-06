import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { Telegraf, Markup } from 'telegraf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  BOT_TOKEN,
  PORT = 3010,
  WEBHOOK_DOMAIN,
  WEBHOOK_PATH = '/tg/webhook',
  WEBHOOK_SECRET
} = process.env;

if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required');
if (!WEBHOOK_PATH.startsWith('/')) throw new Error('WEBHOOK_PATH must start with "/"');

// ---------------- BOT ----------------
const bot = new Telegraf(BOT_TOKEN);

bot.catch((err, ctx) => console.error('Telegraf error:', err));

bot.start((ctx) => ctx.reply('Бот на VPS запущен ✅\nНапиши /play, чтобы открыть мини-игру.'));

bot.command('play', (ctx) => {
  // Кнопка, открывающая мини-апп
  return ctx.reply(
    'Открываем мини-игру внутри Telegram 👇',
    Markup.keyboard([
      Markup.button.webApp('🎮 Играть', `https://${WEBHOOK_DOMAIN}/game/`)
    ]).resize()
  );
});

// Приём web_app_data из мини-аппа (если отправите через tg.sendData)
bot.on('web_app_data', (ctx) => {
  try {
    const data = JSON.parse(ctx.webAppData.data || '{}');
    return ctx.reply(`Принял из мини-аппа: ${JSON.stringify(data)}`);
  } catch {
    return ctx.reply(`Принял из мини-аппа (строка): ${ctx.webAppData.data}`);
  }
});

// Простое эхо
bot.on('text', (ctx) => ctx.reply(`Эхо: ${ctx.message.text}`));

// --------------- APP (Express) ---------------
const app = express();
app.set('trust proxy', true);
app.use(morgan('combined'));
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// Раздаём мини-апп как статику: https://<домен>/game/
app.use('/game', express.static(path.join(__dirname, 'public', 'game')));

// Health/ping
app.get('/health', (_, res) => res.send('ok'));
app.get('/ping', (_, res) => res.json({ pong: true, ts: Date.now() }));

// GET по вебхуку для быстрой проверки
app.get(WEBHOOK_PATH, (_, res) => res.status(200).send('ok'));

// Лимитер для вебхука
const webhookLimiter = rateLimit({
  windowMs: 5 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

// Проверка секретного заголовка Telegram (если задан WEBHOOK_SECRET)
function checkWebhookSecret(req, res, next) {
  if (!WEBHOOK_SECRET) return next();
  const got = req.header('X-Telegram-Bot-Api-Secret-Token');
  if (got !== WEBHOOK_SECRET) return res.sendStatus(403);
  next();
}

// Сам вебхук
app.post(WEBHOOK_PATH, webhookLimiter, checkWebhookSecret, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// API из мини-аппа: сохраняем прогресс (пример)
app.post('/api/progress', async (req, res) => {
  // TODO: здесь по-хорошему валидировать req.body.initData (подпись Telegram WebApp)
  // СХЕМА ПРИМЕРА:
  // { score: number, initData: string }
  const { score = 0 } = req.body || {};
  console.log('progress:', { score, from: req.ip });
  // Сохранение в БД пропущено — просто отвечаем
  return res.json({ ok: true });
});

// Быстрый API-пинг из мини-аппа
app.get('/api/ping', (_, res) => res.json({ ok: true, ts: Date.now() }));

// ------------ START ------------
const server = app.listen(PORT, async () => {
  console.log(`HTTP :${PORT}  WEBHOOK_PATH=${WEBHOOK_PATH}`);
  if (WEBHOOK_DOMAIN) {
    try {
      const url = `https://${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;
      const body = { url, drop_pending_updates: true };
      if (WEBHOOK_SECRET) body.secret_token = WEBHOOK_SECRET;

      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      });
      console.log('setWebhook status:', r.status);
      if (!r.ok) console.log(await r.text());
    } catch (e) {
      console.error('setWebhook failed:', e);
    }
  } else {
    console.log('No WEBHOOK_DOMAIN — enabling long polling');
    await bot.launch();
  }
});

function shutdown(sig) {
  console.log(`\nGot ${sig}, shutting down...`);
  try { server.close(() => console.log('HTTP closed')); } catch {}
  try { bot.stop(sig); } catch {}
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

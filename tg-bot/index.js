import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { Telegraf } from 'telegraf';

const {
  BOT_TOKEN,
  PORT = 3010,
  WEBHOOK_DOMAIN,
  WEBHOOK_PATH = '/tg/webhook',
  WEBHOOK_SECRET
} = process.env;

if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required');
if (!WEBHOOK_PATH.startsWith('/')) throw new Error('WEBHOOK_PATH must start with "/"');

const bot = new Telegraf(BOT_TOKEN);

// === Bot handlers ===
bot.catch((err, ctx) => {
  console.error('Telegraf error:', err);
});
bot.start((ctx) => ctx.reply('Бот на VPS запущен ✅'));
bot.help((ctx) => ctx.reply('Команды: /start, /help'));
bot.on('text', (ctx) => ctx.reply(`Эхо: ${ctx.message.text}`));

// === App (Express) ===
const app = express();
app.set('trust proxy', true);
app.use(morgan('combined'));
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// Rate limit для вебхука (на всякий случай)
const webhookLimiter = rateLimit({
  windowMs: 5 * 1000,
  max: 30, // до 30 запросов/5с на IP
  standardHeaders: true,
  legacyHeaders: false
});

// Health и ping
app.get('/health', (_, res) => res.send('ok'));
app.get('/ping', (_, res) => res.json({ pong: true, ts: Date.now() }));

// GET по вебхуку (удобно для curl-проверки)
app.get(WEBHOOK_PATH, (_, res) => res.status(200).send('ok'));

// Проверка секретного заголовка Telegram (если задан WEBHOOK_SECRET)
function checkWebhookSecret(req, res, next) {
  if (!WEBHOOK_SECRET) return next();
  const got = req.header('X-Telegram-Bot-Api-Secret-Token');
  if (got !== WEBHOOK_SECRET) {
    return res.sendStatus(403);
  }
  next();
}

// Вебхук: именно POST, с лимитом и (опц.) проверкой секрета
app.post(WEBHOOK_PATH, webhookLimiter, checkWebhookSecret, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Админ-эндпоинт: переустановить вебхук вручную (GET /admin/webhook/install?secret=...)
app.get('/admin/webhook/install', async (req, res) => {
  try {
    const qsSecret = req.query.secret;
    // простая защита: должен совпасть с WEBHOOK_SECRET (если есть)
    if (WEBHOOK_SECRET && qsSecret !== WEBHOOK_SECRET) return res.sendStatus(403);

    const url = `https://${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;
    const body = { url, drop_pending_updates: true };
    if (WEBHOOK_SECRET) body.secret_token = WEBHOOK_SECRET;

    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    });
    const text = await r.text();
    res.status(r.ok ? 200 : 500).send(text);
  } catch (e) {
    console.error('install webhook failed:', e);
    res.status(500).send(String(e));
  }
});

// === Start HTTP server ===
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
    // Фоллбэк: long polling (если нет домена/https)
    console.log('No WEBHOOK_DOMAIN — enabling long polling');
    await bot.launch();
  }
});

// === Graceful shutdown ===
function shutdown(sig) {
  console.log(`\nGot ${sig}, shutting down...`);
  try { server.close(() => console.log('HTTP closed')); } catch {}
  try { bot.stop(sig); } catch {}
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

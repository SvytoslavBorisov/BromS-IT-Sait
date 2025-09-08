import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, type Response, type NextFunction } from 'express';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { Telegraf, Markup, type Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { verifyInitData, parseInitData } from './verifyInitData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  BOT_TOKEN,
  PORT = 3010,
  WEBHOOK_DOMAIN,
  WEBHOOK_PATH = '/tg/webhook',
  WEBHOOK_SECRET
} = process.env as Record<string, string>;

if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required');
if (!WEBHOOK_PATH.startsWith('/')) throw new Error('WEBHOOK_PATH must start with "/"');

// ---------------- BOT ----------------
const bot = new Telegraf<Context>(BOT_TOKEN);

bot.catch((err: unknown, ctx: Context) => {
  console.error('Telegraf error:', err);
});

bot.start((ctx: Context) =>
  ctx.reply('Бот на VPS запущен ✅\nНапиши /play, чтобы открыть мини-игру.')
);

bot.command('play', (ctx: Context) => {
  // Кнопка, открывающая мини-апп
  return ctx.reply(
    'Открываем мини-игру внутри Telegram 👇',
    Markup.keyboard([Markup.button.webApp('🎮 Играть', `https://${WEBHOOK_DOMAIN}/game`)]).resize()
  );
});

// Приём web_app_data из мини-аппа (типобезопасно через фильтр)
bot.on(message('web_app_data'), (ctx) => {
  const raw = ctx.message.web_app_data?.data ?? '';
  try {
    const data = raw ? JSON.parse(raw) : {};
    return ctx.reply(`Принял из мини-аппа: ${JSON.stringify(data)}`);
  } catch {
    return ctx.reply(`Принял из мини-аппа (строка): ${raw}`);
  }
});

// Простое эхо (типобезопасно)
bot.on(message('text'), (ctx) => ctx.reply(`Эхо: ${ctx.message.text}`));

// --------------- APP (Express) ---------------
const app = express();
app.set('trust proxy', 'loopback');
app.use(morgan('combined'));
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// Health/ping
app.get('/health', (_: Request, res: Response) => res.send('ok'));
app.get('/ping', (_: Request, res: Response) => res.json({ pong: true, ts: Date.now() }));

// GET по вебхуку для быстрой проверки
app.get(WEBHOOK_PATH, (_: Request, res: Response) => res.status(200).send('ok'));

// Лимитер для вебхука
const webhookLimiter = rateLimit({
  windowMs: 5 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

// Проверка секретного заголовка Telegram (если задан WEBHOOK_SECRET)
function checkWebhookSecret(req: Request, res: Response, next: NextFunction) {
  if (!WEBHOOK_SECRET) return next();
  const got = req.header('X-Telegram-Bot-Api-Secret-Token');
  if (got !== WEBHOOK_SECRET) return res.sendStatus(403);
  next();
}

// Сам вебхук\

const webhookCb = bot.webhookCallback(WEBHOOK_PATH, {
  // если не используешь секрет — можно опустить поле
  secretToken: process.env.WEBHOOK_SECRET || undefined,
});
app.post(WEBHOOK_PATH, webhookLimiter, webhookCb);
app.post('/api/progress', async (req: Request, res: Response) => {
  try {
    // initData передаём из web-app в заголовке
    const initData = req.header('X-Telegram-Init-Data') || '';
    if (!verifyInitData(initData, BOT_TOKEN)) {
      return res.status(401).json({ ok: false, error: 'invalid initData' });
    }

    const { score = 0 } = (req.body ?? {}) as { score?: number };
    const init = parseInitData(initData);
    const uid = init?.user?.id;
    const uname = init?.user?.username || init?.user?.first_name;

    // Тут сохрани в БД по uid; для примера просто лог:
    console.log('progress', { uid, uname, score, at: new Date().toISOString() });
    return res.json({ ok: true });
  } catch (e) {
    console.error('progress error:', e);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
});

// Быстрый API-пинг из мини-аппа
app.get('/api/ping', (_: Request, res: Response) => res.json({ ok: true, ts: Date.now() }));

// ------------ START ------------
const server = app.listen(Number(PORT) || 3010, async () => {
  console.log(`HTTP :${PORT}  WEBHOOK_PATH=${WEBHOOK_PATH}`);
  if (WEBHOOK_DOMAIN) {
    try {
      const url = `https://${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;
      const body: Record<string, unknown> = { url, drop_pending_updates: true };
      if (WEBHOOK_SECRET) (body as any).secret_token = WEBHOOK_SECRET;

      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

function shutdown(sig: string) {
  console.log(`\nGot ${sig}, shutting down...`);
  try {
    server.close(() => console.log('HTTP closed'));
  } catch {}
  try {
    bot.stop(sig);
  } catch {}
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

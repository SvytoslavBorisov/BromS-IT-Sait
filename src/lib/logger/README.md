# 📚 Logger — система логирования для проекта

## 1. Общая информация
Логгер предназначен для безопасного, удобного и производительного ведения логов в приложении.  

Он:
- Работает в **Node.js-среде**, а также в Next.js (client, build, edge):
  - на клиенте и в build-фазе используется no-op логгер (не делает ничего, чтобы не ломать сборку);
  - на сервере работает полноценная запись.
- Поддерживает:
  - уровни `debug`, `info`, `warn`, `error`;
  - запись в файлы с ротацией по дате и размеру;
  - опциональный вывод в `stdout` (для контейнеров и облака);
  - маскирование чувствительных данных (`token`, `password`, `cookie` и пр.);
  - безопасную сериализацию объектов (BigInt, Error, циклы, длинные строки);
- Позволяет создавать **дочерние логгеры** с контекстом (`service`, `module`, `requestId`).

---

## 2. Быстрое использование

### Импорт
```ts
import { logger, ensureRequestId } from "@/lib/logger";
Базовые уровни
ts
Копировать код
logger.debug({ message: "Debug info", data: { x: 42 } });
logger.info({ message: "User logged in", userId: 123 });
logger.warn({ message: "Slow query", durationMs: 2500 });
logger.error({ message: "DB connection failed" });
Лог ошибок
ts
Копировать код
try {
  throw new Error("Something bad happened");
} catch (err) {
  logger.logError(err, { userId: 123 });
}
Дочерние логгеры
ts
Копировать код
const reqLogger = logger.child({ 
  requestId: ensureRequestId(), 
  module: "Auth" 
});

reqLogger.info({ message: "Start processing request" });
reqLogger.error({ message: "Validation failed", fields: ["email"] });
👉 Контекст (requestId, module) будет автоматически добавляться ко всем записям.

Завершение приложения
ts
Копировать код
import { shutdownLogger } from "@/lib/logger";

process.on("SIGTERM", async () => {
  await shutdownLogger();
  process.exit(0);
});
3. Конфигурация через переменные окружения
Переменная	По умолчанию	Описание
LOG_DIR	./logs	Папка для логов
LOG_FILE	app	Базовое имя файла (app-2025-10-01.log)
LOG_LEVEL	info	Минимальный уровень (debug, info, warn, error)
LOG_ROTATE_DAILY	true	Ротация по дате (новый файл раз в день)
LOG_MAX_BYTES	10 * 1024 * 1024	Макс. размер файла (по умолчанию 10 МБ)
LOG_STDOUT	false	Если true — дублировать JSON-строку в stdout
LOG_TRUNCATE_LIMIT	20000	Макс. длина строки в JSON (обрезка, если больше)

4. Маскирование данных
Автоматически заменяет значения полей с чувствительными ключами на ***.

Ключи проверяются без учёта регистра:

pgsql
Копировать код
password, pass, pwd, token, accessToken, refreshToken, secret, apiKey,
authorization, cookie, set-cookie, session, jwt, bearer, x-api-key, csrf
Пример:

ts
Копировать код
logger.info({
  message: "User login",
  data: { email: "test@mail.ru", password: "123456" }
});
// => password будет заменён на ***
5. Отличия от console.log
console.log — просто печатает в stdout.

logger:

пишет в файл (с ротацией),

дублирует в stdout (если включено),

маскирует секреты,

добавляет контекст (requestId, module),

безопасно сериализует сложные объекты.

6. Подробности для программистов (внутреннее устройство)
Архитектура
Код находится в src/lib/logger/ и разделён на модули:

types.ts — интерфейсы и типы логгера.

env.ts — конфигурация из переменных окружения.

runtime.ts — определение среды (client/build/edge/server).

utils.ts — утилиты: цветной вывод, маскирование, safe stringify.

noopLogger.ts — no-op реализация (клиент, билд, edge).

core.ts — единый writer: поток, счётчики, ротация.

serverLogger.ts — полноценный логгер, использующий core.

index.ts — фасад, экспортирует logger, getLogger, ensureRequestId, shutdownLogger.

Логика работы
Определение среды

В client, build, edge логгер заменяется на noopLogger.

В Node.js-среде используется ServerLogger.

Один поток для всего приложения

В core.ts хранится глобальный объект core со ссылкой на поток, счётчиком байтов и текущим днём.

Все logger.child() используют один и тот же поток.

Ротация

По дате (LOG_ROTATE_DAILY).

По размеру (LOG_MAX_BYTES).

Алгоритм:

Закрыть текущий поток.

Если ротация по размеру → переименовать старый файл с датой и временем.

Открыть новый поток.

Безопасная сериализация

safeStringify обрабатывает:

BigInt → строка,

Error → { name, message, stack, code, errno, syscall, cause },

циклы → [Circular],

длинные строки → обрезаются (LOG_TRUNCATE_LIMIT).

Маскирование

maskSensitive рекурсивно проходит объект до глубины 5.

Любой ключ из SENSITIVE_KEYS → ***.

Дочерние логгеры

logger.child({ module: "Auth" }) создаёт новый объект, который добавляет контекст к каждой записи.

Поток общий, дублирования нет.

Dev-режим

Если NODE_ENV !== production:

вывод в консоль с цветами (debug=серый, info=голубой, warn=жёлтый, error=красный);

сериализация через util.inspect для удобства.

Backpressure (переполнение буфера)

Если stream.write() вернул false, выводится предупреждение "write buffer is full", логгер ждёт drain.

7. Рекомендации по документации
Формат: Markdown (.md) — лучший вариант для IDE, GitHub/GitLab, Confluence.

Где хранить:

Если документация касается только логгера → src/lib/logger/README.md.

Если планируется больше внутренних библиотек → лучше завести каталог docs/ в корне и хранить там (docs/logger.md), а в src/lib/logger/README.md оставить ссылку.

8. Примеры реальной практики
HTTP-запросы:

ts
Копировать код
const reqLogger = logger.child({ module: "API", requestId: ensureRequestId() });
reqLogger.info({ message: "Incoming request", url: req.url, method: req.method });
Бизнес-логика:

ts
Копировать код
logger.info({ message: "Payment succeeded", userId, amount });
logger.warn({ message: "Payment retry needed", userId, attempt });
logger.error({ message: "Payment failed", userId, error });
Фоновые задачи:

ts
Копировать код
const jobLogger = logger.child({ module: "Cron" });
jobLogger.info({ message: "Started cleanup job" });
// src/instrumentation.ts
export async function register() {
  if (process.env.NODE_ENV !== 'production') return;
  // Этот файл Next исполняет во время next build (через instrumentationHook).
  const orig = globalThis.fetch;

  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url;
    const err = new Error(
      `❌ FETCH DURING BUILD: ${url}\n(запрещено на сборке — см. стек ниже)`
    );
    // Печатаем понятный стек с путями файлов
    console.error(err.stack);
    // Срыв сборки — сразу увидишь, какой модуль дернул сеть
    throw err;
  }) as typeof fetch;

  // чтобы увидеть, что хук реально активировался
  // (Next иногда глушит console.log — но error проходит)
  console.error('🔧 instrumentation.ts registered for production build');
}

// src/app/_build-guard.ts
if (process.env.NODE_ENV === 'production') {
  const orig = globalThis.fetch;
  globalThis.fetch = async (input: any, init: any = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 15000);
    try {
      return await orig(input, { ...init, signal: controller.signal });
    } catch (e) {
      console.error('FETCH DURING BUILD:', url, '\nSTACK:\n', new Error().stack);
      throw e;
    } finally {
      clearTimeout(tid);
    }
  };
}

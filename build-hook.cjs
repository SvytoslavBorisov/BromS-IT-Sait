if (process.env.NODE_ENV === 'production') {
  const orig = global.fetch;
  global.fetch = async function patchedFetch(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    // пропускаем телеметрию Next
    if (url.includes('telemetry.nextjs.org')) {
      return orig(input, init);
    }
    // роняем любые другие сетевые вызовы и печатаем стек
    const err = new Error('❌ FETCH DURING BUILD: ' + url);
    console.error(err.stack);
    throw err;
  };
  console.error('🔧 build-hook installed');
}

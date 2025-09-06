// Впрыскивается в Node до старта Next build
if (process.env.NODE_ENV === 'production') {
  const orig = global.fetch;
  global.fetch = async function patchedFetch(input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    const err = new Error('❌ FETCH DURING BUILD: ' + url);
    // печатаем ПОЛНЫЙ стек с файлами/строками, кто дернул сеть
    console.error(err.stack);
    throw err; // срываем сборку мгновенно → увидишь виновника
  };
  console.error('🔧 build-hook installed');
}

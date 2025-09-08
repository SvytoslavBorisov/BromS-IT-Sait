module.exports = {
  apps: [
    {
      name: "tg-bot",
      cwd: "./apps/bot",          // рабочая директория — пакет бота
      script: "node",             // запускаем node
      args: "dist/index.js",      // собранный файл
      env: {
        NODE_ENV: "production",
        PORT: "3010",
        WEBHOOK_DOMAIN: "broms-it.ru",
        WEBHOOK_PATH: "/tg/wh-0a1801ba0194ccce4963ac5cf469dcc1",
        BOT_TOKEN: "8476941494:AAEI4-coHgnmvylnaGCZ4lZuy_kpr_Q7Ch0"      // твой токен бота
      }
    },
    {
      name: "tg-web",
      cwd: "./apps/web",          // Next.js приложение
      script: "pnpm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "3000"
      }
    }
  ]
}

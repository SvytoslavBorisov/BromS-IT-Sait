module.exports = {
  apps: [
    {
      name: "realtime",
      script: "tsx",
      args: "realtime/server.ts",
      cwd: "/var/www/bromsit/BromS-IT-Sait",
      env: {
        NODE_ENV: "production",
        SOCKETS_PORT: "4000",
        SOCKETS_JWT_SECRET: "superlongrandomsecret_here",
        SOCKETS_CORS_ORIGINS: "https://broms-it.ru,http://localhost:3000"
      }
    }
  ]
}

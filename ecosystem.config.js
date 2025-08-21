module.exports = {
  apps: [
    {
      name: "bromsit",
      script: "npm",
      args: "start",
      cwd: "/var/www/bromsit/BromS-IT-Sait",
      env: { NODE_ENV: "production" }
    },
    {
      name: "realtime",
      // грузим резолвер путей до tsx
      script: "node",
      args: [
        "-r", "tsconfig-paths/register",
        "node_modules/.bin/tsx",
        "realtime/server.ts"
      ],
      cwd: "/var/www/bromsit/BromS-IT-Sait",
      env: {
        NODE_ENV: "production",
        PORT: "4000"
      }
    }
  ]
}

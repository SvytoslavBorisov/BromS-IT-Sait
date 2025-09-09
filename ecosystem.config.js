module.exports = {
  apps: [
    {
      name: "bromsit",
      cwd: ".",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      max_restarts: 10,

      // <— вот здесь передаем V8-флаги
      interpreter: "/usr/bin/node", // можно не указывать, если и так /usr/bin/node
      interpreter_args: "--initial-old-space-size=512 --max-old-space-size=1024",

      env_file: ".env",
      env: {
        NODE_ENV: "production",
        PORT: "3000"
        // НЕ дублировать NODE_OPTIONS
      },

      out_file: "logs/out.log",
      error_file: "logs/err.log",
      time: true
    }
  ]
};
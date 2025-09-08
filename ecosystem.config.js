module.exports = {
  apps: [
    {
      name: "bromsit",
      cwd: ".",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env_file: ".env",
      env: { NODE_ENV: "production", PORT: "3000" },
      instances: 1,      // можно увеличить/перейти в cluster после
      autorestart: true,
      max_restarts: 10,
      watch: false,
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      time: true
    }
  ]
};
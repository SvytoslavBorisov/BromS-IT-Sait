module.exports = {
  apps: [
    {
      name: "bromsit",
      cwd: ".",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env_file: ".env",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        NODE_OPTIONS: "--max-old-space-size=512 --initial-old-space-size=256"
      },
      instances: 1,      // можно увеличить/перейти в cluster после
      autorestart: true,
      exec_mode: "fork",
      instances: 1,
      watch: false,
      max_restarts: 10,
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      time: true
    }
  ]
};
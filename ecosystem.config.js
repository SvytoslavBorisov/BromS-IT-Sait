module.exports = {
  apps: [
    {
      name: "tg-bot",
      cwd: "./tg-bot",
      script: "index.js",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}

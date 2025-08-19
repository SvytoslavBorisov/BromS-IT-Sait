// next.config.js (CommonJS)

const withTM = require('next-transpile-modules')([
  'gost-crypto',
]);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // НЕ трогаем config.module.rules — иначе сломается обработка CSS/PostCSS
  webpack: (config) => {
    // если нужно — только добавляем свои правила через config.module.rules.push(...)
    return config;
  },

  eslint: {
    // игнорировать ошибки ESLint при сборке
    ignoreDuringBuilds: true,
  },

  typescript: {
    // пропускать ошибки TS на сборке
    ignoreBuildErrors: true,
  },
};

module.exports = withTM(nextConfig);

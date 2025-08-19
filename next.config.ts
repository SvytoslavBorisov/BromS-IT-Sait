const withTM = require('next-transpile-modules')(['gost-crypto']);
module.exports = {
  reactStrictMode: true,
  transpilePackages: ['gost-crypto'],
  eslint: {
    ignoreDuringBuilds: true, // ⬅️ ВАЖНО
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};
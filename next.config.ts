const withTM = require('next-transpile-modules')(['gost-crypto']);
module.exports = {
  reactStrictMode: true,
  transpilePackages: ['gost-crypto'],
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true, // ⬅️ ВАЖНО
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};
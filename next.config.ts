const withTM = require('next-transpile-modules')(['gost-crypto']);
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config) => config, // ничего не трогаем
};
module.exports = withTM(nextConfig);
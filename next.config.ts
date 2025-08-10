import type { NextConfig } from "next";


const withTM = require('next-transpile-modules')([
  'gost-crypto'
]);



const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // игнорировать любые ошибки ESLint при сборке
    ignoreDuringBuilds: true,
  },

  typescript: {
    // позволяeм сборке проходить, даже если есть ошибки TS
    ignoreBuildErrors: true,
  }
};

module.exports = withTM({
  // ваш остальной конфиг (если есть)
  reactStrictMode: true,
  // ...
});

export default nextConfig;

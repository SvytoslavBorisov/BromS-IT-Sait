import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // игнорировать любые ошибки ESLint при сборке
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

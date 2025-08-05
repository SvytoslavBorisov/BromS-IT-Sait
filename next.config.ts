import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // игнорировать любые ошибки ESLint при сборке
    ignoreDuringBuilds: true,
  },

  typescript: {
    // позволяeм сборке проходить, даже если есть ошибки TS
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

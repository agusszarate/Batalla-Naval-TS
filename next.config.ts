/** @type {import('next').NextConfig} */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable strict mode for socket.io
  webpack: (config, { isServer }) => {
    config.externals = [
      ...(config.externals || []),
      {
        bufferutil: "bufferutil",
        "utf-8-validate": "utf-8-validate",
      },
    ];
    return config;
  },
  // Fix the Error: Request path contains unescaped characters issue
  experimental: {
    forceSwcTransforms: true,
  },
};

export default nextConfig;

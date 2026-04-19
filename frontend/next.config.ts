import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://api:8000/:path*",
      },
    ];
  },
};

export default nextConfig;

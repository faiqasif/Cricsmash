import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
      {
        protocol: "https",
        hostname: "xmolchsllfzpscxbrksr.supabase.co",
      },
    ],
  },
  async rewrites() {
    if (!apiOrigin) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

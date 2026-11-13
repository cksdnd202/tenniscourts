import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep canonical and other SEO metadata in the initial HTML head for every client.
  htmlLimitedBots: /.*/,
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.courtskorea.com",
          },
        ],
        destination: "https://courtskorea.com/:path*",
        permanent: true,
      },
      {
        source: "/favicon.ico",
        destination: "/courtskorea_favicon_48px.png",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

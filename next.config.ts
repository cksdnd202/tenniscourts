import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/courtskorea_favicon_48px.png",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

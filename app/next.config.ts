import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Proxy Umbra ZK prover CDN to avoid CORS issues
        source: "/umbra-zk-cdn/:path*",
        destination: "https://d3j9fjdkre529f.cloudfront.net/:path*",
      },
    ];
  },
};

export default nextConfig;

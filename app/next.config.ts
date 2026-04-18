import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Proxy Umbra ZK prover CDN to avoid CORS issues
        source: "/umbra-zk-cdn/:path*",
        destination: "https://d3j9fjdkre529f.cloudfront.net/:path*",
      },
      {
        // Umbra's UTXO indexer doesn't send CORS headers, so browser fetch
        // fails ("TypeError: Failed to fetch"). Proxy through our origin.
        source: "/umbra-indexer-devnet/:path*",
        destination: "https://utxo-indexer.api-devnet.umbraprivacy.com/:path*",
      },
      {
        source: "/umbra-indexer-mainnet/:path*",
        destination: "https://utxo-indexer.api.umbraprivacy.com/:path*",
      },
      {
        // Relayer has the same issue when submitting claims from the browser.
        source: "/umbra-relayer-devnet/:path*",
        destination: "https://relayer.api-devnet.umbraprivacy.com/:path*",
      },
      {
        source: "/umbra-relayer-mainnet/:path*",
        destination: "https://relayer.api.umbraprivacy.com/:path*",
      },
    ];
  },
};

export default nextConfig;

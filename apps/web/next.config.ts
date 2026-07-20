import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/publication-manifest.json",
        destination: "/publication-manifest",
      },
    ];
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;

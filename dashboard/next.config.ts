import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

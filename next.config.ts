import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: [],
  experimental: { optimizePackageImports: ["lucide-react", "recharts"] },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents duplicate mounting and duplicate API fetches in dev mode
  devIndicators: false,
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  typescript: {
    ignoreBuildErrors: true, // Prevents memory spikes during Next.js Docker build
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "leaflet", "decimal.js"],
  },
};

module.exports = nextConfig;

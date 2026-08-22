/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents duplicate mounting and duplicate API fetches in dev mode
  devIndicators: false,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "leaflet", "decimal.js"],
  },
};

module.exports = nextConfig;

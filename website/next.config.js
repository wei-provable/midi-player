/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/node_modules/:path*',
        destination: '/api/node_modules/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 
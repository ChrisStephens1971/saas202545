/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@elder-first/types', '@elder-first/config'],
  // PWA configuration will be added later
  images: {
    domains: [],
  },
};

module.exports = nextConfig;

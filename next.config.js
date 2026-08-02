/** @type {import('next').NextConfig} */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const parsedApiUrl = new URL(API_URL);

const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: parsedApiUrl.protocol.replace(':', ''),
        hostname: parsedApiUrl.hostname,
        port: parsedApiUrl.port || undefined,
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;

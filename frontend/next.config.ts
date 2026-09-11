import type { NextConfig } from 'next';

const mediaServer = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001');

const nextConfig: NextConfig = {
  // Keep `next dev` and `next build` from writing into the same directory.
  // This prevents missing webpack chunks when a build runs beside the dev server.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  images: {
    remotePatterns: [
      {
        protocol: mediaServer.protocol === 'https:' ? 'https' : 'http',
        hostname: mediaServer.hostname,
        port: mediaServer.port,
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;

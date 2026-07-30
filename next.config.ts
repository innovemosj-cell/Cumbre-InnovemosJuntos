import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Cloudflare Pages no soporta el optimizador nativo de Next (requiere
    // sharp, que es binario nativo). Servimos las imagenes tal cual desde
    // su URL de origen.
    unoptimized: true,
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;

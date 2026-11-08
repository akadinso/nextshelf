import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // admin product image uploads go through a server action
    serverActions: { bodySizeLimit: '10mb' },
  },
}

export default nextConfig

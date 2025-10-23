const nextConfig = {
  output: 'standalone',
  basePath: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_URL ? 
    new URL(process.env.NEXT_PUBLIC_BASE_URL).pathname !== '/' ? 
    new URL(process.env.NEXT_PUBLIC_BASE_URL).pathname : undefined 
    : undefined,
  assetPrefix: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_BASE_URL || '' : '',
  webpack: (config, { isServer }) => {
    // Handle 3D force graph library
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    
    // Optimize for 3D libraries
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader', 'glslify-loader'],
    })
    
    return config
  },
  experimental: {
    esmExternals: 'loose',
  },
}

module.exports = nextConfig

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer, dev_ }) => {
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
    
    // Production optimizations for 3D libraries
    if (!isServer && !dev_) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            threejs: {
              test: /[\\/]node_modules[\\/](three|3d-force-graph)[\\/]/,
              name: 'threejs',
              chunks: 'all',
              priority: 20,
            },
          },
        },
      }
    }
    
    return config
  },
}

module.exports = nextConfig

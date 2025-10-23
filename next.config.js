const nextConfig = {
  output: 'standalone',
  basePath: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_URL ? 
    new URL(process.env.NEXT_PUBLIC_BASE_URL).pathname !== '/' ? 
    new URL(process.env.NEXT_PUBLIC_BASE_URL).pathname : undefined 
    : undefined,
  assetPrefix: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_BASE_URL || '' : '',
}

module.exports = nextConfig

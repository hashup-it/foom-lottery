import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  compiler: {
    styledComponents: true
  },
  productionBrowserSourceMaps: false,
  transpilePackages: ['shared'],
  experimental: {
    serverSourceMaps: false,
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
    ],
  },
  webpack(config: any) {
    /** @ts-ignore */
    const fileLoaderRule = config.module.rules.find(rule => rule.test?.test?.('.svg'))

    config.module.rules.push(
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/,
      },
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] },
        use: ['@svgr/webpack'],
      }
    )

    fileLoaderRule.exclude = /\.svg$/i
    config.experiments = { ...config.experiments, topLevelAwait: true }

    return config
  },
}

export default nextConfig

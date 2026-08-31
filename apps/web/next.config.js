const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: Next tries to infer the workspace root from lockfiles; the user's
  // home directory may contain an unrelated package-lock.json, so pin it.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Prisma WASM query engine (@prisma/client/wasm, Workers 上必需):
  // wasm-worker-loader.mjs 通过 `import('./query_engine_bg.wasm')` 加载引擎,
  // webpack 必须开启 asyncWebAssembly 才能打包 .wasm 导入。
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true }
    return config
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "img-src 'self' data: https: http:",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

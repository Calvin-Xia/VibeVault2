const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: Next tries to infer the workspace root from lockfiles; the user's
  // home directory may contain an unrelated package-lock.json, so pin it.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // better-sqlite3 是原生模块,靠 bindings 在运行时按 module.filename 定位 .node 文件。
  // 一旦被 webpack 打进 bundle,module.filename 就不存在,bindings 会对 undefined 调用
  // .indexOf 直接抛错 —— 表现为本地所有 Prisma 查询失败(页面渲染成"暂无链接"、
  // Server Action 一律 500)。
  //
  // 注意:单靠 serverExternalPackages 无效。better-sqlite3 虽在 Next 默认 external 列表中,
  // 但它是被 @prisma/adapter-better-sqlite3 间接 require 的,而该适配器不在默认列表里,
  // 于是原生模块仍被打包;适配器本身又是 packages/db 通过路径别名(裸 TS 源码)引入的,
  // Next 的 external 判定覆盖不到这条链。因此在 webpack 层显式 external 才可靠。
  //
  // 这也正是 Workers 构建需要的:生产环境走 D1 适配器,
  // better-sqlite3 根本不该进入产物。
  webpack: (config, { isServer }) => {
    // Prisma WASM query engine (@prisma/client/wasm, Workers 上必需):
    // wasm-worker-loader.mjs 通过 `import('./query_engine_bg.wasm')` 加载引擎,
    // webpack 必须开启 asyncWebAssembly 才能打包 .wasm 导入。
    config.experiments = { ...config.experiments, asyncWebAssembly: true }

    if (isServer) {
      const nativeModules = ['better-sqlite3', '@prisma/adapter-better-sqlite3', 'bindings']
      config.externals = Array.isArray(config.externals)
        ? [...config.externals, ...nativeModules]
        : [config.externals, ...nativeModules].filter(Boolean)
    }

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

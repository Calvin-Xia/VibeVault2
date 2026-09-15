const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: Next tries to infer the workspace root from lockfiles; the user's
  // home directory may contain an unrelated package-lock.json, so pin it.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  webpack: (config, { isServer, dev }) => {
    // Prisma WASM query engine (@prisma/client/wasm, Workers 上必需):
    // wasm-worker-loader.mjs 通过 `import('./query_engine_bg.wasm')` 加载引擎,
    // webpack 必须开启 asyncWebAssembly 才能打包 .wasm 导入。
    config.experiments = { ...config.experiments, asyncWebAssembly: true }

    // 【仅 dev】把原生模块从 server bundle 中 external 掉。
    //
    // 为什么必须是 dev-only:better-sqlite3 靠 bindings 在运行时用 module.filename 定位
    // .node 文件,被 webpack 打包后 module.filename 为 undefined,bindings 会对它调用
    // .indexOf 抛错 —— 本地所有 Prisma 查询失败,而 listLinks/getStatusCounts 的 try/catch
    // 会把它吞成"空数据",界面看着像"暂无链接",Server Action 则一律 500。
    //
    // 生产构建绝对不能这么做:external 会在产物里留下裸 require("@prisma/adapter-better-sqlite3"),
    // 而 OpenNext 用 esbuild 二次打包 server-functions 时无法解析它(CI 实测 6 处
    // "Could not resolve" 直接构建失败)。生产走 D1 适配器,这一整块本来就是死代码,
    // 让 esbuild 照常把它打进去即可 —— 原来的构建一直是这么通过的。
    //
    // 另注:单靠 serverExternalPackages 修不好 dev。better-sqlite3 虽在 Next 默认 external
    // 列表里,但它是被 @prisma/adapter-better-sqlite3 间接 require 的,而该适配器不在默认
    // 列表内,且适配器是 packages/db 通过路径别名(裸 TS 源码)引入的,Next 的 external
    // 判定覆盖不到这条链,所以只能落到 webpack 层。
    if (isServer && dev) {
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

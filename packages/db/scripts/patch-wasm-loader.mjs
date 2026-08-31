// prisma generate 后处理:改写生成的 .prisma/client/index.js 中
// query_compiler 的加载逻辑。
//
// 背景:engineType="client" 生成的节点目标客户端通过
//   require('fs').readFileSync(<dirname>/query_compiler_bg.wasm)
// 加载查询编译器,这在 Cloudflare Workers (workerd) 上必然失败(无文件系统)。
// 此补丁把加载改为:
//   1. 优先经 OpenNext 的 ASSETS binding 取回随静态资源分发的 wasm
//      (public/__wasm/,由本脚本从生成产物拷贝,不占 worker 脚本体积);
//   2. 回退到原 fs 读取(本地 Node 开发)。
// prisma 升级后若产物结构变化导致替换失败,本脚本会显式报错退出。
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..') // packages/db
const webDir = join(pkgDir, '..', '..', 'apps', 'web')

// 沿 @prisma/client 的解析位置定位 .prisma/client(与 prisma generate 的输出一致):
// <store>/node_modules/@prisma/client → <store>/node_modules/.prisma/client
const clientPkgJson = createRequire(join(pkgDir, 'package.json')).resolve('@prisma/client/package.json')
const prismaClientDir = dirname(clientPkgJson)
const generatedDir = join(prismaClientDir, '..', '..', '.prisma', 'client')
const generatedIndex = join(generatedDir, 'index.js')

const source = readFileSync(generatedIndex, 'utf8')

const fsLoaderPattern =
  /getQueryCompilerWasmModule: async \(\) => \{[\s\S]*?require\('fs'\)\.readFileSync\([\s\S]*?new WebAssembly\.Module\(queryCompilerWasmFileBytes\)[\s\S]*?\}/

const assetLoader = `getQueryCompilerWasmModule: async () => {
        try {
          let assets = globalThis.__VIBEVAULT_ASSETS
          if (!assets) {
            const { getCloudflareContext } = require('@opennextjs/cloudflare')
            assets = getCloudflareContext().env.ASSETS
          }
          const res = await assets.fetch(new Request('https://assets.local/__wasm/query_compiler_bg.wasm'))
          if (!res.ok) throw new Error('ASSETS fetch failed with status ' + res.status)
          return new WebAssembly.Module(new Uint8Array(await res.arrayBuffer()))
        } catch (assetErr) {
          const queryCompilerWasmFilePath = require('path').join(config.dirname, 'query_compiler_bg.wasm')
          const queryCompilerWasmFileBytes = require('fs').readFileSync(queryCompilerWasmFilePath)
          return new WebAssembly.Module(queryCompilerWasmFileBytes)
        }
      }`

if (source.includes('__VIBEVAULT_ASSETS')) {
  // 必须在匹配测试之前判断:打补丁后 catch 回退块仍含 readFileSync,
  // 否则正则会二次匹配导致嵌套破坏
  console.log('[patch-wasm-loader] already patched, skipping loader rewrite')
} else if (!fsLoaderPattern.test(source)) {
  console.error('[patch-wasm-loader] fs-based compiler loader not found — prisma version layout changed?')
  process.exit(1)
} else {
  writeFileSync(generatedIndex, source.replace(fsLoaderPattern, assetLoader))
  console.log('[patch-wasm-loader] patched compiler loader in', generatedIndex)
}

// 把 wasm 作为静态资源分发(OpenNext 会把 public/ 打进 .open-next/assets)
const assetDir = join(webDir, 'public', '__wasm')
mkdirSync(assetDir, { recursive: true })
copyFileSync(join(generatedDir, 'query_compiler_bg.wasm'), join(assetDir, 'query_compiler_bg.wasm'))
console.log('[patch-wasm-loader] copied wasm asset to', join(assetDir, 'query_compiler_bg.wasm'))

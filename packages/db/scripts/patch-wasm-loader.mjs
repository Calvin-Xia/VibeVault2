// prisma generate 后处理:把生成的 .prisma/client/index.js 中
// query_compiler 的 fs.readFileSync 加载替换为 base64 内联加载。
//
// 背景:engineType="client" 生成的节点目标客户端通过
//   require('fs').readFileSync(<dirname>/query_compiler_bg.wasm)
// 加载查询编译器。这在 Cloudflare Workers (workerd) 上必然失败:
// 没有文件系统。base64 内联变体(@prisma/client/runtime/
// query_compiler_bg.<provider>.wasm-base64.js)无需 fs,是
// 新 prisma-client 生成器的官方产物;此处把同样的策略手动
// 应用到 prisma-client-js 生成器(6.19.x)的产物上。
// prisma 升级后若替换失败,本脚本会显式报错退出。
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..')

// 沿 @prisma/client 的解析位置定位 .prisma/client(与 prisma generate 的输出一致):
// <store>/node_modules/@prisma/client → <store>/node_modules/.prisma/client
const clientPkgJson = createRequire(join(pkgDir, 'package.json')).resolve('@prisma/client/package.json')
const prismaClientDir = dirname(clientPkgJson)
const generatedIndex = join(prismaClientDir, '..', '..', '.prisma', 'client', 'index.js')

const source = readFileSync(generatedIndex, 'utf8')

const fsLoaderPattern =
  /getQueryCompilerWasmModule: async \(\) => \{[\s\S]*?require\('fs'\)\.readFileSync\([\s\S]*?new WebAssembly\.Module\(queryCompilerWasmFileBytes\)[\s\S]*?\}/

const base64Loader = `getQueryCompilerWasmModule: async () => {
        const { wasm } = require('@prisma/client/runtime/query_compiler_bg.sqlite.wasm-base64.js')
        return new WebAssembly.Module(Buffer.from(wasm, 'base64'))
      }`

if (!fsLoaderPattern.test(source)) {
  if (source.includes('query_compiler_bg.sqlite.wasm-base64.js')) {
    console.log('[patch-wasm-loader] already patched, skipping')
    process.exit(0)
  }
  console.error('[patch-wasm-loader] fs-based compiler loader not found — prisma version layout changed?')
  process.exit(1)
}

writeFileSync(generatedIndex, source.replace(fsLoaderPattern, base64Loader))
console.log('[patch-wasm-loader] patched', generatedIndex)

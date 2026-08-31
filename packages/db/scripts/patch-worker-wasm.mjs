// OpenNext 构建后处理:把 .open-next/worker.js 中 Prisma 查询编译器的
// fs 加载改为静态 import,使 wrangler 以 CompiledWasm 模块上传 wasm。
//
// 背景:workerd 禁止运行时 WebAssembly 编译("Wasm code generation
// disallowed by embedder"),fs/ASSETS/内联 base64 方案全部不可行
// (内联还会超出免费版 3MiB gzip 限制)。唯一路径是静态 import ——
// wrangler 对 rules 中声明为 CompiledWasm 的 glob 会把 import 的 .wasm
// 作为预编译模块随 worker 上传,运行时直接实例化。
// 在根 build 脚本中于 opennextjs-cloudflare build 之后执行。
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..') // packages/db
const repoRoot = join(pkgDir, '..', '..')
const workerPath = join(repoRoot, 'apps', 'web', '.open-next', 'worker.js')

// wasm 来源:prisma generate 的产物(与生成客户端的 glue 严格配对)
const clientPkgJson = createRequire(join(pkgDir, 'package.json')).resolve('@prisma/client/package.json')
const generatedDir = join(dirname(clientPkgJson), '..', '..', '.prisma', 'client')
const wasmSource = join(generatedDir, 'query_compiler_bg.wasm')
const wasmTarget = join(repoRoot, 'apps', 'web', '.open-next', 'query_compiler_bg.wasm')

const IMPORT_NAME = '__query_compiler_wasm'
const IMPORT_STMT = `import ${IMPORT_NAME} from "./query_compiler_bg.wasm";\n`

let worker = readFileSync(workerPath, 'utf8')

if (worker.includes(IMPORT_NAME)) {
  console.log('[patch-worker-wasm] already patched, skipping')
  process.exit(0)
}

// 替换所有 getQueryCompilerWasmModule 加载器为静态导入的编译模块。
// 属性名不会被压缩器改名;body 内的字符串字面量不含花括号,括号计数安全。
const PROP = 'getQueryCompilerWasmModule:'
let patched = 0
for (;;) {
  const idx = worker.indexOf(PROP, patched ? undefined : 0)
  if (idx === -1) break
  // 定位箭头函数 body 的第一个 '{'
  const bodyStart = worker.indexOf('{', idx + PROP.length)
  if (bodyStart === -1) {
    console.error('[patch-worker-wasm] cannot find loader body')
    process.exit(1)
  }
  // 花括号配对扫描(忽略字符串内花括号:此函数体内没有)
  let depth = 0
  let bodyEnd = -1
  for (let i = bodyStart; i < worker.length; i++) {
    const ch = worker[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        bodyEnd = i
        break
      }
    }
  }
  if (bodyEnd === -1) {
    console.error('[patch-worker-wasm] unbalanced braces in loader body')
    process.exit(1)
  }
  worker =
    worker.slice(0, idx) +
    `${PROP} async () => ${IMPORT_NAME}` +
    worker.slice(bodyEnd + 1)
  patched++
}

if (patched === 0) {
  console.error('[patch-worker-wasm] getQueryCompilerWasmModule loader not found — bundler output changed?')
  process.exit(1)
}

worker = IMPORT_STMT + worker
writeFileSync(workerPath, worker)
copyFileSync(wasmSource, wasmTarget)
console.log(`[patch-worker-wasm] patched ${patched} loader(s), import + wasm added (${workerPath})`)

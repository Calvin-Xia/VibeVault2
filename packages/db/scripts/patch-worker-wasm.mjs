// OpenNext 构建后处理:把 .open-next 输出中 Prisma 查询编译器的
// fs 加载改为静态 import,使 wrangler 以 CompiledWasm 模块上传 wasm。
//
// 背景:workerd 禁止运行时 WebAssembly 编译("Wasm code generation
// disallowed by embedder"),fs/ASSETS/内联 base64 方案全部不可行
// (内联还会超出免费版 3MiB gzip 限制)。唯一路径是静态 import ——
// wrangler 对 rules 中声明为 CompiledWasm 的 glob 会把 import 的 .wasm
// 作为预编译模块随 worker 上传,运行时直接实例化。
// 在根 build 脚本中于 opennextjs-cloudflare build 之后执行。
//
// 注意:OpenNext 的 server 代码位于 .open-next/server-functions/** 而非
// worker.js 本体,因此这里递归扫描全部 .mjs/.js 分块。
import { readFileSync, writeFileSync, copyFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..') // packages/db
const repoRoot = join(pkgDir, '..', '..')
const openNextDir = join(repoRoot, 'apps', 'web', '.open-next')

// wasm 来源:prisma generate 的产物(与生成客户端的 glue 严格配对)
const clientPkgJson = createRequire(join(pkgDir, 'package.json')).resolve('@prisma/client/package.json')
const generatedDir = join(dirname(clientPkgJson), '..', '..', '.prisma', 'client')
const wasmSource = join(generatedDir, 'query_compiler_bg.wasm')

const IMPORT_NAME = '__query_compiler_wasm'
const PROP = 'getQueryCompilerWasmModule:'

function* walkJsFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) yield* walkJsFiles(p)
    else if (/\.(mjs|js|cjs)$/.test(name)) yield p
  }
}

function patchFile(filePath) {
  let source = readFileSync(filePath, 'utf8')
  if (source.includes(IMPORT_NAME)) {
    console.log(`[patch-worker-wasm] ${relative(openNextDir, filePath)} already patched, skipping`)
    return 0
  }
  if (!source.includes(PROP)) return 0

  let patched = 0
  for (;;) {
    const idx = source.indexOf(PROP)
    if (idx === -1) break
    const bodyStart = source.indexOf('{', idx + PROP.length)
    if (bodyStart === -1) {
      console.error('[patch-worker-wasm] cannot find loader body')
      process.exit(1)
    }
    // 花括号配对扫描(此函数体内的字符串字面量不含花括号)
    let depth = 0
    let bodyEnd = -1
    for (let i = bodyStart; i < source.length; i++) {
      const ch = source[i]
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
    source =
      source.slice(0, idx) +
      `${PROP} async () => ${IMPORT_NAME}` +
      source.slice(bodyEnd + 1)
    patched++
  }

  // 在文件头加静态 import,wasm 拷到该分块旁
  source = `import ${IMPORT_NAME} from "./query_compiler_bg.wasm";\n` + source
  writeFileSync(filePath, source)
  copyFileSync(wasmSource, join(dirname(filePath), 'query_compiler_bg.wasm'))
  console.log(
    `[patch-worker-wasm] patched ${patched} loader(s) in ${relative(openNextDir, filePath)} (+ wasm copied)`,
  )
  return patched
}

let total = 0
for (const file of walkJsFiles(openNextDir)) {
  total += patchFile(file)
}

if (total === 0) {
  console.error('[patch-worker-wasm] getQueryCompilerWasmModule loader not found in any chunk — bundler output changed?')
  process.exit(1)
}
console.log(`[patch-worker-wasm] done, ${total} loader(s) patched`)

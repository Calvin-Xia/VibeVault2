/**
 * 轻量元数据抓取器(零依赖,Workers 兼容)。
 *
 * 安全红线:
 * - SSRF 防护:拒绝非 http(s)、拒绝带凭据的 URL、拒绝内网/保留 IP 字面量
 *   (含十进制/十六进制/八进制/缩写点分等 IPv4 变体,以及 IPv4-mapped IPv6)
 * - 超时与响应大小限制,避免滥用
 * - 解析失败时返回 { error },由调用方置 metadataStatus = 'FAILED'
 *
 * 已知限制:不做 DNS 解析后的复查(Workers 运行时无 dns 模块),
 * 因此"域名解析到内网"的 DNS rebinding 不在拦截范围内。
 */

import { isBlockedLiteralHost, stripHostBrackets } from '@/lib/ipGuard'

export interface FetchedMetadata {
  title: string | null
  description: string | null
  ogImage: string | null
  favicon: string | null
  siteName: string | null
  publishedTime: string | null
}

export interface MetadataResult {
  success: boolean
  metadata?: FetchedMetadata
  error?: string
}

const FETCH_TIMEOUT_MS = 5000
const MAX_BODY_BYTES = 2 * 1024 * 1024 // 2 MB

/** 明确禁止的主机名 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'local',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
])

/** 保留的域名后缀(RFC 6761 / RFC 8375) */
const BLOCKED_HOSTNAME_SUFFIXES = ['.localhost', '.local', '.localdomain', '.internal', '.home.arpa']

/** 校验目标 URL 是否允许被抓取(SSRF 防护)。返回 ok:false 表示拒绝。 */
export function validateFetchTarget(rawUrl: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { ok: false, error: 'Invalid URL' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: 'Only HTTP/HTTPS URLs are allowed' }
  }

  // 带凭据的 URL 会被原样转发到目标站,拒绝
  if (url.username !== '' || url.password !== '') {
    return { ok: false, error: 'URLs with embedded credentials are not allowed' }
  }

  // 去掉括号与末尾的点(localhost. 与 localhost 等价)后判定
  const host = stripHostBrackets(url.hostname.toLowerCase()).replace(/\.+$/, '')

  if (host === '') {
    return { ok: false, error: 'Invalid URL' }
  }

  // 先按字面量判定内网/保留 IP(覆盖 IPv4 各种变体与 IPv6)
  if (isBlockedLiteralHost(host)) {
    return { ok: false, error: 'Private network hosts are not allowed' }
  }

  if (BLOCKED_HOSTNAMES.has(host) || BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return { ok: false, error: 'Private network hosts are not allowed' }
  }

  return { ok: true, url }
}

/**
 * 码点转字符。页面可以写任意数字实体(如 &#999999999;),
 * String.fromCodePoint 对超出 Unicode 范围或落在代理区的码点会抛 RangeError,
 * 而这段逻辑在解析远端 HTML 时执行 —— 必须兜住,否则一个畸形页面就能让整次抓取失败。
 */
function codePointToString(codePoint: number): string {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return '\uFFFD'
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) return '\uFFFD'
  try {
    return String.fromCodePoint(codePoint)
  } catch {
    return '\uFFFD'
  }
}

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec: string) => codePointToString(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => codePointToString(parseInt(hex, 16)))
}

/** 从 HTML 字符串中提取第一个匹配的 meta/链接标签内容。 */
function extractTag(html: string, selector: RegExp): string | null {
  const match = html.match(selector)
  if (!match) return null
  const value = match[1] ?? match[2] ?? null
  if (!value) return null
  return decodeEntities(value.trim()) || null
}

const META_PATTERNS = {
  ogTitle: /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i,
  ogTitleReversed: /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["'][^>]*>/i,
  ogDescription: /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i,
  ogDescriptionReversed: /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["'][^>]*>/i,
  ogImage: /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["'][^>]*>/i,
  ogImageReversed: /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["'][^>]*>/i,
  ogSiteName: /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']*)["'][^>]*>/i,
  ogSiteNameReversed: /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:site_name["'][^>]*>/i,
  articlePublished: /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']*)["'][^>]*>/i,
  articlePublishedReversed: /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']article:published_time["'][^>]*>/i,
  htmlTitle: /<title[^>]*>([\s\S]*?)<\/title>/i,
  favicon: /<link[^>]*rel=["'](?:shortcut icon|icon)["'][^>]*href=["']([^"']*)["'][^>]*>/i,
  faviconReversed: /<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut icon|icon)["'][^>]*>/i,
} as const

/** 解析页面 HTML,提取元数据。纯函数,可单测。 */
export function parseMetadataHtml(html: string, pageUrl: string): FetchedMetadata {
  const pick = (a: RegExp, b: RegExp): string | null => extractTag(html, a) ?? extractTag(html, b)

  const ogTitle = pick(META_PATTERNS.ogTitle, META_PATTERNS.ogTitleReversed)
  const title = ogTitle ?? pick(META_PATTERNS.htmlTitle, /(?!)/)
  const description = pick(META_PATTERNS.ogDescription, META_PATTERNS.ogDescriptionReversed)
  const ogImage = pick(META_PATTERNS.ogImage, META_PATTERNS.ogImageReversed)
  const siteName = pick(META_PATTERNS.ogSiteName, META_PATTERNS.ogSiteNameReversed)
  const publishedTime = pick(META_PATTERNS.articlePublished, META_PATTERNS.articlePublishedReversed)

  // 相对 favicon/og:image 解析为绝对地址(基于页面 URL)
  let favicon = pick(META_PATTERNS.favicon, META_PATTERNS.faviconReversed)
  if (favicon) {
    try {
      favicon = new URL(favicon, pageUrl).toString()
    } catch {
      favicon = null
    }
  }

  let resolvedOgImage: string | null = ogImage
  if (resolvedOgImage) {
    try {
      resolvedOgImage = new URL(resolvedOgImage, pageUrl).toString()
    } catch {
      resolvedOgImage = null
    }
  }

  return {
    title: title || null,
    description,
    ogImage: resolvedOgImage,
    favicon,
    siteName,
    publishedTime,
  }
}

/**
 * 按字节上限读取响应体,超限立刻取消流并返回 null。
 *
 * 注意顺序:必须先判大小再累积。先 `await response.text()` 再检查长度的话,
 * 整个响应已经进了内存,大小限制就完全失去防护意义。
 */
async function readBodyCapped(response: Response, maxBytes: number): Promise<string | null> {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return null
  }

  const stream = response.body
  if (!stream) {
    // 无流式体(部分运行时/测试桩):只能整体读取后判断
    const text = await response.text()
    return text.length > maxBytes ? null : text
  }

  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8')
  let received = 0
  let body = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      received += value.byteLength
      if (received > maxBytes) {
        await reader.cancel().catch(() => {})
        return null
      }
      body += decoder.decode(value, { stream: true })
    }
    body += decoder.decode()
  } finally {
    reader.releaseLock()
  }

  return body
}

/**
 * 抓取页面元数据(带 SSRF 防护)。
 * 纯运行时函数:用于 Server Actions / Worker;测试中可 mock fetch。
 */
export async function fetchMetadata(rawUrl: string): Promise<MetadataResult> {
  const target = validateFetchTarget(rawUrl)
  if (!target.ok) {
    return { success: false, error: target.error }
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const response = await fetch(target.url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VibeVaultMetadata/1.0; +https://vibevault.dev)',
        Accept: 'text/html,application/xhtml+xml',
      },
    }).finally(() => clearTimeout(timer))

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return { success: false, error: 'Not an HTML page' }
    }

    const body = await readBodyCapped(response, MAX_BODY_BYTES)
    if (body === null) {
      return { success: false, error: 'Response too large' }
    }

    const metadata = parseMetadataHtml(body, target.url.toString())
    return { success: true, metadata }
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError' ? 'Timed out' : 'Fetch failed'
    return { success: false, error: message }
  }
}

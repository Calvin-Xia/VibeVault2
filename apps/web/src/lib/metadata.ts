/**
 * 轻量元数据抓取器(零依赖,Workers 兼容)。
 *
 * 安全红线:
 * - SSRF 防护:拒绝非 http(s)、拒绝内网/保留 IP 字面量、localhost 与裸 IPv6
 * - 超时与响应大小限制,避免滥用
 * - 解析失败时返回 { error },由调用方置 metadataStatus = 'FAILED'
 */

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

/** 内网/保留 IP 字面量(IPv4)与 localhost 白名单拦截 */
const PRIVATE_IPV4 = /^(?:10\.|127\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|0\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|224\.|240\.|255\.)/i
const LOCAL_HOSTNAMES = /^(?:localhost|local|localhost\.localdomain|[^.]*\.local(?:\.localdomain)?)$/i
const RAW_IPV6 = /^[0-9a-f:*]+$/i

/** 校验目标 URL 是否允许被抓取(SSRF 防护)。返回 null 表示安全,否则返回拒绝原因。 */
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

  const host = url.hostname.toLowerCase()
  const bareHost = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host

  // 拒绝裸 IPv6
  if (RAW_IPV6.test(bareHost) && bareHost.includes(':')) {
    return { ok: false, error: 'IPv6 literal hosts are not allowed' }
  }

  // 拒绝 IPv6 内网段 (::1, fc00::/7, fe80::/10)
  if (bareHost.includes(':')) {
    if (/^(?:fc|fd|fe8|fe9|fea|feb|::1)/i.test(bareHost)) {
      return { ok: false, error: 'Private network hosts are not allowed' }
    }
  }

  if (PRIVATE_IPV4.test(bareHost) || LOCAL_HOSTNAMES.test(bareHost)) {
    return { ok: false, error: 'Private network hosts are not allowed' }
  }

  return { ok: true, url }
}

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
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

    const body = await response.text()
    if (body.length > MAX_BODY_BYTES) {
      return { success: false, error: 'Response too large' }
    }

    const metadata = parseMetadataHtml(body, target.url.toString())
    return { success: true, metadata }
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError' ? 'Timed out' : 'Fetch failed'
    return { success: false, error: message }
  }
}

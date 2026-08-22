/**
 * URL 规范化(纯函数,可单测)。
 * 从 linkActions.createLink 中提取,便于测试与复用。
 */

export interface NormalizeResult {
  ok: true
  url: string
  normalizedUrl: string
  domain: string
}

export interface NormalizeFailure {
  ok: false
  error: string
}

export function normalizeUrl(rawUrl: string): NormalizeResult | NormalizeFailure {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { ok: false, error: 'Invalid URL format' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only HTTP and HTTPS URLs are allowed' }
  }

  return {
    ok: true,
    url: parsed.toString(),
    normalizedUrl: parsed.toString().split('#')[0],
    domain: parsed.hostname,
  }
}

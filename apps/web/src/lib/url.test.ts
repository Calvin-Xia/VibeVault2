import { describe, it, expect } from 'vitest'
import { normalizeUrl } from '@/lib/url'

describe('normalizeUrl', () => {
  it('规范化合法 http URL', () => {
    const r = normalizeUrl('https://Example.com/path?q=1#frag')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.domain).toBe('example.com')
      expect(r.normalizedUrl).toBe('https://example.com/path?q=1')
    }
  })

  it('剥离 hash 但保留 query', () => {
    const r = normalizeUrl('https://example.com/a#section')
    if (r.ok) {
      expect(r.normalizedUrl).toBe('https://example.com/a')
    }
    const r2 = normalizeUrl('https://example.com/a?x=1#s')
    if (r2.ok) {
      expect(r2.normalizedUrl).toBe('https://example.com/a?x=1')
    }
  })

  it('拒绝非 http/https 协议', () => {
    const r = normalizeUrl('javascript:alert(1)')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('Only HTTP and HTTPS')
  })

  it('拒绝非法 URL 格式', () => {
    expect(normalizeUrl('not a url').ok).toBe(false)
    expect(normalizeUrl('').ok).toBe(false)
  })

  it('保留原始 url 字段为序列化形式', () => {
    const r = normalizeUrl('https://example.com')
    if (r.ok) {
      expect(r.url).toBe('https://example.com/')
    }
  })
})

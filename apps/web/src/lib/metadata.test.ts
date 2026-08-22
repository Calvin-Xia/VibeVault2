import { describe, it, expect } from 'vitest'
import { validateFetchTarget, parseMetadataHtml } from '@/lib/metadata'

const METADATA_MODULE = '@/lib/metadata'

describe('validateFetchTarget (SSRF 防护)', () => {
  it('允许公网 http/https 链接', () => {
    expect(validateFetchTarget('https://example.com/article').ok).toBe(true)
    expect(validateFetchTarget('http://example.com').ok).toBe(true)
  })

  it('拒绝非 http/https 协议', () => {
    const r = validateFetchTarget('ftp://example.com')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('Only HTTP/HTTPS')
  })

  it('拒绝非法 URL', () => {
    expect(validateFetchTarget('not-a-url').ok).toBe(false)
    expect(validateFetchTarget('').ok).toBe(false)
  })

  it('拒绝 localhost 与 .local 主机', () => {
    for (const bad of ['http://localhost/', 'http://localhost:8080/', 'http://foo.local/']) {
      const r = validateFetchTarget(bad)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toContain('Private network')
    }
  })

  it('拒绝内网 IPv4 字面量', () => {
    const badHosts = ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '0.0.0.0']
    for (const host of badHosts) {
      const r = validateFetchTarget(`http://${host}/`)
      expect(r.ok, `应拒绝 http://${host}/`).toBe(false)
    }
  })

  it('拒绝内网 IPv6 字面量', () => {
    for (const bad of ['http://[::1]/', 'http://[fc00::1]/', 'http://[fe80::1]/']) {
      const r = validateFetchTarget(bad)
      expect(r.ok, `应拒绝 ${bad}`).toBe(false)
    }
  })

  it('空白输入不被误判为合法', () => {
    expect(validateFetchTarget(' ').ok).toBe(false)
  })
})

describe('parseMetadataHtml', () => {
  const pageUrl = 'https://example.com/a/b'

  it('提取 og:title / og:description / og:image / og:site_name', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Test &amp; Title" />
        <meta property="og:description" content="A description" />
        <meta property="og:image" content="https://cdn.example.com/img.png" />
        <meta property="og:site_name" content="Example Site" />
      </head></html>
    `
    const m = parseMetadataHtml(html, pageUrl)
    expect(m.title).toBe('Test & Title')
    expect(m.description).toBe('A description')
    expect(m.ogImage).toBe('https://cdn.example.com/img.png')
    expect(m.siteName).toBe('Example Site')
  })

  it('title 回退到 <title> 标签', () => {
    const html = '<html><head><title>Fallback Title</title></head></html>'
    expect(parseMetadataHtml(html, pageUrl).title).toBe('Fallback Title')
  })

  it('解析相对 favicon 为绝对 URL', () => {
    const html = '<html><head><link rel="icon" href="/favicon.ico"></head></html>'
    expect(parseMetadataHtml(html, pageUrl).favicon).toBe('https://example.com/favicon.ico')
  })

  it('解析相对 og:image 为绝对 URL', () => {
    const html = '<html><head><meta property="og:image" content="/og.png"></head></html>'
    expect(parseMetadataHtml(html, pageUrl).ogImage).toBe('https://example.com/og.png')
  })

  it('提取 article:published_time', () => {
    const html = '<html><head><meta property="article:published_time" content="2026-01-02T03:04:05Z"></head></html>'
    expect(parseMetadataHtml(html, pageUrl).publishedTime).toBe('2026-01-02T03:04:05Z')
  })

  it('属性顺序颠倒也能提取(content 在 property 前)', () => {
    const html = '<html><head><meta content="Reversed Order" property="og:title"></head></html>'
    expect(parseMetadataHtml(html, pageUrl).title).toBe('Reversed Order')
  })

  it('空/无效 HTML 返回全 null 而非抛出', () => {
    const m = parseMetadataHtml('', pageUrl)
    expect(m.title).toBeNull()
    expect(m.description).toBeNull()
    expect(() => parseMetadataHtml('<bad', pageUrl)).not.toThrow()
  })

  it('解码 HTML 实体', () => {
    const html = '<html><head><meta property="og:description" content="A &amp; B &lt;b&gt;"></head></html>'
    expect(parseMetadataHtml(html, pageUrl).description).toBe('A & B <b>')
  })
})

// 保证模块能被解析(防止树摇后的误报)
describe('module sanity', () => {
  it('metadata 模块可加载', async () => {
    const mod = await import(METADATA_MODULE)
    expect(typeof mod.fetchMetadata).toBe('function')
  })
})

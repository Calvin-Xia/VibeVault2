import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateFetchTarget, parseMetadataHtml, fetchMetadata } from '@/lib/metadata'

const METADATA_MODULE = '@/lib/metadata'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** 构造带流式响应体的 Response,用于验证大小上限在读取过程中生效 */
function streamedResponse(chunks: Uint8Array[], headers: Record<string, string> = {}): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'content-type': 'text/html', ...headers } })
}

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

  it('拒绝 IPv4 等价写法绕过(十进制/十六进制/八进制/缩写点分)', () => {
    const bypasses = [
      'http://2130706433/', // 十进制 127.0.0.1
      'http://0x7f000001/', // 十六进制
      'http://0x7f.0.0.1/', // 混合进制
      'http://0177.0.0.1/', // 八进制
      'http://127.1/', // 缩写点分
      'http://2852039166/', // 十进制 169.254.169.254(云元数据)
    ]
    for (const url of bypasses) {
      const r = validateFetchTarget(url)
      expect(r.ok, `应拒绝 ${url}`).toBe(false)
    }
  })

  it('拒绝 IPv4-mapped IPv6 绕过', () => {
    for (const url of ['http://[::ffff:127.0.0.1]/', 'http://[::127.0.0.1]/', 'http://[0:0:0:0:0:ffff:169.254.169.254]/']) {
      expect(validateFetchTarget(url).ok, `应拒绝 ${url}`).toBe(false)
    }
  })

  it('拒绝末尾带点的 localhost 与保留后缀', () => {
    for (const url of ['http://localhost./', 'http://foo.internal/', 'http://x.home.arpa/']) {
      expect(validateFetchTarget(url).ok, `应拒绝 ${url}`).toBe(false)
    }
  })

  it('拒绝带内嵌凭据的 URL', () => {
    const r = validateFetchTarget('http://user:pass@example.com/')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('credentials')
  })

  it('放行公网 IP 字面量', () => {
    for (const url of ['https://1.1.1.1/', 'https://8.8.8.8/x', 'https://[2606:4700::1111]/']) {
      expect(validateFetchTarget(url).ok, `应放行 ${url}`).toBe(true)
    }
  })
})

describe('fetchMetadata 响应体大小上限', () => {
  it('Content-Length 超限时直接拒绝,不读取响应体', async () => {
    const text = vi.fn(async () => '<html></html>')
    const response = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html', 'content-length': String(8 * 1024 * 1024) }),
      body: null,
      text,
    } as unknown as Response
    vi.stubGlobal('fetch', vi.fn(async () => response))

    const result = await fetchMetadata('https://example.com/')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Response too large')
    expect(text).not.toHaveBeenCalled()
  })

  it('流式响应体超过上限时中断读取并拒绝', async () => {
    // 33 × 64KB ≈ 2.06MB,略高于 2MB 上限
    const chunk = new Uint8Array(64 * 1024)
    const chunks = Array.from({ length: 33 }, () => chunk)
    vi.stubGlobal('fetch', vi.fn(async () => streamedResponse(chunks)))

    const result = await fetchMetadata('https://example.com/')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Response too large')
  })

  it('正常大小的 HTML 照常解析', async () => {
    const html = '<html><head><title>Hello</title><meta property="og:description" content="Desc"></head></html>'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })),
    )

    const result = await fetchMetadata('https://example.com/')
    expect(result.success).toBe(true)
    expect(result.metadata?.title).toBe('Hello')
    expect(result.metadata?.description).toBe('Desc')
  })

  it('非 HTML 响应被拒绝', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('%PDF-1.4', { headers: { 'content-type': 'application/pdf' } })),
    )
    const result = await fetchMetadata('https://example.com/file.pdf')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not an HTML page')
  })

  it('非 2xx 响应被拒绝', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 503 })))
    const result = await fetchMetadata('https://example.com/')
    expect(result.success).toBe(false)
    expect(result.error).toBe('HTTP 503')
  })

  it('SSRF 目标在发起请求前就被拒绝', async () => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    const result = await fetchMetadata('http://169.254.169.254/latest/meta-data/')
    expect(result.success).toBe(false)
    expect(spy).not.toHaveBeenCalled()
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

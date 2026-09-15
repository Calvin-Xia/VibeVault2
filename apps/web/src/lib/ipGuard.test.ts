import { describe, it, expect } from 'vitest'
import {
  parseIpv4ToInt,
  parseIpv6ToGroups,
  isBlockedIpv4,
  isBlockedIpv6,
  isBlockedLiteralHost,
  stripHostBrackets,
} from '@/lib/ipGuard'

describe('parseIpv4ToInt', () => {
  it('解析标准点分十进制', () => {
    expect(parseIpv4ToInt('127.0.0.1')).toBe(2130706433)
    expect(parseIpv4ToInt('0.0.0.0')).toBe(0)
    expect(parseIpv4ToInt('255.255.255.255')).toBe(4294967295)
  })

  it('把各种等价写法归一化为同一整数(SSRF 绕过面)', () => {
    const loopback = 2130706433
    const variants = [
      '127.0.0.1',
      '127.1', // 缩写点分:末段吸收剩余字节
      '127.0.1',
      '2130706433', // 十进制整数
      '0x7f000001', // 十六进制
      '0x7f.0.0.1', // 混合进制
      '0177.0.0.1', // 八进制
      '0x7f.1', // 混合 + 缩写
    ]
    for (const v of variants) {
      expect(parseIpv4ToInt(v), `应把 ${v} 解析为 ${loopback}`).toBe(loopback)
    }
  })

  it('拒绝非法与越界输入', () => {
    for (const bad of ['', '256.1.1.1', '1.2.3.4.5', 'example.com', '1.2.3.', '.1.2.3', '08', '0x', '1.2.3.99999999999']) {
      expect(parseIpv4ToInt(bad), `应拒绝 ${bad}`).toBeNull()
    }
  })
})

describe('isBlockedIpv4', () => {
  it('拦截内网与保留网段', () => {
    const blocked = [
      '0.0.0.0',
      '0.1.2.3',
      '10.0.0.1',
      '100.64.0.1',
      '127.0.0.1',
      '169.254.169.254', // 云元数据服务
      '172.16.0.1',
      '172.31.255.255',
      '192.0.0.1',
      '192.0.2.1',
      '192.88.99.1',
      '192.168.1.1',
      '198.18.0.1',
      '198.51.100.1',
      '203.0.113.1',
      '224.0.0.1',
      '255.255.255.255',
    ]
    for (const ip of blocked) {
      const value = parseIpv4ToInt(ip)
      expect(value, `${ip} 应可解析`).not.toBeNull()
      expect(isBlockedIpv4(value as number), `应拦截 ${ip}`).toBe(true)
    }
  })

  it('放行公网地址', () => {
    for (const ip of ['1.1.1.1', '8.8.8.8', '93.184.216.34', '172.32.0.1', '11.0.0.1']) {
      expect(isBlockedIpv4(parseIpv4ToInt(ip) as number), `应放行 ${ip}`).toBe(false)
    }
  })
})

describe('parseIpv6ToGroups', () => {
  it('展开 :: 压缩', () => {
    expect(parseIpv6ToGroups('::1')).toEqual([0, 0, 0, 0, 0, 0, 0, 1])
    expect(parseIpv6ToGroups('::')).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
    expect(parseIpv6ToGroups('2606:4700::1111')).toEqual([0x2606, 0x4700, 0, 0, 0, 0, 0, 0x1111])
  })

  it('展开内嵌 IPv4 写法', () => {
    expect(parseIpv6ToGroups('::ffff:1.2.3.4')).toEqual([0, 0, 0, 0, 0, 0xffff, 0x0102, 0x0304])
    expect(parseIpv6ToGroups('0:0:0:0:0:ffff:127.0.0.1')).toEqual([0, 0, 0, 0, 0, 0xffff, 0x7f00, 0x0001])
  })

  it('忽略 zone id', () => {
    expect(parseIpv6ToGroups('fe80::1%eth0')).toEqual([0xfe80, 0, 0, 0, 0, 0, 0, 1])
  })

  it('拒绝非 IPv6 与组数错误的输入', () => {
    for (const bad of ['', 'example.com', '1.2.3.4', '1:2:3:4:5:6:7:8:9', 'gggg::1', '::1::2']) {
      expect(parseIpv6ToGroups(bad), `应拒绝 ${bad}`).toBeNull()
    }
  })
})

describe('isBlockedLiteralHost', () => {
  it('拦截 IPv4-mapped / IPv4-compatible IPv6', () => {
    for (const host of ['[::ffff:127.0.0.1]', '::ffff:127.0.0.1', '[::127.0.0.1]', '::1']) {
      expect(isBlockedLiteralHost(host), `应拦截 ${host}`).toBe(true)
    }
  })

  it('拦截 6to4 / NAT64 内嵌的内网地址', () => {
    expect(isBlockedLiteralHost('2002:7f00:1::')).toBe(true) // 内嵌 127.0.0.1
    expect(isBlockedLiteralHost('2002:a9fe:a9fe::')).toBe(true) // 内嵌 169.254.169.254
    expect(isBlockedLiteralHost('64:ff9b::7f00:1')).toBe(true) // 内嵌 127.0.0.1
  })

  it('拦截 IPv6 保留段', () => {
    for (const host of ['fc00::1', 'fd12:3456::1', 'fe80::1', 'febf::1', 'ff02::1']) {
      expect(isBlockedLiteralHost(host), `应拦截 ${host}`).toBe(true)
    }
  })

  it('拦截非全局单播的其余 IPv6 段', () => {
    // 这些段漏掉时都是通往内网的 SSRF 路径:
    // 旧实现"一律拒绝 IPv6 字面量"能兜住,改成精确判定后必须逐段补上
    const cases: Array<[string, string]> = [
      ['fec0::1', 'fec0::/10 站点本地'],
      ['feff::1', 'fec0::/10 上边界'],
      ['64:ff9b:1::1', '64:ff9b:1::/48 本地 NAT64'],
      ['100::1', '100::/64 丢弃专用'],
      ['2001:db8::1', '2001:db8::/32 文档'],
      ['2001:2::1', '2001:2::/48 基准测试'],
      ['2001:10::1', 'ORCHID'],
      ['2001:2f::1', 'ORCHIDv2'],
    ]
    for (const [host, why] of cases) {
      expect(isBlockedLiteralHost(host), `应拦截 ${host} (${why})`).toBe(true)
    }
  })

  it('不误伤相邻的全局单播段', () => {
    // 被拦网段的上下边界外侧必须是放行的公网地址,防止掩码写宽误杀
    for (const host of ['2606:4700::1111', '2001:4860:4860::8888', '2001:db7::1', '2001:db9::1', '3ff0::1', '3fff:1000::1']) {
      expect(isBlockedLiteralHost(host), `应放行 ${host}`).toBe(false)
    }
  })

  it('放行公网 IP 与普通域名', () => {
    for (const host of ['1.1.1.1', '8.8.8.8', '2606:4700::1111', '2001:4860:4860::8888', 'example.com', 'sub.example.co.uk']) {
      expect(isBlockedLiteralHost(host), `应放行 ${host}`).toBe(false)
    }
  })
})

describe('isBlockedIpv6', () => {
  const groups = (input: string) => parseIpv6ToGroups(input) as number[]

  it('拦截未指定地址与回环', () => {
    expect(isBlockedIpv6(groups('::'))).toBe(true)
    expect(isBlockedIpv6(groups('::1'))).toBe(true)
  })

  it('拦截 ULA / link-local / 组播', () => {
    expect(isBlockedIpv6(groups('fc00::1'))).toBe(true)
    expect(isBlockedIpv6(groups('fe80::1'))).toBe(true)
    expect(isBlockedIpv6(groups('ff02::1'))).toBe(true)
  })

  it('默认拒绝:全局单播 2000::/3 之外的地址一律拦截', () => {
    // 含 IPv4-mapped/compatible —— 即使内嵌的是公网 IPv4 也拒绝。
    // 这类形态在 2000::/3 之外,直接拒绝比"取出内嵌 IPv4 再判定"更不容易出错,
    // 而收藏夹场景根本不需要它们。
    for (const host of ['::ffff:192.168.0.1', '::ffff:1.1.1.1', '::127.0.0.1', '64:ff9b::7f00:1', '100::1', 'fec0::1', 'feff::1', 'fec0:0:0:ffff::1']) {
      expect(isBlockedIpv6(groups(host)), `应拦截 ${host}`).toBe(true)
    }
  })

  it('拦截全局单播内部不可全局路由的特殊段', () => {
    // 2001::/23 覆盖 2001:0000::–2001:01ff::,2001:db8::/32 与 3fff::/20 单独判定
    for (const host of ['2001::1', '2001:2::1', '2001:10::1', '2001:1ff::1', '2001:db8::1', '3fff::1', '3fff:fff::1']) {
      expect(isBlockedIpv6(groups(host)), `应拦截 ${host}`).toBe(true)
    }
  })

  it('放行公网 IPv6,且不误伤被拦网段的相邻地址', () => {
    const allowed = [
      '2606:4700::1111', // Cloudflare
      '2001:4860:4860::8888', // Google
      '2a00:1450:4001::1',
      '2400:cb00::1',
      '2001:200::1', // 紧邻 2001::/23 上边界之外
      '2001:db9::1', // 紧邻 2001:db8::/32 之外
      '3ff0::1', // 紧邻 3fff::/20 下方 —— 验证 /20 掩码没有写宽
      '3ffe:ffff::1', // 紧邻 3fff::/20 下方
      '2002:808:808::1', // 6to4 但内嵌 8.8.8.8(公网)
    ]
    for (const host of allowed) {
      expect(isBlockedIpv6(groups(host)), `应放行 ${host}`).toBe(false)
    }
  })
})

describe('stripHostBrackets', () => {
  it('去掉 IPv6 方括号', () => {
    expect(stripHostBrackets('[::1]')).toBe('::1')
    expect(stripHostBrackets('example.com')).toBe('example.com')
  })
})

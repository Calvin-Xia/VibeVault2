/**
 * IP 字面量解析与内网/保留地址判定(纯函数,可单测)。
 *
 * 为什么不能只做字符串前缀匹配:同一个 IPv4 地址有多种等价写法,URL 解析器
 * 会全部接受,而按字面量做前缀匹配只能拦住其中一种 ——
 *   127.0.0.1 / 127.1 / 2130706433(十进制) / 0x7f000001(十六进制) / 0177.0.0.1(八进制)
 *   以及 IPv4-mapped IPv6:[::ffff:127.0.0.1] / [::127.0.0.1]
 * 先用 WHATWG URL 的算法把主机名归一化成 32 位整数(IPv4)或 8 组 16 位(IPv6),
 * 再判断保留网段,才能完整覆盖。
 */

/** 归一化后的 IPv4,无符号 32 位整数 */
export type Ipv4 = number

/** 归一化后的 IPv6,8 组无符号 16 位整数 */
export type Ipv6 = number[]

/** 解析单个 IPv4 段,支持十进制、0x 十六进制、前导 0 八进制 */
function parseIpv4Part(part: string): number | null {
  if (part === '') return null

  let radix = 10
  let digits = part

  if (/^0[xX]/.test(part)) {
    radix = 16
    digits = part.slice(2)
  } else if (part.length > 1 && part[0] === '0') {
    // 前导 0 视为八进制;非法八进制数字(如 08)整体判为无效
    radix = 8
    digits = part.slice(1)
  }

  if (digits === '') return null

  const pattern = radix === 16 ? /^[0-9a-f]+$/i : radix === 8 ? /^[0-7]+$/ : /^[0-9]+$/
  if (!pattern.test(digits)) return null

  const value = parseInt(digits, radix)
  return Number.isFinite(value) ? value : null
}

/**
 * 把 IPv4 字面量解析为 32 位整数,覆盖 WHATWG URL 认可的全部写法
 * (1~4 段、十进制/十六进制/八进制、末段吸收剩余字节)。非 IPv4 返回 null。
 */
export function parseIpv4ToInt(input: string): Ipv4 | null {
  if (input === '') return null

  const parts = input.split('.')
  if (parts.length > 4) return null

  const nums: number[] = []
  for (const part of parts) {
    const value = parseIpv4Part(part)
    if (value === null) return null
    nums.push(value)
  }

  const last = nums[nums.length - 1]
  const head = nums.slice(0, -1)

  // 前面的段每段必须恰好一个字节
  if (head.some((n) => n > 255)) return null
  // 末段吸收剩余字节
  const lastCapacity = 2 ** (8 * (4 - head.length))
  if (last >= lastCapacity) return null

  let value = last
  for (let i = 0; i < head.length; i++) {
    value += head[i] * 2 ** (8 * (3 - i))
  }
  return value >>> 0
}

/** 解析单个十六进制 hextet(1~4 位) */
function parseHextet(part: string): number | null {
  if (part === '' || part.length > 4 || !/^[0-9a-f]+$/i.test(part)) return null
  return parseInt(part, 16)
}

/**
 * 把 IPv6 字面量解析为 8 组 16 位整数。支持 `::` 压缩与内嵌 IPv4 写法。
 * 非 IPv6 返回 null。
 */
export function parseIpv6ToGroups(input: string): Ipv6 | null {
  // 去掉 zone id(如 fe80::1%eth0)
  const zoneIndex = input.indexOf('%')
  let host = zoneIndex === -1 ? input : input.slice(0, zoneIndex)

  if (!host.includes(':')) return null

  // 内嵌 IPv4 后缀(如 ::ffff:127.0.0.1)
  let embedded: number[] = []
  const lastColon = host.lastIndexOf(':')
  const tail = host.slice(lastColon + 1)
  if (tail.includes('.')) {
    const v4 = parseIpv4ToInt(tail)
    if (v4 === null) return null
    embedded = [(v4 >>> 16) & 0xffff, v4 & 0xffff]
    host = host.slice(0, lastColon + 1)
    // 剥掉 IPv4 后若以单个 ':' 结尾(非 '::'),去掉它再分段
    if (!host.endsWith('::')) host = host.slice(0, -1)
  }

  const doubleColon = host.indexOf('::')
  let headParts: string[]
  let tailParts: string[]

  if (doubleColon === -1) {
    headParts = host.split(':')
    tailParts = []
  } else {
    const headStr = host.slice(0, doubleColon)
    const tailStr = host.slice(doubleColon + 2)
    headParts = headStr === '' ? [] : headStr.split(':')
    tailParts = tailStr === '' ? [] : tailStr.split(':')
  }

  const explicit: number[] = []
  for (const part of [...headParts, ...tailParts]) {
    const value = parseHextet(part)
    if (value === null) return null
    explicit.push(value)
  }

  const total = explicit.length + embedded.length

  if (doubleColon === -1) {
    // 无压缩:必须刚好 8 组
    if (total !== 8) return null
    return [...explicit.slice(0, 8 - embedded.length), ...embedded]
  }

  // 有压缩:`::` 至少代表 1 组,因此显式组数必须 <= 7
  if (total > 7) return null

  const headCount = headParts.length
  const headGroups = explicit.slice(0, headCount)
  const tailGroups = explicit.slice(headCount)

  const groups = [
    ...headGroups,
    ...new Array(8 - total).fill(0),
    ...tailGroups,
    ...embedded,
  ]
  return groups.length === 8 ? groups : null
}

/** 判断 32 位整数是否落在内网/保留网段 */
export function isBlockedIpv4(value: Ipv4): boolean {
  const a = (value >>> 24) & 0xff
  const b = (value >>> 16) & 0xff
  const c = (value >>> 8) & 0xff

  if (a === 0) return true // 0.0.0.0/8 "this network"
  if (a === 10) return true // 10.0.0.0/8
  if (a === 127) return true // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local + 云元数据
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 CGNAT
  if (a === 192 && b === 0 && c === 0) return true // 192.0.0.0/24 IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return true // 192.0.2.0/24 TEST-NET-1
  if (a === 192 && b === 88 && c === 99) return true // 192.88.99.0/24 6to4 relay anycast
  if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && c === 100) return true // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true // 203.0.113.0/24 TEST-NET-3
  if (a >= 224) return true // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + 广播

  return false
}

/** 判断 IPv6 各组是否落在内网/保留网段(含 IPv4-mapped / 6to4 / Teredo 内嵌地址) */
/**
 * 判断 IPv6 是否落在非全局可达的地址空间。
 *
 * 采用**默认拒绝**:先只放行全局单播 2000::/3(RFC 4291),再在其中排除
 * 少数不可全局路由的特殊用途段。
 *
 * 为什么不是"逐个枚举内网段"(本项目此前的做法):IANA 的 IPv6 特殊用途表一直在增长 ——
 * 3fff::/20 是 2024 年新增、100:0:0:1::/64 是 2025 年新增 —— 默认放行意味着
 * 每漏掉一段就多一条通往内网的 SSRF 路径。默认拒绝后,新增的特殊用途段自动被挡住。
 * 两类历史写法都因此被拦住:内网/保留段(fe80::/10、fc00::/7、fec0::/10 站点本地、
 * 100::/64、64:ff9b:1::/48 本地 NAT64)以及各版本之前的 IPv4 映射形态
 * (::1、::ffff:127.0.0.1)—— 后者在 2000::/3 之外,一律拒绝,不必再单独判定内嵌 IPv4。
 */
export function isBlockedIpv6(groups: Ipv6): boolean {
  const [g0, g1, g2] = groups

  // 全局单播 2000::/3 之外一律拒绝:含 ::/::1、::ffff:0:0/96 映射地址、
  // fe80::/10、fc00::/7、ff00::/8、fec0::/10、100::/64、64:ff9b::/96、5f00::/16 等
  if ((g0 & 0xe000) !== 0x2000) return true

  // 2001::/23 IETF Protocol Assignments —— 该段整体标注为 not globally reachable
  // (含 Teredo 2001::/32、基准测试 2001:2::/48、ORCHID 2001:10::/28 等)
  if (g0 === 0x2001 && (g1 & 0xfe00) === 0x0000) return true
  // 2001:db8::/32 文档用 (RFC 3849)
  if (g0 === 0x2001 && g1 === 0x0db8) return true
  // 3fff::/20 文档用 (RFC 9637)。注意 /20 跨了 g0 与 g1 的高 4 位,
  // 不能只掩 g0(那会连 3ff0::/20 一起误伤)
  if (g0 === 0x3fff && (g1 & 0xf000) === 0x0000) return true

  // 6to4 2002::/16 落在全局单播内,但其内嵌 IPv4 可能指向内网,必须再按 IPv4 规则复查
  if (g0 === 0x2002) {
    return isBlockedIpv4(((g1 << 16) | g2) >>> 0)
  }

  return false
}

/** 去掉 IPv6 的主机名括号 */
export function stripHostBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
}

/**
 * 判断主机名是否为内网/保留 IP 字面量。
 * 非 IP 字面量(普通域名)一律返回 false —— 域名解析后的 IP 判定需要 DNS,
 * 由调用方按需处理。
 */
export function isBlockedLiteralHost(rawHost: string): boolean {
  const host = stripHostBrackets(rawHost.trim().toLowerCase())
  if (host === '') return false

  if (host.includes(':')) {
    const groups = parseIpv6ToGroups(host)
    return groups !== null ? isBlockedIpv6(groups) : false
  }

  // 仅当整串是合法的 IPv4 字面量时才判定;纯域名走域名规则
  const value = parseIpv4ToInt(host)
  return value !== null ? isBlockedIpv4(value) : false
}

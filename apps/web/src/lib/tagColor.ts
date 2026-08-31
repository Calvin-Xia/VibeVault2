// 标签颜色工具(见 DESIGN.md:品牌紫 #7C3AED,前景锚点 #0B0D14 / #F2F4FA)

export const DEFAULT_TAG_COLOR = '#7C3AED'

// DESIGN.md 前景锚点
const DARK_TEXT = '#0B0D14'
const LIGHT_TEXT = '#F2F4FA'

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex)
  if (!match) return null
  const value = match[1]
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

// WCAG 相对亮度(sRGB 线性化)
function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * 根据标签背景色返回可读的文字颜色:
 * 浅色背景返回深色文字(#0B0D14),否则返回浅色文字(#F2F4FA)。
 * 解析失败时回退到品牌紫 DEFAULT_TAG_COLOR。
 */
export function tagTextColor(hex: string | null | undefined): string {
  const rgb = hexToRgb(typeof hex === 'string' ? hex.trim() : '') ?? hexToRgb(DEFAULT_TAG_COLOR)!
  const luminance = relativeLuminance(rgb)
  // 阈值取黑/白文字对比度 4.5:1 的中点(≈0.179)
  return luminance > 0.179 ? DARK_TEXT : LIGHT_TEXT
}

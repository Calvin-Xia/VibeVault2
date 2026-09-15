/**
 * 展示用日期格式化(纯函数)。
 *
 * 固定时区是刻意的:卡片与详情页都是 SSR 的,若依赖运行环境默认时区,
 * 服务端(容器通常是 UTC)和浏览器(用户本地时区)在跨零点的时间戳上会
 * 格式化出不同的日期,导致 hydration 文本不一致。界面为 zh-CN,统一按东八区呈现。
 */

const DISPLAY_TIME_ZONE = 'Asia/Shanghai'

export function formatDisplayDate(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date)
}

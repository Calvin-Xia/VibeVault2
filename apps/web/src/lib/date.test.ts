import { describe, it, expect } from 'vitest'
import { formatDisplayDate } from '@/lib/date'

describe('formatDisplayDate', () => {
  it('空值返回空串', () => {
    expect(formatDisplayDate(null)).toBe('')
    expect(formatDisplayDate(undefined)).toBe('')
    expect(formatDisplayDate('')).toBe('')
  })

  it('无效日期返回空串而不是 "Invalid Date"', () => {
    expect(formatDisplayDate('not-a-date')).toBe('')
    expect(formatDisplayDate(new Date('nope'))).toBe('')
  })

  it('接受 Date 与 ISO 字符串,结果一致', () => {
    const iso = '2026-03-15T04:00:00.000Z'
    expect(formatDisplayDate(new Date(iso))).toBe(formatDisplayDate(iso))
    expect(formatDisplayDate(iso)).not.toBe('')
  })

  it('固定按东八区格式化,不受运行环境时区影响', () => {
    // 2026-03-15T20:00Z → 东八区已是 3 月 16 日
    const iso = '2026-03-15T20:00:00.000Z'
    const formatted = formatDisplayDate(iso)
    expect(formatted).toContain('16')
  })
})

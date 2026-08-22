import { describe, it, expect } from 'vitest'
import { hashCode } from '@/lib/otp'

describe('hashCode (OTP 验证码哈希)', () => {
  it('同一验证码生成确定性哈希', () => {
    expect(hashCode('123456')).toBe(hashCode('123456'))
  })

  it('不同验证码生成不同哈希', () => {
    expect(hashCode('123456')).not.toBe(hashCode('654321'))
  })

  it('输出为 64 位 hex (sha256)', () => {
    expect(hashCode('000000')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('空白输入也产生确定哈希(不抛异常)', () => {
    expect(hashCode('')).toMatch(/^[0-9a-f]{64}$/)
  })
})

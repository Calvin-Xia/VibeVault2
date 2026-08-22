import crypto from 'crypto'

/**
 * OTP 验证码哈希(纯函数,无副作用;从 otpActions 提取以便单测)。
 */
export function hashCode(code: string): string {
  const pepper = process.env.OTP_PEPPER || 'vibevault-default-pepper-change-in-production'
  return crypto.createHash('sha256').update(pepper + code).digest('hex')
}

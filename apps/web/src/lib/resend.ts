import { Resend } from 'resend'

let instance: Resend | null = null

/**
 * 惰性单例:避免在模块加载期(Next 构建收集 page data)构造 Resend,
 * 否则缺失 RESEND_API_KEY 时整个构建失败。
 * 仅在实际发信时(SendOtp)构造。
 */
export function getResend(): Resend {
  if (!instance) {
    instance = new Resend(process.env.RESEND_API_KEY)
  }
  return instance
}

export default getResend

'use server'

import crypto from 'crypto'
import { prisma } from '@vibevault/db'
import { getResend } from '@/lib/resend'
import { hashCode } from '@/lib/otp'

/**
 * 进程内滑动窗口限流。
 *
 * 注意这是"尽力而为"的限流:Workers 上按 isolate/colo 独立计数,不能当作全局限制。
 * 真正的强约束是 MAX_ATTEMPTS(每个验证码最多试 5 次)。
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 5
const MAX_SENDS_PER_WINDOW = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

/** 表中最多保留多少条记录;超出后先清理过期项,仍超限则整体清空 */
const MAX_RATE_LIMIT_ENTRIES = 10_000

/**
 * 防止 Map 无限增长:长驻 isolate 上每个新邮箱都会新增一条记录且永不过期回收,
 * 累积下去就是内存泄漏。只在表超过阈值时才做 O(n) 扫描,避免每个请求都全表遍历。
 */
function evictRateLimitEntries(now: number) {
  if (rateLimitMap.size <= MAX_RATE_LIMIT_ENTRIES) return

  for (const [key, value] of rateLimitMap) {
    if (now > value.resetAt) rateLimitMap.delete(key)
  }

  // 清理后仍超限(大量活跃邮箱)时整体清空:
  // 宁可短暂放宽限流,也不能让内存无上界增长
  if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    rateLimitMap.clear()
  }
}

function checkRateLimit(email: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  evictRateLimitEntries(now)
  const entry = rateLimitMap.get(email)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= MAX_SENDS_PER_WINDOW) {
    return { allowed: false, retryAfterMs: entry.resetAt - now }
  }

  entry.count++
  return { allowed: true }
}

async function cleanExpiredOtps() {
  await prisma.oTPVerification.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
}

export async function sendOtp(email: string): Promise<{ success: boolean; error?: string }> {
  if (!email || !email.includes('@')) {
    return { success: false, error: '请输入有效的邮箱地址' }
  }

  const rateCheck = checkRateLimit(email)
  if (!rateCheck.allowed) {
    const retryMinutes = Math.ceil((rateCheck.retryAfterMs ?? 0) / 60000)
    return {
      success: false,
      error: `发送次数过多，请 ${retryMinutes} 分钟后再试`,
    }
  }

  await cleanExpiredOtps()

  const code = crypto.randomInt(100000, 1000000).toString()
  const codeHash = hashCode(code)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

  await prisma.oTPVerification.deleteMany({ where: { email } })

  await prisma.oTPVerification.create({
    data: {
      email,
      codeHash,
      expiresAt,
    },
  })

  const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev'

  try {
    // resend SDK v3+ 对 API 拒绝不抛异常，而是返回 { data: null, error }，
    // 必须检查 error 否则发送失败也会假成功
    const { data, error } = await getResend().emails.send({
      from: fromAddress,
      to: email,
      subject: 'VibeVault - 验证码',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1f2937;">VibeVault 验证码</h2>
          <p style="color: #4b5563;">您的登录验证码是：</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px; margin: 16px 0;">
            ${code}
          </div>
          <p style="color: #9ca3af; font-size: 14px;">验证码 ${OTP_EXPIRY_MINUTES} 分钟内有效。请勿将验证码分享给他人。</p>
        </div>
      `,
    })

    if (error) {
      console.error(
        `[sendOtp] Resend 拒绝发信: name=${error.name} statusCode=${error.statusCode} message=${error.message} to=${email} from=${fromAddress}`,
      )
      return { success: false, error: '邮件发送失败，请稍后重试' }
    }

    console.log(`[sendOtp] 验证码邮件已提交 Resend: id=${data?.id ?? 'unknown'} to=${email}`)
  } catch (err) {
    console.error('[sendOtp] Resend 请求异常:', err)
    return { success: false, error: '邮件发送失败，请稍后重试' }
  }

  return { success: true }
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  if (!email || !code) {
    return { success: false, error: '请输入邮箱和验证码' }
  }

  await cleanExpiredOtps()

  const record = await prisma.oTPVerification.findFirst({
    where: { email },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    return { success: false, error: '验证码不存在或已过期，请重新获取' }
  }

  if (new Date() > record.expiresAt) {
    await prisma.oTPVerification.delete({ where: { id: record.id } })
    return { success: false, error: '验证码已过期，请重新获取' }
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.oTPVerification.delete({ where: { id: record.id } })
    return { success: false, error: '验证码尝试次数过多，请重新获取' }
  }

  await prisma.oTPVerification.update({
    where: { id: record.id },
    data: { attempts: record.attempts + 1 },
  })

  const inputHash = hashCode(code)
  const inputBuffer = Buffer.from(inputHash, 'hex')
  const recordBuffer = Buffer.from(record.codeHash, 'hex')
  
  if (inputBuffer.length !== recordBuffer.length || !crypto.timingSafeEqual(inputBuffer, recordBuffer)) {
    return { success: false, error: '验证码错误，请重试' }
  }

  await prisma.oTPVerification.delete({ where: { id: record.id } })

  return { success: true }
}

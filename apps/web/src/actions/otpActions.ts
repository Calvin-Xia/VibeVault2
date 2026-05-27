'use server'

import crypto from 'crypto'
import { prisma } from '@vibevault/db'
import resend from '@/lib/resend'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 5
const MAX_SENDS_PER_WINDOW = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

function hashCode(code: string): string {
  const pepper = process.env.OTP_PEPPER || 'vibevault-default-pepper-change-in-production'
  return crypto.createHash('sha256').update(pepper + code).digest('hex')
}

function checkRateLimit(email: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
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
    await resend.emails.send({
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
  } catch {
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

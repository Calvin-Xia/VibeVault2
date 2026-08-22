'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { sendOtp } from '@/actions/otpActions'

const BRAND = 'VibeVault'

export default function SignInPage() {
  const { status } = useSession()
  const router = useRouter()

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const codeInputRef = useRef<HTMLInputElement>(null)

  const brandLetters = useMemo(() => BRAND.split(''), [])

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/app')
    }
  }, [status, router])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    if (step === 'otp' && codeInputRef.current) {
      codeInputRef.current.focus()
    }
  }, [step])

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet border-t-transparent" />
      </div>
    )
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await sendOtp(email)
      if (result.success) {
        setStep('otp')
        setCooldown(60)
      } else {
        setError(result.error || '发送失败，请重试')
      }
    } catch {
      setError('发送失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        code,
        redirect: false,
      })

      if (result?.error) {
        setError('验证码错误或已过期')
      } else {
        router.push('/app')
      }
    } catch {
      setError('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    if (cooldown > 0) return
    setError('')
    setLoading(true)

    try {
      const result = await sendOtp(email)
      if (result.success) {
        setCooldown(60)
        setCode('')
      } else {
        setError('发送失败，请重试')
      }
    } catch {
      setError('发送失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="glass card w-full max-w-md rounded-2xl p-8"
      >
        <div className="mb-8 text-center">
          <span className="eyebrow in-view mb-4">Personal Link Vault</span>
          <h1 className="font-display mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
            {brandLetters.map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="gradient-text inline-block"
              >
                {ch}
              </motion.span>
            ))}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">可视化链接收藏夹</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                邮箱地址
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                className="input h-11"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading || !email} className="btn btn-primary w-full h-11">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  发送中...
                </span>
              ) : (
                '发送验证码'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="mb-2">
              <p className="text-sm text-muted-foreground">
                验证码已发送至 <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-foreground mb-1.5">
                验证码
              </label>
              <input
                ref={codeInputRef}
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className="input h-11 text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading || code.length !== 6} className="btn btn-primary w-full h-11">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  验证中...
                </span>
              ) : (
                '验证并登录'
              )}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setError('')
                }}
                className="link text-sm"
              >
                ← 更换邮箱
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || loading}
                className="link text-sm disabled:text-textTertiary disabled:cursor-not-allowed"
              >
                {cooldown > 0 ? `重新发送 (${cooldown}s)` : '重新发送验证码'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}

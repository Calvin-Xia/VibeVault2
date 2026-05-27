'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { sendOtp } from '@/actions/otpActions'

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
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
        setError(result.error || '发送失败，请重试')
      }
    } catch {
      setError('发送失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass w-full max-w-md rounded-2xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">VibeVault</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">可视化链接收藏夹</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                验证码已发送至 <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>
              </p>
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
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
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                ← 更换邮箱
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || loading}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {cooldown > 0 ? `重新发送 (${cooldown}s)` : '重新发送验证码'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

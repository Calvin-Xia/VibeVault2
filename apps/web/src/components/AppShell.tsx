'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Menu, Settings, Moon, Sun } from 'lucide-react'
import Sidebar from './Sidebar'
import { MobileSheet } from './ui/MobileSheet'
import { Skeleton } from './ui/Skeleton'

interface AppShellProps {
  children: React.ReactNode
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // 暗夜宝库:默认暗色,除非用户显式选择亮色
    const stored = localStorage.getItem('theme')
    const dark = stored !== 'light'
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const toggleDarkMode = useCallback(() => {
    setIsDark(prev => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:block">
        <Suspense fallback={<Skeleton className="w-64 h-full" />}>
          <Sidebar />
        </Suspense>
      </aside>

      {/* Mobile sidebar — sheet overlay */}
      <MobileSheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} side="left">
        <Suspense fallback={<Skeleton className="w-64 h-full" />}>
          <Sidebar onClose={() => setMobileMenuOpen(false)} />
        </Suspense>
      </MobileSheet>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-background/70 backdrop-blur-[12px] flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-3 sm:p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              aria-label="打开菜单"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              <span className="gradient-text">VibeVault</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-3 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              aria-label={isDark ? '切换亮色模式' : '切换暗色模式'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Settings button */}
            <Link
              href="/app/settings"
              className="p-3 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              aria-label="设置"
            >
              <Settings className="h-5 w-5" />
            </Link>

            {/* User authentication */}
            {session ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted ring-2 ring-violet/30 flex items-center justify-center">
                  <span className="text-sm font-medium">{session.user?.name?.charAt(0) || 'U'}</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="btn btn-secondary h-8 px-3 text-xs"
                >
                  登出
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn(undefined, { callbackUrl: '/app' })}
                className="btn btn-primary h-8 px-3 text-xs"
              >
                登录
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell

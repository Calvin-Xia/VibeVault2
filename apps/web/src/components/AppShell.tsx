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
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = stored === 'dark' || (!stored && prefersDark)
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
        <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="打开菜单"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold">VibeVault</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label={isDark ? '切换亮色模式' : '切换暗色模式'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Settings button */}
            <Link
              href="/app/settings"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="设置"
            >
              <Settings className="h-5 w-5" />
            </Link>

            {/* User authentication */}
            {session ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium">{session.user?.name?.charAt(0) || 'U'}</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors"
                >
                  登出
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn(undefined, { callbackUrl: '/app' })}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
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

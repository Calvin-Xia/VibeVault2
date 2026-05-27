import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import Providers from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VibeVault - 可视化链接收藏夹',
  description: '收藏、管理和可视化你的网络链接',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const stored = localStorage.getItem('theme')
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            if (stored === 'dark' || (!stored && prefersDark)) {
              document.documentElement.classList.add('dark')
            }
          } catch (e) {}
        `}} />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800`}>
        <Providers>
          {children}
          {/* Toast notifications - sonner */}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  )
}

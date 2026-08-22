import './globals.css'
import type { Metadata } from 'next'
import { Noto_Sans_SC, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import Providers from '@/components/Providers'

const notoSans = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

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
        {/* 暗夜宝库:默认暗色,除非用户显式选择亮色 */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const stored = localStorage.getItem('theme')
            if (stored === 'light') {
              document.documentElement.classList.remove('dark')
            } else {
              document.documentElement.classList.add('dark')
            }
          } catch (e) {}
        `}} />
      </head>
      <body className={`${notoSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-screen bg-background text-foreground antialiased`}>
        <div className="aurora" aria-hidden="true" />
        <Providers>
          {children}
          {/* Toast notifications - sonner */}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  )
}

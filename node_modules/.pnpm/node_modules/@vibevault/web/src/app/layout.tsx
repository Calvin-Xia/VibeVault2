import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import AppShell from '@/components/AppShell'
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
    <html lang="zh-CN">
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800`}>
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  )
}

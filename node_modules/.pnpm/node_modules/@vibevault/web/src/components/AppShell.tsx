'use client'

import React from 'react'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import Sidebar from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { data: session } = useSession()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-white/80 backdrop-blur-md dark:bg-gray-900/80 flex items-center justify-between px-4">
          <h1 className="text-xl font-semibold">VibeVault</h1>
          <div className="flex items-center gap-4">
            {/* Settings button */}
            <Link 
              href="/app/settings" 
              className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="设置"
            >
              ⚙️
            </Link>

            {/* User authentication */}
            {session ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-sm font-medium">{session.user?.name?.charAt(0) || 'U'}</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  登出
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
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

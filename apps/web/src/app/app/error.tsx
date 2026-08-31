'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import AppShell from '@/components/AppShell'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <AppShell>
      <div className="flex items-center justify-center h-full p-6">
        <div className="glass-static card rounded-2xl p-8 max-w-md w-full text-center" role="alert">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" aria-hidden="true" />
          <h2 className="text-xl font-semibold mb-2">页面出错了</h2>
          <p className="text-muted-foreground mb-6">
            发生了未知错误，请稍后重试
          </p>
          <button onClick={reset} className="btn btn-primary">
            重试
          </button>
        </div>
      </div>
    </AppShell>
  )
}

'use client'

import { useEffect } from 'react'

export default function Error({
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
    <div className="flex items-center justify-center min-h-screen">
      <div className="glass card rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold mb-2">出现了一些问题</h2>
        <p className="text-muted-foreground mb-6">
          发生了未知错误，请稍后重试
        </p>
        <button
          onClick={reset}
          className="btn btn-primary"
        >
          重试
        </button>
      </div>
    </div>
  )
}

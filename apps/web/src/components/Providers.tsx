'use client'

import React from 'react'
import { SessionProvider } from 'next-auth/react'
import { MotionConfig } from 'framer-motion'

interface ProvidersProps {
  children: React.ReactNode
}

const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <SessionProvider>
      {/* reducedMotion="user":遵循系统 prefers-reduced-motion 设置(见 DESIGN.md) */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </SessionProvider>
  )
}

export default Providers

'use client'

import { motion } from 'framer-motion'
import React from 'react'

interface RevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: 'h1' | 'h2' | 'h3' | 'div'
}

/**
 * 滚动入场容器(Text — Section H2 签名动效,DESIGN.md L2 档)。
 * fadeInUp 风格:仅 opacity/transform,0.7s cubic-bezier(.16,1,.3,1)。
 */
export function Reveal({ children, className, delay = 0, as = 'div' }: RevealProps) {
  const MotionTag = motion[as as 'div'] as typeof motion.div
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </MotionTag>
  )
}

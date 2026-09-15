'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  side?: 'left' | 'right'
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function MobileSheet({
  open,
  onOpenChange,
  children,
  side = 'left',
}: MobileSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [open])

  // 焦点管理:打开时聚焦面板内第一个可聚焦元素,关闭时恢复之前的焦点
  useEffect(() => {
    if (!open) return
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    firstFocusable?.focus()
    return () => {
      previouslyFocused?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleClose])

  // 焦点陷阱。面板标了 aria-modal="true",若不把 Tab 限制在面板内,
  // 键盘用户可以直接 Tab 到遮罩背后的页面内容,与声明的模态语义矛盾。
  const handlePanelKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return

    const panel = panelRef.current
    if (!panel) return

    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    if (focusable.length === 0) {
      e.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    if (e.shiftKey) {
      if (active === first || !(active instanceof Node) || !panel.contains(active)) {
        e.preventDefault()
        last.focus()
      }
    } else if (active === last || !(active instanceof Node) || !panel.contains(active)) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  if (!mounted) return null

  // portal 到 body:抽屉是 position:fixed,留在卡片树内会受祖先 transform /
  // `contain: layout` 影响,被当成相对该祖先定位(见 LinkGridVirtual 的列容器)。
  return createPortal(
    // 两个 motion 元素必须是 AnimatePresence 的直接子节点且各自带 key,
    // 否则 AnimatePresence 无法追踪它们,离场动画不会执行。
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overlay fixed inset-0 z-50"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {open && (
        <motion.div
          key="mobile-sheet-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="导航菜单"
          initial={{ x: side === 'left' ? '-100%' : '100%' }}
          animate={{ x: 0 }}
          exit={{ x: side === 'left' ? '-100%' : '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onKeyDown={handlePanelKeyDown}
          className={`fixed inset-y-0 z-50 w-64 bg-card text-card-foreground shadow-2xl border-border ${
            side === 'left' ? 'left-0 border-r' : 'right-0 border-l'
          }`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

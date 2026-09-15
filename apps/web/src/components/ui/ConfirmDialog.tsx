'use client'

import { useEffect, useRef, useCallback, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  isConfirming?: boolean
  variant?: 'danger' | 'default'
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  onConfirm,
  isConfirming = false,
  variant = 'default',
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  // 每个实例独立的 id,避免同页两个对话框时 aria-labelledby 指向错误的节点
  const titleId = useId()
  const descriptionId = useId()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const handleClose = useCallback(() => {
    if (!isConfirming) {
      onOpenChange(false)
    }
  }, [isConfirming, onOpenChange])

  // 焦点管理:打开时聚焦取消按钮,关闭/卸载时恢复打开前的焦点
  useEffect(() => {
    if (!open) return
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelButtonRef.current?.focus()
    return () => {
      previouslyFocused?.focus()
    }
  }, [open])

  // 键盘交互仅绑定在面板上:Escape 关闭;Tab 在面板内循环(焦点陷阱)。
  // Enter 由按钮原生处理,不再有全局 Enter 直接触发 onConfirm 的行为。
  const handlePanelKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handleClose()
        return
      }
      if (e.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusable.length === 0) return
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
    },
    [handleClose]
  )

  if (!open || !mounted) return null

  // 必须 portal 到 body:卡片所在列用了 `contain: layout`,卡片的 motion.div 又带 transform,
  // 两者都会成为 position:fixed 的包含块 —— 留在原地时 inset-0 会相对卡片列解析,
  // 对话框被定位到整列高度的中点而不是视口中央(长列表里直接跑到屏幕外)。
  return createPortal(
    <div
      className="overlay fixed inset-0 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="panel relative bg-card text-card-foreground rounded-2xl shadow-2xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
      >
        <div className="absolute top-1.5 right-1.5">
          <button
            onClick={handleClose}
            aria-label="关闭"
            className="p-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mb-4">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${
              variant === 'danger'
                ? 'bg-destructive/10'
                : 'bg-muted'
            }`}
          >
            <AlertTriangle
              className={`w-6 h-6 ${
                variant === 'danger'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            />
          </div>

          <h3
            id={titleId}
            className="text-lg font-semibold text-card-foreground mb-1"
          >
            {title}
          </h3>
          <p
            id={descriptionId}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            ref={cancelButtonRef}
            onClick={handleClose}
            disabled={isConfirming}
            className="btn btn-secondary flex-1"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={`btn flex-1 ${
              variant === 'danger' ? 'btn-destructive' : 'btn-primary'
            }`}
          >
            {isConfirming ? '处理中...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

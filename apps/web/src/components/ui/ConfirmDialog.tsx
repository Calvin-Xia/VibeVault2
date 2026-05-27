'use client'

import { useEffect, useRef, useCallback } from 'react'
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
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  isConfirming = false,
  variant = 'default',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  const handleClose = useCallback(() => {
    if (!isConfirming) {
      onOpenChange(false)
    }
  }, [isConfirming, onOpenChange])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
      if (e.key === 'Enter' && !isConfirming) {
        e.preventDefault()
        onConfirm()
      }
    },
    [handleClose, onConfirm, isConfirming]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      confirmButtonRef.current?.focus()
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative bg-card text-card-foreground rounded-xl shadow-2xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

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
            id="confirm-dialog-title"
            className="text-lg font-semibold text-card-foreground mb-1"
          >
            {title}
          </h3>
          <p
            id="confirm-dialog-description"
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isConfirming}
            className="flex-1 px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            disabled={isConfirming}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              variant === 'danger'
                ? 'text-destructive-foreground bg-destructive hover:bg-destructive/90'
                : 'text-primary-foreground bg-primary hover:bg-primary/90'
            }`}
          >
            {isConfirming ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

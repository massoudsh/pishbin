'use client'

import { useEffect, useId, useRef } from 'react'
import { fa } from '@/lib/fa'
import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = fa.common.delete, cancelLabel = fa.common.cancel, variant = 'danger', onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    dialog.showModal()
    cancelRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open])

  return (
    <dialog ref={dialogRef} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { event.preventDefault(); onCancel() }} onClick={event => { if (event.target === event.currentTarget) onCancel() }} className="glass-surface glass-elevated m-auto w-[calc(100%_-_2rem)] max-w-md p-0">
      <div className="p-6">
        <h2 id={`${id}-title`} className="text-lg font-semibold">{title}</h2>
        <p id={`${id}-description`} className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button ref={cancelRef} variant="outline" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant === 'danger' ? 'destructive' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  )
}

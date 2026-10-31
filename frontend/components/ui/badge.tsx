import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'destructive' | 'outline'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-muted text-muted-foreground',
  accent: 'bg-accent/10 text-accent dark:bg-accent/20',
  success: 'status-success',
  warning: 'status-warning',
  destructive: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  outline: 'border border-border text-foreground',
}

export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface StatProps {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  badge?: { label: ReactNode; variant?: BadgeVariant }
  valueClassName?: string
  className?: string
}

export function Stat({ label, value, hint, badge, valueClassName, className }: StatProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      </div>
      <p className={cn('mt-2 text-2xl font-semibold text-foreground', valueClassName)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}

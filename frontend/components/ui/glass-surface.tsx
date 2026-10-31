import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface GlassSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'subtle' | 'medium' | 'elevated'
}

export const GlassSurface = forwardRef<HTMLDivElement, GlassSurfaceProps>(
  ({ variant = 'medium', className, ...props }, ref) => (
    <div ref={ref} className={cn('glass-surface', `glass-${variant}`, className)} {...props} />
  )
)
GlassSurface.displayName = 'GlassSurface'

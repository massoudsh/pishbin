import { Button as NewButton, type ButtonProps as NewButtonProps } from '@/components/ui/button'

interface ButtonProps extends Omit<NewButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'danger'
}

export default function Button({ variant = 'primary', ...props }: ButtonProps) {
  return <NewButton variant={variant === 'danger' ? 'destructive' : variant} {...props} />
}


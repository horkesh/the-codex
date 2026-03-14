import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 font-body font-medium tracking-wide transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]'

const variants: Record<Variant, string> = {
  primary: 'bg-gold text-obsidian hover:bg-gold-light shadow-gold',
  ghost: 'bg-transparent text-ivory-muted hover:text-ivory hover:bg-slate-light',
  danger: 'bg-[--color-error] text-ivory hover:opacity-90',
  outline: 'border border-gold/40 text-gold hover:border-gold hover:bg-gold/5',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-[--radius-sm]',
  md: 'h-10 px-5 text-sm rounded-[--radius-md]',
  lg: 'h-12 px-6 text-base rounded-[--radius-lg]',
}

const spinnerSizes: Record<Size, 'sm' | 'md'> = { sm: 'sm', md: 'sm', lg: 'md' }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, fullWidth = false, className, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        disabled={disabled || loading}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {loading && <Spinner size={spinnerSizes[size]} className="shrink-0" />}
        {children}
      </motion.button>
    )
  },
)

Button.displayName = 'Button'

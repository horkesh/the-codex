import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type InputAs = 'input' | 'textarea'

interface InputBaseProps {
  label?: string
  error?: string
  hint?: string
  as?: InputAs
  className?: string
}

type InputProps = InputBaseProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof InputBaseProps>

type TextareaProps = InputBaseProps &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, keyof InputBaseProps>

type Props = (InputProps & { as?: 'input' }) | (TextareaProps & { as: 'textarea' })

const fieldBase =
  'w-full bg-slate-mid border border-white/10 text-ivory font-body text-sm placeholder:text-ivory-dim ' +
  'focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20 ' +
  'transition-colors duration-200 rounded-[--radius-md] px-3'

export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  Props
>((props, ref) => {
  const { label, error, hint, as: asEl = 'input', className, ...rest } = props

  const fieldClass = cn(fieldBase, error && 'border-[--color-error]/60', className)

  return (
    <div className="flex flex-col w-full">
      {label && (
        <label className="text-ivory-muted text-xs uppercase tracking-widest mb-1 font-body">
          {label}
        </label>
      )}

      {asEl === 'textarea' ? (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className={cn(fieldClass, 'py-2.5 resize-y min-h-[96px]')}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          className={cn(fieldClass, 'h-10')}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error && (
        <p className="text-[--color-error] text-xs mt-1 font-body">{error}</p>
      )}
      {hint && !error && (
        <p className="text-ivory-dim text-xs mt-1 font-body">{hint}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

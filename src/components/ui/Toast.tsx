import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui'

type ToastType = 'info' | 'success' | 'error'

const iconMap: Record<ToastType, React.ReactNode> = {
  info: <Info size={16} className="text-gold shrink-0" />,
  success: <CheckCircle size={16} className="text-[--color-success] shrink-0" />,
  error: <XCircle size={16} className="text-[--color-error] shrink-0" />,
}

const toastVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.97 },
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[9998] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'pointer-events-auto',
              'bg-slate-light border border-white/10 rounded-lg px-4 py-3',
              'flex items-center gap-3 text-sm text-ivory',
              'shadow-[--shadow-modal]',
            )}
            role="alert"
          >
            {iconMap[toast.type as ToastType]}
            <span className="flex-1 font-body leading-snug">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-ivory-dim hover:text-ivory transition-colors duration-150 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

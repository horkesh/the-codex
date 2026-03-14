import { BottomNav } from './BottomNav'
import { ToastContainer } from '@/components/ui/Toast'

interface ShellProps {
  children: React.ReactNode
}

/**
 * Main application shell.
 * Wraps all protected routes. Pages control their own TopBar and PageWrapper
 * internally; Shell provides the persistent chrome (BottomNav, ToastContainer)
 * and the full-screen obsidian canvas.
 */
export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-dvh bg-obsidian flex flex-col relative">
      {/* Page content — flex-1 so it fills between top and bottom chrome */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {children}
      </div>

      {/* Persistent bottom navigation */}
      <BottomNav />

      {/* Toast notifications — fixed, sits above everything */}
      <ToastContainer />
    </div>
  )
}

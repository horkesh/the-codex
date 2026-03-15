import { ToastContainer } from '@/components/ui/Toast'

interface ShellProps {
  children: React.ReactNode
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="h-dvh bg-obsidian flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {children}
      </div>
      <ToastContainer />
    </div>
  )
}

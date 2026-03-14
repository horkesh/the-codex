import { create } from 'zustand'

type ToastType = 'info' | 'success' | 'error'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface UIState {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

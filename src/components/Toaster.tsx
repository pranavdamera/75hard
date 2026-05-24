'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

interface Toast {
  id: string
  message: string
  exiting: boolean
}

interface ToastCtx {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 180)
  }, [])

  const showToast = useCallback((message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-3), { id, message, exiting: false }])

    const timer = setTimeout(() => dismiss(id), 4200)
    timers.current.set(id, timer)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 inset-x-4 z-[200] flex flex-col items-end gap-2 pointer-events-none"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className={[
              'pointer-events-auto max-w-sm w-full',
              'flex items-center gap-3 px-4 py-3',
              'bg-surface-2 border border-border rounded-xl shadow-xl',
              'text-sm text-foreground',
              t.exiting ? 'toast-exit' : 'toast-enter',
            ].join(' ')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-muted hover:text-foreground transition-colors shrink-0 text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

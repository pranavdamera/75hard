'use client'

import { ToastProvider } from './Toaster'

export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

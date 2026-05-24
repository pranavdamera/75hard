'use client'

import { useState, useEffect } from 'react'

interface ProgressBarProps {
  completed: number
  total?: number
}

export default function ProgressBar({ completed, total = 7 }: ProgressBarProps) {
  const [animated, setAnimated] = useState(false)
  const safeTotal = total > 0 ? total : 7
  const pct       = Math.min(100, Math.round((completed / safeTotal) * 100))
  const allDone   = completed >= safeTotal

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          Daily Progress
        </span>
        <span className={[
          'text-sm font-bold tabular-nums transition-colors duration-300',
          allDone ? 'text-success' : 'text-foreground',
        ].join(' ')}>
          {completed}/{safeTotal}
          {allDone && <span className="ml-1">🔥</span>}
        </span>
      </div>

      <div className="h-2.5 rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width:      animated ? `${pct}%` : '0%',
            transition: 'width 0.75s cubic-bezier(0.4, 0, 0.2, 1)',
            background: allDone
              ? 'var(--success)'
              : 'linear-gradient(90deg, #ea6100 0%, var(--primary) 60%, rgba(249,115,22,0.75) 100%)',
            boxShadow: pct > 4
              ? allDone
                ? '0 0 12px rgba(34,197,94,0.55)'
                : '0 0 12px rgba(249,115,22,0.5)'
              : 'none',
          }}
        />
      </div>
    </div>
  )
}

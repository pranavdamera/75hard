'use client'

import { useState, useEffect } from 'react'
import type { ChallengeInfo } from '@/lib/utils'

interface DayStatusProps {
  info: ChallengeInfo
  displayName?: string | null
}

const RADIUS = 44
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function DayStatus({ info, displayName }: DayStatusProps) {
  const [animated, setAnimated] = useState(false)
  const name = displayName ? `, ${displayName.split(' ')[0]}` : ''

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(id)
  }, [])

  if (info.status === 'no_start_date') {
    return (
      <div className="text-center py-6">
        <p className="text-3xl font-black mb-1">Ready to go?</p>
        <p className="text-sm text-muted">Set your start date in Settings to begin.</p>
      </div>
    )
  }

  if (info.status === 'not_started') {
    return (
      <div className="text-center py-6">
        <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">
          Challenge starts in
        </p>
        <p className="text-6xl font-black text-primary leading-none">{info.daysUntilStart}</p>
        <p className="text-sm text-muted mt-1 font-medium">{info.daysUntilStart === 1 ? 'day' : 'days'}</p>
      </div>
    )
  }

  if (info.status === 'complete') {
    return (
      <div className="text-center py-6">
        <p className="text-4xl mb-2">🏆</p>
        <p className="text-2xl font-black text-success">Challenge Complete!</p>
        <p className="text-sm text-muted mt-1">75 days done{name}. Legendary.</p>
      </div>
    )
  }

  // in_progress
  const progressPct = (info.dayNumber / 75) * 100
  const offset = CIRCUMFERENCE - (progressPct / 100) * CIRCUMFERENCE

  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative inline-flex items-center justify-center">
        {/* SVG ring */}
        <svg
          width="148"
          height="148"
          viewBox="0 0 120 120"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Track */}
          <circle
            cx="60" cy="60" r={RADIUS}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Progress */}
          <circle
            cx="60" cy="60" r={RADIUS}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={animated ? offset : CIRCUMFERENCE}
            style={{
              transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: 'drop-shadow(0 0 4px rgba(249,115,22,0.5))',
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
          <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Day</span>
          <span className="text-5xl font-black text-primary leading-none tabular-nums">
            {info.dayNumber}
          </span>
          <span className="text-sm text-muted font-semibold leading-tight">of 75</span>
        </div>
      </div>

      <p className="text-xs text-muted mt-1 font-medium">
        {info.daysRemaining} day{info.daysRemaining === 1 ? '' : 's'} remaining
      </p>
    </div>
  )
}

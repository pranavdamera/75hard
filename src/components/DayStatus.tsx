import type { ChallengeInfo } from '@/lib/utils'

interface DayStatusProps {
  info: ChallengeInfo
  displayName?: string | null
}

export default function DayStatus({ info, displayName }: DayStatusProps) {
  const name = displayName ? `, ${displayName.split(' ')[0]}` : ''

  if (info.status === 'no_start_date') {
    return (
      <div className="text-center py-4">
        <p className="text-muted text-sm mb-1">Set your start date in Settings to begin.</p>
        <p className="text-2xl font-black">Ready to go?</p>
      </div>
    )
  }

  if (info.status === 'not_started') {
    return (
      <div className="text-center py-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
          Challenge starts in
        </p>
        <p className="text-5xl font-black text-primary">{info.daysUntilStart}</p>
        <p className="text-muted text-sm mt-1">{info.daysUntilStart === 1 ? 'day' : 'days'}</p>
      </div>
    )
  }

  if (info.status === 'complete') {
    return (
      <div className="text-center py-4">
        <p className="text-4xl mb-2">🏆</p>
        <p className="text-2xl font-black text-success">Challenge Complete!</p>
        <p className="text-muted text-sm mt-1">You finished 75 Hard{name}. Legendary.</p>
      </div>
    )
  }

  // in_progress
  const progressPct = Math.round((info.dayNumber / 75) * 100)

  return (
    <div className="text-center py-4">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
        Day
      </p>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-6xl font-black text-primary leading-none">{info.dayNumber}</span>
        <span className="text-2xl font-bold text-muted">/75</span>
      </div>
      {/* Mini ring progress */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <div className="w-32 h-1.5 rounded-full bg-surface-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs text-muted">{info.daysRemaining}d left</span>
      </div>
    </div>
  )
}

import { getChallengeInfo } from '@/lib/utils'
import type { Profile, DailyLog } from '@/types/database'

interface FriendCardProps {
  friend: Profile
  todayLog: Partial<DailyLog> | null
  compact?: boolean
}

const TASK_KEYS = [
  'workout_1_done', 'workout_2_done', 'outdoor_workout_done',
  'diet_done', 'water_done', 'reading_done', 'progress_photo_done', 'no_alcohol_cheat_done',
] as const

function countDone(log: Partial<DailyLog> | null): number {
  if (!log) return 0
  return TASK_KEYS.filter((k) => log[k] === true).length
}

export default function FriendCard({ friend, todayLog, compact = false }: FriendCardProps) {
  const info = getChallengeInfo(friend.start_date)
  const done = countDone(todayLog)
  const allDone = done === 8
  const hasStarted = done > 0

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface border border-border">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: 'rgba(249,115,22,0.12)', color: 'var(--primary)' }}
        >
          {(friend.display_name ?? friend.email)[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {friend.display_name ?? friend.email.split('@')[0]}
          </p>
          <p className="text-xs text-muted">
            {info.status === 'in_progress' ? `Day ${info.dayNumber}` : info.status === 'not_started' ? 'Not started' : 'Done'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={['text-sm font-semibold tabular-nums', allDone ? 'text-success' : 'text-foreground'].join(' ')}>
            {done}/8
          </span>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: allDone ? 'var(--success)' : hasStarted ? 'var(--warning)' : 'var(--border)' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
          style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--primary)' }}
        >
          {(friend.display_name ?? friend.email)[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {friend.display_name ?? friend.email.split('@')[0]}
          </p>
          <p className="text-sm text-muted truncate">{friend.email}</p>
        </div>
        {info.status === 'in_progress' && (
          <div className="text-right shrink-0">
            <p className="text-xs text-muted">Day</p>
            <p className="text-2xl font-black text-primary leading-none">{info.dayNumber}</p>
          </div>
        )}
      </div>

      {/* Today's progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted uppercase tracking-wider font-semibold">Today</span>
          <span className={['text-sm font-bold', allDone ? 'text-success' : ''].join(' ')}>
            {done}/8 {allDone && '🔥'}
          </span>
        </div>
        {/* Mini task dots */}
        <div className="flex gap-1.5 flex-wrap">
          {TASK_KEYS.map((key) => (
            <div
              key={key}
              className="w-5 h-5 rounded-full"
              style={{
                background: todayLog?.[key]
                  ? 'var(--success)'
                  : 'var(--surface-3)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(done / 8) * 100}%`,
            background: allDone ? 'var(--success)' : 'var(--primary)',
          }}
        />
      </div>
    </div>
  )
}

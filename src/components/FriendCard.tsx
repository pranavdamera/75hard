import { getChallengeInfo, countCompleted } from '@/lib/utils'
import type { Profile, DailyLog } from '@/types/database'

interface FriendCardProps {
  friend: Profile
  todayLog: Partial<DailyLog> | null
  compact?: boolean
}

const TOTAL = 7

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const letter = name[0].toUpperCase()
  const dim    = size === 'sm' ? 'w-9 h-9 text-sm' : 'w-12 h-12 text-lg'
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-black shrink-0`}
      style={{
        background: 'linear-gradient(135deg, rgba(249,115,22,0.25) 0%, rgba(249,115,22,0.1) 100%)',
        color: 'var(--primary)',
        border: '1px solid rgba(249,115,22,0.2)',
      }}
    >
      {letter}
    </div>
  )
}

export default function FriendCard({ friend, todayLog, compact = false }: FriendCardProps) {
  const info       = getChallengeInfo(friend.start_date)
  const done       = countCompleted(todayLog ?? {})
  const allDone    = done >= TOTAL
  const hasStarted = done > 0
  const pct        = Math.min(100, Math.round((done / TOTAL) * 100))
  const displayName = friend.display_name ?? friend.email.split('@')[0]

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-surface border border-border/60 hover:border-border transition-colors">
        <Avatar name={displayName} size="sm" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{displayName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1 rounded-full bg-surface-3 overflow-hidden max-w-[60px]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: allDone ? 'var(--success)' : 'var(--primary)',
                }}
              />
            </div>
            <p className="text-[10px] text-muted">
              {info.status === 'in_progress' ? `Day ${info.dayNumber}` :
               info.status === 'not_started' ? 'Not started' : 'Done'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={[
            'text-sm font-bold tabular-nums',
            allDone ? 'text-success' : hasStarted ? 'text-foreground' : 'text-muted',
          ].join(' ')}>
            {done}/{TOTAL}
          </span>
          <div
            className="w-2 h-2 rounded-full transition-colors duration-300"
            style={{
              background: allDone    ? 'var(--success)'
                        : hasStarted ? 'var(--primary)'
                        :              'var(--surface-3)',
              boxShadow:  allDone    ? '0 0 6px rgba(34,197,94,0.5)'
                        : hasStarted ? '0 0 6px rgba(249,115,22,0.4)'
                        :              'none',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl bg-surface border border-border/60 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar name={displayName} />
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{displayName}</p>
          <p className="text-xs text-muted truncate">{friend.email}</p>
        </div>
        {info.status === 'in_progress' && (
          <div className="text-right shrink-0 bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
            <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Day</p>
            <p className="text-2xl font-black text-primary leading-none">{info.dayNumber}</p>
          </div>
        )}
      </div>

      {/* Today's progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted uppercase tracking-widest font-semibold">Today</span>
          <span className={['text-sm font-bold tabular-nums', allDone ? 'text-success' : ''].join(' ')}>
            {done}/{TOTAL} {allDone && '🔥'}
          </span>
        </div>

        {/* Task dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-all duration-300"
              style={{
                background: i < done
                  ? allDone ? 'var(--success)' : 'var(--primary)'
                  : 'var(--surface-3)',
                boxShadow: i < done && allDone
                  ? '0 0 4px rgba(34,197,94,0.4)'
                  : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

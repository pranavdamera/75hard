interface ProgressBarProps {
  completed: number
  total?: number
}

export default function ProgressBar({ completed, total = 8 }: ProgressBarProps) {
  const pct = Math.round((completed / total) * 100)
  const allDone = completed === total

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          Daily Progress
        </span>
        <span
          className={[
            'text-sm font-bold',
            allDone ? 'text-success' : 'text-foreground',
          ].join(' ')}
        >
          {completed}/{total}
          {allDone && ' 🔥'}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: allDone
              ? 'var(--success)'
              : `linear-gradient(90deg, var(--primary) 0%, rgba(249,115,22,0.7) 100%)`,
          }}
        />
      </div>
    </div>
  )
}

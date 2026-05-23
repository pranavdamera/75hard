'use client'

import { TASK_KEYS, TASK_LABELS, type TaskKey, type DailyLog } from '@/types/database'
import { cn } from '@/lib/utils'

interface DailyChecklistProps {
  log: Partial<DailyLog>
  onToggle: (key: TaskKey) => void
  disabled?: boolean
  isPhotoTask?: (key: TaskKey) => boolean
  onPhotoTaskClick?: () => void
}

export default function DailyChecklist({
  log,
  onToggle,
  disabled,
  isPhotoTask,
  onPhotoTaskClick,
}: DailyChecklistProps) {
  return (
    <div className="space-y-2.5">
      {TASK_KEYS.map((key) => {
        const done = log[key] === true
        const meta = TASK_LABELS[key]
        const isPhoto = isPhotoTask?.(key) ?? false

        return (
          <button
            key={key}
            onClick={() => {
              if (isPhoto && !done && onPhotoTaskClick) {
                onPhotoTaskClick()
              } else {
                onToggle(key)
              }
            }}
            disabled={disabled}
            className={cn(
              'task-card w-full flex items-center gap-4 p-4 rounded-xl border text-left',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              done
                ? 'bg-success/8 border-success/30'
                : 'bg-surface border-border hover:border-surface-3 active:scale-[0.99]'
            )}
            style={
              done
                ? { background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)' }
                : undefined
            }
          >
            {/* Emoji */}
            <span className="text-2xl shrink-0 w-8 text-center">{meta.emoji}</span>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-semibold leading-tight',
                  done ? 'text-success' : 'text-foreground'
                )}
              >
                {meta.label}
              </p>
              <p className="text-xs text-muted mt-0.5 leading-snug">{meta.description}</p>
            </div>

            {/* Checkbox */}
            <div
              className={cn(
                'w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                done ? 'border-success bg-success' : 'border-border bg-transparent'
              )}
            >
              {done && (
                <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="#000"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

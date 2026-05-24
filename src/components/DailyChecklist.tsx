'use client'

import { TASK_KEYS, TASK_LABELS, type TaskKey, type DailyLog } from '@/types/database'
import { cn } from '@/lib/utils'

interface DailyChecklistProps {
  log: Partial<DailyLog>
  onToggle: (key: TaskKey) => void
  disabled?: boolean
  onPhotoUploadClick?: () => void
}

export default function DailyChecklist({
  log,
  onToggle,
  disabled,
  onPhotoUploadClick,
}: DailyChecklistProps) {
  return (
    <div className="space-y-2.5">
      {TASK_KEYS.map((key) => {
        const done = log[key] === true
        const meta = TASK_LABELS[key]
        const isPhoto = key === 'progress_photo_done'

        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
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
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted leading-snug">{meta.description}</p>
                {isPhoto && onPhotoUploadClick && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onPhotoUploadClick() }}
                    className="text-[10px] text-primary hover:underline shrink-0"
                  >
                    upload
                  </button>
                )}
              </div>
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

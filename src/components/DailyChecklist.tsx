'use client'

import { TASK_KEYS, TASK_LABELS, type TaskKey, type DailyLog } from '@/types/database'

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
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
      {TASK_KEYS.map((key) => {
        const done = log[key] === true
        const meta = TASK_LABELS[key]
        const isPhoto = key === 'progress_photo_done'

        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            disabled={disabled}
            className={[
              'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
              done ? 'bg-surface' : 'bg-surface hover:bg-surface-2 active:bg-surface-3',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {/* Check */}
            <div
              className={[
                'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all duration-150',
                done ? 'bg-success border-success' : 'border-border',
              ].join(' ')}
            >
              {done && (
                <svg viewBox="0 0 10 10" fill="none" className="w-3 h-3">
                  <path
                    d="M2 5l2 2 4-4"
                    stroke="#000"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            {/* Label */}
            <span
              className={[
                'flex-1 text-sm font-medium transition-colors',
                done ? 'text-muted line-through' : 'text-foreground',
              ].join(' ')}
            >
              {meta.label}
            </span>

            {/* Photo upload link */}
            {isPhoto && onPhotoUploadClick && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onPhotoUploadClick() }}
                className="text-[11px] text-primary hover:underline shrink-0 pr-1"
              >
                {done ? 'view' : 'upload'}
              </button>
            )}

            {/* Emoji hint */}
            <span className="text-sm opacity-30 shrink-0">{meta.emoji}</span>
          </button>
        )
      })}
    </div>
  )
}

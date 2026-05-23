'use client'

import { useMemo } from 'react'
import { cn, addDays, getLocalToday, countCompleted } from '@/lib/utils'
import type { DailyLog } from '@/types/database'

interface CalendarGridProps {
  startDate: string
  logs: DailyLog[]
  onSelectDay?: (date: string) => void
}

type DayStatus = 'complete' | 'partial' | 'failed' | 'today' | 'future' | 'pre-start'

function getDayStatus(date: string, log: Partial<DailyLog> | undefined, today: string): DayStatus {
  if (date > today) return 'future'
  const done = log ? countCompleted(log) : 0
  if (date === today) {
    if (done === 8) return 'complete'
    return 'today'
  }
  // Past day
  if (done === 8) return 'complete'
  if (done > 0) return 'partial'
  return 'failed'
}

const STATUS_STYLES: Record<DayStatus, string> = {
  complete:   'bg-success text-black font-bold',
  partial:    'bg-warning text-black font-bold',
  failed:     'bg-danger/80 text-white font-bold',
  today:      'border-2 border-primary text-primary font-bold',
  future:     'bg-surface text-muted',
  'pre-start':'bg-surface-2 text-muted/40',
}

export default function CalendarGrid({ startDate, logs, onSelectDay }: CalendarGridProps) {
  const today = getLocalToday()
  const logMap = useMemo(() => new Map(logs.map((l) => [l.log_date, l])), [logs])

  const days = useMemo(() => {
    return Array.from({ length: 75 }, (_, i) => {
      const date = addDays(startDate, i)
      const log = logMap.get(date)
      const status = getDayStatus(date, log, today)
      const done = log ? countCompleted(log) : 0
      return { date, dayNum: i + 1, status, done }
    })
  }, [startDate, logMap, today])

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {/* Day-of-week headers */}
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
        <div key={i} className="text-center text-[10px] text-muted font-semibold pb-1">
          {d}
        </div>
      ))}

      {/* Offset cells for the first week */}
      {Array.from({ length: new Date(startDate + 'T00:00:00').getDay() }, (_, i) => (
        <div key={`pre-${i}`} />
      ))}

      {days.map(({ date, dayNum, status }) => (
        <button
          key={date}
          onClick={() => onSelectDay?.(date)}
          disabled={status === 'future' || status === 'pre-start'}
          className={cn(
            'aspect-square rounded-lg flex items-center justify-center text-xs transition-all',
            STATUS_STYLES[status],
            status !== 'future' && status !== 'pre-start' && 'hover:opacity-80 active:scale-95',
          )}
          title={date}
        >
          {dayNum}
        </button>
      ))}
    </div>
  )
}

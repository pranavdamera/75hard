import type { DailyLog } from '@/types/database'

// ── Date helpers ──────────────────────────────────────────────

export function formatDate(date: Date): string {
  // Returns YYYY-MM-DD in local time (avoids UTC offset shifting the date)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getLocalToday(): string {
  return formatDate(new Date())
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

export function isPast(dateStr: string): boolean {
  return dateStr < getLocalToday()
}

export function isFuture(dateStr: string): boolean {
  return dateStr > getLocalToday()
}

// ── Challenge status ──────────────────────────────────────────

export type ChallengeStatus = 'no_start_date' | 'not_started' | 'in_progress' | 'complete'

export interface ChallengeInfo {
  status: ChallengeStatus
  dayNumber: number        // 1-75 during challenge, 0 if not started
  daysRemaining: number
  daysUntilStart: number
  startDate: string | null
  endDate: string | null
}

export function getChallengeInfo(startDate: string | null): ChallengeInfo {
  if (!startDate) {
    return {
      status: 'no_start_date',
      dayNumber: 0,
      daysRemaining: 75,
      daysUntilStart: 0,
      startDate: null,
      endDate: null,
    }
  }

  const start = new Date(startDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffMs = today.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const dayNumber = diffDays + 1

  const endDate = formatDate(new Date(start.getTime() + 74 * 24 * 60 * 60 * 1000))

  if (dayNumber < 1) {
    return {
      status: 'not_started',
      dayNumber: 0,
      daysRemaining: 75,
      daysUntilStart: Math.abs(diffDays),
      startDate,
      endDate,
    }
  }

  if (dayNumber > 75) {
    return {
      status: 'complete',
      dayNumber: 75,
      daysRemaining: 0,
      daysUntilStart: 0,
      startDate,
      endDate,
    }
  }

  return {
    status: 'in_progress',
    dayNumber,
    daysRemaining: 75 - dayNumber,
    daysUntilStart: 0,
    startDate,
    endDate,
  }
}

// ── Log helpers ───────────────────────────────────────────────

const TASK_KEYS = [
  'workout_1_done',
  'workout_2_done',
  'outdoor_workout_done',
  'diet_done',
  'water_done',
  'reading_done',
  'progress_photo_done',
  'no_alcohol_cheat_done',
] as const

export function countCompleted(log: Partial<DailyLog>): number {
  return TASK_KEYS.filter((k) => log[k] === true).length
}

export function isFullyComplete(log: Partial<DailyLog>): boolean {
  return countCompleted(log) === 8
}

// ── Streak calculator ─────────────────────────────────────────

export function computeStreak(
  logs: Pick<DailyLog, 'log_date' | 'workout_1_done' | 'workout_2_done' | 'outdoor_workout_done' | 'diet_done' | 'water_done' | 'reading_done' | 'progress_photo_done' | 'no_alcohol_cheat_done'>[],
  startDate: string
): number {
  const today = getLocalToday()
  const logMap = new Map(logs.map((l) => [l.log_date, l]))
  let streak = 0
  let cursor = today

  // Walk backwards from today until we hit a gap or the start
  while (cursor >= startDate) {
    const log = logMap.get(cursor)
    if (log && isFullyComplete(log)) {
      streak++
    } else if (cursor < today) {
      // Past day was incomplete — streak broken
      break
    }
    cursor = addDays(cursor, -1)
  }

  return streak
}

// ── CSS utility ───────────────────────────────────────────────

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

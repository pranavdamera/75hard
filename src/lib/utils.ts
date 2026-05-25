import type { DailyLog, ChallengeTask } from '@/types/database'
import { TASK_KEYS, TASK_TO_LOG_KEY } from '@/types/database'

// ── Date helpers ──────────────────────────────────────────────

export function formatDate(date: Date): string {
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
  dayNumber: number
  daysRemaining: number
  daysUntilStart: number
  startDate: string | null
  endDate: string | null
}

export function getChallengeInfo(startDate: string | null): ChallengeInfo {
  if (!startDate) {
    return { status: 'no_start_date', dayNumber: 0, daysRemaining: 75, daysUntilStart: 0, startDate: null, endDate: null }
  }

  const start = new Date(startDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const dayNumber = diffDays + 1
  const endDate = formatDate(new Date(start.getTime() + 74 * 24 * 60 * 60 * 1000))

  if (dayNumber < 1) {
    return { status: 'not_started', dayNumber: 0, daysRemaining: 75, daysUntilStart: Math.abs(diffDays), startDate, endDate }
  }
  if (dayNumber > 75) {
    return { status: 'complete', dayNumber: 75, daysRemaining: 0, daysUntilStart: 0, startDate, endDate }
  }
  return { status: 'in_progress', dayNumber, daysRemaining: 75 - dayNumber, daysUntilStart: 0, startDate, endDate }
}

// ── Log helpers ───────────────────────────────────────────────

export function countCompleted(log: Partial<DailyLog>, tasks?: ChallengeTask[]): number {
  if (tasks && tasks.length > 0) {
    return tasks
      .filter(t => t.enabled)
      .filter(t => log[TASK_TO_LOG_KEY[t.task_key]] === true)
      .length
  }
  // Fallback: count all 7 standard fields
  return TASK_KEYS.filter(k => log[k] === true).length
}

export function isFullyComplete(log: Partial<DailyLog>, tasks?: ChallengeTask[]): boolean {
  const total = tasks ? tasks.filter(t => t.enabled).length : 7
  return countCompleted(log, tasks) >= total && total > 0
}

export function totalEnabled(tasks?: ChallengeTask[]): number {
  if (!tasks || tasks.length === 0) return 7
  return tasks.filter(t => t.enabled).length
}

// ── Streak calculator ─────────────────────────────────────────

export function computeStreak(
  logs: Array<Partial<DailyLog> & { log_date: string }>,
  startDate: string,
  tasks?: ChallengeTask[]
): number {
  const today = getLocalToday()
  const logMap = new Map(logs.map(l => [l.log_date, l]))
  let streak = 0
  let cursor = today

  while (cursor >= startDate) {
    const log = logMap.get(cursor)
    if (log && isFullyComplete(log, tasks)) {
      streak++
    } else if (cursor < today) {
      break
    }
    cursor = addDays(cursor, -1)
  }

  return streak
}

// ── Motivational microcopy ────────────────────────────────────

export function getMicrocopy(completed: number, total: number): string {
  if (total === 0) return 'Set up your tasks in settings.'
  if (completed === 0) return 'Start the day strong.'
  if (completed >= total) return 'Day complete. Locked in.'
  if (completed / total >= 0.5) return 'Almost locked in.'
  return 'Stack the small wins.'
}

export interface FriendStatusPill {
  label: string
  classes: string
}

export function getFriendStatusPill(done: number, total: number): FriendStatusPill {
  if (total > 0 && done >= total) {
    return { label: 'Locked In', classes: 'text-success bg-success/10 border border-success/25' }
  }
  if (done > 0) {
    return { label: 'In Progress', classes: 'text-primary bg-primary/10 border border-primary/20' }
  }
  return { label: 'Needs Push', classes: 'text-muted bg-surface-3 border border-border' }
}

// ── Nutrition calculations (Mifflin-St Jeor) ─────────────────

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary:    1.2,
  light:        1.375,
  moderate:     1.55,
  very_active:  1.725,
  athlete:      1.9,
}

export interface NutritionResult {
  bmr: number
  maintenance: number
  targetCalories: number
  proteinG: number
  fatG: number
  carbsG: number
  explanation: string
}

export function calcNutrition(params: {
  weightLbs: number
  heightInches: number
  age: number
  sex: string
  activityLevel: string
  goalType: string
}): NutritionResult {
  const { weightLbs, heightInches, age, sex, activityLevel, goalType } = params

  const weightKg = weightLbs / 2.2046
  const heightCm = heightInches * 2.54

  const bmr = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55
  const maintenance = Math.round(bmr * multiplier)

  let targetCalories: number
  let explanation: string

  switch (goalType) {
    case 'cut':
      targetCalories = Math.round(maintenance - 450)
      explanation = 'Deficit of ~450 kcal/day for steady fat loss (~0.9 lb/week).'
      break
    case 'lean_bulk':
      targetCalories = Math.round(maintenance + 250)
      explanation = 'Surplus of ~250 kcal/day for lean muscle gain with minimal fat.'
      break
    case 'strength':
      targetCalories = Math.round(maintenance + 150)
      explanation = 'Small surplus supports performance, strength, and recovery.'
      break
    default: // maintain / recomp
      targetCalories = maintenance
      explanation = 'Eating at maintenance. Body recomposition happens through training stimulus.'
  }

  const proteinPerLb = goalType === 'lean_bulk' ? 0.9 : 0.95
  const fatPerLb = 0.35

  const proteinG = Math.round(weightLbs * proteinPerLb)
  const fatG = Math.round(weightLbs * fatPerLb)
  const carbsG = Math.max(0, Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4))

  return { bmr: Math.round(bmr), maintenance, targetCalories, proteinG, fatG, carbsG, explanation }
}

// ── CSS utility ───────────────────────────────────────────────

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

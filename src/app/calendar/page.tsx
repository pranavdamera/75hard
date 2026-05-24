'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import CalendarGrid from '@/components/CalendarGrid'
import {
  getChallengeInfo,
  countCompleted,
  computeStreak,
  addDays,
  getLocalToday,
  totalEnabled,
  isFullyComplete,
} from '@/lib/utils'
import { TASK_META, TASK_TO_LOG_KEY, type ChallengeTask, type ChallengeTaskKey } from '@/types/database'
import type { Profile, DailyLog } from '@/types/database'

interface DayDetail {
  date: string
  log: DailyLog | null
}

// ── Day detail drawer ──────────────────────────────────────────────────────

function DayDetailDrawer({
  detail,
  tasks,
  onClose,
}: {
  detail: DayDetail
  tasks: ChallengeTask[]
  onClose: () => void
}) {
  const { date, log } = detail
  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  const enabledTasks = tasks.filter(t => t.enabled).sort((a, b) => a.sort_order - b.sort_order)

  const hasMeals = log && (log.breakfast || log.lunch || log.dinner || log.snacks)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-surface border-t border-border">
        <div className="sticky top-0 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-semibold">{displayDate}</p>
            {log && (
              <p className="text-xs text-muted">
                {countCompleted(log, tasks)}/{totalEnabled(tasks)} tasks completed
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-5 space-y-5 pb-8">
          {/* Tasks */}
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {enabledTasks.map(task => {
              const doneKey = TASK_TO_LOG_KEY[task.task_key as ChallengeTaskKey]
              const done    = log?.[doneKey] === true
              const meta    = TASK_META[task.task_key as ChallengeTaskKey]

              const notesKey = task.task_key === 'indoor_workout'  ? 'indoor_workout_notes'
                             : task.task_key === 'outdoor_workout' ? 'outdoor_workout_notes'
                             : null
              const minsKey  = task.task_key === 'indoor_workout'  ? 'indoor_workout_minutes'
                             : task.task_key === 'outdoor_workout' ? 'outdoor_workout_minutes'
                             : null

              const noteVal = notesKey && log ? (log[notesKey as keyof DailyLog] as string | null) : null
              const minsVal = minsKey  && log ? (log[minsKey  as keyof DailyLog] as number | null) : null

              return (
                <div key={task.id} className="px-4 py-3 flex items-start gap-3">
                  <div className={[
                    'w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center',
                    done ? 'bg-success border-success' : 'border-border',
                  ].join(' ')}>
                    {done && (
                      <svg viewBox="0 0 10 10" fill="none" className="w-3 h-3">
                        <path d="M2 5l2 2 4-4" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={['text-sm font-medium', done ? 'text-foreground' : 'text-muted'].join(' ')}>
                      {meta.emoji} {task.task_label}
                    </p>
                    {minsVal != null && (
                      <p className="text-xs text-muted mt-0.5">{minsVal} min</p>
                    )}
                    {noteVal && (
                      <p className="text-xs text-muted mt-0.5">{noteVal}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Meal log */}
          {hasMeals && (
            <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Meals</p>
              {log?.breakfast && <p className="text-sm"><span className="text-muted">B: </span>{log.breakfast}</p>}
              {log?.lunch     && <p className="text-sm"><span className="text-muted">L: </span>{log.lunch}</p>}
              {log?.dinner    && <p className="text-sm"><span className="text-muted">D: </span>{log.dinner}</p>}
              {log?.snacks    && <p className="text-sm"><span className="text-muted">S: </span>{log.snacks}</p>}
            </div>
          )}

          {/* General notes */}
          {log?.notes && (
            <div className="p-4 rounded-xl bg-surface-2 border border-border">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Notes</p>
              <p className="text-sm">{log.notes}</p>
            </div>
          )}

          {/* Progress photo */}
          {log?.photo_url && (
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Progress Photo</p>
              <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-border">
                <Image src={log.photo_url} alt="Progress photo" fill className="object-cover" unoptimized />
              </div>
            </div>
          )}

          {!log && (
            <p className="text-sm text-muted text-center py-4">No activity logged for this day.</p>
          )}

          {/* Action */}
          <Link
            href={`/dashboard?date=${date}`}
            className="block w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold text-center hover:opacity-90 transition-opacity"
          >
            View / Edit in Dashboard
          </Link>
        </div>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const supabase = createClient()

  const [profile,     setProfile]     = useState<Profile | null>(null)
  const [logs,        setLogs]        = useState<DailyLog[]>([])
  const [tasks,       setTasks]       = useState<ChallengeTask[]>([])
  const [loading,     setLoading]     = useState(true)
  const [dayDetail,   setDayDetail]   = useState<DayDetail | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData) return
      setProfile(profileData)

      const { data: tasksData } = await supabase
        .from('challenge_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order')

      setTasks(tasksData ?? [])

      if (!profileData.start_date) {
        setLoading(false)
        return
      }

      const endDate = addDays(profileData.start_date, 74)
      const { data: logsData } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', profileData.start_date)
        .lte('log_date', endDate)

      setLogs(logsData ?? [])
      setLoading(false)
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSelectDay(date: string) {
    const log = logs.find(l => l.log_date === date) ?? null
    setDayDetail({ date, log })
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    )
  }

  const info     = getChallengeInfo(profile?.start_date ?? null)
  const today    = getLocalToday()
  const total    = totalEnabled(tasks)

  const completedDays = logs.filter(l => l.log_date < today && isFullyComplete(l, tasks)).length
  const partialDays   = logs.filter(l => {
    const n = countCompleted(l, tasks)
    return l.log_date < today && n > 0 && n < total
  }).length
  const daysPassed = Math.max(0,
    info.status === 'in_progress' ? info.dayNumber - 1 :
    info.status === 'complete'    ? 75 : 0
  )
  const failedDays = Math.max(0, daysPassed - completedDays - partialDays)
  const streak     = profile?.start_date ? computeStreak(logs, profile.start_date, tasks) : 0

  // Photos gallery data
  const photoLogs = logs.filter(l => l.photo_url).sort((a, b) => a.log_date.localeCompare(b.log_date))

  if (!profile?.start_date || info.status === 'no_start_date') {
    return (
      <div className="min-h-dvh bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="max-w-lg mx-auto">
            <h1 className="text-lg font-black text-primary">Calendar</h1>
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <p className="text-2xl mb-3">📅</p>
          <p className="font-semibold mb-2">No start date set</p>
          <p className="text-sm text-muted mb-6">Set your start date in Settings to see your calendar.</p>
          <a href="/settings" className="inline-block px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity">
            Go to Settings
          </a>
        </div>
        <Nav />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-black text-primary">Calendar</h1>
          {info.status === 'in_progress' && (
            <p className="text-xs text-muted">Day {info.dayNumber} of 75</p>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Streak',  value: `${streak}🔥`, color: 'text-primary' },
            { label: 'Done',    value: completedDays, color: 'text-success' },
            { label: 'Partial', value: partialDays,   color: 'text-warning' },
            { label: 'Missed',  value: failedDays,    color: 'text-danger'  },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-xl p-3 text-center">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted mt-0.5 uppercase tracking-wide font-semibold">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap">
          {[
            { color: 'bg-success',         label: `Complete (${total}/${total})` },
            { color: 'bg-warning',         label: 'Partial' },
            { color: 'bg-danger/80',       label: 'Missed' },
            { color: 'border-2 border-primary', label: 'Today' },
            { color: 'bg-surface',         label: 'Future' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${l.color}`} />
              <span className="text-xs text-muted">{l.label}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <CalendarGrid
            startDate={profile.start_date}
            logs={logs}
            totalTasks={total}
            onSelectDay={handleSelectDay}
          />
        </div>

        {/* Overall progress */}
        {info.status === 'in_progress' && (
          <div className="p-4 rounded-xl bg-surface border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted uppercase tracking-wider font-semibold">Overall Progress</span>
              <span className="text-sm font-bold text-primary">{info.dayNumber}/75</span>
            </div>
            <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(info.dayNumber / 75) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-2">{info.daysRemaining} days remaining</p>
          </div>
        )}

        {info.status === 'complete' && (
          <div className="p-6 rounded-xl bg-success/10 border border-success/30 text-center">
            <p className="text-3xl mb-2">🏆</p>
            <p className="font-bold text-success">Challenge Complete!</p>
            <p className="text-sm text-muted mt-1">You finished all 75 days.</p>
          </div>
        )}

        {/* Progress photo gallery */}
        {photoLogs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Progress Photos</p>
            <div className="grid grid-cols-3 gap-2">
              {photoLogs.map(l => (
                <button
                  key={l.id}
                  onClick={() => setDayDetail({ date: l.log_date, log: l })}
                  className="relative aspect-square rounded-xl overflow-hidden border border-border hover:opacity-90 transition-opacity"
                >
                  <Image
                    src={l.photo_url!}
                    alt={`Progress ${l.log_date}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                    <p className="text-[10px] text-white font-semibold">
                      {new Date(l.log_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Day detail drawer */}
      {dayDetail && (
        <DayDetailDrawer
          detail={dayDetail}
          tasks={tasks}
          onClose={() => setDayDetail(null)}
        />
      )}

      <Nav />
    </div>
  )
}

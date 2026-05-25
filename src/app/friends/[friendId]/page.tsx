'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import {
  getChallengeInfo,
  countCompleted,
  computeStreak,
  isFullyComplete,
  totalEnabled,
  addDays,
  getLocalToday,
  getFriendStatusPill,
} from '@/lib/utils'
import {
  TASK_META,
  TASK_TO_LOG_KEY,
  type ChallengeTaskKey,
  type ChallengeTask,
} from '@/types/database'
import type { Profile, DailyLog } from '@/types/database'

// ── Mini 75-day grid ───────────────────────────────────────────────────────

function MiniGrid({
  startDate,
  logs,
  tasks,
}: {
  startDate: string
  logs: DailyLog[]
  tasks: ChallengeTask[]
}) {
  const today  = getLocalToday()
  const total  = totalEnabled(tasks)
  const logMap = new Map(logs.map(l => [l.log_date, l]))

  const days = Array.from({ length: 75 }, (_, i) => {
    const date = addDays(startDate, i)
    const log  = logMap.get(date)
    const done = log ? countCompleted(log, tasks) : 0
    let status: 'complete' | 'partial' | 'failed' | 'today' | 'future'
    if (date > today) {
      status = 'future'
    } else if (date === today) {
      status = done >= total ? 'complete' : 'today'
    } else if (done >= total) {
      status = 'complete'
    } else if (done > 0) {
      status = 'partial'
    } else {
      status = 'failed'
    }
    return { date, dayNum: i + 1, status }
  })

  const colors: Record<string, string> = {
    complete: 'bg-success',
    partial:  'bg-warning',
    failed:   'bg-danger/70',
    today:    'border-2 border-primary',
    future:   'bg-surface-3',
  }

  return (
    <div className="grid grid-cols-10 gap-1">
      {days.map(({ date, dayNum, status }) => (
        <div
          key={date}
          title={`Day ${dayNum} — ${date}`}
          className={`aspect-square rounded ${colors[status]} flex items-center justify-center`}
        >
          {status === 'today' && (
            <span className="text-[8px] font-black text-primary">{dayNum}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Task status row (read-only) ────────────────────────────────────────────

function TaskStatusRow({ task, log }: { task: ChallengeTask; log: Partial<DailyLog> | null }) {
  const doneKey = TASK_TO_LOG_KEY[task.task_key as ChallengeTaskKey]
  const done    = log?.[doneKey] === true
  const meta    = TASK_META[task.task_key as ChallengeTaskKey]

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className={[
        'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center',
        done ? 'bg-success border-success' : 'border-border',
      ].join(' ')}>
        {done && (
          <svg viewBox="0 0 10 10" fill="none" className="w-3 h-3">
            <path d="M2 5l2 2 4-4" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-base">{meta.emoji}</span>
      <span className={['text-sm font-medium flex-1', done ? 'text-foreground' : 'text-muted'].join(' ')}>
        {task.task_label}
      </span>
      {done && <span className="text-xs text-success font-semibold">Done</span>}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function FriendProfilePage() {
  const params  = useParams()
  const router  = useRouter()
  const supabase = createClient()
  const friendId = params.friendId as string

  const [friendProfile, setFriendProfile] = useState<Profile | null>(null)
  const [tasks,         setTasks]         = useState<ChallengeTask[]>([])
  const [todayLog,      setTodayLog]      = useState<DailyLog | null>(null)
  const [allLogs,       setAllLogs]       = useState<DailyLog[]>([])
  const [loading,       setLoading]       = useState(true)
  const [notFriend,     setNotFriend]     = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Verify friendship (current user → friend)
      const { data: link } = await supabase
        .from('friend_links')
        .select('id')
        .eq('user_id', user.id)
        .eq('friend_user_id', friendId)
        .maybeSingle()

      if (!link) {
        setNotFriend(true)
        setLoading(false)
        return
      }

      const today = getLocalToday()

      const [
        { data: profile },
        { data: tasksData },
        { data: todayLogData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', friendId).single(),
        supabase.from('challenge_tasks').select('*').eq('user_id', friendId).order('sort_order'),
        supabase.from('daily_logs').select('*').eq('user_id', friendId).eq('log_date', today).maybeSingle(),
      ])

      if (!profile) { setNotFriend(true); setLoading(false); return }

      setFriendProfile(profile)
      setTasks(tasksData ?? [])
      setTodayLog(todayLogData ?? null)

      // Load all logs for streak + mini grid
      if (profile.start_date) {
        const endDate = addDays(profile.start_date, 74)
        const { data: logsData } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', friendId)
          .gte('log_date', profile.start_date)
          .lte('log_date', endDate)
        setAllLogs(logsData ?? [])
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId])

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    )
  }

  if (notFriend || !friendProfile) {
    return (
      <div className="min-h-dvh bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="max-w-lg mx-auto">
            <Link href="/friends" className="text-sm text-muted hover:text-foreground">← Friends</Link>
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-3xl mb-3">🔒</p>
          <p className="font-semibold mb-1">Access denied</p>
          <p className="text-sm text-muted">You need to be connected with this person to view their profile.</p>
        </div>
        <Nav />
      </div>
    )
  }

  const info        = getChallengeInfo(friendProfile.start_date)
  const enabledTasks = tasks.filter(t => t.enabled).sort((a, b) => a.sort_order - b.sort_order)
  const total       = totalEnabled(tasks)
  const todayDone   = countCompleted(todayLog ?? {}, tasks)
  const pill        = getFriendStatusPill(todayDone, total)
  const streak      = friendProfile.start_date ? computeStreak(allLogs, friendProfile.start_date, tasks) : 0
  const displayName = friendProfile.display_name ?? friendProfile.email.split('@')[0]

  const today        = getLocalToday()
  const completedDays = allLogs.filter(l => l.log_date < today && isFullyComplete(l, tasks)).length
  const daysPassed    = Math.max(0,
    info.status === 'in_progress' ? info.dayNumber - 1 :
    info.status === 'complete'    ? 75 : 0
  )
  const missedDays = Math.max(0, daysPassed - completedDays)

  const hasMeals = todayLog && (todayLog.breakfast || todayLog.lunch || todayLog.dinner || todayLog.snacks)
  const canViewPhotos = friendProfile.friends_can_view_photos
  const canViewNotes  = friendProfile.friends_can_view_workout_notes
  const canViewMeals  = friendProfile.friends_can_view_meals

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/friends" className="text-muted hover:text-foreground transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-black">{displayName}</h1>
            <p className="text-xs text-muted">{friendProfile.email}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Hero card */}
        <div className="p-4 rounded-xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black">{displayName}</p>
              {info.status === 'in_progress' && (
                <p className="text-sm text-muted">Day {info.dayNumber} of 75</p>
              )}
              {info.status === 'not_started' && (
                <p className="text-sm text-muted">Challenge starts in {info.daysUntilStart}d</p>
              )}
              {info.status === 'complete' && (
                <p className="text-sm text-success font-semibold">Challenge complete 🏆</p>
              )}
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${pill.classes}`}>
              {pill.label}
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: info.status === 'in_progress' ? info.dayNumber : info.status === 'complete' ? 75 : 0, label: 'Day', color: 'text-primary' },
              { val: streak, label: 'Streak 🔥', color: 'text-warning' },
              { val: completedDays, label: 'Locked', color: 'text-success' },
              { val: missedDays,    label: 'Missed',  color: 'text-danger' },
            ].map(s => (
              <div key={s.label} className="text-center bg-surface-2 rounded-xl p-3">
                <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-muted mt-0.5 uppercase tracking-wide font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Today's checklist */}
        {info.status === 'in_progress' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Today&apos;s Tasks</p>
              <span className={['text-sm font-bold', todayDone >= total ? 'text-success' : 'text-foreground'].join(' ')}>
                {todayDone}/{total} {todayDone >= total && '🔥'}
              </span>
            </div>
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/60">
              {enabledTasks.map(task => (
                <TaskStatusRow key={task.id} task={task} log={todayLog} />
              ))}
            </div>
          </div>
        )}

        {/* Progress photo */}
        {canViewPhotos && todayLog?.photo_url && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Today&apos;s Photo</p>
            <div className="relative w-full aspect-square max-w-xs rounded-2xl overflow-hidden border border-border">
              <Image
                src={todayLog.photo_url}
                alt={`${displayName}'s progress photo`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        )}

        {!canViewPhotos && todayLog?.photo_url && (
          <div className="p-4 rounded-xl bg-surface-2 border border-border text-center">
            <p className="text-2xl mb-1">🔒</p>
            <p className="text-sm text-muted">{displayName} hasn&apos;t enabled photo sharing.</p>
          </div>
        )}

        {/* Workout notes */}
        {canViewNotes && (todayLog?.indoor_workout_notes || todayLog?.outdoor_workout_notes) && (
          <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Workout Notes</p>
            {todayLog?.indoor_workout_notes && (
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wide">Indoor</p>
                <p className="text-sm">{todayLog.indoor_workout_notes}</p>
              </div>
            )}
            {todayLog?.outdoor_workout_notes && (
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wide">Outdoor</p>
                <p className="text-sm">{todayLog.outdoor_workout_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Meals */}
        {canViewMeals && hasMeals && (
          <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Today&apos;s Meals</p>
            {todayLog?.breakfast && <p className="text-sm"><span className="text-muted">B: </span>{todayLog.breakfast}</p>}
            {todayLog?.lunch     && <p className="text-sm"><span className="text-muted">L: </span>{todayLog.lunch}</p>}
            {todayLog?.dinner    && <p className="text-sm"><span className="text-muted">D: </span>{todayLog.dinner}</p>}
            {todayLog?.snacks    && <p className="text-sm"><span className="text-muted">S: </span>{todayLog.snacks}</p>}
          </div>
        )}

        {/* 75-day grid */}
        {friendProfile.start_date && allLogs.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">75-Day Progress</p>
            <MiniGrid startDate={friendProfile.start_date} logs={allLogs} tasks={tasks} />
            <div className="flex gap-3 mt-4 flex-wrap">
              {[
                { color: 'bg-success',   label: 'Complete' },
                { color: 'bg-warning',   label: 'Partial' },
                { color: 'bg-danger/70', label: 'Missed' },
                { color: 'border-2 border-primary', label: 'Today' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${l.color}`} />
                  <span className="text-[10px] text-muted">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {info.status === 'in_progress' && (
          <div className="p-4 rounded-xl bg-surface border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted uppercase tracking-wider font-semibold">Challenge Progress</span>
              <span className="text-sm font-bold text-primary">{info.dayNumber}/75</span>
            </div>
            <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(info.dayNumber / 75) * 100}%`, transition: 'width 0.75s ease' }}
              />
            </div>
            <p className="text-xs text-muted mt-2">{info.daysRemaining} days remaining</p>
          </div>
        )}

      </div>

      <Nav />
    </div>
  )
}

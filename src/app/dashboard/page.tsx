'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import ProgressBar from '@/components/ProgressBar'
import DayStatus from '@/components/DayStatus'
import DailyChecklist from '@/components/DailyChecklist'
import PhotoUpload from '@/components/PhotoUpload'
import FriendCard from '@/components/FriendCard'
import { useFriendNotifications } from '@/hooks/useFriendNotifications'
import {
  getChallengeInfo,
  countCompleted,
  computeStreak,
  isFullyComplete,
  getLocalToday,
  addDays,
  getMicrocopy,
  totalEnabled,
} from '@/lib/utils'
import type { Profile, DailyLog, TaskKey, ChallengeTask, NutritionGoal } from '@/types/database'

interface FriendWithLog {
  profile: Profile
  todayLog: Partial<DailyLog> | null
}

// ── Streak badge ─────────────────────────────────────────────────────────

function StreakBadge({ streak }: { streak: number }) {
  if (streak < 1) return null
  return (
    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
      <span className="text-sm">🔥</span>
      <span className="text-xs font-black text-primary">{streak}</span>
    </div>
  )
}

// ── Comparison card ───────────────────────────────────────────────────────

function ComparisonCard({
  myDone,
  myTotal,
  friends,
}: {
  myDone: number
  myTotal: number
  friends: FriendWithLog[]
}) {
  if (friends.length === 0) return null

  const FRIEND_TOTAL = 7
  const topFriend    = friends[0]
  const friendDone   = countCompleted(topFriend.todayLog ?? {})
  const friendName   = topFriend.profile.display_name ?? topFriend.profile.email.split('@')[0]
  const myPct        = myTotal > 0 ? (myDone / myTotal) * 100 : 0
  const friendPct    = (friendDone / FRIEND_TOTAL) * 100

  let message: string
  if (myDone >= myTotal && friendDone >= FRIEND_TOTAL) {
    message = "You're both locked in 🔥"
  } else if (myPct > friendPct) {
    message = `You're ahead of ${friendName}`
  } else if (friendPct > myPct) {
    message = `${friendName} is ahead — keep pushing`
  } else {
    message = 'Neck and neck. Keep going.'
  }

  return (
    <div className="rounded-xl border border-border/60 bg-surface overflow-hidden">
      <div className="flex items-stretch">
        <div className="w-1 shrink-0 bg-gradient-to-b from-primary to-primary/30" />
        <div className="flex-1 p-4 space-y-3">
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Today vs. Partner</p>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">You</span>
                <span className="text-xs font-bold text-primary">{myDone}/{myTotal}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, myPct)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{friendName}</span>
                <span className="text-xs font-bold text-muted">{friendDone}/{FRIEND_TOTAL}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-surface-3 transition-all duration-500"
                  style={{
                    width:      `${Math.min(100, friendPct)}%`,
                    background: friendDone >= FRIEND_TOTAL ? 'var(--success)' : 'var(--muted)',
                  }}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted font-semibold">{message}</p>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard inner ───────────────────────────────────────────────────────

function DashboardContent() {
  const supabase     = createClient()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [profile,       setProfile]       = useState<Profile | null>(null)
  const [log,           setLog]           = useState<Partial<DailyLog> | null>(null)
  const [allLogs,       setAllLogs]       = useState<DailyLog[]>([])
  const [tasks,         setTasks]         = useState<ChallengeTask[]>([])
  const [nutritionGoal, setNutritionGoal] = useState<NutritionGoal | null>(null)
  const [notes,         setNotes]         = useState('')
  const [notesSaved,    setNotesSaved]    = useState(false)

  const initialDate = searchParams.get('date') ?? getLocalToday()
  const [selectedDate, setSelectedDate] = useState(
    initialDate <= getLocalToday() ? initialDate : getLocalToday()
  )

  const [friends,        setFriends]       = useState<FriendWithLog[]>([])
  const [loading,        setLoading]       = useState(true)
  const [saving,         setSaving]        = useState(false)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)

  const isToday    = selectedDate === getLocalToday()
  const isFutureDate = selectedDate > getLocalToday()

  useFriendNotifications(friends.map(f => f.profile))

  // Profile + tasks + nutrition + all logs (not date-sensitive)
  const fetchCore = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profileData) return null
    if (!profileData.onboarding_completed) {
      router.push('/onboarding')
      return null
    }
    setProfile(profileData)

    const [{ data: tasksData }, { data: nutritionData }] = await Promise.all([
      supabase.from('challenge_tasks').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('nutrition_goals').select('*').eq('user_id', user.id).maybeSingle(),
    ])

    setTasks(tasksData ?? [])
    setNutritionGoal(nutritionData ?? null)

    // Load all logs for streak + days-completed
    if (profileData.start_date) {
      const endDate = addDays(profileData.start_date, 74)
      const { data: logsData } = await supabase
        .from('daily_logs')
        .select('id, user_id, log_date, indoor_workout_done, outdoor_workout_done, diet_done, water_done, reading_done, progress_photo_done, no_alcohol_cheat_done')
        .eq('user_id', user.id)
        .gte('log_date', profileData.start_date)
        .lte('log_date', endDate)
      setAllLogs((logsData ?? []) as DailyLog[])
    }

    return { user, profileData, tasksData }
  }, [supabase, router])

  // Selected-date log (date-sensitive)
  const fetchDayLog = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: logData } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', selectedDate)
      .maybeSingle()

    setLog(logData ?? {})
    setNotes(logData?.notes ?? '')
  }, [supabase, selectedDate])

  const fetchFriends = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: links } = await supabase
      .from('friend_links')
      .select('friend_user_id')
      .eq('user_id', user.id)

    if (!links?.length) return

    const friendIds = links.map(l => l.friend_user_id)
    const today     = getLocalToday()

    const [{ data: profiles }, { data: logs }] = await Promise.all([
      supabase.from('profiles').select('*').in('id', friendIds),
      supabase.from('daily_logs').select('*').in('user_id', friendIds).eq('log_date', today),
    ])

    if (!profiles?.length) return
    const logMap = new Map((logs ?? []).map(l => [l.user_id, l]))
    setFriends(profiles.map(p => ({ profile: p, todayLog: logMap.get(p.id) ?? null })))
  }, [supabase])

  // On mount: load core + friends
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    Promise.all([fetchCore(), fetchFriends()]).finally(() => setLoading(false))
  }, [fetchCore, fetchFriends])

  // On selectedDate change: reload day log
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDayLog()
  }, [fetchDayLog])

  async function ensureLog(userId: string) {
    await supabase
      .from('daily_logs')
      .upsert({ user_id: userId, log_date: selectedDate }, { onConflict: 'user_id,log_date' })
  }

  async function handleToggle(key: TaskKey) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newVal = !(log?.[key] ?? false)
    setLog(prev => ({ ...prev, [key]: newVal }))
    setSaving(true)

    try {
      await ensureLog(user.id)
      const { error } = await supabase
        .from('daily_logs')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ [key]: newVal } as any)
        .eq('user_id', user.id)
        .eq('log_date', selectedDate)
      if (error) throw error
    } catch {
      setLog(prev => ({ ...prev, [key]: !newVal }))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDetail(fields: Partial<DailyLog>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaving(true)
    try {
      await ensureLog(user.id)
      await supabase
        .from('daily_logs')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(fields as any)
        .eq('user_id', user.id)
        .eq('log_date', selectedDate)
      setLog(prev => ({ ...prev, ...fields }))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNotes() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaving(true)
    try {
      await ensureLog(user.id)
      await supabase
        .from('daily_logs')
        .update({ notes })
        .eq('user_id', user.id)
        .eq('log_date', selectedDate)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoUploaded(url: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setLog(prev => ({ ...prev, photo_url: url, progress_photo_done: true }))
    await ensureLog(user.id)
    await supabase
      .from('daily_logs')
      .update({ photo_url: url, progress_photo_done: true })
      .eq('user_id', user.id)
      .eq('log_date', selectedDate)

    setShowPhotoUpload(false)
  }

  const challengeInfo   = getChallengeInfo(profile?.start_date ?? null)
  const total           = totalEnabled(tasks)
  const completedCount  = countCompleted(log ?? {}, tasks)
  const microcopy       = getMicrocopy(completedCount, total)

  // Streak + completed days from allLogs
  const streak         = profile?.start_date ? computeStreak(allLogs, profile.start_date, tasks) : 0
  const today          = getLocalToday()
  const completedDays  = allLogs.filter(l => l.log_date < today && isFullyComplete(l, tasks)).length
  const isCurrentDayDone = log && isFullyComplete(log, tasks)
  const totalLockedDays  = completedDays + (isCurrentDayDone ? 1 : 0)

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <span className="text-xs font-semibold text-primary tracking-widest uppercase">75 Hard</span>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-muted">Saving…</span>}
            {streak > 0 && <StreakBadge streak={streak} />}
            <Link href="/settings" className="text-sm text-muted hover:text-foreground transition-colors">
              {profile?.display_name?.split(' ')[0] ?? 'Me'}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

        <DayStatus info={challengeInfo} displayName={profile?.display_name} />

        {challengeInfo.status === 'no_start_date' && (
          <Link
            href="/settings"
            className="block px-4 py-3 rounded-lg border border-primary/30 bg-primary/5 text-sm text-primary font-medium hover:bg-primary/10 transition-colors"
          >
            Set your start date to begin →
          </Link>
        )}

        {/* Challenge stats row */}
        {challengeInfo.status === 'in_progress' && (
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center bg-surface border border-border rounded-xl p-3">
              <p className="text-xl font-black text-primary">{challengeInfo.dayNumber}</p>
              <p className="text-[10px] text-muted uppercase tracking-wide font-semibold">Day</p>
            </div>
            <div className="text-center bg-surface border border-border rounded-xl p-3">
              <p className="text-xl font-black text-success">{totalLockedDays}</p>
              <p className="text-[10px] text-muted uppercase tracking-wide font-semibold">Locked</p>
            </div>
            <div className="text-center bg-surface border border-border rounded-xl p-3">
              <p className="text-xl font-black text-foreground">{challengeInfo.daysRemaining}</p>
              <p className="text-[10px] text-muted uppercase tracking-wide font-semibold">Left</p>
            </div>
          </div>
        )}

        {/* Date navigator + progress */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              className="p-2 rounded-lg border border-border text-muted hover:text-foreground hover:border-surface-3 transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold">
                {isToday ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              <p className="text-xs text-muted">{selectedDate}</p>
            </div>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              disabled={isToday}
              className="p-2 rounded-lg border border-border text-muted hover:text-foreground hover:border-surface-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <ProgressBar completed={completedCount} total={total} />

          <p className={[
            'text-xs text-center font-semibold tracking-wide transition-colors duration-300',
            completedCount >= total && total > 0 ? 'text-success' : 'text-muted',
          ].join(' ')}>
            {microcopy}
          </p>
        </div>

        {/* Checklist */}
        {isFutureDate ? (
          <p className="text-center text-muted text-sm py-8">Future day — check back then.</p>
        ) : (
          <div className="space-y-5">
            <DailyChecklist
              key={selectedDate}
              tasks={tasks}
              log={log ?? {}}
              onToggle={handleToggle}
              onSaveDetail={handleSaveDetail}
              onPhotoUploadClick={() => setShowPhotoUpload(v => !v)}
            />

            {(showPhotoUpload || log?.photo_url) && profile && (
              <PhotoUpload
                userId={profile.id}
                date={selectedDate}
                currentUrl={log?.photo_url ?? null}
                onUploaded={handlePhotoUploaded}
              />
            )}

            <div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Notes for today…"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors resize-none"
              />
              {notesSaved && <p className="text-xs text-success mt-1">Saved</p>}
            </div>
          </div>
        )}

        {/* Nutrition goal card */}
        {nutritionGoal && (
          <Link
            href="/nutrition"
            className="block rounded-xl overflow-hidden border border-border/60 hover:border-primary/40 transition-all duration-200 group"
          >
            <div className="flex items-stretch">
              <div className="w-1 shrink-0 bg-gradient-to-b from-primary to-primary/40" />
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Nutrition Goals</p>
                  <span className="text-xs text-primary/70 group-hover:text-primary transition-colors font-semibold">Edit →</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: nutritionGoal.target_calories?.toLocaleString(), label: 'Cal',  color: 'text-primary' },
                    { val: `${nutritionGoal.protein_g}g`,                   label: 'Pro',  color: 'text-success' },
                    { val: `${nutritionGoal.carbs_g}g`,                     label: 'Carb', color: 'text-warning' },
                    { val: `${nutritionGoal.fat_g}g`,                       label: 'Fat',  color: 'text-muted'   },
                  ].map(item => (
                    <div key={item.label} className="text-center">
                      <p className={`text-base font-black tabular-nums ${item.color}`}>{item.val}</p>
                      <p className="text-[9px] text-muted uppercase tracking-widest font-semibold mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Accountability partners */}
        {friends.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest">Partners</p>
              <Link href="/friends" className="text-xs text-primary hover:underline">Manage</Link>
            </div>

            {/* Comparison card (vs. first friend) */}
            <ComparisonCard myDone={completedCount} myTotal={total} friends={friends} />

            <div className="space-y-2">
              {friends.map(({ profile: friend, todayLog: fl }) => (
                <FriendCard key={friend.id} friend={friend} todayLog={fl} compact />
              ))}
            </div>
          </div>
        ) : (
          <Link
            href="/friends"
            className="block px-4 py-3 rounded-lg border border-dashed border-border text-center text-sm text-muted hover:border-border hover:text-foreground transition-colors"
          >
            Add an accountability partner
          </Link>
        )}
      </div>

      <Nav />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

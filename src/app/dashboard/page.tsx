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

function DashboardContent() {
  const supabase      = createClient()
  const router        = useRouter()
  const searchParams  = useSearchParams()

  const [profile,        setProfile]        = useState<Profile | null>(null)
  const [log,            setLog]            = useState<Partial<DailyLog> | null>(null)
  const [tasks,          setTasks]          = useState<ChallengeTask[]>([])
  const [nutritionGoal,  setNutritionGoal]  = useState<NutritionGoal | null>(null)
  const [notes,          setNotes]          = useState('')
  const [notesSaved,     setNotesSaved]     = useState(false)
  const initialDate = searchParams.get('date') ?? getLocalToday()
  const [selectedDate, setSelectedDate] = useState(
    initialDate <= getLocalToday() ? initialDate : getLocalToday()
  )
  const [friends,  setFriends]  = useState<FriendWithLog[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)

  const isToday = selectedDate === getLocalToday()

  useFriendNotifications(friends.map(f => f.profile))

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      // Redirect to onboarding if not completed
      if (!profileData.onboarding_completed) {
        router.push('/onboarding')
        return
      }
    }

    const [
      { data: logData },
      { data: tasksData },
      { data: nutritionData },
    ] = await Promise.all([
      supabase.from('daily_logs').select('*').eq('user_id', user.id).eq('log_date', selectedDate).maybeSingle(),
      supabase.from('challenge_tasks').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('nutrition_goals').select('*').eq('user_id', user.id).maybeSingle(),
    ])

    setLog(logData ?? {})
    setNotes(logData?.notes ?? '')
    setTasks(tasksData ?? [])
    setNutritionGoal(nutritionData ?? null)
  }, [supabase, selectedDate, router])

  const fetchFriends = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: links } = await supabase
      .from('friend_links')
      .select('friend_user_id')
      .eq('user_id', user.id)

    if (!links?.length) return

    const friendIds = links.map(l => l.friend_user_id)

    const { data: profiles } = await supabase.from('profiles').select('*').in('id', friendIds)
    if (!profiles?.length) return

    const today = getLocalToday()
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('*')
      .in('user_id', friendIds)
      .eq('log_date', today)

    const logMap = new Map((logs ?? []).map(l => [l.user_id, l]))

    setFriends(profiles.map(p => ({ profile: p, todayLog: logMap.get(p.id) ?? null })))
  }, [supabase])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchData(), fetchFriends()]).finally(() => setLoading(false))
  }, [fetchData, fetchFriends])

  async function ensureLog(userId: string): Promise<void> {
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

  const challengeInfo    = getChallengeInfo(profile?.start_date ?? null)
  const total            = totalEnabled(tasks)
  const completedCount   = countCompleted(log ?? {}, tasks)
  const microcopy        = getMicrocopy(completedCount, total)
  const isFutureDate     = selectedDate > getLocalToday()

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
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-muted">Saving…</span>}
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
            completedCount >= total ? 'text-success' : 'text-muted',
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
              {/* Orange left accent */}
              <div className="w-1 shrink-0 bg-gradient-to-b from-primary to-primary/40" />
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Nutrition Goals</p>
                  <span className="text-xs text-primary/70 group-hover:text-primary transition-colors font-semibold">Edit →</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: nutritionGoal.target_calories?.toLocaleString(), label: 'Cal', color: 'text-primary' },
                    { val: `${nutritionGoal.protein_g}g`,                   label: 'Pro', color: 'text-success' },
                    { val: `${nutritionGoal.carbs_g}g`,                     label: 'Carb', color: 'text-warning' },
                    { val: `${nutritionGoal.fat_g}g`,                       label: 'Fat', color: 'text-muted' },
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
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest">Partners</p>
              <Link href="/friends" className="text-xs text-primary hover:underline">Manage</Link>
            </div>
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
    <Suspense fallback={<div className="min-h-dvh bg-background flex items-center justify-center"><div className="text-muted text-sm">Loading…</div></div>}>
      <DashboardContent />
    </Suspense>
  )
}

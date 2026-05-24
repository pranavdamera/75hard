'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import ProgressBar from '@/components/ProgressBar'
import DayStatus from '@/components/DayStatus'
import DailyChecklist from '@/components/DailyChecklist'
import PhotoUpload from '@/components/PhotoUpload'
import FriendCard from '@/components/FriendCard'
import {
  getChallengeInfo,
  countCompleted,
  getLocalToday,
  addDays,
} from '@/lib/utils'
import type { Profile, DailyLog, TaskKey } from '@/types/database'

interface FriendWithLog {
  profile: Profile
  todayLog: Partial<DailyLog> | null
}

function DashboardContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [log, setLog] = useState<Partial<DailyLog> | null>(null)
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const initialDate = searchParams.get('date') ?? getLocalToday()
  const [selectedDate, setSelectedDate] = useState(
    initialDate <= getLocalToday() ? initialDate : getLocalToday()
  )
  const [friends, setFriends] = useState<FriendWithLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)

  const isToday = selectedDate === getLocalToday()

  // Fetch profile + log for selected date
  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) setProfile(profileData)

    // Daily log
    const { data: logData } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', selectedDate)
      .maybeSingle()

    setLog(logData ?? {})
    setNotes(logData?.notes ?? '')
  }, [supabase, selectedDate])

  // Fetch friends
  const fetchFriends = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: links } = await supabase
      .from('friend_links')
      .select('friend_user_id')
      .eq('user_id', user.id)

    if (!links?.length) return

    const friendIds = links.map((l) => l.friend_user_id)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds)

    if (!profiles?.length) return

    const today = getLocalToday()
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('*')
      .in('user_id', friendIds)
      .eq('log_date', today)

    const logMap = new Map((logs ?? []).map((l) => [l.user_id, l]))

    setFriends(
      profiles.map((p) => ({
        profile: p,
        todayLog: logMap.get(p.id) ?? null,
      }))
    )
  }, [supabase])

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setLoading(true)
    Promise.all([fetchData(), fetchFriends()]).finally(() => setLoading(false))
  }, [fetchData, fetchFriends])

  async function ensureLog(userId: string): Promise<string | null> {
    // Upsert a log row and return its id
    const { data, error } = await supabase
      .from('daily_logs')
      .upsert({ user_id: userId, log_date: selectedDate }, { onConflict: 'user_id,log_date' })
      .select('id')
      .single()
    if (error) return null
    return data?.id ?? null
  }

  async function handleToggle(key: TaskKey) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newVal = !(log?.[key] ?? false)

    // Optimistic update
    setLog((prev) => ({ ...prev, [key]: newVal }))
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
      // Revert
      setLog((prev) => ({ ...prev, [key]: !newVal }))
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

    setLog((prev) => ({ ...prev, photo_url: url, progress_photo_done: true }))
    await ensureLog(user.id)
    await supabase
      .from('daily_logs')
      .update({ photo_url: url, progress_photo_done: true })
      .eq('user_id', user.id)
      .eq('log_date', selectedDate)

    setShowPhotoUpload(false)
  }

  const challengeInfo = getChallengeInfo(profile?.start_date ?? null)
  const completedCount = countCompleted(log ?? {})
  const isFutureDate = selectedDate > getLocalToday()

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      {/* ── Top bar ──────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-black text-primary">75 Hard</h1>
          {saving && <span className="text-xs text-muted">Saving…</span>}
          <Link href="/settings" className="text-muted text-sm hover:text-foreground transition-colors">
            {profile?.display_name?.split(' ')[0] ?? 'Me'}
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* ── Day status ─────────────────────────────────── */}
        <DayStatus info={challengeInfo} displayName={profile?.display_name} />

        {/* ── Date navigator ─────────────────────────────── */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-foreground hover:border-surface-3 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>

          <div className="flex-1 text-center">
            <p className="text-sm font-semibold">
              {isToday
                ? 'Today'
                : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
            </p>
            <p className="text-xs text-muted">{selectedDate}</p>
          </div>

          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            disabled={isToday}
            className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-foreground hover:border-surface-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* ── Progress bar ───────────────────────────────── */}
        <ProgressBar completed={completedCount} />

        {/* ── Checklist ──────────────────────────────────── */}
        {isFutureDate ? (
          <div className="p-6 rounded-xl bg-surface border border-border text-center">
            <p className="text-muted text-sm">Future day — check back then.</p>
          </div>
        ) : (
          <>
            <section>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Tasks
              </p>
              <DailyChecklist
                log={log ?? {}}
                onToggle={handleToggle}
                onPhotoUploadClick={() => setShowPhotoUpload((v) => !v)}
              />
            </section>

            {/* ── Photo upload ─────────────────────────── */}
            {(showPhotoUpload || log?.photo_url) && profile && (
              <section>
                <PhotoUpload
                  userId={profile.id}
                  date={selectedDate}
                  currentUrl={log?.photo_url ?? null}
                  onUploaded={handlePhotoUploaded}
                />
              </section>
            )}

            {/* ── Notes ────────────────────────────────── */}
            <section>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Notes
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="How was your day? What did you crush?"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors resize-none"
              />
              {notesSaved && (
                <p className="text-xs text-success mt-1">Notes saved ✓</p>
              )}
            </section>
          </>
        )}

        {/* ── Friends summary ────────────────────────────── */}
        {friends.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                Accountability
              </p>
              <Link href="/friends" className="text-xs text-primary hover:underline">
                See all
              </Link>
            </div>
            <div className="space-y-2">
              {friends.map(({ profile: friend, todayLog: fl }) => (
                <FriendCard key={friend.id} friend={friend} todayLog={fl} compact />
              ))}
            </div>
          </section>
        )}

        {friends.length === 0 && (
          <Link
            href="/friends"
            className="block p-4 rounded-xl border border-dashed border-border text-center text-sm text-muted hover:border-primary/40 hover:text-foreground transition-colors"
          >
            + Add an accountability partner
          </Link>
        )}

        {/* ── No start date prompt ───────────────────────── */}
        {challengeInfo.status === 'no_start_date' && (
          <Link
            href="/settings"
            className="block p-4 rounded-xl bg-primary/10 border border-primary/30 text-center text-sm text-primary font-semibold hover:bg-primary/15 transition-colors"
          >
            Set your start date to begin tracking →
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

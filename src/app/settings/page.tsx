'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import { getChallengeInfo, totalEnabled } from '@/lib/utils'
import { getNotifyEnabled, setNotifyEnabled } from '@/hooks/useFriendNotifications'
import {
  DEFAULT_TASKS,
  TASK_META,
  ALL_CHALLENGE_TASK_KEYS,
  type ChallengeTask,
  type ChallengeTaskKey,
} from '@/types/database'
import type { Profile } from '@/types/database'

// ── Toggle component ──────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      className={[
        'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
        value ? 'bg-primary' : 'bg-surface-3',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
          value ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

// ── Challenge style constants ─────────────────────────────────────────────

const CHALLENGE_STYLES = [
  { key: 'strict',  label: '75 Hard (Strict)',   description: 'All tasks required, no exceptions' },
  { key: 'custom',  label: 'Custom / Recreational', description: 'Choose your own tasks and rules' },
] as const

// ── Main settings page ────────────────────────────────────────────────────

export default function SettingsPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [profile,        setProfile]        = useState<Profile | null>(null)
  const [tasks,          setTasks]          = useState<ChallengeTask[]>([])
  const [displayName,    setDisplayName]    = useState('')
  const [startDate,      setStartDate]      = useState('')
  const [challengeStyle, setChallengeStyle] = useState('strict')

  // Privacy
  const [canViewPhotos, setCanViewPhotos]   = useState(true)
  const [canViewNotes,  setCanViewNotes]    = useState(false)
  const [canViewMeals,  setCanViewMeals]    = useState(false)

  const [loading,           setLoading]           = useState(true)
  const [savingProfile,     setSavingProfile]     = useState(false)
  const [savedProfile,      setSavedProfile]      = useState(false)
  const [savingTasks,       setSavingTasks]        = useState(false)
  const [savedTasks,        setSavedTasks]         = useState(false)
  const [savingPrivacy,     setSavingPrivacy]     = useState(false)
  const [savedPrivacy,      setSavedPrivacy]      = useState(false)
  const [profileError,      setProfileError]      = useState<string | null>(null)
  const [showResetConfirm,  setShowResetConfirm]  = useState(false)
  const [notifyEnabled,     setNotifyState]       = useState(true)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setNotifyState(getNotifyEnabled()) }, [])

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: profileData }, { data: tasksData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('challenge_tasks').select('*').eq('user_id', user.id).order('sort_order'),
    ])

    if (profileData) {
      setProfile(profileData)
      setDisplayName(profileData.display_name ?? '')
      setStartDate(profileData.start_date ?? '')
      setChallengeStyle(profileData.challenge_style ?? 'strict')
      setCanViewPhotos(profileData.friends_can_view_photos ?? true)
      setCanViewNotes(profileData.friends_can_view_workout_notes ?? false)
      setCanViewMeals(profileData.friends_can_view_meals ?? false)
    }

    if (tasksData && tasksData.length > 0) {
      setTasks(tasksData)
    } else {
      // Synthesize default tasks if none exist yet
      setTasks(DEFAULT_TASKS.map((t, i) => ({
        id: `tmp-${i}`,
        user_id: user.id,
        task_key: t.task_key as ChallengeTaskKey,
        task_label: t.task_label,
        enabled: true,
        sort_order: t.sort_order,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })))
    }

    setLoading(false)
  }, [supabase])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData() }, [loadData])

  // ── Profile save ──────────────────────────────────────────────────────

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(null)
    setSavingProfile(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name:    displayName.trim() || null,
          start_date:      startDate || null,
          challenge_style: challengeStyle,
        })
        .eq('id', user.id)

      if (error) throw error
      setSavedProfile(true)
      setTimeout(() => setSavedProfile(false), 2500)
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Task toggle ───────────────────────────────────────────────────────

  function handleTaskToggle(taskKey: ChallengeTaskKey) {
    setTasks(prev => prev.map(t =>
      t.task_key === taskKey ? { ...t, enabled: !t.enabled } : t
    ))
  }

  async function handleSaveTasks() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSavingTasks(true)
    try {
      await Promise.all(
        tasks.map(t =>
          supabase
            .from('challenge_tasks')
            .upsert({
              user_id:    user.id,
              task_key:   t.task_key,
              task_label: t.task_label,
              enabled:    t.enabled,
              sort_order: t.sort_order,
            }, { onConflict: 'user_id,task_key' })
        )
      )
      setSavedTasks(true)
      setTimeout(() => setSavedTasks(false), 2500)
      // Reload to get real IDs
      loadData()
    } finally {
      setSavingTasks(false)
    }
  }

  async function handleResetToStrict() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSavingTasks(true)
    try {
      await Promise.all(
        ALL_CHALLENGE_TASK_KEYS.map((key, i) =>
          supabase.from('challenge_tasks').upsert({
            user_id:    user.id,
            task_key:   key,
            task_label: DEFAULT_TASKS.find(t => t.task_key === key)?.task_label ?? key,
            enabled:    true,
            sort_order: i,
          }, { onConflict: 'user_id,task_key' })
        )
      )
      setChallengeStyle('strict')
      await supabase.from('profiles').update({ challenge_style: 'strict' }).eq('id', user.id)
      loadData()
      setSavedTasks(true)
      setTimeout(() => setSavedTasks(false), 2500)
    } finally {
      setSavingTasks(false)
    }
  }

  // ── Privacy save ──────────────────────────────────────────────────────

  async function handleSavePrivacy() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSavingPrivacy(true)
    try {
      await supabase.from('profiles').update({
        friends_can_view_photos:        canViewPhotos,
        friends_can_view_workout_notes: canViewNotes,
        friends_can_view_meals:         canViewMeals,
      }).eq('id', user.id)

      setSavedPrivacy(true)
      setTimeout(() => setSavedPrivacy(false), 2500)
    } finally {
      setSavingPrivacy(false)
    }
  }

  // ── Reset challenge ───────────────────────────────────────────────────

  async function handleReset() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await Promise.all([
      supabase.from('profiles').update({ start_date: null }).eq('id', user.id),
      supabase.from('daily_logs').delete().eq('user_id', user.id),
    ])

    setStartDate('')
    setShowResetConfirm(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    )
  }

  const info           = getChallengeInfo(startDate || null)
  const enabledCount   = totalEnabled(tasks)
  const enabledTasksArr = tasks.filter(t => t.enabled)

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-black text-primary">Settings</h1>
          <p className="text-xs text-muted">{profile?.email}</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ── Profile ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSaveProfile} className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <p className="text-sm font-semibold">Profile</p>

          <div>
            <label className="text-xs text-muted block mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1.5">Challenge Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-foreground focus:outline-none focus:border-primary transition-colors text-sm"
              style={{ colorScheme: 'dark' }}
            />
            {startDate && (
              <p className="text-xs text-muted mt-1.5">
                {info.status === 'in_progress' && `Day ${info.dayNumber} of 75 — ${info.daysRemaining} days remaining`}
                {info.status === 'not_started' && `Challenge starts in ${info.daysUntilStart} day${info.daysUntilStart === 1 ? '' : 's'}`}
                {info.status === 'complete' && 'Challenge complete! 🏆'}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted block mb-2">Challenge Style</label>
            <div className="grid grid-cols-2 gap-2">
              {CHALLENGE_STYLES.map(s => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setChallengeStyle(s.key)}
                  className={[
                    'px-3 py-2.5 rounded-xl border-2 text-left transition-all',
                    challengeStyle === s.key
                      ? 'border-primary bg-primary/5'
                      : 'border-border text-muted hover:border-surface-3',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold leading-snug">{s.label}</p>
                  <p className="text-[10px] text-muted mt-0.5 leading-snug">{s.description}</p>
                </button>
              ))}
            </div>
          </div>

          {profileError && <p className="text-xs text-danger">{profileError}</p>}
          {savedProfile  && <p className="text-xs text-success">Saved ✓</p>}

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </form>

        {/* ── Challenge Rules ──────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Challenge Tasks</p>
            <span className="text-xs text-primary font-bold">
              {enabledCount}/{tasks.length} enabled
            </span>
          </div>

          {/* Preview */}
          <div className="px-3 py-2.5 rounded-xl bg-surface-2 border border-border/60">
            <p className="text-xs text-muted leading-relaxed">
              {enabledCount === 0
                ? 'No tasks enabled — add at least one.'
                : `Your daily challenge has ${enabledCount} task${enabledCount === 1 ? '' : 's'}: ${enabledTasksArr.map(t => t.task_label).join(', ')}.`}
            </p>
          </div>

          {/* Task list */}
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/60">
            {tasks.map(task => {
              const meta = TASK_META[task.task_key as ChallengeTaskKey]
              return (
                <div key={task.task_key} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="text-base w-7 text-center">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{task.task_label}</p>
                    <p className="text-[11px] text-muted">{meta.description}</p>
                  </div>
                  <Toggle value={task.enabled} onChange={() => handleTaskToggle(task.task_key as ChallengeTaskKey)} />
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveTasks}
              disabled={savingTasks}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {savingTasks ? 'Saving…' : 'Save Tasks'}
            </button>
            <button
              type="button"
              onClick={handleResetToStrict}
              disabled={savingTasks}
              className="px-4 py-3 rounded-xl border border-border text-sm font-semibold text-muted hover:text-foreground hover:border-surface-3 transition-colors"
            >
              Reset
            </button>
          </div>
          {savedTasks && <p className="text-xs text-success text-center">Tasks saved ✓ — dashboard will reflect these immediately.</p>}
        </div>

        {/* ── Privacy ─────────────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold">Friend Visibility</p>
            <p className="text-xs text-muted mt-0.5">Control what your accountability partners can see.</p>
          </div>

          <div className="space-y-3">
            {[
              {
                key: 'photos' as const,
                label: "Today's progress photo",
                description: 'Friends can see your daily progress photo',
                value: canViewPhotos,
                onChange: setCanViewPhotos,
              },
              {
                key: 'notes' as const,
                label: 'Workout notes',
                description: 'Friends can see your workout details and notes',
                value: canViewNotes,
                onChange: setCanViewNotes,
              },
              {
                key: 'meals' as const,
                label: 'Meal log',
                description: 'Friends can see your daily meal entries',
                value: canViewMeals,
                onChange: setCanViewMeals,
              },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted mt-0.5">{item.description}</p>
                </div>
                <Toggle value={item.value} onChange={item.onChange} />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSavePrivacy}
            disabled={savingPrivacy}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {savingPrivacy ? 'Saving…' : 'Save Privacy Settings'}
          </button>
          {savedPrivacy && <p className="text-xs text-success text-center">Privacy settings saved ✓</p>}
        </div>

        {/* ── Notifications ─────────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Friend notifications</p>
              <p className="text-xs text-muted mt-0.5">Alert when a partner logs activity</p>
            </div>
            <Toggle
              value={notifyEnabled}
              onChange={v => { setNotifyState(v); setNotifyEnabled(v) }}
            />
          </div>
        </div>

        {/* ── Danger zone ─────────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Danger Zone</p>

          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-2.5 rounded-xl border border-danger/40 text-danger text-sm font-semibold hover:bg-danger/10 transition-colors"
            >
              Reset Challenge
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted">
                This will clear your start date and all daily logs. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-surface-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Yes, Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sign out ─────────────────────────────────────────────────── */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl border border-border text-sm font-semibold text-muted hover:text-foreground hover:border-surface-3 transition-colors"
        >
          Sign Out
        </button>
      </div>

      <Nav />
    </div>
  )
}

'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import { getChallengeInfo } from '@/lib/utils'
import { getNotifyEnabled, setNotifyEnabled } from '@/hooks/useFriendNotifications'
import type { Profile } from '@/types/database'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [notifyEnabled, setNotifyState] = useState(true)

  useEffect(() => { setNotifyState(getNotifyEnabled()) }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setDisplayName(data.display_name ?? '')
        setStartDate(data.start_date ?? '')
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          start_date: startDate || null,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  async function handleReset() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Clear start date and all logs
    await Promise.all([
      supabase.from('profiles').update({ start_date: null }).eq('id', user.id),
      supabase.from('daily_logs').delete().eq('user_id', user.id),
    ])

    setStartDate('')
    setShowResetConfirm(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    )
  }

  const info = getChallengeInfo(startDate || null)

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-black text-primary">Settings</h1>
          <p className="text-xs text-muted">{profile?.email}</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile form */}
        <form onSubmit={handleSave} className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <p className="text-sm font-semibold">Profile</p>

          <div>
            <label className="text-xs text-muted block mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1.5">Challenge Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
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

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}
          {saved && (
            <p className="text-xs text-success">Saved ✓</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        {/* Challenge info */}
        {startDate && info.status === 'in_progress' && (
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold">Challenge Progress</p>
            <div className="flex gap-3">
              <div className="flex-1 text-center p-3 rounded-xl bg-surface-2">
                <p className="text-2xl font-black text-primary">{info.dayNumber}</p>
                <p className="text-[10px] text-muted uppercase tracking-wide">Current Day</p>
              </div>
              <div className="flex-1 text-center p-3 rounded-xl bg-surface-2">
                <p className="text-2xl font-black text-foreground">{info.daysRemaining}</p>
                <p className="text-[10px] text-muted uppercase tracking-wide">Days Left</p>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Friend notifications</p>
              <p className="text-xs text-muted mt-0.5">
                Alert when an accountability partner logs activity
              </p>
            </div>
            <button
              onClick={() => {
                const next = !notifyEnabled
                setNotifyState(next)
                setNotifyEnabled(next)
              }}
              className={[
                'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
                notifyEnabled ? 'bg-primary' : 'bg-surface-3',
              ].join(' ')}
              role="switch"
              aria-checked={notifyEnabled}
            >
              <span
                className={[
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                  notifyEnabled ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
          </div>
        </div>

        {/* Danger zone */}
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

        {/* Sign out */}
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

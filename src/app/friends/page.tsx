'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import FriendCard from '@/components/FriendCard'
import { getLocalToday, countCompleted, getFriendStatusPill } from '@/lib/utils'
import type { Profile, DailyLog } from '@/types/database'

interface FriendWithLog {
  profile: Profile
  todayLog: Partial<DailyLog> | null
  completionPct: number
}

const TOTAL = 7

export default function FriendsPage() {
  const supabase = createClient()

  const [friends,    setFriends]    = useState<FriendWithLog[]>([])
  const [loading,    setLoading]    = useState(true)
  const [addEmail,   setAddEmail]   = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError,   setAddError]   = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)

  async function loadFriends() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: links } = await supabase
      .from('friend_links')
      .select('friend_user_id')
      .eq('user_id', user.id)

    if (!links?.length) {
      setFriends([])
      setLoading(false)
      return
    }

    const friendIds = links.map((l) => l.friend_user_id)

    const [{ data: profiles }, { data: logs }] = await Promise.all([
      supabase.from('profiles').select('*').in('id', friendIds),
      supabase
        .from('daily_logs')
        .select('*')
        .in('user_id', friendIds)
        .eq('log_date', getLocalToday()),
    ])

    const logMap = new Map((logs ?? []).map((l) => [l.user_id, l]))

    const enriched: FriendWithLog[] = (profiles ?? []).map((p) => {
      const tl  = logMap.get(p.id) ?? null
      const pct = Math.min(100, Math.round((countCompleted(tl ?? {}) / TOTAL) * 100))
      return { profile: p, todayLog: tl, completionPct: pct }
    })

    // Sort: most complete first
    enriched.sort((a, b) => b.completionPct - a.completionPct)

    setFriends(enriched)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { loadFriends() }, [])

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    setAddSuccess(null)
    setAddLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const email = addEmail.trim().toLowerCase()

      if (email === user.email) {
        throw new Error("You can't add yourself.")
      }

      const { data: friendProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .eq('email', email)
        .maybeSingle()

      if (profileError) throw profileError
      if (!friendProfile) {
        throw new Error('No account found with that email. Ask them to sign up first.')
      }

      const { data: existing } = await supabase
        .from('friend_links')
        .select('id')
        .eq('user_id', user.id)
        .eq('friend_user_id', friendProfile.id)
        .maybeSingle()

      if (existing) {
        throw new Error('Already connected with that person.')
      }

      const { error: linkError } = await supabase.from('friend_links').insert({
        user_id: user.id,
        friend_user_id: friendProfile.id,
      })

      if (linkError) throw linkError

      setAddSuccess(`Connected with ${friendProfile.display_name ?? email}!`)
      setAddEmail('')
      loadFriends()
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setAddLoading(false)
    }
  }

  async function handleRemove(friendId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('friend_links')
      .delete()
      .eq('user_id', user.id)
      .eq('friend_user_id', friendId)

    setFriends((prev) => prev.filter((f) => f.profile.id !== friendId))
  }

  // Leaderboard summary
  const leaderId   = friends[0]?.profile.id
  const allLocked  = friends.length > 0 && friends.every(f => f.completionPct >= 100)
  const lockedCount = friends.filter(f => f.completionPct >= 100).length

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-black text-primary">Friends</h1>
          <p className="text-xs text-muted">Accountability partners</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Add friend */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Add accountability partner</p>
          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="friend@email.com"
              required
              className="flex-1 px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="submit"
              disabled={addLoading}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
            >
              {addLoading ? '…' : 'Add'}
            </button>
          </form>

          {addError   && <p className="text-xs text-danger">{addError}</p>}
          {addSuccess && <p className="text-xs text-success">{addSuccess}</p>}
          <p className="text-xs text-muted">The link is one-way — ask them to add you back for mutual tracking.</p>
        </div>

        {/* Friends list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(n => (
              <div key={n} className="h-24 rounded-xl bg-surface border border-border animate-pulse" />
            ))}
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">👥</p>
            <p className="font-semibold mb-1">No partners yet</p>
            <p className="text-sm text-muted">Add a friend by their email above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Leaderboard banner */}
            {friends.length > 1 && (
              <div className="px-4 py-3 rounded-xl bg-surface-2 border border-border/60 flex items-center gap-3">
                <span className="text-lg">🏆</span>
                <p className="text-sm font-semibold flex-1">
                  {allLocked
                    ? "Everyone's locked in today!"
                    : `${friends[0].profile.display_name ?? friends[0].profile.email.split('@')[0]} leads with ${friends[0].completionPct}%`}
                </p>
                {lockedCount > 0 && !allLocked && (
                  <span className="text-xs text-success font-bold">{lockedCount} locked 🔥</span>
                )}
              </div>
            )}

            <p className="text-xs font-semibold text-muted uppercase tracking-wider">
              {friends.length} {friends.length === 1 ? 'partner' : 'partners'} — sorted by today&apos;s progress
            </p>

            {friends.map(({ profile, todayLog }) => {
              const done   = countCompleted(todayLog ?? {})
              const pill   = getFriendStatusPill(done, TOTAL)
              const isLead = profile.id === leaderId && friends.length > 1

              return (
                <div key={profile.id} className="relative">
                  {isLead && (
                    <div className="absolute -top-1 -right-1 z-10 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                      LEADING
                    </div>
                  )}
                  <FriendCard friend={profile} todayLog={todayLog} />
                  <div className="absolute top-3.5 right-3 flex items-center gap-2">
                    <span className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full ${pill.classes}`}>
                      {pill.label}
                    </span>
                    <button
                      onClick={() => handleRemove(profile.id)}
                      className="text-muted hover:text-danger text-xs transition-colors px-1 py-0.5 rounded hover:bg-danger/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Nav />
    </div>
  )
}

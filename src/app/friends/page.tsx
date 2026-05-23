'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import FriendCard from '@/components/FriendCard'
import { getLocalToday } from '@/lib/utils'
import type { Profile, DailyLog } from '@/types/database'

interface FriendWithLog {
  profile: Profile
  todayLog: Partial<DailyLog> | null
}

export default function FriendsPage() {
  const supabase = createClient()

  const [friends, setFriends] = useState<FriendWithLog[]>([])
  const [loading, setLoading] = useState(true)
  const [addEmail, setAddEmail] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
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

    setFriends(
      (profiles ?? []).map((p) => ({
        profile: p,
        todayLog: logMap.get(p.id) ?? null,
      }))
    )
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

      // Find the friend's profile by email
      const { data: friendProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .eq('email', email)
        .maybeSingle()

      if (profileError) throw profileError
      if (!friendProfile) {
        throw new Error('No account found with that email. Ask them to sign up first.')
      }

      // Check if already friends
      const { data: existing } = await supabase
        .from('friend_links')
        .select('id')
        .eq('user_id', user.id)
        .eq('friend_user_id', friendProfile.id)
        .maybeSingle()

      if (existing) {
        throw new Error('Already connected with that person.')
      }

      // Create the link (one-way; they can add back for mutual)
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

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-black text-primary">Friends</h1>
          <p className="text-xs text-muted">Accountability partners</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Add friend form */}
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

          {addError && (
            <p className="text-xs text-danger">{addError}</p>
          )}
          {addSuccess && (
            <p className="text-xs text-success">{addSuccess}</p>
          )}
          <p className="text-xs text-muted">
            They must have an account. The link is one-way — ask them to add you back too.
          </p>
        </div>

        {/* Friends list */}
        {loading ? (
          <p className="text-center text-muted text-sm py-8">Loading…</p>
        ) : friends.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">👥</p>
            <p className="font-semibold mb-1">No partners yet</p>
            <p className="text-sm text-muted">Add a friend by their email above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">
              {friends.length} {friends.length === 1 ? 'partner' : 'partners'}
            </p>
            {friends.map(({ profile, todayLog }) => (
              <div key={profile.id} className="relative">
                <FriendCard friend={profile} todayLog={todayLog} />
                <button
                  onClick={() => handleRemove(profile.id)}
                  className="absolute top-3 right-3 text-muted hover:text-danger text-xs transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Nav />
    </div>
  )
}

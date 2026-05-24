'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toaster'
import { getLocalToday, countCompleted } from '@/lib/utils'

export const NOTIFY_KEY = '75hard_notify_friends'

export function getNotifyEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const v = localStorage.getItem(NOTIFY_KEY)
  return v === null ? true : v === 'true'
}

export function setNotifyEnabled(val: boolean) {
  localStorage.setItem(NOTIFY_KEY, String(val))
}

export function useFriendNotifications(
  friends: Array<{ id: string; display_name: string | null; email: string }>
) {
  const { showToast } = useToast()
  const supabase = createClient()
  // track last known completed count per friend
  const baseline = useRef<Map<string, number>>(new Map())
  // prevent notifications on first poll (just set baseline)
  const initialised = useRef(false)

  const poll = useCallback(async () => {
    if (!getNotifyEnabled() || friends.length === 0) return

    const today = getLocalToday()
    const ids = friends.map(f => f.id)

    const { data: logs } = await supabase
      .from('daily_logs')
      .select('user_id,workout_1_done,workout_2_done,outdoor_workout_done,diet_done,water_done,reading_done,progress_photo_done,no_alcohol_cheat_done')
      .in('user_id', ids)
      .eq('log_date', today)

    const logMap = new Map((logs ?? []).map(l => [l.user_id, l]))

    for (const friend of friends) {
      const log = logMap.get(friend.id)
      const count = log ? countCompleted(log) : 0
      const prev = baseline.current.get(friend.id) ?? 0

      if (!initialised.current) {
        baseline.current.set(friend.id, count)
        continue
      }

      if (count === prev) continue

      const name = friend.display_name?.split(' ')[0] ?? friend.email.split('@')[0]

      if (count === 8 && prev < 8) {
        showToast(`${name} completed their day — all 8 tasks done`)
      } else if (prev === 0 && count > 0) {
        showToast(`${name} started their day (${count}/8)`)
      } else if (count > prev) {
        showToast(`${name} is at ${count}/8 tasks`)
      }

      baseline.current.set(friend.id, count)
    }

    initialised.current = true
  }, [friends, supabase, showToast])

  useEffect(() => {
    if (friends.length === 0) return

    baseline.current = new Map()
    initialised.current = false

    poll()
    const interval = setInterval(poll, 30_000)

    const onFocus = () => poll()
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [friends, poll])
}

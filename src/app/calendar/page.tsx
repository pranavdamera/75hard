'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import CalendarGrid from '@/components/CalendarGrid'
import { getChallengeInfo, countCompleted, computeStreak, addDays, getLocalToday } from '@/lib/utils'
import type { Profile, DailyLog } from '@/types/database'

export default function CalendarPage() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)

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
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    )
  }

  const info = getChallengeInfo(profile?.start_date ?? null)

  const today = getLocalToday()
  const completedDays = logs.filter((l) => l.log_date < today && countCompleted(l) === 8).length
  const partialDays = logs.filter((l) => {
    const n = countCompleted(l)
    return l.log_date < today && n > 0 && n < 8
  }).length
  // Days that have passed (excluding today) minus those with any log entry
  const daysPassed = Math.max(0, info.status === 'in_progress' ? info.dayNumber - 1 : info.status === 'complete' ? 75 : 0)
  const failedDays = Math.max(0, daysPassed - completedDays - partialDays)
  const streak = profile?.start_date ? computeStreak(logs, profile.start_date) : 0

  function handleSelectDay(date: string) {
    router.push(`/dashboard?date=${date}`)
  }

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
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Streak', value: `${streak}🔥`, color: 'text-primary' },
            { label: 'Done', value: completedDays, color: 'text-success' },
            { label: 'Partial', value: partialDays, color: 'text-warning' },
            { label: 'Missed', value: failedDays, color: 'text-danger' },
          ].map((s) => (
            <div key={s.label} className="bg-surface border border-border rounded-xl p-3 text-center">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted mt-0.5 uppercase tracking-wide font-semibold">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap">
          {[
            { color: 'bg-success', label: 'Complete (8/8)' },
            { color: 'bg-warning', label: 'Partial' },
            { color: 'bg-danger/80', label: 'Missed' },
            { color: 'border-2 border-primary', label: 'Today' },
            { color: 'bg-surface', label: 'Future' },
          ].map((l) => (
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
            onSelectDay={handleSelectDay}
          />
        </div>

        {/* Overall progress */}
        {info.status === 'in_progress' && (
          <div className="p-4 rounded-xl bg-surface border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted uppercase tracking-wider font-semibold">
                Overall Progress
              </span>
              <span className="text-sm font-bold text-primary">
                {info.dayNumber}/75
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(info.dayNumber / 75) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-2">
              {info.daysRemaining} days remaining
            </p>
          </div>
        )}

        {info.status === 'complete' && (
          <div className="p-6 rounded-xl bg-success/10 border border-success/30 text-center">
            <p className="text-3xl mb-2">🏆</p>
            <p className="font-bold text-success">Challenge Complete!</p>
            <p className="text-sm text-muted mt-1">You finished all 75 days.</p>
          </div>
        )}
      </div>

      <Nav />
    </div>
  )
}

'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_TASKS, ALL_CHALLENGE_TASK_KEYS } from '@/types/database'
import type { ChallengeTaskKey } from '@/types/database'

const TOTAL_STEPS = 4

const GOAL_OPTIONS = [
  { key: 'cut',      label: 'Lose Fat / Cut',          description: 'Calorie deficit, preserve muscle' },
  { key: 'lean_bulk',label: 'Lean Bulk',                description: 'Slight surplus, build muscle' },
  { key: 'maintain', label: 'Maintain / Recomp',       description: 'Eat at maintenance, body recomp' },
  { key: 'strength', label: 'Strength & Performance',  description: 'Fuel training, prioritize output' },
] as const

const ACTIVITY_OPTIONS = [
  { key: 'sedentary',   label: 'Sedentary',      description: 'Little or no exercise' },
  { key: 'light',       label: 'Light',           description: '1–3 days/week' },
  { key: 'moderate',    label: 'Moderate',        description: '3–5 days/week' },
  { key: 'very_active', label: 'Very Active',     description: '6–7 days/week' },
  { key: 'athlete',     label: 'Athlete',         description: '2× per day, heavy training' },
] as const

export default function OnboardingPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [step, setStep] = useState(0)

  // Step 0 — name + start date
  const [displayName, setDisplayName] = useState('')
  const [startDate,   setStartDate]   = useState('')

  // Step 1 — challenge style
  const [challengeStyle, setChallengeStyle] = useState<'strict' | 'custom'>('strict')

  // Step 2 — task selection
  const [enabledKeys, setEnabledKeys] = useState<Set<ChallengeTaskKey>>(
    new Set(ALL_CHALLENGE_TASK_KEYS)
  )

  // Step 3 — goal + body stats (all optional)
  const [goalType,      setGoalType]      = useState('')
  const [age,           setAge]           = useState('')
  const [sex,           setSex]           = useState('')
  const [heightFt,      setHeightFt]      = useState('')
  const [heightIn,      setHeightIn]      = useState('')
  const [currentWeight, setCurrentWeight] = useState('')
  const [goalWeight,    setGoalWeight]    = useState('')
  const [activityLevel, setActivityLevel] = useState('')

  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, display_name')
        .eq('id', user.id)
        .single()

      if (profile?.onboarding_completed) {
        router.push('/dashboard')
        return
      }
      if (profile?.display_name) setDisplayName(profile.display_name)
      setLoading(false)
    }
    check()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When challenge style changes to strict, re-enable all tasks
  useEffect(() => {
    if (challengeStyle === 'strict') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnabledKeys(new Set(ALL_CHALLENGE_TASK_KEYS))
    }
  }, [challengeStyle])

  function toggleTask(key: ChallengeTaskKey) {
    setEnabledKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
  }

  async function handleFinish() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setError(null)
    setSaving(true)

    try {
      const heightInches = heightFt || heightIn
        ? (parseInt(heightFt || '0', 10) * 12) + parseInt(heightIn || '0', 10)
        : null

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name:        displayName.trim() || null,
          start_date:          startDate || null,
          onboarding_completed: true,
          challenge_style:     challengeStyle,
          goal_type:           goalType  || null,
          age:                 age       ? parseInt(age, 10)    : null,
          sex:                 sex       || null,
          height_inches:       heightInches,
          current_weight_lbs:  currentWeight ? parseFloat(currentWeight) : null,
          goal_weight_lbs:     goalWeight    ? parseFloat(goalWeight)    : null,
          activity_level:      activityLevel || null,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Upsert challenge tasks
      const taskRows = DEFAULT_TASKS.map(t => ({
        user_id:    user.id,
        task_key:   t.task_key,
        task_label: t.task_label,
        enabled:    enabledKeys.has(t.task_key),
        sort_order: t.sort_order,
      }))

      const { error: tasksError } = await supabase
        .from('challenge_tasks')
        .upsert(taskRows, { onConflict: 'user_id,task_key' })

      if (tasksError) throw tasksError

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-surface-3">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8">
        {/* Step counter */}
        <p className="text-xs text-muted mb-6 font-semibold uppercase tracking-wider">
          Step {step + 1} of {TOTAL_STEPS}
        </p>

        {/* ── Step 0: Name + Start Date ── */}
        {step === 0 && (
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="text-2xl font-black mb-1">Welcome.</h1>
              <p className="text-muted text-sm">Let&apos;s set up your challenge.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted block mb-1.5 uppercase tracking-wide font-semibold">Your Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-muted block mb-1.5 uppercase tracking-wide font-semibold">Challenge Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  style={{ colorScheme: 'dark' }}
                />
                <p className="text-xs text-muted mt-1.5">Leave blank to set later in Settings.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Challenge Style ── */}
        {step === 1 && (
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="text-2xl font-black mb-1">Your challenge style</h1>
              <p className="text-muted text-sm">How strict do you want to go?</p>
            </div>

            <div className="space-y-3">
              {[
                {
                  key:         'strict' as const,
                  label:       'Strict 75 Hard',
                  description: 'All 7 tasks every day. No exceptions. The real program.',
                },
                {
                  key:         'custom' as const,
                  label:       'Custom / Recreational',
                  description: 'Choose your own tasks. Build sustainable habits at your pace.',
                },
              ].map(option => (
                <button
                  key={option.key}
                  onClick={() => setChallengeStyle(option.key)}
                  className={[
                    'w-full text-left p-4 rounded-xl border-2 transition-all',
                    challengeStyle === option.key
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface hover:border-surface-3',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div className={[
                      'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center',
                      challengeStyle === option.key ? 'border-primary' : 'border-border',
                    ].join(' ')}>
                      {challengeStyle === option.key && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{option.label}</p>
                      <p className="text-xs text-muted mt-0.5">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Task Selection ── */}
        {step === 2 && (
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="text-2xl font-black mb-1">Daily tasks</h1>
              <p className="text-muted text-sm">
                {challengeStyle === 'strict'
                  ? 'All tasks are enabled for strict 75 Hard.'
                  : 'Choose which tasks to track daily.'}
              </p>
            </div>

            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {DEFAULT_TASKS.map(task => {
                const checked = enabledKeys.has(task.task_key)
                const locked  = challengeStyle === 'strict'

                return (
                  <button
                    key={task.task_key}
                    onClick={() => !locked && toggleTask(task.task_key)}
                    disabled={locked}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
                      locked ? 'cursor-default' : 'hover:bg-surface-2',
                    ].join(' ')}
                  >
                    <div className={[
                      'w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all',
                      checked ? 'bg-primary border-primary' : 'border-border',
                    ].join(' ')}>
                      {checked && (
                        <svg viewBox="0 0 10 10" fill="none" className="w-3 h-3">
                          <path d="M2 5l2 2 4-4" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium">{task.task_label}</span>
                  </button>
                )
              })}
            </div>

            {enabledKeys.size === 0 && (
              <p className="text-xs text-danger">Select at least one task.</p>
            )}
          </div>
        )}

        {/* ── Step 3: Goal + Body Stats ── */}
        {step === 3 && (
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="text-2xl font-black mb-1">Your goal</h1>
              <p className="text-muted text-sm">Optional — used to personalize nutrition recommendations.</p>
            </div>

            {/* Goal type */}
            <div className="space-y-2">
              <label className="text-xs text-muted block uppercase tracking-wide font-semibold">Primary Goal</label>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_OPTIONS.map(g => (
                  <button
                    key={g.key}
                    onClick={() => setGoalType(goalType === g.key ? '' : g.key)}
                    className={[
                      'p-3 rounded-xl border-2 text-left transition-all',
                      goalType === g.key
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-surface hover:border-surface-3',
                    ].join(' ')}
                  >
                    <p className="text-xs font-semibold">{g.label}</p>
                    <p className="text-[10px] text-muted mt-0.5">{g.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Body stats — optional */}
            <div className="space-y-3">
              <p className="text-xs text-muted uppercase tracking-wide font-semibold">
                Body Stats <span className="normal-case text-muted/60 ml-1">(optional, for nutrition calc)</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted block mb-1">Age</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="25"
                    className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">Sex</label>
                  <select value={sex} onChange={e => setSex(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    style={{ colorScheme: 'dark' }}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">Height (ft)</label>
                  <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="5"
                    className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">Height (in)</label>
                  <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="10"
                    className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">Current Weight (lbs)</label>
                  <input type="number" value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} placeholder="180"
                    className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">Goal Weight (lbs)</label>
                  <input type="number" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} placeholder="170"
                    className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted block mb-1">Activity Level</label>
                <select value={activityLevel} onChange={e => setActivityLevel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  style={{ colorScheme: 'dark' }}>
                  <option value="">Select</option>
                  {ACTIVITY_OPTIONS.map(a => (
                    <option key={a.key} value={a.key}>{a.label} — {a.description}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-xs text-danger">{error}</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-surface-2 transition-colors"
            >
              Back
            </button>
          )}

          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={() => {
                if (step === 2 && enabledKeys.size === 0) return
                setStep(s => s + 1)
              }}
              className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Saving…' : "Let's Go"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

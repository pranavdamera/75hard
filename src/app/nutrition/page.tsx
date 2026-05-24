'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import { calcNutrition, type NutritionResult } from '@/lib/utils'
import type { Profile, NutritionGoal } from '@/types/database'

const GOAL_OPTIONS = [
  { key: 'cut',       label: 'Cut',                  emoji: '🔥' },
  { key: 'lean_bulk', label: 'Lean Bulk',             emoji: '💪' },
  { key: 'maintain',  label: 'Maintain / Recomp',    emoji: '⚖️' },
  { key: 'strength',  label: 'Strength / Performance', emoji: '🏋️' },
] as const

const ACTIVITY_OPTIONS = [
  { key: 'sedentary',   label: 'Sedentary',       description: 'Desk job, little exercise' },
  { key: 'light',       label: 'Light',            description: '1–3 workouts/week' },
  { key: 'moderate',    label: 'Moderate',         description: '3–5 workouts/week' },
  { key: 'very_active', label: 'Very Active',      description: '6–7 workouts/week' },
  { key: 'athlete',     label: 'Athlete',          description: 'Twice daily, heavy volume' },
] as const

export default function NutritionPage() {
  const supabase = createClient()

  const [profile,       setProfile]       = useState<Profile | null>(null)
  const [savedGoal,     setSavedGoal]     = useState<NutritionGoal | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [result,        setResult]        = useState<NutritionResult | null>(null)

  // Form state — pre-fill from profile if available
  const [age,           setAge]           = useState('')
  const [sex,           setSex]           = useState('')
  const [heightFt,      setHeightFt]      = useState('')
  const [heightIn,      setHeightIn]      = useState('')
  const [weightLbs,     setWeightLbs]     = useState('')
  const [goalType,      setGoalType]      = useState('maintain')
  const [activityLevel, setActivityLevel] = useState('moderate')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [
        { data: profileData },
        { data: goalData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('nutrition_goals').select('*').eq('user_id', user.id).maybeSingle(),
      ])

      if (profileData) {
        setProfile(profileData)
        if (profileData.age)                setAge(String(profileData.age))
        if (profileData.sex)                setSex(profileData.sex)
        if (profileData.height_inches) {
          setHeightFt(String(Math.floor(profileData.height_inches / 12)))
          setHeightIn(String(profileData.height_inches % 12))
        }
        if (profileData.current_weight_lbs) setWeightLbs(String(profileData.current_weight_lbs))
        if (profileData.activity_level)     setActivityLevel(profileData.activity_level)
        if (profileData.goal_type)          setGoalType(profileData.goal_type)
      }

      if (goalData) setSavedGoal(goalData)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCalculate() {
    const w = parseFloat(weightLbs)
    const h = (parseInt(heightFt || '0', 10) * 12) + parseInt(heightIn || '0', 10)
    const a = parseInt(age, 10)

    if (!w || !h || !a || !sex) return

    const res = calcNutrition({
      weightLbs: w,
      heightInches: h,
      age: a,
      sex,
      activityLevel,
      goalType,
    })
    setResult(res)
  }

  async function handleSave() {
    if (!result) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaving(true)
    try {
      // Save nutrition goal
      const { data, error } = await supabase
        .from('nutrition_goals')
        .upsert({
          user_id:             user.id,
          goal_type:           goalType,
          target_calories:     result.targetCalories,
          protein_g:           result.proteinG,
          carbs_g:             result.carbsG,
          fat_g:               result.fatG,
          maintenance_calories: result.maintenance,
        }, { onConflict: 'user_id' })
        .select('*')
        .single()

      if (error) throw error
      if (data) setSavedGoal(data)

      // Also update profile stats
      const heightInches = (parseInt(heightFt || '0', 10) * 12) + parseInt(heightIn || '0', 10)
      await supabase.from('profiles').update({
        age:                parseInt(age, 10) || null,
        sex:                sex || null,
        height_inches:      heightInches || null,
        current_weight_lbs: parseFloat(weightLbs) || null,
        activity_level:     activityLevel || null,
        goal_type:          goalType || null,
      }).eq('id', user.id)

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
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

  const canCalculate = weightLbs && heightFt && age && sex

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-black text-primary">Nutrition</h1>
          <p className="text-xs text-muted">Macro & calorie targets</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Saved goal card */}
        {savedGoal && (
          <div className="p-4 rounded-xl bg-surface-2 border border-primary/30 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Current Goals</p>
              <p className="text-xs text-muted capitalize">{savedGoal.goal_type?.replace('_', ' ')}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { val: savedGoal.target_calories?.toLocaleString(), label: 'Calories' },
                { val: `${savedGoal.protein_g}g`, label: 'Protein' },
                { val: `${savedGoal.carbs_g}g`,   label: 'Carbs'   },
                { val: `${savedGoal.fat_g}g`,     label: 'Fat'     },
              ].map(item => (
                <div key={item.label} className="bg-surface rounded-xl p-2">
                  <p className="text-base font-black text-foreground">{item.val}</p>
                  <p className="text-[10px] text-muted uppercase tracking-wide">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calculator form */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <p className="text-sm font-semibold">Calculate My Targets</p>

          {/* Goal type */}
          <div>
            <label className="text-xs text-muted block mb-2 uppercase tracking-wide font-semibold">Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map(g => (
                <button
                  key={g.key}
                  onClick={() => setGoalType(g.key)}
                  className={[
                    'py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center gap-2',
                    goalType === g.key
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted hover:border-surface-3',
                  ].join(' ')}
                >
                  <span>{g.emoji}</span>
                  <span className="text-xs">{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Body stats */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted block mb-1 uppercase tracking-wide">Age</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="25" min={10} max={100}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="text-[11px] text-muted block mb-1 uppercase tracking-wide">Sex</label>
              <select value={sex} onChange={e => setSex(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                style={{ colorScheme: 'dark' }}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted block mb-1 uppercase tracking-wide">Height ft</label>
              <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="5" min={3} max={8}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="text-[11px] text-muted block mb-1 uppercase tracking-wide">Height in</label>
              <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="10" min={0} max={11}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-muted block mb-1 uppercase tracking-wide">Current Weight (lbs)</label>
              <input type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="180" min={50} max={600}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
            </div>
          </div>

          {/* Activity level */}
          <div>
            <label className="text-[11px] text-muted block mb-1.5 uppercase tracking-wide font-semibold">Activity Level</label>
            <div className="space-y-1.5">
              {ACTIVITY_OPTIONS.map(a => (
                <button
                  key={a.key}
                  onClick={() => setActivityLevel(a.key)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all text-sm',
                    activityLevel === a.key
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted hover:border-surface-3',
                  ].join(' ')}
                >
                  <div className={[
                    'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                    activityLevel === a.key ? 'border-primary' : 'border-border',
                  ].join(' ')}>
                    {activityLevel === a.key && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <span className="font-medium">{a.label}</span>
                    <span className="text-xs text-muted ml-2">{a.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Calculate
          </button>

          {!canCalculate && (
            <p className="text-xs text-muted text-center">Fill in age, sex, height, and weight to calculate.</p>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
            <p className="text-sm font-semibold">Your Daily Targets</p>

            {/* Main numbers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <p className="text-3xl font-black text-primary">{result.targetCalories.toLocaleString()}</p>
                <p className="text-xs text-muted mt-1 uppercase tracking-wide font-semibold">Calories / Day</p>
                <p className="text-xs text-muted mt-1">Maintenance: {result.maintenance.toLocaleString()} kcal</p>
              </div>

              {[
                { val: `${result.proteinG}g`, label: 'Protein', sub: `${result.proteinG * 4} kcal`, color: 'text-success' },
                { val: `${result.fatG}g`,     label: 'Fat',     sub: `${result.fatG * 9} kcal`,     color: 'text-warning' },
                { val: `${result.carbsG}g`,   label: 'Carbs',   sub: `${result.carbsG * 4} kcal`,   color: 'text-primary' },
                { val: `${result.bmr}`,       label: 'BMR',     sub: 'kcal/day at rest',             color: 'text-muted'   },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl bg-surface-2 text-center">
                  <p className={`text-xl font-black ${item.color}`}>{item.val}</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">{item.label}</p>
                  <p className="text-[10px] text-muted">{item.sub}</p>
                </div>
              ))}
            </div>

            {/* Explanation */}
            <div className="p-3 rounded-xl bg-surface-2 border border-border">
              <p className="text-xs text-foreground leading-relaxed">{result.explanation}</p>
            </div>

            {/* Disclaimer */}
            <div className="p-3 rounded-xl bg-surface-3/50">
              <p className="text-[11px] text-muted leading-relaxed">
                These are estimates based on the Mifflin-St Jeor formula. Adjust based on your weekly weight trend, training performance, hunger, and energy levels.
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Saving…' : 'Save as My Goals'}
            </button>

            {saved && (
              <p className="text-xs text-success text-center">Goals saved ✓ — visible on your dashboard.</p>
            )}
          </div>
        )}

        {/* Profile link note */}
        {profile && !profile.current_weight_lbs && (
          <p className="text-xs text-muted text-center">
            Tip: complete your stats once and they&apos;ll pre-fill here next time.
          </p>
        )}
      </div>

      <Nav />
    </div>
  )
}

'use client'

import { useState } from 'react'
import {
  TASK_TO_LOG_KEY,
  TASK_META,
  type ChallengeTask,
  type ChallengeTaskKey,
  type TaskKey,
  type DailyLog,
} from '@/types/database'

interface DailyChecklistProps {
  tasks: ChallengeTask[]
  log: Partial<DailyLog>
  onToggle: (key: TaskKey) => void
  onSaveDetail: (fields: Partial<DailyLog>) => Promise<void>
  onPhotoUploadClick?: () => void
  disabled?: boolean
}

function Checkmark() {
  return (
    <svg viewBox="0 0 10 10" fill="none" className="w-3 h-3">
      <path d="M2 5l2 2 4-4" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckCircle({ done, onClick, disabled }: { done: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <div className={[
        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150',
        done ? 'bg-success border-success' : 'border-border hover:border-primary',
      ].join(' ')}>
        {done && <Checkmark />}
      </div>
    </button>
  )
}

// ── Workout row (indoor / outdoor) ────────────────────────────────────────

function WorkoutRow({
  task, log, onToggle, onSaveDetail, disabled,
}: {
  task: ChallengeTask
  log: Partial<DailyLog>
  onToggle: (key: TaskKey) => void
  onSaveDetail: (fields: Partial<DailyLog>) => Promise<void>
  disabled?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isIndoor = task.task_key === 'indoor_workout'
  const doneKey  = TASK_TO_LOG_KEY[task.task_key as ChallengeTaskKey] as TaskKey
  const notesKey = (isIndoor ? 'indoor_workout_notes'   : 'outdoor_workout_notes')   as keyof DailyLog
  const minsKey  = (isIndoor ? 'indoor_workout_minutes' : 'outdoor_workout_minutes') as keyof DailyLog

  const [notes,   setNotes]   = useState((log[notesKey] as string  | null) ?? '')
  const [minutes, setMinutes] = useState(String((log[minsKey] as number | null) ?? ''))

  const done    = log[doneKey] === true
  const meta    = TASK_META[task.task_key as ChallengeTaskKey]
  const hasNote = !!log[notesKey]
  const hasMins = !!log[minsKey]

  async function handleSave() {
    setSaving(true)
    await onSaveDetail({
      [notesKey]: notes.trim() || null,
      [minsKey]:  minutes ? parseInt(minutes, 10) : null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="task-card">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <CheckCircle done={done} onClick={() => onToggle(doneKey)} disabled={disabled} />

        <div className="flex-1 min-w-0">
          <span className={['text-sm font-medium', done ? 'text-muted line-through' : 'text-foreground'].join(' ')}>
            {task.task_label}
          </span>
          {!expanded && (hasMins || hasNote) && (
            <p className="text-xs text-muted mt-0.5 truncate">
              {hasMins && `${log[minsKey]} min`}
              {hasMins && hasNote && ' · '}
              {hasNote && (log[notesKey] as string)}
            </p>
          )}
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors shrink-0"
          aria-label="Toggle details"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className={['w-4 h-4 transition-transform duration-200', expanded ? 'rotate-180' : ''].join(' ')}>
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/40 bg-surface-2/30">
          <div className="flex gap-3 pt-2">
            <div className="w-24 shrink-0">
              <label className="text-[11px] text-muted block mb-1 uppercase tracking-wide">Minutes</label>
              <input
                type="number"
                value={minutes}
                onChange={e => setMinutes(e.target.value)}
                placeholder="45"
                min={0}
                max={600}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] text-muted block mb-1 uppercase tracking-wide">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={meta.description}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {saved && <span className="text-xs text-success">Saved ✓</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Diet row ───────────────────────────────────────────────────────────────

function DietRow({
  task, log, onToggle, onSaveDetail, disabled,
}: {
  task: ChallengeTask
  log: Partial<DailyLog>
  onToggle: (key: TaskKey) => void
  onSaveDetail: (fields: Partial<DailyLog>) => Promise<void>
  disabled?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [breakfast, setBreakfast] = useState(log.breakfast ?? '')
  const [lunch, setLunch] = useState(log.lunch ?? '')
  const [dinner, setDinner] = useState(log.dinner ?? '')
  const [snacks, setSnacks] = useState(log.snacks ?? '')

  const done     = log.diet_done === true
  const hasMeals = !!(log.breakfast || log.lunch || log.dinner || log.snacks)

  async function handleSave() {
    setSaving(true)
    await onSaveDetail({
      breakfast: breakfast.trim() || null,
      lunch:     lunch.trim()     || null,
      dinner:    dinner.trim()    || null,
      snacks:    snacks.trim()    || null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="task-card">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <CheckCircle done={done} onClick={() => onToggle('diet_done')} disabled={disabled} />

        <div className="flex-1 min-w-0">
          <span className={['text-sm font-medium', done ? 'text-muted line-through' : 'text-foreground'].join(' ')}>
            {task.task_label}
          </span>
          {hasMeals && !expanded && (
            <p className="text-xs text-muted mt-0.5">Meals logged</p>
          )}
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[11px] text-primary hover:underline shrink-0 px-1 font-medium"
        >
          {expanded ? 'hide' : 'log meals'}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/40 bg-surface-2/30">
          <div className="grid grid-cols-2 gap-2 pt-2">
            {([
              ['Breakfast', breakfast, setBreakfast],
              ['Lunch',     lunch,     setLunch],
              ['Dinner',    dinner,    setDinner],
              ['Snacks',    snacks,    setSnacks],
            ] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, val, setter]) => (
              <div key={label}>
                <label className="text-[11px] text-muted block mb-1 uppercase tracking-wide">{label}</label>
                <textarea
                  value={val}
                  onChange={e => setter(e.target.value)}
                  placeholder={`${label}…`}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-xs placeholder:text-muted focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Saving…' : 'Save Meals'}
            </button>
            {saved && <span className="text-xs text-success">Saved ✓</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Simple row (water, reading, no_alcohol, progress_photo) ───────────────

function SimpleRow({
  task, log, onToggle, onPhotoUploadClick, disabled,
}: {
  task: ChallengeTask
  log: Partial<DailyLog>
  onToggle: (key: TaskKey) => void
  onPhotoUploadClick?: () => void
  disabled?: boolean
}) {
  const doneKey = TASK_TO_LOG_KEY[task.task_key as ChallengeTaskKey] as TaskKey
  const done    = log[doneKey] === true
  const meta    = TASK_META[task.task_key as ChallengeTaskKey]
  const isPhoto = task.task_key === 'progress_photo'

  return (
    <div
      className="task-card flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 active:bg-surface-3 transition-colors cursor-pointer"
      onClick={() => !isPhoto && onToggle(doneKey)}
    >
      <CheckCircle done={done} onClick={() => onToggle(doneKey)} disabled={disabled} />

      <span className={['flex-1 text-sm font-medium', done ? 'text-muted line-through' : 'text-foreground'].join(' ')}>
        {task.task_label}
      </span>

      {isPhoto && onPhotoUploadClick && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onPhotoUploadClick() }}
          className="text-[11px] text-primary hover:underline shrink-0 pr-1 font-medium"
        >
          {done ? 'view' : 'upload'}
        </button>
      )}

      <span className="text-sm opacity-30 shrink-0">{meta.emoji}</span>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

export default function DailyChecklist({
  tasks,
  log,
  onToggle,
  onSaveDetail,
  onPhotoUploadClick,
  disabled,
}: DailyChecklistProps) {
  const enabled = [...tasks].filter(t => t.enabled).sort((a, b) => a.sort_order - b.sort_order)

  if (enabled.length === 0) {
    return (
      <div className="rounded-xl border border-border px-4 py-8 text-center text-sm text-muted">
        No tasks configured.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
      {enabled.map(task => {
        if (task.task_key === 'indoor_workout' || task.task_key === 'outdoor_workout') {
          return (
            <WorkoutRow
              key={task.id}
              task={task}
              log={log}
              onToggle={onToggle}
              onSaveDetail={onSaveDetail}
              disabled={disabled}
            />
          )
        }
        if (task.task_key === 'diet') {
          return (
            <DietRow
              key={task.id}
              task={task}
              log={log}
              onToggle={onToggle}
              onSaveDetail={onSaveDetail}
              disabled={disabled}
            />
          )
        }
        return (
          <SimpleRow
            key={task.id}
            task={task}
            log={log}
            onToggle={onToggle}
            onPhotoUploadClick={onPhotoUploadClick}
            disabled={disabled}
          />
        )
      })}
    </div>
  )
}

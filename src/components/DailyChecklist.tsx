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

// ── Shared checkbox ─────────────────────────────────────────────────────────

function CheckCircle({ done, onClick, disabled }: { done: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={done ? 'Mark incomplete' : 'Mark complete'}
      className="shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
    >
      <div className={[
        'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
        done
          ? 'bg-success border-success shadow-[0_0_8px_rgba(34,197,94,0.4)]'
          : 'border-border hover:border-primary/70',
      ].join(' ')}>
        {done && (
          <svg viewBox="0 0 10 10" fill="none" className="w-3.5 h-3.5 check-pop">
            <path d="M2 5l2 2 4-4" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </button>
  )
}

// ── Expand toggle ────────────────────────────────────────────────────────────

function ExpandButton({ expanded, onClick, label }: { expanded: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-3/60 transition-all shrink-0"
      aria-label={expanded ? 'Collapse' : label}
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 transition-transform duration-250"
        style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
      >
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </button>
  )
}

// ── Smooth expand wrapper ────────────────────────────────────────────────────

function ExpandPanel({ expanded, children }: { expanded: boolean; children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden"
      style={{
        maxHeight: expanded ? '500px' : '0px',
        opacity:   expanded ? 1 : 0,
        transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-out',
      }}
    >
      {children}
    </div>
  )
}

// ── Save row ─────────────────────────────────────────────────────────────────

function SaveRow({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <button
        onClick={onSave}
        disabled={saving}
        className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {saved && (
        <span className="text-xs text-success font-semibold fade-in-up">Saved ✓</span>
      )}
    </div>
  )
}

// ── Workout row (indoor / outdoor) ───────────────────────────────────────────

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
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  const isIndoor = task.task_key === 'indoor_workout'
  const doneKey  = TASK_TO_LOG_KEY[task.task_key as ChallengeTaskKey] as TaskKey
  const notesKey = (isIndoor ? 'indoor_workout_notes'   : 'outdoor_workout_notes')   as keyof DailyLog
  const minsKey  = (isIndoor ? 'indoor_workout_minutes' : 'outdoor_workout_minutes') as keyof DailyLog

  const [notes,   setNotes]   = useState((log[notesKey]  as string  | null) ?? '')
  const [minutes, setMinutes] = useState(String((log[minsKey] as number | null) ?? ''))

  const done    = log[doneKey] === true
  const meta    = TASK_META[task.task_key as ChallengeTaskKey]
  const hasNote = !!(log[notesKey] as string | null)
  const hasMins = !!(log[minsKey]  as number | null)

  async function handleSave() {
    setSaving(true)
    await onSaveDetail({
      [notesKey]: notes.trim() || null,
      [minsKey]:  minutes ? parseInt(minutes, 10) : null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className={[
      'task-card transition-colors duration-200',
      done ? 'bg-success/[0.04]' : '',
    ].join(' ')}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <CheckCircle done={done} onClick={() => onToggle(doneKey)} disabled={disabled} />

        <div className="flex-1 min-w-0">
          <span className={[
            'text-sm font-semibold transition-all duration-200',
            done ? 'text-muted/60 line-through' : 'text-foreground',
          ].join(' ')}>
            {task.task_label}
          </span>
          {!expanded && (hasMins || hasNote) && (
            <p className="text-xs text-muted mt-0.5 truncate">
              {hasMins && `${log[minsKey]} min`}
              {hasMins && hasNote && ' · '}
              {hasNote && String(log[notesKey])}
            </p>
          )}
        </div>

        <span className={['text-base transition-opacity duration-200', done ? 'opacity-100' : 'opacity-25'].join(' ')}>
          {meta.emoji}
        </span>

        <ExpandButton expanded={expanded} onClick={() => setExpanded(v => !v)} label="Add details" />
      </div>

      {/* Expanded detail */}
      <ExpandPanel expanded={expanded}>
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border/40 bg-surface-2/20">
          <div className="flex gap-3">
            <div className="w-24 shrink-0">
              <label className="text-[10px] text-muted block mb-1.5 uppercase tracking-widest font-semibold">Minutes</label>
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
              <label className="text-[10px] text-muted block mb-1.5 uppercase tracking-widest font-semibold">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={meta.description}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>
          </div>
          <SaveRow onSave={handleSave} saving={saving} saved={saved} />
        </div>
      </ExpandPanel>
    </div>
  )
}

// ── Diet row ──────────────────────────────────────────────────────────────────

function DietRow({
  task, log, onToggle, onSaveDetail, disabled,
}: {
  task: ChallengeTask
  log: Partial<DailyLog>
  onToggle: (key: TaskKey) => void
  onSaveDetail: (fields: Partial<DailyLog>) => Promise<void>
  disabled?: boolean
}) {
  const [expanded,  setExpanded]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [breakfast, setBreakfast] = useState(log.breakfast ?? '')
  const [lunch,     setLunch]     = useState(log.lunch     ?? '')
  const [dinner,    setDinner]    = useState(log.dinner    ?? '')
  const [snacks,    setSnacks]    = useState(log.snacks    ?? '')

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
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className={['task-card transition-colors duration-200', done ? 'bg-success/[0.04]' : ''].join(' ')}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <CheckCircle done={done} onClick={() => onToggle('diet_done')} disabled={disabled} />

        <div className="flex-1 min-w-0">
          <span className={[
            'text-sm font-semibold transition-all duration-200',
            done ? 'text-muted/60 line-through' : 'text-foreground',
          ].join(' ')}>
            {task.task_label}
          </span>
          {hasMeals && !expanded && (
            <p className="text-xs text-muted mt-0.5">Meals logged ✓</p>
          )}
        </div>

        <span className={['text-base transition-opacity duration-200', done ? 'opacity-100' : 'opacity-25'].join(' ')}>
          🥗
        </span>

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[11px] text-primary/80 hover:text-primary font-semibold shrink-0 px-2 py-1 rounded-md hover:bg-primary/10 transition-all"
        >
          {expanded ? 'hide' : 'meals'}
        </button>
      </div>

      <ExpandPanel expanded={expanded}>
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border/40 bg-surface-2/20">
          <div className="grid grid-cols-2 gap-2.5">
            {([
              ['Breakfast', breakfast, setBreakfast],
              ['Lunch',     lunch,     setLunch],
              ['Dinner',    dinner,    setDinner],
              ['Snacks',    snacks,    setSnacks],
            ] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, val, setter]) => (
              <div key={label}>
                <label className="text-[10px] text-muted block mb-1 uppercase tracking-widest font-semibold">{label}</label>
                <textarea
                  value={val}
                  onChange={e => setter(e.target.value)}
                  placeholder={`${label}…`}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-xs placeholder:text-muted/50 focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
            ))}
          </div>
          <SaveRow onSave={handleSave} saving={saving} saved={saved} />
        </div>
      </ExpandPanel>
    </div>
  )
}

// ── Simple row (water, reading, no_alcohol, progress_photo) ──────────────────

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
      role="button"
      tabIndex={0}
      onClick={() => !isPhoto && onToggle(doneKey)}
      onKeyDown={e => e.key === 'Enter' && !isPhoto && onToggle(doneKey)}
      className={[
        'task-card flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors duration-200',
        done ? 'bg-success/[0.04]' : 'hover:bg-surface-2/60 active:bg-surface-3/60',
      ].join(' ')}
    >
      <CheckCircle done={done} onClick={() => onToggle(doneKey)} disabled={disabled} />

      <span className={[
        'flex-1 text-sm font-semibold transition-all duration-200',
        done ? 'text-muted/60 line-through' : 'text-foreground',
      ].join(' ')}>
        {task.task_label}
      </span>

      {isPhoto && onPhotoUploadClick && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onPhotoUploadClick() }}
          className="text-[11px] text-primary/80 hover:text-primary font-semibold px-2 py-1 rounded-md hover:bg-primary/10 transition-all shrink-0"
        >
          {done ? 'view' : 'upload'}
        </button>
      )}

      <span className={['text-base transition-opacity duration-200', done ? 'opacity-100' : 'opacity-25'].join(' ')}>
        {meta.emoji}
      </span>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

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
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/60">
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

import Link from 'next/link'

const rules = [
  'Two 45-minute workouts — one must be outdoors',
  'Follow a diet. No cheat meals, no alcohol.',
  'Drink 1 gallon of water',
  'Read 10 pages of non-fiction',
  'Take a daily progress photo',
]

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="flex flex-col justify-center min-h-dvh px-6 max-w-lg mx-auto">
        <div className="mb-3">
          <span className="text-xs font-semibold text-primary tracking-widest uppercase">
            75 Hard
          </span>
        </div>
        <h1 className="text-[clamp(3rem,12vw,5.5rem)] font-black leading-[0.9] tracking-tighter mb-6">
          No<br />
          excuses.<br />
          <span className="text-primary">75 days.</span>
        </h1>
        <p className="text-muted leading-relaxed mb-10 max-w-xs text-sm">
          The mental toughness challenge that reshapes how you think, move, and show up.
          Track daily. Stay locked in with an accountability partner.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login?tab=signup"
            className="px-6 py-3 rounded-lg font-bold text-sm text-white bg-primary hover:opacity-90 transition-opacity"
          >
            Start the challenge
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg font-bold text-sm border border-border bg-surface text-foreground hover:bg-surface-2 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Rules ────────────────────────────────────────── */}
      <section className="px-6 py-20 max-w-lg mx-auto border-t border-border">
        <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-8">
          The 5 rules — all of them, every day
        </p>
        <ol className="space-y-4">
          {rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="text-xs font-mono text-primary mt-0.5 w-4 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-sm leading-relaxed text-foreground">{rule}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-danger mt-8">
          Miss one rule and you restart from Day 1.
        </p>
      </section>

      {/* ── What the app does ─────────────────────────────── */}
      <section className="px-6 py-20 max-w-lg mx-auto border-t border-border">
        <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-8">
          Built for daily use
        </p>
        <div className="space-y-6">
          {[
            { label: 'Daily checklist', body: '8 items. Tap each one off. That\'s the whole loop.' },
            { label: '75-day calendar', body: 'Every day is green, yellow, or red. No hiding from yourself.' },
            { label: 'Accountability partner', body: 'Add a friend. See their progress in real time. They see yours.' },
            { label: 'Progress photos', body: 'One per day. Optional to upload, required to face.' },
          ].map(f => (
            <div key={f.label} className="flex gap-4">
              <div className="w-px bg-border shrink-0 mt-1" />
              <div>
                <p className="text-sm font-semibold mb-1">{f.label}</p>
                <p className="text-sm text-muted leading-relaxed">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="px-6 py-20 max-w-lg mx-auto border-t border-border">
        <p className="text-2xl font-black mb-6">
          Monday starts now.<br />
          <span className="text-primary">Are you in?</span>
        </p>
        <Link
          href="/login?tab=signup"
          className="inline-block px-8 py-3.5 rounded-lg font-bold text-sm text-white bg-primary hover:opacity-90 transition-opacity"
        >
          Create your account
        </Link>
      </section>

      <footer className="px-6 py-8 border-t border-border text-xs text-muted">
        75 Hard Tracker
      </footer>
    </main>
  )
}

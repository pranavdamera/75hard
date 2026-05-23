import Link from 'next/link'

const features = [
  { emoji: '✅', title: 'Daily Checklist', body: '8 tasks. No exceptions. Tap to check off each one.' },
  { emoji: '📅', title: '75-Day Calendar', body: 'Visual grid showing every day — green, yellow, or red.' },
  { emoji: '📸', title: 'Progress Photos', body: 'Upload your daily photo and watch yourself transform.' },
  { emoji: '👥', title: 'Accountability Partner', body: 'Add a friend. See their progress. Stay locked in together.' },
  { emoji: '🔥', title: 'Streak Tracker', body: "Current streak front and center. Don't break the chain." },
  { emoji: '📖', title: 'Daily Notes', body: 'Log what you learned, what was hard, what you crushed.' },
]

const rules = [
  'Two 45-minute workouts (one must be outdoors)',
  'Follow a diet — no cheat meals, no alcohol',
  'Drink 1 gallon of water',
  'Read 10 pages of non-fiction',
  'Take a daily progress photo',
]

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center min-h-dvh px-6 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 10%, rgba(249,115,22,0.13) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface text-sm text-muted mb-8">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            75 days. No excuses.
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none mb-4">
            75 <span className="text-primary">Hard</span>
            <br />
            Tracker
          </h1>
          <p className="text-lg text-muted leading-relaxed mb-10 max-w-sm mx-auto">
            The mental toughness challenge that changes everything. Track daily. Stay accountable.
            Finish what you started.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login?tab=signup"
              className="px-8 py-3.5 rounded-xl font-bold text-base text-white bg-primary hover:opacity-90 transition-opacity"
            >
              Start the Challenge
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-xl font-bold text-base border border-border bg-surface text-foreground hover:bg-surface-2 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Rules ────────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-2 text-center">The 5 Rules</h2>
        <p className="text-muted text-center mb-8 text-sm">
          All 5 every day. Miss one and you restart from Day 1.
        </p>
        <ul className="space-y-3">
          {rules.map((rule, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-4 rounded-xl bg-surface border border-border"
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-primary"
                style={{ background: 'rgba(249,115,22,0.15)' }}
              >
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed">{rule}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-2 text-center">Everything you need</h2>
        <p className="text-muted text-center mb-10 text-sm">
          Built to be used every day. Open, check, close.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div key={f.title} className="p-5 rounded-xl bg-surface border border-border">
              <div className="text-2xl mb-3">{f.emoji}</div>
              <div className="font-semibold mb-1">{f.title}</div>
              <div className="text-sm text-muted leading-relaxed">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="px-6 py-20 text-center">
        <p className="text-muted text-sm mb-4">Monday starts now.</p>
        <Link
          href="/login?tab=signup"
          className="inline-block px-10 py-4 rounded-xl font-bold text-base text-white bg-primary hover:opacity-90 transition-opacity"
        >
          Create Your Account
        </Link>
      </section>

      <footer className="text-center py-8 text-muted text-xs border-t border-border">
        75 Hard Tracker — Built for the grind.
      </footer>
    </main>
  )
}

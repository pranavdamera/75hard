'use client'

export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'login' | 'signup'>(
    searchParams.get('tab') === 'signup' ? 'signup' : 'login'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const supabase = createClient()

  function switchTab(newTab: 'login' | 'signup') {
    setTab(newTab)
    setError(null)
    setMessage(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (tab === 'signup') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name || email.split('@')[0] },
          },
        })
        if (signUpError) throw signUpError

        // Upsert profile — handles trigger race and the case where trigger is absent
        if (signUpData.user) {
          await supabase.from('profiles').upsert(
            {
              id: signUpData.user.id,
              email: signUpData.user.email!,
              display_name: name || email.split('@')[0],
            },
            { onConflict: 'id' }
          )
        }

        if (signUpData.session) {
          setMessage('Account created! Redirecting...')
          router.push('/dashboard')
          router.refresh()
        } else {
          setMessage('Account created! Check your email to confirm, then sign in.')
          setTab('login')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 py-12">
      {/* Logo / back link */}
      <Link href="/" className="text-muted text-sm mb-10 hover:text-foreground transition-colors">
        ← 75 Hard Tracker
      </Link>

      <div className="w-full max-w-sm">
        {/* Tab switcher */}
        <div className="flex rounded-xl bg-surface border border-border p-1 mb-8">
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={[
                'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
                tab === t
                  ? 'bg-surface-2 text-foreground shadow'
                  : 'text-muted hover:text-foreground',
              ].join(' ')}
            >
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <h1 className="text-2xl font-bold mb-1">
          {tab === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-muted text-sm mb-8">
          {tab === 'login'
            ? 'Sign in to your tracker.'
            : 'Start your 75 Hard journey today.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'signup' && (
            <div>
              <label className="text-sm text-muted block mb-1.5">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
          )}
          <div>
            <label className="text-sm text-muted block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-primary hover:opacity-90 disabled:opacity-50 transition-opacity mt-2"
          >
            {loading ? 'Loading…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-muted text-sm mt-6">
          {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => switchTab(tab === 'login' ? 'signup' : 'login')}
            className="text-primary hover:underline font-medium"
          >
            {tab === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <LoginForm />
    </Suspense>
  )
}

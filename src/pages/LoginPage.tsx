import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const schema = z.object({
  email:    z.string().email('Email non valida'),
  password: z.string().min(1, 'Password obbligatoria'),
})
type FormValues = z.infer<typeof schema>

function ShieldMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
      <path d="M11 2.5L3.5 5.5v6c0 4.5 3.35 8.25 7.5 9.25C15.15 19.75 18.5 16 18.5 11.5v-6L11 2.5Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 11.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    try {
      await login(data)
      navigate('/repositories', { replace: true })
    } catch {
      toast.error('Credenziali non valide')
    }
  }

  return (
    <div
      className="min-h-screen bg-[var(--bg)] flex"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* ── Left panel: form ─────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 max-w-[440px]">
        {/* Back */}
        <Link
          to="/"
          className="flex items-center gap-2 text-[var(--fg-3)] hover:text-[var(--fg-2)] mb-12 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12 text-[var(--fg)]">
          <span className="text-[var(--accent)]"><ShieldMark /></span>
          <span className="font-display text-lg font-700 tracking-tight">
            Code<span className="text-[var(--accent)]">Guardian</span>
          </span>
        </div>

        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <h1 className="font-display font-700 text-3xl tracking-tight text-[var(--fg)] mb-2">
            Accedi
          </h1>
          <p className="text-sm text-[var(--fg-3)] font-light">
            Non hai un account?{' '}
            <Link to="/register" className="text-[var(--accent)] hover:brightness-110 transition-all">
              Registrati
            </Link>
          </p>
        </div>

        {/* Form */}
        {/* Demo credentials banner */}
        {import.meta.env.VITE_MOCK_MODE === 'true' && (
          <div className="mb-6 border border-[var(--accent)] bg-[var(--accent-dim)] rounded-[var(--radius-sm)] px-4 py-3 animate-fade-up">
            <p className="data-label text-[var(--accent)] mb-2">DEMO MODE · CREDENZIALI DI TEST</p>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="data-label w-20">EMAIL</span>
                <button
                  type="button"
                  className="font-mono text-xs text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
                  onClick={() => { void navigator.clipboard.writeText('test@codeguardian.dev') }}
                  title="Copia"
                >
                  test@codeguardian.dev
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="data-label w-20">PASSWORD</span>
                <button
                  type="button"
                  className="font-mono text-xs text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
                  onClick={() => { void navigator.clipboard.writeText('Test1234!') }}
                  title="Copia"
                >
                  Test1234!
                </button>
              </div>
            </div>
            <button
              type="button"
              className="mt-3 w-full text-center font-mono text-[11px] text-[var(--accent)] border border-[var(--accent)] py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-all"
              onClick={() => {
                setValue('email', 'test@codeguardian.dev', { shouldValidate: true })
                setValue('password', 'Test1234!', { shouldValidate: true })
              }}
            >
              → Compila automaticamente
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 animate-fade-up delay-100"
        >
          <div className="space-y-1.5">
            <label className="data-label">EMAIL</label>
            <Input
              type="email"
              placeholder="tu@esempio.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="font-mono text-[11px] text-[var(--danger)]">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="data-label">PASSWORD</label>
            <div className="relative">
              <Input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)] hover:text-[var(--fg-2)] transition-colors"
                onClick={() => setShowPwd(s => !s)}
              >
                {showPwd
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="font-mono text-[11px] text-[var(--danger)]">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Accedi
          </Button>
        </form>
      </div>

      {/* ── Right panel: decorative ──────────────────────────── */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-end p-12 bg-grid border-l border-[var(--border)] relative overflow-hidden"
      >
        {/* Accent glow */}
        <div
          className="pointer-events-none absolute bottom-0 right-0"
          style={{
            width: 500,
            height: 500,
            background: 'radial-gradient(ellipse at bottom right, rgba(200,255,0,0.06) 0%, transparent 70%)',
          }}
        />

        {/* Mock report card */}
        <div className="relative border border-[var(--border-mid)] bg-[var(--surface)] p-6 max-w-sm">
          <div className="data-label text-[var(--accent)] mb-4">SECURITY REPORT · LIVE</div>
          {[
            { label: 'AUTH MODULE',     score: 94, ok: true },
            { label: 'DEPS AUDIT',      score: 71, ok: false },
            { label: 'INPUT VALIDATION',score: 88, ok: true },
          ].map(({ label, score, ok }) => (
            <div key={label} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="data-label">{label}</span>
                <span
                  className="font-mono text-xs"
                  style={{
                    color: ok ? 'var(--success)' : 'var(--warning)',
                    fontFeatureSettings: '"tnum"',
                  }}
                >
                  {score}
                </span>
              </div>
              <div className="h-[2px] bg-[var(--surface-3)]">
                <div
                  style={{
                    width: `${score}%`,
                    height: '100%',
                    background: ok ? 'var(--success)' : 'var(--warning)',
                  }}
                />
              </div>
            </div>
          ))}
          <div className="border-t border-[var(--border)] mt-5 pt-4 flex items-center gap-2">
            <span className="led bg-[var(--accent)] shadow-[0_0_4px_var(--accent)]" />
            <span className="data-label text-[var(--accent)]">analysis running…</span>
          </div>
        </div>

        <p
          className="relative font-display font-700 mt-8 text-[var(--fg-3)] leading-tight"
          style={{ fontSize: '48px', letterSpacing: '-0.04em' }}
        >
          Proteggi<br />il tuo codice.
        </p>
      </div>
    </div>
  )
}

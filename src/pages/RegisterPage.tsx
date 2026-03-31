import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, ArrowLeft, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const schema = z.object({
  username: z
    .string()
    .min(4, 'Minimo 4 caratteri')
    .max(20, 'Massimo 20 caratteri')
    .regex(/^[a-zA-Z0-9]+$/, 'Solo lettere e numeri'),
  email: z.string().email('Email non valida'),
  password: z
    .string()
    .min(8, 'Minimo 8 caratteri')
    .regex(/[A-Z]/, '1 maiuscola')
    .regex(/[a-z]/, '1 minuscola')
    .regex(/[0-9]/, '1 numero')
    .regex(/[^A-Za-z0-9]/, '1 carattere speciale'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Le password non coincidono',
  path: ['confirmPassword'],
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

const pwdChecks = [
  { label: '8+ caratteri',      test: (p: string) => p.length >= 8 },
  { label: 'Maiuscola',         test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Minuscola',         test: (p: string) => /[a-z]/.test(p) },
  { label: 'Numero',            test: (p: string) => /[0-9]/.test(p) },
  { label: 'Carattere speciale',test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function PasswordChecks({ value }: { value: string }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
      {pwdChecks.map(({ label, test }) => {
        const ok = test(value)
        return (
          <div key={label} className="flex items-center gap-1.5">
            {ok
              ? <Check className="h-3 w-3 text-[var(--success)]" />
              : <X className="h-3 w-3 text-[var(--fg-3)]" />
            }
            <span className="font-mono text-[10px]" style={{ color: ok ? 'var(--success)' : 'var(--fg-3)' }}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  const password = watch('password', '')

  const onSubmit = async (data: FormValues) => {
    try {
      await registerUser({ username: data.username, email: data.email, password: data.password })
      toast.success('Account creato. Benvenuto.')
      navigate('/repositories', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error('Registrazione fallita', { description: msg ?? 'Riprova più tardi.' })
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Left: form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 max-w-[480px]">
        <Link
          to="/"
          className="flex items-center gap-2 text-[var(--fg-3)] hover:text-[var(--fg-2)] mb-12 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>

        <div className="flex items-center gap-2.5 mb-12 text-[var(--fg)]">
          <span className="text-[var(--accent)]"><ShieldMark /></span>
          <span className="font-display text-lg font-700 tracking-tight">
            Code<span className="text-[var(--accent)]">Guardian</span>
          </span>
        </div>

        <div className="mb-8 animate-fade-up">
          <h1 className="font-display font-700 text-3xl tracking-tight text-[var(--fg)] mb-2">
            Crea account
          </h1>
          <p className="text-sm text-[var(--fg-3)] font-light">
            Hai già un account?{' '}
            <Link to="/login" className="text-[var(--accent)] hover:brightness-110 transition-all">
              Accedi
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 animate-fade-up delay-100">
          <div className="space-y-1.5">
            <label className="data-label">USERNAME</label>
            <Input placeholder="mario_rossi" autoComplete="username" {...register('username')} />
            {errors.username
              ? <p className="font-mono text-[11px] text-[var(--danger)]">{errors.username.message}</p>
              : <p className="font-mono text-[11px] text-[var(--fg-3)]">4–20 caratteri, solo lettere e numeri</p>
            }
          </div>

          <div className="space-y-1.5">
            <label className="data-label">EMAIL</label>
            <Input type="email" placeholder="tu@esempio.com" autoComplete="email" {...register('email')} />
            {errors.email && <p className="font-mono text-[11px] text-[var(--danger)]">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="data-label">PASSWORD</label>
            <div className="relative">
              <Input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)] hover:text-[var(--fg-2)] transition-colors"
                onClick={() => setShowPwd(s => !s)}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordChecks value={password} />
            {errors.password && <p className="font-mono text-[11px] text-[var(--danger)]">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="data-label">CONFERMA PASSWORD</label>
            <Input type="password" placeholder="••••••••" autoComplete="new-password" {...register('confirmPassword')} />
            {errors.confirmPassword && (
              <p className="font-mono text-[11px] text-[var(--danger)]">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Crea account
          </Button>
        </form>
      </div>

      {/* Right: decorative */}
      <div className="hidden lg:flex flex-1 flex-col justify-end p-12 bg-grid border-l border-[var(--border)] relative overflow-hidden">
        <div
          className="pointer-events-none absolute top-0 left-0"
          style={{
            width: 500,
            height: 500,
            background: 'radial-gradient(ellipse at top left, rgba(200,255,0,0.05) 0%, transparent 70%)',
          }}
        />
        {/* Animated scan line */}
        <div
          className="pointer-events-none absolute inset-x-0 h-px bg-[var(--accent)] opacity-20"
          style={{
            animation: 'scanline 4s linear infinite',
            top: 0,
          }}
        />

        {/* Feature list */}
        <div className="relative space-y-3 mb-8">
          {[
            'Analisi statica del codice con LLM agents',
            'Report di sicurezza OWASP-compliant',
            'Remediation automatica con codice suggerito',
            'Real-time updates via WebSocket',
            'Storico analisi e confronto versioni',
          ].map((feat, i) => (
            <div
              key={i}
              className="flex items-center gap-3 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="led bg-[var(--accent)] opacity-70" />
              <span className="font-mono text-xs text-[var(--fg-2)]">{feat}</span>
            </div>
          ))}
        </div>

        <p
          className="relative font-display font-700 text-[var(--fg-3)] leading-tight"
          style={{ fontSize: '48px', letterSpacing: '-0.04em' }}
        >
          Qualità.<br />Sicurezza.<br />Chiarezza.
        </p>
      </div>
    </div>
  )
}

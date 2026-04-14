import { Link } from 'react-router-dom'
import { ArrowRight, Code2, Lock, FileText, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── Shield logo ────────────────────────────────────────────
function Shield() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M11 2.5L3.5 5.5v6c0 4.5 3.35 8.25 7.5 9.25C15.15 19.75 18.5 16 18.5 11.5v-6L11 2.5Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path
        d="M8 11.5l2 2 4-4"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Terminal-style metric block ────────────────────────────
function MetricBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
      <p
        className="font-mono text-3xl font-300 text-[var(--accent)] tracking-tight leading-none"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {value}
      </p>
      <p className="data-label mt-2">{label}</p>
    </div>
  )
}

// ─── Analysis area card ─────────────────────────────────────
const areas = [
  {
    id: '01',
    icon: Code2,
    title: 'Audit Codice',
    description:
      'Analisi statica del sorgente, rilevamento bug, verifica copertura test e metriche di complessità ciclomatica.',
    tag: 'STATIC · COVERAGE · COMPLEXITY',
  },
  {
    id: '02',
    icon: Lock,
    title: 'Audit Sicurezza',
    description:
      'Scansione dipendenze per CVE, conformità OWASP Top-10, identificazione pattern di codice insicuro.',
    tag: 'OWASP · CVE · SAST',
  },
  {
    id: '03',
    icon: FileText,
    title: 'Audit Documentazione',
    description:
      'Verifica completezza, coerenza semantica tra documentazione e implementazione, analisi coverage API.',
    tag: 'COMPLETENESS · COHERENCE · API',
  },
]

// ─── Fake terminal output ────────────────────────────────────
const terminalLines = [
  { prefix: '$', text: 'codeguardian analyze ./my-project', accent: false },
  { prefix: '›', text: 'Cloning repository… done', accent: false },
  { prefix: '›', text: 'Running code analysis agent', accent: false },
  { prefix: '›', text: 'Running security agent', accent: false },
  { prefix: '›', text: 'Running documentation agent', accent: false },
  { prefix: '✓', text: 'Analysis complete  [3m 42s]', accent: true },
  { prefix: '', text: '', accent: false },
  { prefix: '', text: 'QUALITY     87/100   ▁▂▃▄▅▆▇█  HIGH', accent: false },
  { prefix: '', text: 'SECURITY    62/100   ▁▂▃▄▅      MED ', accent: false },
  { prefix: '', text: 'DOCS        91/100   ▁▂▃▄▅▆▇██  HIGH', accent: false },
  { prefix: '', text: '', accent: false },
  { prefix: '', text: '3 critical  ·  12 warnings  ·  8 info', accent: false },
]

// ─── Feature list item ───────────────────────────────────────
function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" strokeWidth={2} />
      <span className="text-sm text-[var(--fg-2)] font-light">{children}</span>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────
export function LandingPage() {
  return (
    <div
      className="min-h-screen bg-[var(--bg)] text-[var(--fg)]"
      style={{ fontFamily: 'var(--font-body)' }}
    >

      {/* ══ NAV ════════════════════════════════════════════════ */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-13 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5 text-[var(--fg)]">
            <span className="text-[var(--accent)]"><Shield /></span>
            <span className="font-display text-[15px] font-700 tracking-tight">
              Code<span className="text-[var(--accent)]">Guardian</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Accedi</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Inizia gratis</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ══ HERO ═══════════════════════════════════════════════ */}
      <section className="relative pt-28 pb-0 overflow-hidden">
        {/* Dot grid background */}
        <div className="absolute inset-0 bg-dot opacity-100" />

        {/* Accent glow — top centre */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            width: 600,
            height: 300,
            background: 'radial-gradient(ellipse at center top, rgba(200,255,0,0.07) 0%, transparent 70%)',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6">
          {/* Eyebrow */}
          <div className="animate-fade-up flex items-center gap-3 mb-8">
            <span className="data-label">CODEGUARDIAN · v1.0</span>
            <span className="h-px flex-1 max-w-[60px] bg-[var(--border-mid)]" />
              <span className="data-label text-[var(--accent)]">{new Date().getFullYear()}</span>
            </div>
            {/* Headline — oversized, Syne 800 */}
          <h1
            className="animate-fade-up delay-100 font-display font-800 text-[var(--fg)] leading-[0.92] tracking-[-0.04em]"
            style={{ fontSize: 'clamp(52px, 9vw, 104px)' }}
          >
            Intelligenza<br />
            <span className="text-[var(--accent)]">artificiale</span><br />
            per il tuo codice.
          </h1>

          {/* Sub */}
          <p className="animate-fade-up delay-200 mt-8 text-[var(--fg-2)] font-light text-lg max-w-xl leading-relaxed">
            Analisi multi-agente di repository GitHub: qualità del codice, sicurezza
            e documentazione. Report dettagliati in pochi minuti.
          </p>

          {/* CTA */}
          <div className="animate-fade-up delay-300 mt-10 flex items-center gap-4">
            <Button size="lg" asChild>
              <Link to="/register">
                Crea account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Accedi</Link>
            </Button>
          </div>

          {/* ── Terminal block ─────────────────────────────────── */}
          <div className="animate-fade-up delay-500 mt-20 relative">
            {/* Header bar */}
            <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border-mid)] border-b-0 rounded-t-[var(--radius)] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)] opacity-70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)] opacity-70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)] opacity-70" />
              <span className="ml-3 data-label">codeguardian — zsh</span>
            </div>
            {/* Terminal body */}
            <div
              className="bg-[var(--surface)] border border-[var(--border-mid)] rounded-b-[var(--radius)] p-6 overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)',
              }}
            >
              {terminalLines.map((line, i) => (
                <div
                  key={i}
                  className="flex gap-3 leading-7 animate-fade-in"
                  style={{ animationDelay: `${600 + i * 80}ms`, animationFillMode: 'both' }}
                >
                  <span
                    className="font-mono text-sm shrink-0 w-4"
                    style={{ color: line.accent ? 'var(--accent)' : 'var(--fg-3)' }}
                  >
                    {line.prefix}
                  </span>
                  <span
                    className="font-mono text-sm"
                    style={{ color: line.accent ? 'var(--accent)' : line.prefix === '$' ? 'var(--fg)' : 'var(--fg-2)' }}
                  >
                    {line.text}
                    {i === terminalLines.length - 1 && (
                      <span className="inline-block w-[7px] h-[14px] bg-[var(--fg-3)] ml-1 animate-blink align-middle" />
                    )}
                  </span>
                </div>
              ))}
            </div>
            {/* Fade out bottom */}
            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[var(--bg)] to-transparent rounded-b-[var(--radius)] pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ══ METRICS ════════════════════════════════════════════ */}
      <section className="relative border-y border-[var(--border)] mt-20">
        <div className="mx-auto max-w-6xl px-6 py-0">
          <div className="grid grid-cols-4 divide-x divide-[var(--border)]">
            <MetricBlock value="3"      label="aree di analisi" />
            <MetricBlock value="< 5m"   label="tempo medio per repo" />
            <MetricBlock value="47"     label="use case coperti" />
            <MetricBlock value="AI"     label="powered by LLM agents" />
          </div>
        </div>
      </section>

      {/* ══ AREAS ══════════════════════════════════════════════ */}
      <section className="py-32 px-6">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          <div className="flex items-baseline justify-between mb-16">
            <h2
              className="font-display font-700 text-[var(--fg)] tracking-tight"
              style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
            >
              Tre agenti.<br />Un unico report.
            </h2>
            <span className="data-label hidden md:block">ANALISI · MULTI-AGENTE</span>
          </div>

          {/* Three columns */}
          <div className="grid md:grid-cols-3 gap-0 border border-[var(--border)] divide-x divide-[var(--border)]">
            {areas.map(({ id, icon: Icon, title, description, tag }) => (
              <div
                key={id}
                className="p-8 group hover:bg-[var(--surface)] transition-colors duration-200"
              >
                <div className="data-label mb-6">{id}</div>

                <div
                  className="inline-flex h-10 w-10 items-center justify-center mb-5
                              border border-[var(--border-mid)] text-[var(--fg-2)]
                              group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]
                              transition-colors duration-200"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>

                <h3
                  className="font-display font-700 text-[var(--fg)] mb-3 tracking-tight"
                  style={{ fontSize: '18px' }}
                >
                  {title}
                </h3>
                <p className="text-sm text-[var(--fg-2)] font-light leading-relaxed mb-6">
                  {description}
                </p>
                <p className="data-label text-[var(--accent)]">{tag}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ═══════════════════════════════════════════ */}
      <section className="py-24 px-6 border-t border-[var(--border)]">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="data-label text-[var(--accent)] mb-4">PERCHÉ CODEGUARDIAN</p>
              <h2
                className="font-display font-700 text-[var(--fg)] tracking-tight mb-8"
                style={{ fontSize: 'clamp(24px, 3.5vw, 40px)' }}
              >
                Costruito per<br />team engineering seri.
              </h2>
              <div className="space-y-4">
                <Feature>Report multi-livello: overview, issue detail, remediation con codice suggerito</Feature>
                <Feature>Aggiornamenti real-time via WebSocket durante l'analisi</Feature>
                <Feature>Storico analisi con confronto tra versioni successive</Feature>
                <Feature>Classifica repository per qualità complessiva</Feature>
                <Feature>Export in JSON, PDF, CSV, Markdown</Feature>
                <Feature>Integrazione OAuth con account GitHub privati</Feature>
              </div>
              <div className="mt-10">
                <Button asChild>
                  <Link to="/register">
                    Inizia adesso
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Score preview */}
            <div className="border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5">
              <div className="flex items-center justify-between mb-2">
                <p className="font-display font-700 text-sm">my-project · report #47</p>
                <span className="data-label text-[var(--accent)]">COMPLETED</span>
              </div>
              {[
                { label: 'CODE QUALITY',    value: 87, color: 'var(--success)' },
                { label: 'SECURITY',        value: 62, color: 'var(--warning)' },
                { label: 'DOCUMENTATION',   value: 91, color: 'var(--success)' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="data-label">{label}</span>
                    <span className="font-mono text-sm font-300" style={{ color, fontFeatureSettings: '"tnum"' }}>
                      {value}/100
                    </span>
                  </div>
                  <div className="h-[3px] w-full bg-[var(--surface-3)]">
                    <div
                      className="h-full transition-none"
                      style={{ width: `${value}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-4 grid grid-cols-3 text-center">
                {[
                  { n: 3,  label: 'CRITICAL', color: 'var(--danger)' },
                  { n: 12, label: 'WARNINGS', color: 'var(--warning)' },
                  { n: 8,  label: 'INFO',     color: 'var(--info)' },
                ].map(({ n, label, color }) => (
                  <div key={label}>
                    <p className="font-mono text-2xl font-300" style={{ color, fontFeatureSettings: '"tnum"' }}>{n}</p>
                    <p className="data-label mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA BOTTOM ═════════════════════════════════════════ */}
      <section className="border-t border-[var(--border)] py-24 px-6 bg-grid">
        <div className="mx-auto max-w-3xl text-center">
          <p className="data-label text-[var(--accent)] mb-6">PRONTO A INIZIARE?</p>
          <h2
            className="font-display font-700 text-[var(--fg)] tracking-tight mb-8"
            style={{ fontSize: 'clamp(28px, 5vw, 56px)' }}
          >
            Il tuo codice merita<br />un guardian.
          </h2>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/register">
                Crea account gratuito
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Accedi</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═════════════════════════════════════════════ */}
      <footer className="border-t border-[var(--border)] py-6 px-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--fg-3)]">
            <span className="text-[var(--accent)]"><Shield /></span>
            <span className="font-mono text-xs">CodeGuardian · SkarabGroup</span>
          </div>
          <span className="data-label hidden md:block">
            Università di Padova · Ingegneria del Software · 2025/2026
          </span>
        </div>
      </footer>
    </div>
  )
}

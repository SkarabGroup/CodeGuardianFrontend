import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-[var(--bg)]"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <p
        className="font-display font-800 leading-none text-[var(--surface-3)] mb-6"
        style={{ fontSize: 'clamp(96px, 20vw, 192px)', letterSpacing: '-0.04em' }}
      >
        404
      </p>
      <p className="data-label text-[var(--accent)] mb-3">PAGINA NON TROVATA</p>
      <p className="text-sm text-[var(--fg-3)] font-light mb-8">
        La risorsa che cerchi non esiste o è stata rimossa.
      </p>
      <Button size="sm" asChild variant="outline">
        <Link to="/">
          <ArrowLeft className="h-3.5 w-3.5" />
          Torna alla home
        </Link>
      </Button>
    </div>
  )
}

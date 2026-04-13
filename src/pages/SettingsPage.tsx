import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Settings,
  User,
  Lock,
  Loader2,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
} from 'lucide-react'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}
import { toast } from 'sonner'
import { usersApi } from '@/api/users'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useNavigate } from 'react-router-dom'

const profileSchema = z.object({
  username: z
    .string()
    .min(4, 'Minimo 4 caratteri')
    .max(20, 'Massimo 20 caratteri')
    .regex(/^[a-zA-Z0-9]+$/, 'Solo lettere e numeri'),
  email: z.string().email('Email non valida'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password corrente obbligatoria'),
    newPassword: z
      .string()
      .min(8, 'Minimo 8 caratteri')
      .regex(/[A-Z]/, 'Almeno una maiuscola')
      .regex(/[a-z]/, 'Almeno una minuscola')
      .regex(/[0-9]/, 'Almeno un numero')
      .regex(/[^A-Za-z0-9]/, 'Almeno un carattere speciale'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  })

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--muted))]">
          <Settings className="h-5 w-5 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Impostazioni</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Gestisci il tuo account e le preferenze</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><User className="h-4 w-4" />Profilo</TabsTrigger>
          <TabsTrigger value="password"><Lock className="h-4 w-4" />Password</TabsTrigger>
          <TabsTrigger value="github"><GithubIcon className="h-4 w-4" />GitHub</TabsTrigger>
          <TabsTrigger value="danger" className="data-[state=active]:text-red-400">
            <Trash2 className="h-4 w-4" />Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfileSection /></TabsContent>
        <TabsContent value="password"><PasswordSection /></TabsContent>
        <TabsContent value="github"><GitHubSection /></TabsContent>
        <TabsContent value="danger"><DangerSection /></TabsContent>
      </Tabs>
    </div>
  )
}

function ProfileSection() {
  const { user, refreshUser } = useAuth()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: user?.username ?? '', email: user?.email ?? '' },
  })

  const onSubmit = async (data: ProfileForm) => {
    try {
      await usersApi.updateProfile(data)
      await refreshUser()
      toast.success('Profilo aggiornato')
    } catch {
      toast.error('Errore aggiornamento profilo')
    }
  }

  const generateApiKey = async () => {
    try {
      const { apiKey: key } = await usersApi.generateApiKey()
      setApiKey(key)
      toast.success('API Key generata')
    } catch {
      toast.error('Errore generazione API Key')
    }
  }

  const copyApiKey = () => {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informazioni personali</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Username</label>
              <Input {...register('username')} />
              {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Salva modifiche
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Key</CardTitle>
          <CardDescription>Usa questa chiave per accedere alle API di CodeGuardian</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKey ? (
            <div className="flex gap-2">
              <Input value={apiKey} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyApiKey}>
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ) : null}
          <Button variant="outline" onClick={generateApiKey}>
            {apiKey ? 'Rigenera API Key' : 'Genera API Key'}
          </Button>
          {apiKey && <p className="text-xs text-yellow-400">Attenzione: questa chiave viene mostrata una sola volta. Salvala in un posto sicuro.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function PasswordSection() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const onSubmit = async (data: PasswordForm) => {
    try {
      await usersApi.changePassword(data.newPassword)
      toast.success('Password aggiornata')
      reset()
    } catch {
      toast.error('Errore aggiornamento password', { description: 'Controlla la password corrente.' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cambia password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password corrente</label>
            <Input type="password" {...register('currentPassword')} />
            {errors.currentPassword && <p className="text-xs text-red-400">{errors.currentPassword.message}</p>}
          </div>
          <Separator />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nuova password</label>
            <Input type="password" {...register('newPassword')} />
            {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Conferma nuova password</label>
            <Input type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Cambia password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function GitHubSection() {
  const { user, refreshUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [linkPending, setLinkPending] = useState(false)

  const handleLink = () => {
    setLinkPending(true)
  }

  const handleLinkConfirm = () => {
    setLinkPending(false)
    // In produzione: window.location.href = oauthRedirectUrl
    toast.info('Redirect OAuth non ancora disponibile in questo ambiente')
  }

  const handleLinkCancel = () => {
    setLinkPending(false)
  }

  const handleUnlink = async () => {
    if (!confirm('Scollegare il tuo account GitHub?')) return
    setIsLoading(true)
    try {
      await usersApi.unlinkGithub()
      await refreshUser()
      toast.success('Account GitHub scollegato')
    } catch {
      toast.error('Errore durante la disconnessione')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GithubIcon className="h-5 w-5" />
          Integrazione GitHub
        </CardTitle>
        <CardDescription>Collega il tuo account GitHub per analizzare repository privati</CardDescription>
      </CardHeader>
      <CardContent>
        {user?.hasGithubLinked ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-sm text-green-400 font-medium">Account GitHub collegato</span>
              {user.githubId && <span className="text-xs text-[hsl(var(--muted-foreground))] ml-auto">ID: {user.githubId}</span>}
            </div>
            <Button variant="outline" className="text-red-400 hover:text-red-400 hover:bg-red-500/10" onClick={handleUnlink} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GithubIcon className="h-4 w-4" />}
              Scollega GitHub
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-4">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--muted-foreground))]" />
              <span className="text-sm text-[hsl(var(--muted-foreground))]">Nessun account GitHub collegato</span>
            </div>
            {linkPending ? (
              <div className="rounded-lg border border-[hsl(var(--border))] p-4 space-y-3">
                <p className="text-sm font-medium">Stai per essere reindirizzato a GitHub</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  CodeGuardian richiederà l'accesso in lettura ai tuoi repository per poterli analizzare. Puoi revocare l'accesso in qualsiasi momento dalle impostazioni di GitHub.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleLinkConfirm}>
                    <GithubIcon className="h-4 w-4" />
                    Procedi con GitHub
                  </Button>
                  <Button variant="outline" onClick={handleLinkCancel}>
                    Annulla
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button onClick={handleLink}>
                  <GithubIcon className="h-4 w-4" />
                  Collega GitHub
                </Button>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Verrai reindirizzato a GitHub per autorizzare l'accesso.
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DangerSection() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const handleDelete = async () => {
    if (confirmText !== 'ELIMINA') {
      toast.error('Scrivi ELIMINA per confermare')
      return
    }
    setIsLoading(true)
    try {
      await usersApi.deleteAccount()
      await logout()
      navigate('/')
      toast.success('Account eliminato')
    } catch {
      toast.error('Errore eliminazione account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-red-500/20">
      <CardHeader>
        <CardTitle className="text-base text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Zona pericolosa
        </CardTitle>
        <CardDescription>Azioni irreversibili sull'account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-3">
          <h4 className="font-medium text-red-400">Elimina account</h4>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Questa azione è irreversibile. Tutti i dati, i repository e le analisi verranno eliminati permanentemente.
          </p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Scrivi <code className="text-red-400">ELIMINA</code> per confermare</label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ELIMINA"
              className="border-red-500/20"
            />
          </div>
          <Button
            variant="destructive"
            disabled={confirmText !== 'ELIMINA' || isLoading}
            onClick={handleDelete}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Elimina account definitivamente
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

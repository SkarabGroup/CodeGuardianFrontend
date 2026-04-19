import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Settings,
  User,
  Lock,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react'

import { toast } from 'sonner'

import { usersApi } from '@/api/users'
import { authApi } from '@/api/auth'
import { patApi } from '@/api/pat'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useNavigate } from 'react-router-dom'

const patSchema = z.object({
  repositoryUrl: z.string().url('Inserisci un URL GitHub valido'),
  password: z.string().optional(),
  personalAccessToken: z.string().min(1, 'Il PAT è richiesto'),
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

type PatForm = z.infer<typeof patSchema>
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
          <TabsTrigger value="profile"><User className="h-4 w-4" />Profilo (PAT)</TabsTrigger>
          <TabsTrigger value="password"><Lock className="h-4 w-4" />Password</TabsTrigger>
          <TabsTrigger value="danger" className="data-[state=active]:text-red-400">
            <Trash2 className="h-4 w-4" />Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfileSection /></TabsContent>
        <TabsContent value="password"><PasswordSection /></TabsContent>
        <TabsContent value="danger"><DangerSection /></TabsContent>
      </Tabs>
    </div>
  )
}

function ProfileSection() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PatForm>({
    resolver: zodResolver(patSchema),
    defaultValues: { repositoryUrl: '', password: '', personalAccessToken: '' },
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const onSubmit = async (data: PatForm) => {
    try {
      const payload = {
        repositoryUrl: data.repositoryUrl,
        password: data.password || '',
        personalAccessToken: data.personalAccessToken
      }

      try {
        await patApi.add(payload)
      } catch (err: any) {
        if (err.message && err.message.toLowerCase().includes('already exist')) {
          await patApi.update({
            repositoryUrl: data.repositoryUrl,
            password: data.password || '',
            newPersonalAccessToken: data.personalAccessToken
          })
        } else {
          throw err
        }
      }

      toast.success('PAT salvato / aggiornato correttamente')
      reset()
    } catch (err: any) {
      toast.error(err.message || 'Errore durante il salvataggio del PAT')
    }
  }

  const doDelete = async (data: PatForm) => {
    setIsDeleting(true)
    try {
      await patApi.delete({ repositoryUrl: data.repositoryUrl, password: data.password || '' })
      toast.success('PAT eliminato correttamente')
      reset()
    } catch (err: any) {
      toast.error(err.message || "Errore durante l'eliminazione del PAT")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Access Token (PAT)</CardTitle>
          <CardDescription>Usa questa sezione per gestire il PAT di GitHub necessario per analizzare i tuoi repository.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Repository URL</label>
              <Input placeholder="https://github.com/org/repo" {...register('repositoryUrl')} />
              {errors.repositoryUrl && <p className="text-xs text-red-400">{errors.repositoryUrl.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Personal Access Token</label>
              <Input type="password" {...register('personalAccessToken')} />
              {errors.personalAccessToken && <p className="text-xs text-red-400">{errors.personalAccessToken.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password di crittazione</label>
              <Input type="password" placeholder="Password PAT" {...register('password')} />
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Inserisci se vuoi crittografare o devi sovrascrivere/eliminare un PAT già protetto.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" disabled={isSubmitting || isDeleting} onClick={handleSubmit(onSubmit)}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Salva PAT
              </Button>
              <Button type="button" variant="destructive" disabled={isSubmitting || isDeleting} onClick={handleSubmit(doDelete)}>
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Elimina PAT
              </Button>
            </div>
          </form>
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
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nuova password</label>
            <Input type="password" {...register('newPassword')} />
            {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Conferma password</label>
            <Input type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Aggiorna password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function DangerSection() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState('')

  const handleDelete = async () => {
    if (!password) {
      toast.error('Inserisci la password per confermare')
      return
    }

    setIsLoading(true)
    try {
      if (user?.email) {
         try {
           await authApi.login({ email: user.email, password })
         } catch {
           toast.error('Password errata, riprova')
           setIsLoading(false)
           return
         }
      }

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
            <label className="text-sm font-medium">Inserisci la tua password per confermare</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="La tua password"
              className="border-red-500/20"
            />
          </div>
          <Button
            variant="destructive"
            disabled={!password || isLoading}
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

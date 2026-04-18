import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, GitBranch } from 'lucide-react'
import { toast } from 'sonner'
import { repositoriesApi } from '@/api/repositories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { Repository } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(100),
  url: z.string().url('URL non valido').regex(/github\.com/, 'Deve essere un URL GitHub'),
  description: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (repo: Repository) => void
}

export function AddRepositoryModal({ open, onOpenChange, onCreated }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    try {
      const repo = await repositoriesApi.create(data)
      toast.success('Repository aggiunta!', { description: data.name })
      onCreated(repo)
      reset()
      onOpenChange(false)
    } catch (error: any) {
      const msg = error?.message || ''
      if (msg.includes('already exists')) {
        toast.error('Repository già presente', { description: 'Questa repository è già stata aggiunta alla tua collezione.' })
      } else {
        toast.error('Errore', { description: msg || 'Impossibile aggiungere la repository.' })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-[hsl(var(--primary))]" />
            Aggiungi Repository
          </DialogTitle>
          <DialogDescription>
            Inserisci l'URL di un repository GitHub pubblico o privato.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome</label>
            <Input placeholder="my-project" {...register('name')} />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">URL GitHub</label>
            <Input placeholder="https://github.com/org/repo" {...register('url')} />
            {errors.url && <p className="text-xs text-red-400">{errors.url.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrizione <span className="text-[hsl(var(--muted-foreground))]">(opzionale)</span></label>
            <Input placeholder="Breve descrizione del progetto" {...register('description')} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Aggiungi
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

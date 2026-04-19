import { gateway } from './gateway'

export const patApi = {
  add: async (payload: { repositoryUrl: string; password?: string; personalAccessToken: string }) => {
    const res = await gateway.post('/pat', { ...payload, password: payload.password || '' })
    if (res.data?.added === false) {
      throw new Error(res.data.error || 'Impossibile aggiungere il PAT')
    }
    return res.data
  },

  update: async (payload: { repositoryUrl: string; password?: string; newPersonalAccessToken: string }) => {
    const res = await gateway.put('/pat', { ...payload, password: payload.password || '' })
    if (res.data?.updated === false) {
      throw new Error(res.data.error || 'Impossibile aggiornare il PAT')
    }
    return res.data
  },

  delete: async (payload: { repositoryUrl: string; password?: string }) => {
    const res = await gateway.delete('/pat', { data: { ...payload, password: payload.password || '' } })
    if (res.data?.deleted === false) {
      throw new Error(res.data.error || 'Impossibile eliminare il PAT')
    }
    return res.data
  },
}

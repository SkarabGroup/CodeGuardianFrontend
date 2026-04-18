import { gateway } from './gateway'

export const patApi = {
  add: async (payload: { repositoryUrl: string; password?: string; personalAccessToken: string }): Promise<void> => {
    await gateway.post('/pat', payload)
  },

  update: async (payload: { repositoryUrl: string; password?: string; newPersonalAccessToken: string }): Promise<void> => {
    await gateway.put('/pat', payload)
  },

  delete: async (payload: { repositoryUrl: string; password?: string }): Promise<void> => {
    await gateway.delete('/pat', { data: payload })
  },
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { patApi } from '@/api/pat'

const mockPost   = vi.hoisted(() => vi.fn())
const mockPut    = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())

vi.mock('@/api/gateway', () => ({
  gateway: { post: mockPost, put: mockPut, delete: mockDelete },
  tokenStorage: { getAccess: vi.fn(), getRefresh: vi.fn(), setAccess: vi.fn(), setRefresh: vi.fn(), clear: vi.fn() },
}))

const payload = { repositoryUrl: 'https://github.com/org/repo', personalAccessToken: 'ghp_abc' }

describe('patApi', () => {
  beforeEach(() => vi.clearAllMocks())

  // add
  it('add posts PAT payload and returns data on success', async () => {
    mockPost.mockResolvedValue({ data: { added: true } })
    const result = await patApi.add(payload)
    expect(mockPost).toHaveBeenCalledWith('/pat', { ...payload, password: '' })
    expect(result).toEqual({ added: true })
  })

  it('add throws when server returns added:false', async () => {
    mockPost.mockResolvedValue({ data: { added: false, error: 'PAT non valido' } })
    await expect(patApi.add(payload)).rejects.toThrow('PAT non valido')
  })

  it('add throws with default message when added:false and no error', async () => {
    mockPost.mockResolvedValue({ data: { added: false } })
    await expect(patApi.add(payload)).rejects.toThrow('Impossibile aggiungere il PAT')
  })

  it('add uses provided password', async () => {
    mockPost.mockResolvedValue({ data: { added: true } })
    await patApi.add({ ...payload, password: 'secret' })
    expect(mockPost).toHaveBeenCalledWith('/pat', { ...payload, password: 'secret' })
  })

  // update
  it('update sends PUT and returns data on success', async () => {
    mockPut.mockResolvedValue({ data: { updated: true } })
    const result = await patApi.update({ repositoryUrl: payload.repositoryUrl, newPersonalAccessToken: 'ghp_new' })
    expect(mockPut).toHaveBeenCalledWith('/pat', { repositoryUrl: payload.repositoryUrl, newPersonalAccessToken: 'ghp_new', password: '' })
    expect(result).toEqual({ updated: true })
  })

  it('update throws when updated:false', async () => {
    mockPut.mockResolvedValue({ data: { updated: false, error: 'Token scaduto' } })
    await expect(patApi.update({ repositoryUrl: payload.repositoryUrl, newPersonalAccessToken: 'x' })).rejects.toThrow('Token scaduto')
  })

  it('update throws with default message when updated:false and no error', async () => {
    mockPut.mockResolvedValue({ data: { updated: false } })
    await expect(patApi.update({ repositoryUrl: payload.repositoryUrl, newPersonalAccessToken: 'x' })).rejects.toThrow('Impossibile aggiornare il PAT')
  })

  // delete
  it('delete sends DELETE with payload and returns data', async () => {
    mockDelete.mockResolvedValue({ data: { deleted: true } })
    const result = await patApi.delete({ repositoryUrl: payload.repositoryUrl })
    expect(mockDelete).toHaveBeenCalledWith('/pat', { data: { repositoryUrl: payload.repositoryUrl, password: '' } })
    expect(result).toEqual({ deleted: true })
  })

  it('delete throws when deleted:false', async () => {
    mockDelete.mockResolvedValue({ data: { deleted: false, error: 'Non trovato' } })
    await expect(patApi.delete({ repositoryUrl: payload.repositoryUrl })).rejects.toThrow('Non trovato')
  })

  it('delete throws with default message when deleted:false and no error', async () => {
    mockDelete.mockResolvedValue({ data: { deleted: false } })
    await expect(patApi.delete({ repositoryUrl: payload.repositoryUrl })).rejects.toThrow('Impossibile eliminare il PAT')
  })
})

import MockAdapter from 'axios-mock-adapter'
import { gateway } from '@/api/gateway'
import {
  MOCK_USER, MOCK_TOKENS, MOCK_REPOS, MOCK_HISTORY,
  MOCK_RANKING, MOCK_API_KEY,
} from './data'

const DELAY = 350 // ms — simula latenza di rete

/** Installa l'intercettore mock sull'istanza Axios del gateway */
export function setupMocks() {
  const mock = new MockAdapter(gateway, { delayResponse: DELAY, onNoMatch: 'passthrough' })

  // ── Auth ──────────────────────────────────────────────────
  mock.onPost('/account/auth/login').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as { email?: string; password?: string }
    if (body.email === 'test@codeguardian.dev' && body.password === 'Test1234!') {
      return [200, { ...MOCK_TOKENS, user: MOCK_USER }]
    }
    return [401, { message: 'Credenziali non valide' }]
  })

  mock.onPost('/account/auth/register').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as { username?: string; email?: string }
    if (!body.email) return [400, { message: 'Dati mancanti' }]
    return [201, {
      ...MOCK_TOKENS,
      user: { ...MOCK_USER, username: body.username, email: body.email },
    }]
  })

  mock.onPost('/account/auth/refresh').reply(200, MOCK_TOKENS)
  mock.onPost('/account/auth/logout').reply(204)

  // ── Users ─────────────────────────────────────────────────
  mock.onGet('/account/users/profile').reply(200, MOCK_USER)

  mock.onPut('/account/users/profile').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as Partial<typeof MOCK_USER>
    return [200, { ...MOCK_USER, ...body }]
  })

  mock.onPut('/account/users/password').reply(204)

  mock.onDelete('/account/users/account').reply(204)

  mock.onPost('/account/users/api-key/generate').reply(200, { apiKey: MOCK_API_KEY })

  mock.onPost('/account/users/github/link').reply(200, { ...MOCK_USER, hasGithubLinked: true })

  mock.onDelete('/account/users/github/unlink').reply(200, { ...MOCK_USER, hasGithubLinked: false, githubId: undefined })

  // ── Repositories ──────────────────────────────────────────
  mock.onGet('/analysis/repositories').reply((config) => {
    const search = (config.params?.search ?? '').toLowerCase()
    const filtered = search
      ? MOCK_REPOS.filter(r => r.name.toLowerCase().includes(search) || r.description?.toLowerCase().includes(search))
      : MOCK_REPOS
    return [200, filtered]
  })

  mock.onGet('/analysis/repositories/ranking').reply(200, MOCK_RANKING)

  MOCK_REPOS.forEach(repo => {
    mock.onGet(`/analysis/repositories/${repo.id}`).reply(200, repo)

    mock.onPut(`/analysis/repositories/${repo.id}`).reply((config) => {
      const body = JSON.parse(config.data ?? '{}')
      return [200, { ...repo, ...body }]
    })

    mock.onDelete(`/analysis/repositories/${repo.id}`).reply(204)

    mock.onPost(`/analysis/repositories/${repo.id}/analyze`).reply(200, {
      analysisId: `ana_mock_${Date.now()}`,
    })


    // History per singola repo
    const repoHistory = MOCK_HISTORY.items.filter(a => a.repositoryId === repo.id)
    mock.onGet(`/analysis/repositories/${repo.id}/history`).reply(200, {
      items: repoHistory,
      total: repoHistory.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    })

    mock.onGet(`/analysis/repositories/${repo.id}/compare`).reply(200, {
      a: MOCK_HISTORY.items[0],
      b: MOCK_HISTORY.items[3],
      delta: { qualityScore: +7, securityScore: +4, documentationScore: +6 },
    })
  })

  // Endpoint reale del backend: POST /analysis/start
  mock.onPost('/analysis/start').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as { repositoryUrl?: string; branch?: string }
    const repo = MOCK_REPOS.find(r => r.url === body.repositoryUrl)
    return [200, {
      analysisId: `ana_mock_${Date.now()}`,
      path: `/tmp/cg-clone/${repo?.id ?? 'unknown'}`,
    }]
  })

  mock.onPost('/analysis/repositories').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as { name?: string; url?: string; description?: string }
    const newRepo = {
      id: `repo_new_${Date.now()}`,
      name: body.name ?? 'Nuovo repository',
      description: body.description ?? '',
      url: body.url ?? 'https://github.com/org/repo',
      isPrivate: false,
      createdAt: new Date().toISOString(),
      totalAnalyses: 0,
    }
    return [201, newRepo]
  })

  // ── Analysis reports ──────────────────────────────────────
  MOCK_HISTORY.items.forEach(analysis => {
    mock.onGet(`/analysis/reports/${analysis.id}`).reply(200, analysis)

    mock.onGet(`/analysis/reports/${analysis.id}/export`).reply(200, new Blob(['mock export'], { type: 'application/octet-stream' }))

    mock.onPatch(new RegExp(`/analysis/reports/${analysis.id}/remediations/.+`)).reply((config) => {
      const body = JSON.parse(config.data ?? '{}')
      return [200, { decision: body.decision }]
    })
  })

  // Global history
  mock.onGet('/analysis/history').reply(200, MOCK_HISTORY)

  console.info(
    '%c[CodeGuardian Mock] %cModalità demo attiva — nessun backend necessario.',
    'color: #C8FF00; font-weight: bold',
    'color: #888',
  )
  console.info(
    '%c  Email:    %ctest@codeguardian.dev\n%c  Password: %cTest1234!',
    'color: #888', 'color: #C8FF00',
    'color: #888', 'color: #C8FF00',
  )
}

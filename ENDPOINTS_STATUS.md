# Stato endpoint microservizi

> Ultimo aggiornamento: 2026-04-09 (rev 6 — verifica live con entrambi i MS su `develop`, Postgres + MongoDB)

---

## Configurazione operativa attuale

| Servizio | Branch | DB | Porta | Note |
|---|---|---|---|---|
| Account MS | `develop` | PostgreSQL 17 (`miodb`) | 3001 | Avviare con `DATABASE_URL` + `JWT_SECRET` |
| Analysis MS | `develop` | MongoDB (`analysis_db`) | 3002 | Avviare con `JWT_SECRET` |
| Frontend | `main` | — | 5173 | `VITE_MOCK_MODE=false` per backend reale |

Usare `./dev.sh` dal frontend per avviare tutto. `./dev.sh --mock` per modalità mock (no DB).

**IMPORTANTE**: entrambi i MS devono condividere lo stesso `JWT_SECRET` (il `dev.sh` passa `codeguardian-dev-secret` a entrambi).

---

## Account Administration Microservice (`localhost:3001`)

| Endpoint | Metodo | Stato | Note |
|---|---|---|---|
| `/account/auth/login` | POST | ✅ testato live | Path reale: `POST /auth/login` (rewrite proxy Vite) |
| `/account/auth/register` | POST | ✅ testato live | Path reale: `POST /auth/register`; manda solo `{email, password}` — `username` non supportato dal DTO |
| `/account/auth/refresh` | POST | ❌ mancante | |
| `/account/auth/logout` | POST | ✅ testato live | Richiede `{ refreshToken }` nel body |
| `/account/users/profile` | GET | ❌ mancante | Frontend ha timeout 5s per non bloccare il mount; senza profilo l'utente non viene ripristinato al reload |
| `/account/users/profile` | PUT | ❌ mancante | |
| `/account/users/password` | PATCH | ⚠️ path mismatch | Implementato come `PATCH /auth/update`; non verifica la password attuale |
| `/account/users/account` | DELETE | ⚠️ path mismatch | Implementato come `DELETE /users/me` |
| `/account/users/api-key/generate` | POST | ❌ mancante | |
| `/account/users/github/link` | POST | ❌ mancante | |
| `/account/users/github/unlink` | DELETE | ❌ mancante | |

### Punti aperti da allineare col team account

| # | Problema | Impatto |
|---|---|---|
| 1 | `user` response ha solo `{ id, email }` — manca `username` | Il frontend lo mostra in SettingsPage e sidebar |
| 2 | Cambio password: `PATCH /auth/update` vs `PATCH /account/users/password` | Breaking — path diverso |
| 3 | Cambio password: nessuna verifica password attuale | Security — il frontend manda `{ currentPassword, newPassword }` |
| 4 | Cancellazione account: `DELETE /users/me` vs `DELETE /account/users/account` | Breaking — path diverso |
| 5 | `GET /account/users/profile` non implementato | Senza questo il frontend non ripristina la sessione al reload |
| 6 | `AllExceptionsFilter` non ha fallback: route non gestite non rispondono (hang infinito) | Il frontend ha workaround con timeout 5s su `getProfile` |
| 7 | `username` non nel DTO di registrazione né nel DB | Il frontend lo raccoglie nel form ma non lo manda al backend |

---

## Analysis Microservice (`localhost:3002`)

| Endpoint | Metodo | Stato | Note |
|---|---|---|---|
| `/analysis/repositories` | GET | ❌ mancante | Era stub su `main`; su `develop` non implementato |
| `/analysis/repositories` | POST | ❌ mancante | Era stub su `main`; su `develop` non implementato |
| `/analysis/repositories/:id` | GET | ❌ mancante | |
| `/analysis/repositories/:id` | PUT | ❌ mancante | |
| `/analysis/repositories/:id` | DELETE | ❌ mancante | |
| `/analysis/repositories/ranking` | GET | ❌ mancante | |
| `/analysis/repositories/:id/analyze` | POST | ❌ mancante | Il backend espone `POST /analysis/start` — path da allineare |
| `/analysis/start` | POST | ✅ testato live | JWT Guard attivo; risponde 201. Manca `GITHUB_PUBLIC_TOKEN` per clone effettivo |
| `/analysis/pat` | POST | ✅ reale | Mergiato in `develop` (PR #56) |
| `/analysis/pat` | DELETE | ✅ reale | Mergiato in `develop` (PR #56) |
| `/analysis/pat` | PUT | ✅ reale | Mergiato in `develop` (PR #56) |
| `/analysis/repositories/:id/history` | GET | ❌ mancante | |
| `/analysis/repositories/:id/compare` | GET | ❌ mancante | |
| `/analysis/reports/:id` | GET | ❌ mancante | Entità report pronte nel domain — prossimo step atteso |
| `/analysis/reports/:id/export` | GET | ❌ mancante | |
| `/analysis/reports/:id/remediations/:remediationId` | PATCH | ❌ mancante | |
| `/analysis/history` | GET | ❌ mancante | |
| WebSocket Socket.io | — | ⚠️ struttura pronta | `OrchestratorService` in place, emit non ancora implementato |

### Body `POST /analysis/start`

```json
{
  "repoUrl": "https://github.com/org/repo",
  "password": "PAT-opzionale",
  "branch": "main",
  "commit": "abc1234...",
  "requestedCode": true
}
```

```json
// Response 201
{
  "errorMessage": "Public analysis requested but GITHUB_PUBLIC_TOKEN is not configured"
}
```

### Punti aperti da allineare col team analysis

| # | Problema | Impatto |
|---|---|---|
| 1 | `POST /analysis/start` path vs `POST /analysis/repositories/:id/analyze` | Breaking — da concordare |
| 2 | `areas: ['code','security','documentation']` (array) vs `requestedCode: boolean` | Il backend deve aggiungere `requestedSecurity` e `requestedDocs`, o accettare l'array |
| 3 | `CoveragePercentage` interno usa [0,1] — da convertire a [0-100] nel JSON | Da fare in serializzazione |
| 4 | `GET /analysis/repositories` non implementato su `develop` | Il frontend non può caricare la lista repo con backend reale |
| 5 | `GITHUB_PUBLIC_TOKEN` non configurato | L'analisi parte ma il clone fallisce — da aggiungere all'`.env` del MS |

### Stato domain layer

- `CodeReport`, `SecurityReport`, `DocumentationReport` — entità pronte su `feature/analysisReportEntities` (non ancora in `develop`)
- `OrchestratorService` — mergiato in `develop`, placeholder (logga e risolve subito)
- Agents scaffold (`src/agents/code/`, `security/`, `documentation/`) — file placeholder, branch separato

---

## Testing

```bash
# Tutto mockato (no DB richiesto)
./dev.sh --mock

# Backend reali (Postgres + MongoDB devono essere attivi)
./dev.sh
```

Con backend reali, funzionano: login, register, logout, `/analysis/start` (JWT ok), PAT endpoints.  
Non funzionano: lista repository, history, reports (endpoint mancanti — usare mock mode per testare il frontend completo).

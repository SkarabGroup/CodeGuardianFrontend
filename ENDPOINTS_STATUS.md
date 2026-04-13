# Stato endpoint microservizi

> Ultimo aggiornamento: 2026-04-13 (rev 10 — PR #66 mergiata in `develop`: doc-agent attivo, `OrchestratorService` non è più placeholder)

---

## Configurazione operativa attuale

| Servizio | Branch | DB | Porta | Note |
|---|---|---|---|---|
| Account MS | `develop` / `main` (allineati) | PostgreSQL 17 (`miodb`) | 3001 | Avviare con `DATABASE_URL` + `JWT_SECRET` |
| Analysis MS | `develop` | MongoDB (`analysis_db`) | 3002 | Avviare con `JWT_SECRET` |
| Frontend | `main` | — | 5173 | `VITE_MOCK_MODE=false` per backend reale |

Usare `./dev.sh` dal frontend per avviare tutto. `./dev.sh --mock` per modalità mock (no DB).

**IMPORTANTE**: entrambi i MS devono condividere lo stesso `JWT_SECRET` (il `dev.sh` passa `codeguardian-dev-secret` a entrambi).

---

## Account Administration Microservice (`localhost:3001`)

> **Stato branch al 2026-04-13**: `develop` e `main` sono allineati (PR #24 mergiata). Nessun nuovo endpoint introdotto rispetto alla rev precedente. Fix minori:
> - PR #21 (`feature/fix_logoutcontroller`): `LogoutController` ora dipende da `ILogoutUseCase` (interfaccia) invece della classe concreta `LogoutService` — nessun impatto sul contratto HTTP.
> - `branch/locale`: rimossa auto-inizializzazione tabelle DB da `onModuleInit` in `PostgresAdapter` — le tabelle devono pre-esistere nel DB di produzione. Nessun impatto API.

| Endpoint | Metodo | Stato | Note |
|---|---|---|---|
| `/account/auth/login` | POST | ✅ testato live | Path reale: `POST /auth/login` (rewrite proxy Vite) |
| `/account/auth/register` | POST | ✅ testato live | Path reale: `POST /auth/register`; manda solo `{email, password}` — `username` non supportato dal DTO |
| `/account/auth/refresh` | POST | ❌ mancante | |
| `/account/auth/logout` | POST | ✅ testato live | Richiede `{ refreshToken }` nel body |
| `/account/users/profile` | GET | ❌ mancante | Frontend ha timeout 5s per non bloccare il mount; senza profilo l'utente non viene ripristinato al reload |
| `/account/users/profile` | PUT | ❌ mancante | |
| `/account/users/password` | PATCH | ✅ allineato | Backend: `PATCH /auth/update`; email da JWT, accetta solo `{ newPassword }`. Frontend fixato. |
| `/account/users/account` | DELETE | ✅ allineato | Backend: `DELETE /users/me`; userId da JWT. Frontend fixato. |
| `/account/users/api-key/generate` | POST | ❌ mancante | |
| `/account/users/github/link` | POST | ❌ mancante | |
| `/account/users/github/unlink` | DELETE | ❌ mancante | |

### Punti aperti da allineare col team account

| # | Problema | Impatto |
|---|---|---|
| 1 | `user` response ha solo `{ id, email }` — manca `username` | Il frontend lo mostra in SettingsPage e sidebar |
| 2 | ~~Cambio password: path mismatch~~ | ✅ risolto — frontend usa `PATCH /account/auth/update` |
| 3 | Cambio password: nessuna verifica password attuale | Backend legge email dal JWT, ignora `currentPassword`. Frontend manda solo `newPassword`. |
| 4 | ~~Cancellazione account: path mismatch~~ | ✅ risolto — frontend usa `DELETE /account/users/me` |
| 5 | `GET /account/users/profile` non implementato | Senza questo il frontend non ripristina la sessione al reload |
| 6 | `AllExceptionsFilter` non ha fallback: route non gestite non rispondono (hang infinito) | Il frontend ha workaround con timeout 5s su `getProfile` |
| 7 | `username` non nel DTO di registrazione né nel DB | Il frontend lo raccoglie nel form ma non lo manda al backend |
| 8 | ⚠️ `PostgresAdapter`: rimossa auto-creazione tabelle DB (`onModuleInit` eliminato nel branch `locale`, ora in `main`) | ✅ risolto — `dev.sh` esegue `psql -f database/init.sql` per tentare l'inizializzazione delle tabelle locali. |

---

## Analysis Microservice (`localhost:3002`)

> **Stato branch al 2026-04-13 17:07** — PR #66 mergiata in `develop` durante la sessione odierna.
>
> **In `develop` (tutti i merge recenti):**
> - PR #66 (`feature/documentation-report.entity`) — **appena mergiato**: entità `DocumentationReport` + 10 value objects (ApiViolation, DocsDiscrepancy, MissingFile, DependencyAudit…) + `DocumentationAnalysisAdapter` che lancia il container Docker `strands-documentation-analyzer`. **`OrchestratorService` non è più un placeholder**: chiama realmente `documentationAgent.runAnalysis()` ad ogni `POST /analysis/start` con `requestDocumentation: true`.
> - PR #65 (`feature/code-report-save`): porta MongoDB `ICodeReportSavePort` in develop. Nessun endpoint HTTP nuovo.
> - PR #63 (`feature/github-analysis-save`): fix save `GitHubAnalysis` su MongoDB.
> - PR #64 (`feature/code-agent`): `CodeAnalysisAdapter` registrato nel modulo ma **commentato** nell'Orchestrator — il code agent non viene ancora chiamato.
>
> **Branch ancora fuori da `develop`:**
> - `feature/security-agent`: agente Python Semgrep/Trivy/Syft — non in `develop`, `requestedSecurity: true` non esegue nulla.
>
> ⚠️ **`main` analysis MS è fermo a `989f2fc`** (primo commit iniziale) — non è stato aggiornato con nessuno dei branch recenti.

| Endpoint | Metodo | Stato | Note |
|---|---|---|---|
| `/analysis/repositories` | GET | ❌ mancante | Non implementato in nessun branch attivo |
| `/analysis/repositories` | POST | ❌ mancante | Non implementato in nessun branch attivo |
| `/analysis/repositories/:id` | GET | ❌ mancante | |
| `/analysis/repositories/:id` | PUT | ❌ mancante | |
| `/analysis/repositories/:id` | DELETE | ❌ mancante | |
| `/analysis/repositories/ranking` | GET | ❌ mancante | |
| `/analysis/repositories/:id/analyze` | POST | mock only | Usato solo nel mock frontend. Backend reale usa `/analysis/start`. |
| `/analysis/start` | POST | ✅ allineato | Body: `{ repoUrl, password?, branch, commit, requestedCode, requestedSecurity, requestDocumentation }`. Risposta: `{ user, id, url, branch, commit, errorMessage }`. Frontend allineato. |
| `/analysis/pat` | POST | ✅ reale | Mergiato in `develop` (PR #56) |
| `/analysis/pat` | DELETE | ✅ reale | Mergiato in `develop` (PR #56) |
| `/analysis/pat` | PUT | ✅ reale | Mergiato in `develop` (PR #56) |
| `/analysis/repositories/:id/history` | GET | ❌ mancante | |
| `/analysis/repositories/:id/compare` | GET | ❌ mancante | |
| `/analysis/reports/:id` | GET | ❌ mancante | Entità pronte ma nessun controller esposto |
| `/analysis/reports/:id/export` | GET | ❌ mancante | |
| `/analysis/reports/:id/remediations/:remediationId` | PATCH | ❌ mancante | |
| `/analysis/history` | GET | ❌ mancante | |
| WebSocket Socket.io | — | ⚠️ struttura pronta | `OrchestratorService` chiama il doc-agent; emit WS verso frontend non ancora implementato |

### Body `POST /analysis/start`

```json
{
  "repoUrl": "https://github.com/org/repo",
  "password": "PAT-opzionale",
  "branch": "main",
  "commit": "abc1234...",
  "requestedCode": true,
  "requestDocumentation": true,
  "requestedSecurity": true
}
```

```json
// Response 201 — success
{
  "user": "user-uuid",
  "id": "analysis-uuid",
  "url": "https://github.com/org/repo",
  "branch": "main",
  "commit": "abc1234...",
  "errorMessage": "Analysis Started Successfully"
}
```

```json
// Response 201 — failure (es. token mancante)
{
  "errorMessage": "Public analysis requested but GITHUB_PUBLIC_TOKEN is not configured"
}
```

> **⚠️ Nota risposta**: il campo `errorMessage` è presente anche in caso di successo (con valore `"Analysis Started Successfully"`). Il frontend deve distinguere success/failure leggendo la presenza di `id` nel body, non solo `errorMessage`.

### Punti aperti da allineare col team analysis

| # | Problema | Impatto |
|---|---|---|
| 1 | ~~`POST /analysis/start` path mismatch~~ | ✅ risolto |
| 2 | ~~`areas` array vs flag booleani~~ | ✅ risolto |
| 3 | `CoveragePercentage` [0,1] → [0,100] | Il normalizzatore del Gateway già gestisce la conversione lato frontend |
| 4 | `GET /analysis/repositories` non implementato | Il frontend non può caricare la lista repo con backend reale |
| 5 | `GITHUB_PUBLIC_TOKEN` non configurato | Il clone fallisce senza token. Richiede `strands-code-analyzer` Docker in esecuzione. |
| 6 | ⚠️ Response `POST /analysis/start` ha `errorMessage` anche in caso di successo | Frontend usa `(data as { id?: string }).id` per rilevare il successo — **corretto**, ma fragile. Allinearsi col team per avere un campo `success: boolean`. |
| 7 | 🔴 **Doc-agent ora attivo in `develop`** (PR #66 mergiata): `POST /analysis/start` con `requestDocumentation: true` tenta di avviare il container Docker `strands-documentation-analyzer` | ✅ aggiornato — `dev.sh` ora builda l'immagine (`infra/docker/Dockerfile.documentation`) se mancante; Docker deve essere in esecuzione. L'Orchestrator avvia il container al bisogno. |
| 8 | ⚠️ Security-agent (`feature/security-agent`) non ancora in `develop` | Il campo `requestedSecurity: true` non esegue nulla nell'Orchestrator. |
| 9 | ⚠️ Code-agent (`CODE_AGENT`) registrato nel modulo ma commentato nell'Orchestrator | `requestedCode: true` non esegue nulla al momento. |

### Stato domain layer

- `CodeReport` — entità in `develop` (PR #65); porta MongoDB `ICodeReportSavePort` attiva
- `DocumentationReport` — entità completa **ora in `develop`** (PR #66); 10 value objects (ApiViolation, DocsDiscrepancy, MissingFile, DependencyAudit, ConfigDependency, MissingInConfigDependency, ReadmeDependency, UndocumentedDependency, VersionMismatchDependency)
- `SecurityReport` — entità in domain ma nessuna porta/adapter in `develop`
- `ICodeReportSavePort` — porta MongoDB in `develop` (PR #65)
- `OrchestratorService` — **chiama realmente `DocumentationAnalysisAdapter`** (PR #66); code-agent e security-agent commentati
- Doc agent Python (`strands-documentation-analyzer`) — **ora in `develop`** (PR #66); richiede build immagine Docker
- Security agent Python (Semgrep + Trivy + Syft) — su `feature/security-agent`, **non ancora in `develop`**
- Code agent — adapter registrato nel modulo ma **commentato** nell'Orchestrator

---

## Frontend — aggiornamenti necessari

> Nessuna modifica urgente al codice frontend in questo momento. I nuovi branch del backend aggiungono infrastruttura interna ma non espongono nuovi endpoint HTTP.

| Tema | Azione richiesta | Priorità |
|---|---|---|
| `startAnalysis` response parsing | Già corretto (`data.id`). Quando il team allinea la response, rivedere. | Bassa |
| `dev.sh` | ✅ aggiornato: builda l'immagine `strands-documentation-analyzer` se mancante e tenta l'inizializzazione delle tabelle PostgreSQL (`database/init.sql`). Assicurarsi che Docker sia in esecuzione. | Alta |
| WebSocket | Preparare listener Socket.io nel frontend; l'emit lato backend arriverà con i prossimi sprint | Bassa |

---

## Testing

```bash
# Tutto mockato (no DB richiesto)
./dev.sh --mock

# Backend reali (Postgres + MongoDB devono essere attivi)
./dev.sh
```

Con backend reali, funzionano: login, register, logout, `/analysis/start` (JWT ok), PAT endpoints.  
`/analysis/start` con `requestDocumentation: true`: l'Orchestrator avvia il container Docker `strands-documentation-analyzer` al bisogno; `dev.sh` ora builda l'immagine se mancante — assicurarsi che Docker sia in esecuzione.  
Non funzionano: lista repository, history, reports (endpoint mancanti — usare mock mode per testare il frontend completo).

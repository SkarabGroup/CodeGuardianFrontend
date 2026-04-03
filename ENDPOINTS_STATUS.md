# Stato endpoint microservizi

> Ultimo aggiornamento: 2026-04-03

---

## Account Administration Microservice (`localhost:3001`)

| Endpoint | Metodo | Stato | Note |
|---|---|---|---|
| `/account/auth/login` | POST | ✅ disponibile | Mock hardcoded su `main` locale |
| `/account/auth/register` | POST | ⚠️ parziale | Use case + service in `features/services_register`, controller non collegato |
| `/account/auth/refresh` | POST | ❌ mancante | |
| `/account/auth/logout` | POST | ❌ mancante | |
| `/account/users/profile` | GET | ✅ disponibile | Mock hardcoded su `main` locale |
| `/account/users/profile` | PUT | ❌ mancante | |
| `/account/users/password` | PUT | ❌ mancante | |
| `/account/users/account` | DELETE | ⚠️ parziale | Service + use case + command in `develop` (`delete.service.ts`), controller non collegato |
| `/account/users/api-key/generate` | POST | ❌ mancante | |
| `/account/users/github/link` | POST | ❌ mancante | |
| `/account/users/github/unlink` | DELETE | ❌ mancante | |

### Cosa c'è in develop (account)
- **Delete service** (`delete.command.ts`, `delete.usecase.ts`, `delete.service.ts`): logica per eliminare un account implementata ma non esposta via HTTP
- `AppModule` ancora vuoto in tutti i branch remoti — nessun controller registrato

---

## Analysis Microservice (`localhost:3002`)

| Endpoint | Metodo | Stato | Note |
|---|---|---|---|
| `/analysis/repositories` | GET | ✅ disponibile | Mock hardcoded su `main` locale (1 repo fisso) |
| `/analysis/repositories` | POST | ✅ disponibile | Mock hardcoded su `main` locale |
| `/analysis/repositories/:id` | GET | ❌ mancante | |
| `/analysis/repositories/:id` | PUT | ❌ mancante | |
| `/analysis/repositories/:id` | DELETE | ❌ mancante | |
| `/analysis/repositories/ranking` | GET | ❌ mancante | |
| `/analysis/repositories/:id/analyze` | POST | ❌ mancante | Comando `StartAnalysisCommand` definito in `develop` |
| `/analysis/repositories/:id/history` | GET | ❌ mancante | |
| `/analysis/repositories/:id/compare` | GET | ❌ mancante | |
| `/analysis/reports/:id` | GET | ❌ mancante | |
| `/analysis/reports/:id/export` | GET | ❌ mancante | |
| `/analysis/reports/:id/remediations/:id` | PATCH | ❌ mancante | |
| `/analysis/history` | GET | ❌ mancante | |
| WebSocket Socket.io | — | ❌ mancante | |

### Cosa c'è in develop / feature branches (analysis)
Il team ha lavorato molto sulla logica di dominio e infrastruttura ma **nessun controller HTTP è ancora collegato**:

- **`develop`** — lavoro più avanzato:
  - `StartAnalysisCommand`: command per avviare un'analisi (userId, repoUrl, branch, commitHash, patPassword)
  - `MongoDBAdapter`: adapter per persistenza su MongoDB degli snapshot di analisi
  - `GitHubAdapter`: adapter per interazione con GitHub (check disponibilità repo, clone)
  - `GitCredentialReadPort`: porta per leggere credenziali PAT dal DB
  - `AnalysisFactory`, `AnalysisProvider`: domain services per creare entità Analysis

- **`feature/validation-service`** (branch nuovo):
  - `ValidatorService`: service applicativo che valida l'accesso a un repository GitHub prima di avviare l'analisi. Controlla le credenziali PAT nel DB e verifica la disponibilità del repo (branch/commit). Pronto per essere iniettato ma non ancora esposto via controller.

- **`feature/Mongo-adapter`**: MongoDB adapter per salvare analisi, già mergiato in `develop`

### Conclusione
I colleghi stanno costruendo il layer di dominio e infrastruttura (entity, VO, adapter, services) seguendo Clean Architecture. La prossima milestone attesa è l'implementazione dei controller HTTP che colleghino tutto quanto all'esterno. L'endpoint più vicino ad essere pronto è `POST /analysis/repositories/:id/analyze` (ha già command + validation service).

---

## Testing

Per testare il frontend completo usare `VITE_MOCK_MODE=true` nel `.env`.
Per testare contro i microservizi reali impostare `VITE_MOCK_MODE=false`, sapendo che le funzionalità disponibili sono solo quelle con stato ✅.

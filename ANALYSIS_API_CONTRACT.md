# Contratto API — Microservizio Analisi

> Documento per il team backend: struttura JSON attesa dal frontend CodeGuardian.
> Creato: 2026-04-03 | Ultimo aggiornamento: 2026-04-13 (rev 3 — allineato ai branch attuali del microservizio, fix issue avvio e PAT)

---

## Stato implementazione microservizio (rilevato da codice)

| Endpoint | Stato backend | Note |
|---|---|---|
| `POST /analysis/start` | **Implementato** (origin/develop) | Ritorna solo `analysisId` + `path`, non il report |
| `POST /analysis/pat` | **Implementato** (origin/develop) | Salvataggio PAT per repo privati |
| `PUT /analysis/pat` | **Implementato** (origin/develop) | Aggiornamento PAT per repo privati |
| `DELETE /analysis/pat` | **Implementato** (origin/develop) | Rimozione PAT per repo privati |
| `GET /analysis/reports/:id` | **Non implementato** | Necessario per recuperare il report completo |
| `GET /analysis/repositories/:id/history` | **Non implementato** | Storico analisi per repository |
| `GET /analysis/reports/:id/export` | **Non implementato** | Export PDF/JSON |
| `PATCH /analysis/reports/:id/remediations/:id` | **Non implementato** | Aggiornamento decisione remediation |

> **Nota architetturale**: il microservizio usa un pattern **CQRS/async**. Il `POST /analysis/start` avvia il clone del repository e restituisce subito l'`analysisId`; l'analisi vera (report, issues, score) avviene in background tramite eventi. I risultati andranno recuperati con un `GET` separato (non ancora implementato).

---

## Divergenze rilevate rispetto alla versione precedente del contratto

### 1. Path dell'endpoint di avvio analisi

Il backend usa:
```
POST /analysis/start
```
Il frontend usa:
```
POST /analysis/start
```
**Risolto** — Il path è stato allineato correttamente a `/analysis/start`.

### 2. `CoveragePercentage` normalizzato 0–1, non 0–100

Il value object `coverage-percentage.vo.ts` (feature/coverage-percentage.vo) valida che il valore sia **tra 0 e 1** (float):
```typescript
if (value < 0 || value > 1 || !Number.isFinite(value)) {
  throw new Error('Coverage percentage must be a number between 0 and 1');
}
```
Il frontend si aspetta **un intero 0–100** (es. `67` per il 67%). **Il backend dovrà moltiplicare per 100** prima di inserirlo nel JSON, oppure il frontend dovrà adattarsi. Da concordare.

### 3. `status` in maiuscolo nel codice backend

L'enum del backend usa:
```typescript
enum AnalysisStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
```
Il frontend si aspetta valori in minuscolo: `"pending"`, `"in-progress"`, `"completed"`, `"failed"`.
**Da allineare** — preferibilmente il backend serializza in minuscolo con trattino nel JSON.

### 4. `CommitHash` è SHA-1 completo (40 caratteri)

Il value object valida `[0-9a-f]{40}`. Il frontend lo tronca a 7 caratteri per la visualizzazione — nessun problema, ma il backend deve mandare il full SHA.

### 5. Schema MongoDB prevede report separati

Lo schema MongoDB (feature/Mongo-adapter) contiene un campo `reportsIndex: [{ type, reportId }]` che referenzia report salvati in una collection separata. Il frontend si aspetta il report embedded nell'oggetto `Analysis`. **Il backend dovrà joinare/popolare** il report nella risposta GET.

### 6. `PathFinding` VO definisce il formato dei `file` nelle issues

Il VO `path-finding.vo.ts` valida che i path nei risultati siano:
- Relativi (no leading `/`)
- Solo forward slash (no backslash)
- Senza `..`

Es: `"src/payments/processor.ts"` ✅ — `"/src/payments/processor.ts"` ❌

---

## Oggetto `Analysis` — struttura attesa dal frontend

```json
{
  "id": "ana_001",
  "repositoryId": "repo_001",
  "date": "2026-04-02T14:30:00Z",
  "status": "completed",
  "areas": ["code", "security", "documentation"],
  "branch": "main",
  "commitHash": "a3f8b2ca3f8b2ca3f8b2ca3f8b2ca3f8b2ca3f8b",

  "executionMetrics": {
    "total_time_seconds": 222,
    "initialization_time_seconds": 8,
    "execution_time_seconds": 194,
    "parsing_time_seconds": 20,
    "started_at": "2026-04-02T14:26:18Z",
    "completed_at": "2026-04-02T14:30:00Z"
  },

  "report": { ... }
}
```

**Valori validi per `status`** (in minuscolo con trattino, per il JSON): `"pending"` | `"in-progress"` | `"completed"` | `"failed"` | `"not-analyzed"`

`commitHash` è il full SHA-1 a 40 caratteri. Il frontend lo tronca a 7 per la visualizzazione.

`executionMetrics` è opzionale.

---

## Oggetto `report` (dentro `Analysis`)

```json
{
  "qualityScore": 87,
  "securityScore": 62,
  "documentationScore": 91,

  "criticalIssues": 3,
  "warningIssues": 12,
  "infoIssues": 8,

  "codeAnalysis": { ... },
  "securityAnalysis": { ... },
  "documentationAnalysis": { ... },

  "remediations": [ ... ]
}
```

Tutti gli score sono **interi 0–100**. `documentationScore` è opzionale.

---

## `codeAnalysis`

```json
{
  "testCoverage": 67,
  "linesAnalyzed": 12480,
  "summary": "Testo descrittivo opzionale",
  "issues": [
    {
      "id": "issue_001",
      "title": "Funzione con complessità ciclomatica elevata",
      "description": "La funzione processPayment() ha complessità 24, soglia massima consigliata: 10.",
      "severity": "critical",
      "file": "src/payments/processor.ts",
      "line": 142,
      "category": "complexity"
    }
  ]
}
```

`testCoverage` deve essere **intero 0–100** (il VO interno usa 0–1, il backend deve convertire prima di serializzare).

`file` deve essere un path relativo conforme al VO `PathFinding` (no leading `/`, solo forward slash, no `..`).

**Valori validi per `severity`:** `"critical"` | `"warning"` | `"info"`

`category` è stringa libera (es. `"complexity"`, `"error-handling"`, `"dead-code"`, `"coverage"`). Viene mostrata come badge testuale.

`id`, `file`, `line` sono opzionali.

---

## `securityAnalysis`

```json
{
  "owaspCompliance": 62,
  "vulnerableDependencies": 3,
  "summary": "Testo descrittivo opzionale",
  "issues": [
    {
      "title": "Dipendenza con CVE critica: lodash@4.17.15",
      "description": "CVE-2021-23337: Prototype Pollution in lodash. Aggiornare a lodash@4.17.21.",
      "severity": "critical",
      "file": "package.json",
      "category": "CVE"
    },
    {
      "title": "Token JWT senza scadenza",
      "description": "I token generati non includono il campo exp.",
      "severity": "critical",
      "file": "src/auth/token.service.ts",
      "line": 56,
      "category": "OWASP-A07"
    }
  ]
}
```

`owaspCompliance` e `vulnerableDependencies` sono opzionali.

**Nota per il frontend:** se `category` corrisponde al pattern `OWASP-AXX` (es. `"OWASP-A07"`) viene mostrato come badge linkato a owasp.org/Top10. Se nel campo `reason` delle remediation è presente il pattern `CVE-YYYY-NNNNN`, viene generato automaticamente un link a nvd.nist.gov.

---

## `documentationAnalysis`

```json
{
  "completenessScore": 91,
  "coherenceScore": 96,
  "summary": "Testo descrittivo opzionale",
  "issues": [
    {
      "title": "API endpoint non documentata: POST /users/reset-password",
      "description": "L'endpoint non ha né JSDoc né entry nella specifica OpenAPI.",
      "severity": "warning",
      "file": "src/users/users.controller.ts",
      "line": 88,
      "category": "api-coverage"
    }
  ]
}
```

`completenessScore` e `coherenceScore` (0–100) sono opzionali.

---

## `remediations` (array dentro `report`)

```json
[
  {
    "id": "rem_001",
    "title": "Aggiorna lodash alla versione 4.17.21",
    "description": "La versione attuale ha una CVE critica che permette Prototype Pollution.",
    "severity": "critical",
    "category": "Security / Dependency",
    "file": "package.json",
    "line": null,
    "currentCode": "\"lodash\": \"^4.17.15\"",
    "suggestedCode": "\"lodash\": \"^4.17.21\"",
    "reason": "CVE-2021-23337 — Prototype Pollution in lodash <4.17.21",
    "decision": "pending"
  }
]
```

**Valori validi per `decision`:** `"pending"` | `"accepted"` | `"rejected"`

`currentCode` e `suggestedCode` sono opzionali — se presenti vengono renderizzati come blocchi diff (rosso/verde).

`reason` è opzionale ma il frontend lo scansiona con regex per estrarre:
- Pattern `CVE-YYYY-NNNNN` → link a `https://nvd.nist.gov/vuln/detail/CVE-...`
- Pattern `OWASP-AXX` o `OWASP AXX` → link a `https://owasp.org/Top10/`

---

## Avvio analisi

> **Path allineato**: il backend e frontend espongono e usano l'endpoint `POST /analysis/start`.

**Body inviato dal frontend:**
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

**Struttura attuale della response del backend** (`StartAnalysisResponseDTO`):
```json
{
  "path": "/tmp/clone/ana_xyz",
  "analysisId": "019612ab-cdef-7abc-8def-0123456789ab"
}
```

**Response attesa dal frontend** (da implementare quando l'analisi è asincrona):
```json
{
  "analysisId": "019612ab-cdef-7abc-8def-0123456789ab"
}
```

Il `path` locale non serve al frontend — può essere omesso o ignorato.

---

## Endpoint storico: `GET /analysis/repositories/:id/history`

**Non ancora implementato nel backend.**

Response attesa:
```json
{
  "items": [ "<array di Analysis completi con report>" ],
  "total": 14,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

Il frontend usa questo endpoint per il grafico storico (qualityScore/securityScore/documentationScore nel tempo) e per la lista nel tab Storico. Gli oggetti `Analysis` devono avere il campo `report` popolato.

---

## Aggiornamento decisione remediation: `PATCH /analysis/reports/:id/remediations/:remediationId`

**Non ancora implementato nel backend.**

**Body inviato:**
```json
{ "decision": "accepted" }
```

**Risposta attesa:** `200` con `{ "decision": "accepted" }` oppure `204`.

---

## WebSocket events (Socket.io)

Il frontend si connette durante un'analisi in corso e ascolta questi eventi per aggiornare la progress bar in tempo reale:

| Evento | Payload |
|---|---|
| `analysis:started` | `{ repositoryId, analysisId }` |
| `analysis:progress` | `{ repositoryId, analysisId, progress: 0–100, message?: string }` |
| `analysis:completed` | `{ repositoryId, analysisId, report: AnalysisReport }` |
| `analysis:failed` | `{ repositoryId, analysisId, error: string }` |

`progress` è un intero 0–100. Il frontend mostra una progress bar animata finché `status` è `"in-progress"` o `"pending"`.

Nel commit 73b29e6 (develop) c'è un commento `// emit analyzeRepository(path)` nel `StartAnalysisService` — questo è il punto dove andrà emesso l'evento WebSocket dopo il clone per avviare l'analisi vera.

---

## Punti aperti da concordare col team backend

| # | Questione | Impatto |
|---|---|---|
| 1 | ~~Path endpoint: `/analysis/start` vs `/analysis/repositories/:id/analyze`~~ | **Risolto** in entrambi i lati |
| 2 | `CoveragePercentage`: 0–1 interno → 0–100 nel JSON oppure il frontend si adatta | Da decidere prima che il report venga implementato |
| 3 | `status` nel JSON: minuscolo con trattino (`"in-progress"`) vs maiuscolo (`"IN_PROGRESS"`) | Il frontend gestisce solo minuscolo |
| 4 | `GET /analysis/reports/:id` con report embedded vs `reportsIndex` separato | Il frontend si aspetta il report inline nella risposta |
| 5 | Quando viene emesso l'evento WebSocket `analysis:completed` e con quale payload | Necessario per aggiornare la UI in tempo reale |

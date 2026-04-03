# Stato implementazione requisiti — Frontend

> Riferimento: AdR `origin/AdR` (2026-03-05, versione più aggiornata)
> Ultimo aggiornamento: 2026-04-03 (rev 3)
> Legenda: ✅ Implementato · ⚠️ Parziale · ❌ Non implementato · 🔧 Responsabilità backend

---

## UC1 — Registrazione

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb1 | Accesso alla sezione di registrazione | ✅ | `RegisterPage` accessibile da `/register` |
| RFOb2 | Comando di conferma invio modulo | ✅ | Pulsante submit nel form |
| RFOb3 | Validazione campi obbligatori al submit | ✅ | Zod schema su tutti i campi |
| RFOb4 | Finalizzazione solo dopo validazione positiva | ✅ | React Hook Form blocca submit se errori |
| RFOb5 | Creazione record account lato backend | 🔧 | Backend — `POST /account/auth/register` (non implementato) |
| RFOb6 | Password memorizzata come hash con salt | 🔧 | Backend |
| RFOb7 | Atomicità registrazione (no record parziali) | 🔧 | Backend |
| RFOb8 | Messaggio di conferma creazione account | ✅ | Toast di successo dopo register |
| RFOb9 | Rilevamento campi obbligatori vuoti | ✅ | Zod + React Hook Form |
| RFOb10 | Notifica campi mancanti specifici | ✅ | Messaggi di errore per campo |
| RFOb11 | Username alfanumerico 4-20 caratteri | ✅ | `.min(4).max(20).regex(/^[a-zA-Z0-9]+$/)` nello schema Zod |
| RFOb12 | Unicità username nel DB | 🔧 | Backend |
| RFOb13 | Vincolo unicità lato persistenza | 🔧 | Backend |
| RFOb14 | Notifica username già in uso | ✅ | Gestione errore 409 con toast |
| RFOb15 | Blocco e messaggio per username non valido | ✅ | Messaggio Zod sotto il campo |
| RFOb16 | Email conforme RFC 5322 | ✅ | `z.string().email()` |
| RFOb17 | Rifiuto email con spazi o senza @ | ✅ | Implicito in `.email()` |
| RFOb18 | Unicità email nel DB | 🔧 | Backend |
| RFOb19 | Vincolo unicità email lato persistenza | 🔧 | Backend |
| RFOb20 | Blocco e messaggio per email non valida | ✅ | Messaggio Zod sotto il campo |
| RFOb21 | Password ≥ 8 caratteri | ✅ | `z.string().min(8)` |
| RFOb22 | Password con maiuscola, minuscola, cifra, spec. | ✅ | 4 `.regex()` con indicatori visivi |
| RFOb23 | Password non contiene username | ✅ | `.superRefine()` in Zod + 6° check live in `PasswordChecks` |
| RFOb24 | Messaggio errore requisiti password non soddisfatti | ✅ | Indicatori colorati in tempo reale |

## UC2 — Login

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb25 | Accesso alla sezione login | ✅ | `LoginPage` su `/login` |
| RFOb26 | Comando di conferma login | ✅ | Pulsante "Accedi" |
| RFOb27 | Validazione credenziali al submit | ✅ | Zod + React Hook Form |
| RFOb28 | Accesso funzionalità solo dopo login | ✅ | `ProtectedRoute` in `App.tsx` |
| RFOb29 | Redirect a dashboard dopo login | ✅ | Navigate a `/repositories` |
| RFOb30 | HTTPS per trasferimento credenziali | 🔧 | Infrastruttura/backend |
| RFOb31-32 | Verifica credenziali lato backend | 🔧 | Backend |
| RFOb33 | Rate limiting / lockout | 🔧 | Backend — nessun feedback UI implementato |
| RFOb34 | Spinner durante validazione | ✅ | `isSubmitting` con `Loader2` |
| RFOb35 | Rilevamento campi vuoti | ✅ | Validazione Zod |
| RFOb36 | Errore formato username | ✅ | Messaggio Zod |
| RFOb37 | Notifica username non trovato | ✅ | Toast errore da risposta backend |
| RFOb38 | Errore formato password | ✅ | Messaggio Zod |
| RFOb39 | Notifica password errata | ✅ | Toast errore da risposta backend |

## UC3 — Collegamento GitHub

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb40 | Accesso sezione collegamento GitHub | ✅ | Tab GitHub in `SettingsPage` |
| RFOb41 | Blocco se GitHub già collegato | ⚠️ | UI mostra stato collegato ma non nasconde il pulsante attivamente |
| RFOb42 | Parametro state anti-CSRF | 🔧 | Backend OAuth |
| RFOb43 | Token GitHub cifrato | 🔧 | Backend |
| RFOb44 | Nessuna persistenza se flusso incompleto | 🔧 | Backend |
| RFOb45 | Avviso prima del redirect a GitHub | ✅ | Testo informativo prima del link OAuth |
| RFOb46 | Annullamento redirect | ✅ | Step intermedio con dettagli OAuth + pulsanti "Procedi" / "Annulla" in `GitHubSection` |
| RFOb47 | Messaggio esito collegamento al ritorno | ⚠️ | Toast presente ma dipende dal callback OAuth non ancora implementato |
| RFOb48 | Gestione timeout API GitHub | 🔧 | Backend |
| RFOb49 | Blocco se GitHub già associato ad altro account | 🔧 | Backend |
| RFOb50 | Messaggio se utente nega consenso su GitHub | 🔧 | Backend — frontend non gestisce il caso |

## UC4 — Richiesta analisi

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb51 | Inserimento URL repository | ✅ | `AnalysisOptionsModal` |
| RFOb52 | Validazione URL GitHub (https + github.com) | ✅ | Zod in `AddRepositoryModal` |
| RFOb53 | Verifica dimensione repository | 🔧 | Backend — nessun feedback UI dedicato |
| RFOb54 | Blocco se report già aggiornato | ❌ | Non implementato |
| RFOb55 | Disabilitazione pulsante dopo submit | ✅ | `isSubmitting` disabilita il bottone |
| RFOb56 | Blocco se analisi già in corso | ✅ | Pulsante "Analizza" disabilitato quando `isRunning` in `RepositoriesPage` e `RepositoryDetailPage` |
| RFOb57 | Blocco se nessuna area selezionata | ✅ | Validazione in `AnalysisOptionsModal` |

## UC5 — Lista repository

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb58 | Ordinamento per data ultima analisi | ⚠️ | Delega al backend; nessun ordinamento esplicito lato frontend |
| RFOb59 | Nome, URL, data ultima analisi per ogni repo | ✅ | Tutti mostrati in `RepositoriesPage` |
| RFOb60 | Messaggio "nessun repository" | ✅ | Empty state con testo dedicato |
| RFOb61 | Errore se servizi non raggiungibili | ✅ | Toast + messaggio dedicato nell'empty state + pulsante Riprova |
| RFOb62 | Pulsante Refresh in caso di errore | ✅ | Pulsante "Riprova" con icona `RefreshCw` nell'empty state di `RepositoriesPage` |

## UC6 — Visualizzazione report

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb63 | Selezione repository per report | ✅ | Click su repo → `RepositoryDetailPage` |
| RFOb64 | Validazione ownership lato server | 🔧 | Backend |
| RFOb65 | Errore autorizzazione per report altrui | 🔧 | Backend — frontend non gestisce 403 dedicato |
| RFOb66 | Gestione timeout recupero dati | ⚠️ | Toast generico, nessun messaggio dedicato di timeout |
| RFOb67 | Selezione/deselezione aree analitiche | ✅ | Tab Code/Security/Documentation/Remediation/History |
| RFOb68 | Aggiornamento dinamico senza reload | ✅ | React state, nessun reload |
| RFOb69 | Avviso se nessuna area selezionata nei filtri | ❌ | I tab sono sempre tutti visibili, nessun filtro de-selezionabile |

### UC6.2 — Metadati report

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb70 | Esposizione metadati report | ⚠️ | Data mostrata in History tab, non nell'area principale |
| RFOb71 | Timestamp ISO 8601 | ⚠️ | `formatDate(analysis.date)` — non ISO 8601 completo |
| RFOb72 | SHA commit con link a GitHub | ✅ | SHA troncato a 7 char con link `{repo.url}/commit/{sha}` in `RepositoryDetailPage` |
| RFOb73 | Username/ID di chi ha avviato la scansione | ❌ | Non visualizzato |

### UC6.3 — Risultati e remediation

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb74 | Metriche aggregate (score, bug, vulnerabilità) | ✅ | `ScoreCard` per qualità/sicurezza/docs |
| RFOb75 | Lista remediation associate alle criticità | ✅ | Tab Remediation in `RepositoryDetailPage` |
| RFOb76 | Espansione dettagli singola remediation | ✅ | Accordion/expand per ogni remediation |
| RFOb77 | Messaggio "Clean" se nessuna criticità | ✅ | "Nessun problema rilevato" con `CheckCircle2` |

## UC7 — Selezione intervallo temporale (History)

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb78 | Input data inizio/fine per filtro storico | ✅ | Due `<input type="date">` con filtro client-side in `HistoryPage` |
| RFOb79 | Pulsante conferma richiesta confronto | ✅ | Filtro applicato istantaneamente al cambio delle date (no confirm esplicito necessario) |
| RFOb80 | Blocco se date non compilate | ⚠️ | Filtro opzionale: una sola data filtra in modo unilaterale |
| RFOb81 | Blocco se data inizio > data fine | ✅ | Validazione con messaggio di errore `dateError` |
| RFOb82 | Limite massimo 12 mesi | ✅ | Controllo differenza mesi con errore dedicato |
| RFOb83 | Messaggio "Nessun report trovato" | ✅ | Empty state generico presente |

## UC8 — Metriche comparative

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb84 | Tabella comparativa report in ordine cronologico | ⚠️ | Grafico storico cronologico ✅ nel tab Storico; selezione manuale di due analisi da comparare ❌ |
| RFOb85 | Indicatori di variazione tra analisi | ✅ | `LineChart` Recharts mostra l'andamento visivo di qualità/sicurezza/docs nel tempo |
| RFOb86 | Allineamento grafico/tabella con fetch atomico | ✅ | Grafico e lista usano la stessa singola chiamata `getHistory()` |
| RFOb87 | Fallback tabellare se grafici non disponibili | ✅ | Lista storica sotto al grafico funge da fallback tabellare |
| RFDe1 | Grafici dinamici (linee/istogrammi) | ✅ | `LineChart` Recharts nel tab Storico di `RepositoryDetailPage` con tre serie (Qualità, Sicurezza, Docs) |
| RFDe2 | Tooltip su hover con valori e commit hash | ⚠️ | Tooltip con valori ✅; commit hash nel tooltip ❌ |

## UC9-UC11 — Analisi code/security/docs

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb88 | Sezione "Codice" con filtro area attiva | ✅ | Tab Code in `RepositoryDetailPage` |
| RFOb89 | Lista bug/code smell con severità e file | ✅ | `IssuesList` con file e gravità |
| RFOb90 | Code coverage e test pass/fail | ✅ | `testCoverage` e `linesAnalyzed` mostrati nel tab Code di `RepositoryDetailPage` |
| RFOb91 | Lista remediation per il codice | ✅ | Tab Remediation |
| RFOb92 | "Codice Conforme" se nessun bug | ✅ | Messaggio "Nessun problema di codice rilevato" |
| RFOb93 | Caricamento asincrono sezione sicurezza | ✅ | Caricamento lazy via tab |
| RFOb94 | Dipendenze vulnerabili con CVE e CVSS | ✅ | Badge categoria (es. `CVE`) sulle issue + link NVD nelle remediation |
| RFOb95 | Mapping OWASP Top 10 | ✅ | Badge categoria (es. `OWASP-A07`) sulle issue + link owasp.org nelle remediation |
| RFOb96 | Remediation sicurezza ordinate per criticità | ⚠️ | Lista presente, ordinamento non verificato |
| RFOb97 | "Repository Sicuro" se no vulnerabilità | ✅ | Messaggio "Nessun problema di sicurezza rilevato" |
| RFOb98 | Sezione documentazione con errori sintattici | ⚠️ | Mostrata ma senza errori sintattici dettagliati |
| RFOb99 | Errori sintattici e link interrotti | ❌ | Non visualizzato |
| RFOb100 | Indice completezza documentale | ✅ | `completenessScore` e `coherenceScore` mostrati nel tab Docs di `RepositoryDetailPage` |
| RFOb101 | Suggerimenti per documentazione mancante | ⚠️ | Remediation generiche, non specifiche per doc |
| RFOb102 | "Documentazione Completa" se no errori | ✅ | Messaggio "Documentazione completa" |

## UC12 — Ranking

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb103 | Score globale 0-100 per repository | ✅ | `ScoreCard` in `RankingPage` |
| RFOb104 | Graduatoria ordinata per score decrescente | ✅ | `RankingPage` |
| RFOb105 | Posizione, nome, score e trend mensile | ✅ | Delta numerico (`▲+7`, `▼-N`) con `TrendingUp`/`TrendingDown` affiancato allo score in `RankingPage`; `scoreDelta` in tipo e mock |
| RFOb106 | Messaggio se nessuna analisi completata | ✅ | Empty state "Classifica vuota" |

## UC13 — Disconnessione GitHub

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb107 | Rimozione integrazione con conferma esplicita | ✅ | `confirm()` dialog prima di `unlinkGithub()` |
| RFOb108-110 | Revoca token e cleanup backend | 🔧 | Backend |

## UC14 — Esportazione report

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFDe3 | Link di download file generato | ✅ | `URL.createObjectURL(blob)` con `<a>.click()` in `handleExport` |
| RFDe4 | Esportazione PDF e JSON | ✅ | Dropdown "Esporta" con PDF e JSON in `RepositoryDetailPage` |
| RFDe5 | Blocco se nessun formato selezionato | ✅ | Il formato è sempre selezionato esplicitamente prima del click nel dropdown |
| RFDe6 | File con metadati e risultati | 🔧 | Contenuto del blob generato dal backend |
| RFDe7 | Generazione asincrona | 🔧 | Backend — frontend mostra spinner `exporting` durante l'attesa |

## UC15 — Cambio password

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb111 | Accesso sezione cambio password | ✅ | Tab Sicurezza in `SettingsPage` |
| RFOb112 | Verifica password corrente prima del cambio | ✅ | Campo "password attuale" presente |
| RFOb113 | Errore se password corrente mancante/errata | ✅ | Validazione Zod + toast errore backend |
| RFOb114 | Nuova password rispetta vincoli di sicurezza | ✅ | Stessi vincoli della registrazione |
| RFOb115 | Blocco se nuova password == vecchia | 🔧 | Backend |
| RFOb116-118 | Hashing, invalidazione sessioni, email conferma | 🔧 | Backend |

## UC16, UC30-UC38 — Dettaglio e gestione remediation

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb119 | Visualizzazione dettaglio remediation | ✅ | Accordion espandibile in `RepositoryDetailPage` |
| RFOb120 | Descrizione, snippet codice, severità, proposta | ✅ | `currentCode`, `suggestedCode`, severità visibili |
| RFOb121 | Link a CWE/OWASP per vulnerabilità sicurezza | ✅ | Link a NVD (CVE) e OWASP Top 10 estratti da `r.reason` e `r.category` nella `RemediationList` |
| RFOb171-176 | Dettaglio per code/security/docs remediation | ✅ | Unificato nel tab Remediation |
| RFOb177-180 | Accettazione remediation codice | ✅ | Pulsante "Accetta" → `updateRemediationDecision` |
| RFOb181-182 | Rifiuto remediation codice | ✅ | Pulsante "Rifiuta" → `updateRemediationDecision` |
| RFOb183-186 | Accettazione/errore remediation sicurezza | ✅ | Unificato |
| RFOb187-188 | Rifiuto remediation sicurezza | ✅ | Unificato |
| RFOb189-192 | Accettazione/errore remediation docs | ✅ | Unificato |
| RFOb193-198 | Rifiuto remediation docs con conferma visiva | ✅ | Badge di stato aggiornato |

## UC39-UC45 — Repository privati

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb199 | Analisi repository privato (utente avanzato) | ❌ | Nessun ruolo "utente avanzato" nel frontend |
| RFOb200 | Validazione integrazione GitHub attiva | ⚠️ | `hasGithubLinked` nel tipo, non verificato prima dell'analisi |
| RFOb201 | Blocco se nessuna area selezionata (privato) | ✅ | Stesso comportamento di UC4 |
| RFOb202 | Inserimento URL repo privato | ⚠️ | `AddRepositoryModal` accetta URL ma non distingue privato/pubblico |
| RFOb203 | Blocco URL duplicato nel catalogo | 🔧 | Backend |
| RFOb204 | Lista repository privati | ❌ | Nessuna sezione dedicata ai privati |
| RFOb205 | Empty state catalogo privato vuoto | ❌ | Non implementato |
| RFOb206-207 | Rimozione repo privato con conferma | ❌ | Nessun pulsante elimina repository nell'UI |
| RFOb208-213 | Gestione permessi utenti terzi | ❌ | Non implementato |

## UC46-UC47 — Raccolte e cancellazione account

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| RFOb214 | Rimozione raccolta senza eliminare report | ❌ | Nessuna UI per le raccolte |
| RFOb215 | Verifica password prima cancellazione account | ⚠️ | Richiede di digitare "ELIMINA", non la password |
| RFOb216 | Avviso irreversibilità con possibilità annullamento | ✅ | Dialog "Zona pericolosa" con testo irreversibilità |
| RFOb217 | Rimozione dati e OAuth dopo cancellazione | 🔧 | Backend |

## Requisiti di Qualità e Vincolo (frontend)

| ID | Descrizione sintetica | Stato | Note |
|---|---|---|---|
| QROb2 | Tempi di risposta dashboard ottimizzati | ✅ | Lazy loading tab, nessun calcolo pesante lato client |
| VROb5 | Copertura test ≥ 70% (Jest) | ✅ | Vitest (API Jest-compatibile): 144 test, 100% stmt/func/lines, 98.59% branch sulle unità coperte (`lib/`, `components/ui/`, `AnalysisStatusBadge`, `ScoreCard`) |
| VROb10 | React v18.3+ | ✅ | React 19.2.4 |
| VROb13 | Compatibilità Windows 10/11 | ⚠️ | Non verificato, stack standard |
| VROb14 | Compatibilità macOS 14+ | ✅ | Testato in sviluppo |
| VROb15 | Compatibilità Linux Ubuntu 22.04+ | ⚠️ | Non verificato, stack standard |
| VROb16 | Compatibilità Chrome 120+ | ⚠️ | Non verificato esplicitamente |
| VROb17 | Compatibilità Firefox 120+ | ⚠️ | Non verificato esplicitamente |
| VROb18 | Compatibilità Safari 17+ | ⚠️ | Non verificato esplicitamente |

---

## Riepilogo

| Categoria | ✅ | ⚠️ | ❌ | 🔧 |
|---|---|---|---|---|
| Registrazione (UC1) | 14 | 0 | 0 | 9 |
| Login (UC2) | 10 | 0 | 0 | 5 |
| GitHub link (UC3) | 4 | 1 | 0 | 6 |
| Analisi (UC4) | 4 | 0 | 1 | 1 |
| Lista repo (UC5) | 4 | 0 | 0 | 0 |
| Report / metadati (UC6) | 7 | 3 | 2 | 3 |
| History / filtri (UC7) | 5 | 1 | 0 | 0 |
| Metriche comparative (UC8) | 4 | 2 | 0 | 0 |
| Code/Security/Docs (UC9-11) | 11 | 2 | 2 | 0 |
| Ranking (UC12) | 4 | 0 | 0 | 0 |
| Disconnessione GitHub (UC13) | 1 | 0 | 0 | 3 |
| Esportazione (UC14) | 3 | 0 | 0 | 2 |
| Cambio password (UC15) | 4 | 0 | 0 | 4 |
| Remediation (UC16, UC30-38) | 10 | 0 | 0 | 0 |
| Repository privati (UC39-45) | 1 | 2 | 6 | 1 |
| Raccolte / Account (UC46-47) | 1 | 1 | 1 | 1 |
| Qualità / Vincoli | 2 | 5 | 1 | 0 |
| **Totale** | **89** | **17** | **13** | **37** |

Le principali aree **ancora mancanti** nel frontend sono:
- Comparativa manuale tra due analisi selezionabili (RFOb84 parziale) — richiede UI di selezione + endpoint compare
- Commit hash nel tooltip del grafico storico (RFDe2 parziale)
- Repository privati con catalogo e permessi (UC39-UC45)
- Raccolte di report (UC46)

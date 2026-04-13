#!/usr/bin/env bash
# Avvia tutti i servizi CodeGuardian in parallelo.
#
# Uso:
#   ./dev.sh          → modalità reale (Postgres + microservizi reali, VITE_MOCK_MODE=false)
#   ./dev.sh --mock   → modalità mock  (nessun DB, tutto mockato,     VITE_MOCK_MODE=true)
#
# Premi Ctrl+C per fermare tutto.

ACCOUNT_DIR="../CodeGuardianAccountAdministrationMicroservice"
ANALYSIS_DIR="../CodeGuardianAnalysisMicroservice"

# ── Colori ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

prefix() {
  local color=$1
  local label=$2
  while IFS= read -r line; do
    printf "${color}[${label}]${NC} %s\n" "$line"
  done
}

cleanup() {
  echo ""
  echo "Stopping all services..."
  kill 0
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Argomenti ─────────────────────────────────────────────────────────────────
MOCK_MODE=false
for arg in "$@"; do
  [[ "$arg" == "--mock" ]] && MOCK_MODE=true
done

# ── Verifica directory microservizi ───────────────────────────────────────────
if [ ! -d "$ACCOUNT_DIR" ]; then
  echo "ERROR: Account microservice not found at $ACCOUNT_DIR"
  exit 1
fi
if [ ! -d "$ANALYSIS_DIR" ]; then
  echo "ERROR: Analysis microservice not found at $ANALYSIS_DIR"
  exit 1
fi

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
if [[ "$MOCK_MODE" == "true" ]]; then
  echo -e "${YELLOW}╔══════════════════════════════════╗"
  echo -e "║       MOCK MODE  (--mock)        ║"
  echo -e "╚══════════════════════════════════╝${NC}"
  echo "  Backend: axios-mock-adapter (no real DB)"
else
  echo -e "${CYAN}╔══════════════════════════════════╗"
  echo -e "║        REAL BACKENDS             ║"
  echo -e "╚══════════════════════════════════╝${NC}"
  echo "  Account  → http://localhost:3001  (branch: develop + Postgres)"
  echo "  Analysis → http://localhost:3002  (branch: develop + MongoDB)"
fi
echo "  Frontend → http://localhost:5173"
echo ""

# ── PostgreSQL (solo modalità reale) ─────────────────────────────────────────
if [[ "$MOCK_MODE" == "false" ]]; then
  export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"
  if ! pg_isready -q 2>/dev/null; then
    echo "Starting PostgreSQL@14..."
    brew services start postgresql@14
    sleep 2
    
    echo "Inizializzando DB Account MS..."
    psql -U root -h localhost -d miodb -f "$ACCOUNT_DIR/database/init.sql" 2>/dev/null || echo "Tabelle parzialmente o già create."
  else
    echo "PostgreSQL already running."
    psql -U root -h localhost -d miodb -f "$ACCOUNT_DIR/database/init.sql" 2>/dev/null || echo "Tabelle parzialmente o già create."
  fi

  # Avverte se i microservizi non sono sul branch develop
  ACCOUNT_BRANCH=$(git -C "$ACCOUNT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [[ "$ACCOUNT_BRANCH" != "develop" ]]; then
    echo -e "${YELLOW}WARNING: Account microservice is on branch '${ACCOUNT_BRANCH}', not 'develop'.${NC}"
    echo "         Run: cd $ACCOUNT_DIR && git checkout develop"
    echo ""
  fi
  ANALYSIS_BRANCH=$(git -C "$ANALYSIS_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [[ "$ANALYSIS_BRANCH" != "develop" ]]; then
    echo -e "${YELLOW}WARNING: Analysis microservice is on branch '${ANALYSIS_BRANCH}', not 'develop'.${NC}"
    echo "         Run: cd $ANALYSIS_DIR && git checkout develop"
    echo ""
  fi
fi

# ── Docker Documentation Agent ────────────────────────────────────────────────
if [[ "$MOCK_MODE" == "false" ]]; then
  echo "Checking docker image per strands-documentation-analyzer..."
  if ! docker image inspect strands-documentation-analyzer >/dev/null 2>&1; then
    echo "Building docker image strands-documentation-analyzer..."
    (cd "$ANALYSIS_DIR" && docker build -t strands-documentation-analyzer -f infra/docker/Dockerfile.documentation .)
  else
    echo "Docker image strands-documentation-analyzer already exists."
  fi
fi

# ── Pulizia porte ─────────────────────────────────────────────────────────────
echo "Cleaning up ports 3001, 3002, 5173..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1
echo ""

# ── Avvio microservizi ────────────────────────────────────────────────────────
JWT_SECRET="codeguardian-dev-secret"

if [[ "$MOCK_MODE" == "false" ]]; then
  # Modalità reale: passa DATABASE_URL, JWT_SECRET e forza PORT=3001
  (cd "$ACCOUNT_DIR" && \
    DATABASE_URL="postgres://root:root@localhost:5432/miodb" PORT=3001 JWT_SECRET="$JWT_SECRET" \
    npm run start:dev 2>&1 | prefix "$RED" "account ") &
else
  # Modalità mock: solo PORT
  (cd "$ACCOUNT_DIR" && PORT=3001 npm run start:dev 2>&1 | prefix "$RED" "account ") &
fi

(cd "$ANALYSIS_DIR" && PORT=3002 JWT_SECRET="$JWT_SECRET" npm run start:dev 2>&1 | prefix "$GREEN" "analysis") &

# Attende un attimo che i microservizi siano pronti
sleep 3

# ── Frontend ──────────────────────────────────────────────────────────────────
VITE_MOCK_MODE=$MOCK_MODE npm run dev 2>&1 | prefix "$BLUE" "frontend"

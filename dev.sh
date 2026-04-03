#!/usr/bin/env bash
# Avvia tutti i servizi CodeGuardian in parallelo.
# Uso: ./dev.sh
# Premi Ctrl+C per fermare tutto.

ACCOUNT_DIR="../CodeGuardianAccountAdministrationMicroservice"
ANALYSIS_DIR="../CodeGuardianAnalysisMicroservice"

# Colori per distinguere i log
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
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

# Verifica che le directory dei microservizi esistano
if [ ! -d "$ACCOUNT_DIR" ]; then
  echo "ERROR: Account microservice not found at $ACCOUNT_DIR"
  exit 1
fi
if [ ! -d "$ANALYSIS_DIR" ]; then
  echo "ERROR: Analysis microservice not found at $ANALYSIS_DIR"
  exit 1
fi

echo "Cleaning up ports 3001, 3002, 5173..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

echo "Starting CodeGuardian services..."
echo "  Account  → http://localhost:3001"
echo "  Analysis → http://localhost:3002"
echo "  Frontend → http://localhost:5173"
echo ""

# Avvia i microservizi in background con prefisso colorato
(cd "$ACCOUNT_DIR" && npm run start:dev 2>&1 | prefix "$RED" "account ") &
(cd "$ANALYSIS_DIR" && npm run start:dev 2>&1 | prefix "$GREEN" "analysis") &

# Aspetta un attimo che i microservizi si avviino prima del frontend
sleep 3

# Avvia il frontend (in foreground per ricevere Ctrl+C)
npm run dev 2>&1 | prefix "$BLUE" "frontend"

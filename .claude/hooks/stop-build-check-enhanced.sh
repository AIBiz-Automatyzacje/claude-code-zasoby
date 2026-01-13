#!/bin/bash

# Stop Build Check Enhanced
# Uruchamia TSC przy zakończeniu odpowiedzi Claude
# - 0 błędów: sukces
# - 1-3 błędy: ostrzeżenie + sugestia agenta
# - >3 błędy: blokada

set -e

# Konfiguracja
ERROR_THRESHOLD=3
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
SESSION_ID="${CLAUDE_SESSION_ID:-default}"
CACHE_DIR="$PROJECT_DIR/.claude/tsc-cache/$SESSION_ID"

# Utwórz katalog cache jeśli nie istnieje
mkdir -p "$CACHE_DIR"

# Przejdź do katalogu projektu
cd "$PROJECT_DIR"

# Uruchom TSC i przechwyć output
TSC_OUTPUT=$(npx tsc --noEmit 2>&1 || true)

# Zapisz output do cache
echo "$TSC_OUTPUT" > "$CACHE_DIR/last-errors.txt"
echo "npx tsc --noEmit" > "$CACHE_DIR/tsc-commands.txt"

# Zlicz błędy (wzorzec "error TS")
# Używamy grep | wc -l zamiast grep -c, bo grep -c ma exit code 1 gdy nic nie znajdzie
ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep "error TS" | wc -l | tr -d ' ')
# Upewnij się że ERROR_COUNT jest liczbą
ERROR_COUNT=${ERROR_COUNT:-0}

# Logika w zależności od liczby błędów
if [ "$ERROR_COUNT" -eq 0 ]; then
    # Sukces - brak błędów
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ TSC CHECK PASSED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Brak błędów TypeScript."
    echo ""
    exit 0

elif [ "$ERROR_COUNT" -le "$ERROR_THRESHOLD" ]; then
    # Ostrzeżenie - mało błędów
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  TSC CHECK: $ERROR_COUNT błąd(y)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "$TSC_OUTPUT" | grep "error TS" | head -10
    echo ""
    echo "💡 Sugestia: Użyj agenta auto-error-resolver"
    echo "   do automatycznego naprawienia błędów."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    exit 0

else
    # Blokada - zbyt wiele błędów
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ TSC CHECK FAILED: $ERROR_COUNT błędów"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Pierwsze 15 błędów:"
    echo "$TSC_OUTPUT" | grep "error TS" | head -15
    echo ""
    echo "🤖 INSTRUKCJA: Uruchom agenta auto-error-resolver"
    echo "   aby automatycznie naprawić błędy TypeScript."
    echo ""
    echo "Cache błędów: $CACHE_DIR/last-errors.txt"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    exit 1
fi

#!/bin/bash
set -e

# Czytaj stdin do zmiennej
INPUT=$(cat)

# Uruchom skrypt z absolutną ścieżką
npx tsx "$CLAUDE_PROJECT_DIR/.claude/hooks/error-handling-reminder.ts" <<< "$INPUT"

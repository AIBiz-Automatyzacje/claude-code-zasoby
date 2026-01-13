---
description: Inicjalizacja równoległych katalogów git worktree dla agentów Claude Code
argument-hint: [nazwa-funkcji] [liczba-worktrees] (np. "auth-refaktor 3")
allowed-tools: Bash(git:*), Bash(mkdir:*), Bash(ls:*)
---

# Przygotowanie równoległych worktrees

## Zmienne
- NAZWA_FUNKCJI: $1
- LICZBA_WORKTREES: $2

## Walidacja wstępna
- Sprawdź czy jesteśmy w repozytorium git: `git rev-parse --git-dir 2>/dev/null || echo "NIE W REPO GIT"`
- Obecna gałąź: `git branch --show-current`
- Sprawdź czy katalog `trees/` już istnieje: `ls -la trees/ 2>/dev/null || echo "Katalog nie istnieje"`

## Instrukcje wykonania

1. **Utwórz katalog bazowy** (jeśli nie istnieje):
```bash
   mkdir -p trees/
```

2. **Utwórz worktrees**:
   Dla każdego numeru od 1 do $2 wykonaj równolegle (użyj narzędzia Batch):

   **Wzór komendy:**
```bash
   git worktree add -b $1-{numer} ./trees/$1-{numer}
```

   **Przykład dla $1="auth-refaktor" i $2=3:**
```bash
   git worktree add -b auth-refaktor-1 ./trees/auth-refaktor-1
   git worktree add -b auth-refaktor-2 ./trees/auth-refaktor-2
   git worktree add -b auth-refaktor-3 ./trees/auth-refaktor-3
```

3. **Zwaliduj każdy worktree**:
```bash
   cd trees/$1-{numer} && git ls-files | head -5
```

4. **Potwierdź utworzenie**:
```bash
   git worktree list
```

## Format wyjściowy
```
✅ Utworzono $2 worktrees dla funkcji "$1"

📁 Struktura:
   - trees/$1-1/
   - trees/$1-2/
   - ...

🔀 Gałęzie: $1-1, $1-2, ...

➡️ Następny krok: /parallel-execute $1 [ścieżka-do-planu] $2
```
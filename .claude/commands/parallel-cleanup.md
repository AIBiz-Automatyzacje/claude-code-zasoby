---
description: Usunięcie worktrees i gałęzi po zakończeniu pracy równoległej
argument-hint: [nazwa-funkcji] (np. "auth-refaktor")
allowed-tools: Bash(git:*), Bash(rm:*), Bash(rmdir:*), Bash(ls:*)
---

# Sprzątanie po pracy równoległej

## Zmienne
- NAZWA_FUNKCJI: $1

## Walidacja wstępna
- Lista worktrees: `git worktree list`
- Lista gałęzi $1: `git branch | grep $1 || echo "Brak gałęzi $1-*"`
- Obecna gałąź: `git branch --show-current`

## Instrukcje

1. **Zapytaj użytkownika**:
   - "Którą wersję zmergowałeś do głównej gałęzi? (podaj numer lub 'żadna')"
   - Jeśli 'żadna' → ostrzeż: "UWAGA: Usunięcie spowoduje utratę wszystkich zmian!"

2. **Poproś o potwierdzenie**:
   - "Czy na pewno usunąć wszystkie worktrees i gałęzie dla '$1'? (tak/nie)"
   - Kontynuuj TYLKO po otrzymaniu "tak"

3. **Usuń worktrees**:
   Dla każdego worktree pasującego do wzorca `trees/$1-*`:

   **Wzór komendy:**
```bash
   git worktree remove trees/$1-{numer} --force
```

   **Przykład dla $1="auth-refaktor":**
```bash
   git worktree remove trees/auth-refaktor-1 --force
   git worktree remove trees/auth-refaktor-2 --force
   git worktree remove trees/auth-refaktor-3 --force
```

4. **Usuń gałęzie**:
```bash
   git branch -D $1-1
   git branch -D $1-2
   git branch -D $1-3
```

5. **Posprzątaj katalog** (jeśli pusty):
```bash
   rmdir trees/ 2>/dev/null || echo "Katalog trees/ zawiera inne pliki"
```

6. **Potwierdź usunięcie**:
```bash
   git worktree list
   git branch | grep $1 || echo "Brak gałęzi $1-*"
```

## Format wyjściowy
```
✅ Sprzątanie zakończone dla "$1"

🗑️ Usunięto worktrees:
   - trees/$1-1/
   - trees/$1-2/
   - ...

🔀 Usunięto gałęzie:
   - $1-1
   - $1-2
   - ...

📋 Pozostałe worktrees: [lista lub "brak"]
```
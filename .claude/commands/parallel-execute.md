---
description: Równoległe wykonanie planu przez wielu agentów w osobnych worktrees
argument-hint: [nazwa-funkcji] [ścieżka-planu] [liczba-worktrees] (np. "auth-refaktor dev/active/auth-refaktor/auth-refaktor-plan.md 3")
allowed-tools: Bash(ls:*), Bash(cat:*), Read, Write, Task
---

# Równoległe wykonanie zadania

## Zmienne
- NAZWA_FUNKCJI: $1
- PLAN_DO_WYKONANIA: $2
- LICZBA_WORKTREES: $3

## Walidacja wstępna
- Sprawdź czy worktrees istnieją: `ls -la trees/ 2>/dev/null || echo "BRAK KATALOGU trees/"`
- Sprawdź czy plan istnieje: `cat $2 2>/dev/null | head -10 || echo "PLAN NIE ZNALEZIONY"`

## Instrukcje

1. **Przeczytaj plan** z `$2`

2. **Uruchom równoległych agentów**:
   Dla każdego numeru od 1 do $3 utwórz subagenta używając narzędzia Task z parametrem:

   ```
   subagent_type: parallel-developer
   ```

   **WAŻNE:** Użyj agenta `parallel-developer` który ma uprawnienia do Write/Edit/Bash.

   **Przykład dla $1="auth-refaktor" i $3=3:**
   - Agent 1 → pracuje w `trees/auth-refaktor-1/`
   - Agent 2 → pracuje w `trees/auth-refaktor-2/`
   - Agent 3 → pracuje w `trees/auth-refaktor-3/`

   **Instrukcje dla każdego agenta:**
```
   Twój workspace: trees/$1-{numer}/

   Zadanie: Zaimplementuj plan z $2 w tym workspace.

   Zasady:
   - Pracuj TYLKO w swoim workspace
   - NIE uruchamiaj testów ani innego kodu
   - Skup się wyłącznie na zmianach w kodzie
   - Po zakończeniu utwórz REZULTATY_$1-{numer}.md w folderze z planem (np. dev/active/$1/)

```

3. **Zawartość REZULTATY.md** każdego agenta:
   - Podsumowanie wykonanych zmian
   - Lista zmodyfikowanych/utworzonych plików
   - Podjęte decyzje implementacyjne
   - Napotkane problemy i rozwiązania
   - Samoocena kompletności (%)

## Format wyjściowy
```
✅ Uruchomiono $3 równoległych agentów

🔄 Status:
   - Agent 1 (trees/$1-1/): [w trakcie/ukończony]
   - Agent 2 (trees/$1-2/): [w trakcie/ukończony]
   - ...

📄 Rezultaty dostępne w:
   - trees/$1-1/REZULTATY.md
   - trees/$1-2/REZULTATY.md
   - ...

➡️ Następny krok: porównaj implementacje, zmerguj najlepszą, potem /parallel-cleanup $1
```

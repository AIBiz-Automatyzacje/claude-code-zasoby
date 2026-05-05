---
name: dev-docs-review
description: "Code review wykonanej fazy/etapu przez multi-agent analysis."
argument-hint: "[ścieżka-do-folderu] [numer-fazy]"
---

# Code Review fazy zadania

## Zmienne
- ŚCIEŻKA_ZADANIA: $1
- NUMER_FAZY: $2

## Instrukcje

### 1. Walidacja
- Sprawdź czy folder `$1/` istnieje
- Sprawdź zmiany w git: `git status --short`
- Jeśli folder nie istnieje → poinformuj użytkownika i zakończ

### 2. Przygotowanie kontekstu
Przeczytaj dokumentację zadania z `$1/`:
- Plan zadania (cele, wymagania, kryteria akceptacji)
- Plik z zadaniami (co miało być zrobione w fazie $2)
- Plik kontekstowy (decyzje, zmiany)

### 3. Uruchom agentów review równolegle

**Cross-reference z planem technicznym:**
Jeśli istnieje plan w `docs/plans/`:
- Przeczytaj Implementation Unit odpowiadający tej fazie
- Przekaż każdemu agentowi review: jakie pliki miały być zmienione (Files:), jakie testy miały być napisane (Test scenarios:), jakie wzorce miały być naśladowane (Patterns to follow:)
- Sprawdź czy Implementation Unit definiował ścieżki plików testowych w sekcji **Pliki: Test:**. Jeśli tak — zweryfikuj czy te pliki istnieją. Brakujący plik testowy zdefiniowany w planie = 🟠 [P2-important] w raporcie "Odchylenia od planu"
- Sprawdź czy IU miało wypełnione `Delegate to:`. Brak pola w IU sprzed reformy delegacji = ⚪ [info] (legacy plan, nie blokuje review). Niezgodność `Delegate to:` z faktyczną kategorią plików (np. UI files w IU oznaczonym `feature-builder-data`) = 🟡 [P3-nit] z notatką dla planisty
- Dodaj do raportu sekcję "Odchylenia od planu" jeśli implementacja różni się od planu

Uruchom 5 agentów (Task) równolegle, każdy z inną perspektywą:

**Agent 1: Security Review**
```
Jesteś security reviewer. Przeczytaj `.claude/agents/security-sentinel.md` i zastosuj jego metodologię.
Sprawdź zmiany z fazy $2 w folderze $1.
Skup się na: auth, RLS policies, XSS, data exposure, Zod validation, API key exposure.
Klasyfikuj: 🔴 [P1-blocking], 🟠 [P2-important], 🟡 [P3-nit]
```

**Agent 2: Performance Review**
```
Jesteś performance reviewer. Przeczytaj `.claude/agents/performance-oracle.md` i zastosuj jego metodologię.
Sprawdź zmiany z fazy $2 w folderze $1.
Skup się na: N+1 queries, bundle size, lazy loading, memoization, useEffect cleanup.
Klasyfikuj: 🔴 [P1-blocking], 🟠 [P2-important], 🟡 [P3-nit]
```

**Agent 3: Architecture & Code Quality**
```
Jesteś architecture reviewer. Przeczytaj `.claude/agents/architecture-strategist.md` i `.claude/agents/kieran-typescript-reviewer.md`.
Sprawdź zmiany z fazy $2 w folderze $1.
Skup się na: SOLID, wzorce, nazewnictwo, type safety, import organization.
Klasyfikuj: 🔴 [P1-blocking], 🟠 [P2-important], 🟡 [P3-nit]
```

**Agent 4: Scenario Exploration & Test Coverage**
```
Jesteś tester scenariuszy. Dla zmian z fazy $2 w folderze $1, sprawdź:
- [ ] Happy path — główny flow działa poprawnie
- [ ] Invalid inputs — walidacja, error messages
- [ ] Boundary conditions — puste listy, max wartości, null/undefined
- [ ] Concurrent operations — race conditions, optimistic updates
- [ ] Scale — co jeśli 100x więcej danych?
- [ ] Test coverage — czy plan techniczny definiował scenariusze testowe
  dla tej fazy? Jeśli tak, czy odpowiadające pliki testowe istnieją
  i zawierają asercje? Brakujące testy = 🟠 [P2-important].
Klasyfikuj znalezione problemy: 🔴 [P1-blocking], 🟠 [P2-important], 🟡 [P3-nit]
```

**Agent 5: E2E Browser Verification**
```
Jesteś testerem E2E. Przeczytaj `.claude/agents/feature-tester-e2e.md` i zastosuj jego metodologię.
Zbierz niezaznaczone checkboxy `Weryfikacja:` z fazy $2 w pliku zadań $1.
Zweryfikuj każdy scenariusz wizualnie w przeglądarce przez agent-browser.
Klasyfikuj: ✅ passed, 🟠 [P2-important] failed.
```

Po zakończeniu wszystkich agentów — **skonsoliduj wyniki:**
- Zbierz findings ze wszystkich 5 agentów
- Usuń duplikaty (różne agenty mogą znaleźć ten sam problem)
- Posortuj po severity: P1 → P2 → P3

### 4. Zapisz wyniki review
Po zakończeniu review przez subagenta:

**Utwórz plik `$1/review-faza-$2.md`** z pełnym raportem.

**Zaktualizuj `$1/[zadanie]-zadania.md`:**
- Dodaj sekcję "## Do poprawy po review fazy $2"
- Wylistuj wszystkie 🔴 i 🟠 problemy jako **checkboxy** (nie bullet points!):
```markdown
  ## Do poprawy po review fazy $2

  - [ ] 🔴 [blocking] **plik:linia** — opis problemu
  - [ ] 🟠 [important] **plik:linia** — opis problemu
  - [ ] 🟡 [nit] **plik:linia** — opis (opcjonalne)
```
- Format musi być spójny z pozostałymi zadaniami w pliku

**Zaktualizuj `$1/[zadanie]-kontekst.md`:**
- Dodaj notatkę o przeprowadzonym review
- Zapisz kluczowe wnioski

### 4.5 Decyzja severity gate
Na podstawie skonsolidowanego raportu:
- **Jeśli są P1 (blocking):** "⛔ WYMAGA POPRAWEK — znaleziono X problemów P1 blokujących kontynuację"
- **Jeśli tylko P2 (important):** "⚠️ KONTYNUUJ Z ZASTRZEŻENIAMI — X problemów P2 do naprawy"
- **Jeśli tylko P3 (nit):** "✅ GOTOWE DO KONTYNUACJI — X sugestii do rozważenia"

### 4.6 Wyniki weryfikacji E2E
Jeśli Agent 5 wykonał weryfikacje:
- Dołącz wyniki E2E do skonsolidowanego raportu (sekcja z screenshotami)
- Nieudane weryfikacje wchodzą do severity gate jako 🟠 [P2-important]
- Odznaczone `Weryfikacja:` checkboxy w pliku zadań potwierdzają przejście

### 5. Przedstaw podsumowanie użytkownikowi

## Format wyjściowy
```
✅ Code Review fazy $2 zakończony

📊 Statystyki:
   - Plików sprawdzonych: X
   - 🔴 [blocking]: X
   - 🟠 [important]: X
   - 🟡 [nit]: X
   - 🔵 [suggestion]: X
   - 🌐 [E2E]: X passed / Y failed

📄 Raport zapisany: $1/review-faza-$2.md

📝 Zadania do poprawy dodane do: $1/[zadanie]-zadania.md

---

[PODSUMOWANIE GŁÓWNYCH PROBLEMÓW]

---

❓ Czy wykonać poprawki teraz? (tak/nie)
   Jeśli tak → uruchom: /dev-docs-execute $1
```
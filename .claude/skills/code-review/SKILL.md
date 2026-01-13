---
name: code-review
description: "Przeprowadza code review dla Next.js 16, React 19, Drizzle ORM, Tailwind CSS 4, Radix UI, SWR. Używaj przy przeglądaniu PR, ocenie implementacji fazy/etapu, weryfikacji zgodności z planem. Generuje raport z klasyfikacją problemów (krytyczne/poważne/drobne/sugestie)."
---

# Code Review

Skill do przeprowadzania code review w projekcie Next.js 16 + React 19.

## Kiedy używać

- Review zmian po zakończeniu fazy/etapu zadania
- Przeglądanie Pull Requestów
- Weryfikacja implementacji przed merge
- Audyt jakości kodu

## Workflow

### Krok 1: Zbierz kontekst

Przed analizą kodu ustal:

1. **Co miało być zrobione?** — przeczytaj plan/zadanie/specyfikację
2. **Jakie pliki się zmieniły?** — `git diff --name-only` lub `git status`
3. **Jaki jest zakres?** — tylko zmiany z danej fazy, nie cały projekt

### Krok 2: Wybierz checklisty

Na podstawie zmienionych plików, załaduj odpowiednie sekcje z `references/tech-stack-checklist.md`:

| Pliki | Sekcje do sprawdzenia |
|-------|----------------------|
| `*.tsx`, `*.ts` w `app/` | Next.js 16, React 19, TypeScript |
| `*.tsx` z `"use client"` | React 19, SWR, Radix UI |
| `*.tsx` z hooks | React 19 (zbędne useMemo/useCallback jeśli React Compiler, stary forwardRef) |
| `schema.ts`, `db/` | Drizzle ORM |
| `*.css` z `@theme` | Tailwind CSS 4 (konfiguracja, zmienne CSS) |
| Komponenty UI | Tailwind CSS 4, Radix UI, Dostępność |
| Server Actions | Bezpieczeństwo, Next.js 16 |
| Pliki z `headers()`/`cookies()` | Next.js 16 (wpływ na cache) |

### Krok 3: Analizuj kod

Dla każdego zmienionego pliku:

1. **Zgodność z planem** — czy realizuje wymagania?
2. **Poprawność** — błędy logiczne, edge cases?
3. **Bezpieczeństwo** — walidacja, XSS, wycieki danych?
4. **Wydajność** — N+1, bundle size, lazy loading?
5. **Jakość** — czytelność, DRY, nazewnictwo?

Techniki i przykłady feedbacku → `references/review-patterns.md`
Częste błędy w tym stacku → `references/common-issues.md`

### Krok 4: Klasyfikuj problemy
````
🔴 [blocking] KRYTYCZNE — blokuje merge
   - Błędy bezpieczeństwa
   - Crash/utrata danych
   - Wycieki danych server → client
   - Hydration Mismatch
   - Drizzle: brak `await` przy zapytaniach (zwraca Promise zamiast danych)
   - Next.js: `headers()`/`cookies()` w komponentach statycznych (psuje cache)
   - Next.js: brak `await` na `params`/`searchParams`

🟠 [important] POWAŻNE — wymaga poprawy
   - Błędne Server/Client Components
   - Problemy wydajnościowe
   - Brak WCAG compliance
   - Niespełnione wymagania
   - React 19: `useEffect` do fetchowania zamiast Server Components/SWR/use()
   - Tailwind 4: nadużywanie arbitrary values (`w-[123px]`) zamiast tokenów

🟡 [nit] DROBNE — zalecane
   - Niespójność stylu
   - Lepsze nazewnictwo
   - Brakujące typy
   - Przestarzałe wzorce (forwardRef, Context.Provider)
   - Zbędne useMemo/useCallback (jeśli React Compiler włączony)

🔵 [suggestion] SUGESTIE — opcjonalne
   - Alternatywne podejścia
   - Propozycje refaktoryzacji
````

### Krok 5: Wygeneruj raport

Użyj formatu z sekcji "Format raportu" poniżej.

## Format raportu
````markdown
## Code Review: [nazwa fazy/zadania]

### Podsumowanie
[Krótka ocena: ✅ gotowe / ⚠️ wymaga poprawek / ❌ wymaga znaczących zmian]

### Statystyki
- Plików sprawdzonych: X
- 🔴 [blocking]: X
- 🟠 [important]: X
- 🟡 [nit]: X
- 🔵 [suggestion]: X

### Problemy

#### 🔴 [blocking] Krytyczne
1. **[plik:linia]** — [opis]
   - Problem: [co jest źle]
   - Rozwiązanie: [jak naprawić]

#### 🟠 [important] Poważne
[jak wyżej]

#### 🟡 [nit] Drobne
1. **[plik:linia]** — [opis]

#### 🔵 [suggestion] Sugestie
1. [propozycja]

### Co zrobiono dobrze
- [pozytywne aspekty]

### Rekomendacja
- [ ] Gotowe do merge
- [ ] Wymaga drobnych poprawek
- [ ] Wymaga znaczących zmian
- [ ] Wymaga przeprojektowania
````

## Integracja z /dev-docs-review

Ten skill jest wywoływany przez slash komendę `/dev-docs-review [ścieżka] [numer-fazy]`.

**Input od subagenta:**
- Ścieżka do folderu zadania
- Numer fazy do review
- Lista zmienionych plików (z git)

**Output:**
- Plik `review-faza-X.md` z pełnym raportem
- Aktualizacja pliku zadań o problemy do poprawy
- Podsumowanie dla użytkownika

## Zasady

1. **Skup się na zakresie** — reviewuj tylko zmiany z danej fazy
2. **Bądź konkretny** — podawaj pliki, linie, przykłady
3. **Proponuj rozwiązania** — nie tylko wskazuj problemy
4. **Doceniaj** — zauważaj dobre rozwiązania
5. **Priorytetyzuj** — blocking > important > nit

## Dokumentacja referencyjna

- **Checklisty techniczne** → `references/tech-stack-checklist.md`
- **Techniki feedbacku** → `references/review-patterns.md`
- **Częste błędy** → `references/common-issues.md`
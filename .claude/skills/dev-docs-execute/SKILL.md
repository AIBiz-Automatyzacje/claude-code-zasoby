---
name: dev-docs-execute
description: "Kontynuacja pracy nad zadaniem - wykonanie kolejnej fazy/etapu."
argument-hint: "[ścieżka-do-folderu np. 'docs/active/auth-refaktor']"
---

# Wykonanie kolejnej fazy zadania

## Zmienne
- ŚCIEŻKA_ZADANIA: $1

## Instrukcje

### 0. Walidacja git
1. **Sprawdź aktualny branch:** `git branch --show-current`
2. **Przeczytaj wymagany branch** z dokumentacji w `$1/` (szukaj "Branch:" w plikach)
3. **Porównaj:**
   - Jeśli branch się zgadza → kontynuuj
   - Jeśli branch się nie zgadza → poinformuj użytkownika i zapytaj czy przełączyć
4. **Sprawdź czy nie ma niezacommitowanych zmian** z poprzednich sesji

### 1. Zapoznaj się z dokumentacją zadania
Przeczytaj wszystkie pliki `.md` w `$1/`:
- Plik z planem (zawiera fazy, cele, kryteria)
- Plik z kontekstem (decyzje, stan, notatki)
- Plik z zadaniami (lista ze statusami ✅/⬜)

### 2. Określ aktualny stan
Na podstawie pliku z zadaniami:
- Znajdź ostatnią ukończoną fazę/etap (oznaczoną ✅)
- Zidentyfikuj NASTĘPNĄ fazę/etap do wykonania
- Jeśli wszystko ukończone → poinformuj użytkownika i zakończ

### 2.5 Wybór strategii wykonania
Na podstawie liczby i zależności zadań w fazie, zdecyduj:
- **Inline** (1-2 taski, mały scope) — wykonaj bezpośrednio w tej sesji
- **Serial subagents** (3+ zadań z zależnościami) — uruchom Task dla każdego zadania sekwencyjnie, każdy sub-agent dostaje świeży kontekst
- **Parallel subagents** (3+ niezależnych zadań) — uruchom Task równolegle dla zadań bez wspólnych zależności i plików

Dla prostych faz (1-2 zadania) zawsze wybierz Inline.

### 3. Wykonaj TYLKO JEDNĄ fazę
- Sprawdź czy w planie (`docs/plans/`) lub w pliku z planem zadania istnieje sekcja "Granice scope'u" / "Poza zakresem"
- Jeśli tak → przeczytaj ją i NIE implementuj niczego co jest tam wymienione, nawet jeśli wydaje się przydatne
- Jeśli zadanie wymaga pracy poza zakresem → STOP, poinformuj użytkownika
- Jeśli checklist fazy zawiera checkboxy z prefixem `Test:` lub `Weryfikacja:` — traktuj je jako integralną część implementacji fazy. Napisz testy RAZEM z kodem implementacyjnym, nie odkładaj na koniec fazy
- Realizuj zadania z kolejnej fazy/etapu
- NIE przechodź do następnych faz
- Zatrzymaj się po ukończeniu tej jednej fazy

### 4. Walidacja i testy
Po zakończeniu fazy:
- Sprawdź czy w planie są zdefiniowane testy akceptacyjne dla tej fazy
- Jeśli tak → wykonaj je
- Zapisz wyniki testów i zrzuty ekranu w `$1/`

### 4.5 System-Wide Test Check
Przed zamknięciem fazy odpowiedz na 5 pytań:
1. Czy typecheck przechodzi bez nowych błędów?
2. Czy istniejące testy nadal przechodzą?
3. Czy nowe testy pokrywają happy path i przynajmniej jeden error case?
3b. Czy checklist fazy zawierał checkboxy testowe (`Test:`)? Jeśli tak — czy odpowiadające testy zostały napisane i przechodzą? Jeśli nie zostały napisane — napisz je TERAZ przed zamknięciem fazy.
4. Czy nowe importy nie łamią istniejących modułów?
5. Czy build przechodzi?

Jeśli odpowiedź na którekolwiek pytanie to NIE — napraw przed kontynuacją.

### 5. Aktualizuj dokumentację
**W pliku z zadaniami:**
- Oznacz ukończone zadania jako ✅
- Dodaj nowo odkryte zadania (jeśli są)

**W pliku z kontekstem:**
- Dodaj zmiany wprowadzone w tej fazie
- Zapisz podjęte decyzje
- Zaktualizuj "Ostatnia aktualizacja: RRRR-MM-DD"

### 5.5 Aktualizacja planu technicznego
Jeśli istnieje plan techniczny w `docs/plans/`:
- Znajdź Implementation Unit odpowiadający ukończonej fazie
- Zaktualizuj checkboxy test scenarios (odznacz spełnione)
- Zaktualizuj checkboxy verification (odznacz spełnione)
- Plan staje się żywym dokumentem śledzenia postępu

### 6. Commit zmian (inkrementalny)
Heurystyka: commituj gdy możesz napisać sensowny commit message opisujący kompletną zmianę.
- Nie czekaj do końca fazy — commituj logiczne jednostki pracy
- Jeśli commit message brzmiałby "WIP" lub "partial" — nie commituj jeszcze
- Pattern: `feat/fix/refactor([nazwa-zadania]): [co i dlaczego]`
- Jedna faza może mieć wiele commitów lub jeden — zależy od złożoności
- Staguj tylko pliki związane z daną jednostką pracy (nie `git add .`)

### 7. Przygotuj podsumowanie
Napisz podsumowanie w **prostym języku** zrozumiałym dla osoby nietechnicznej:
```
## Podsumowanie fazy [numer/nazwa]

### Co zostało zrobione
[Opis w prostych słowach, bez żargonu technicznego]

### Co widać w aplikacji
**Desktop:**
- [Widoczne zmiany dla użytkownika]

**Mobile:**
- [Widoczne zmiany dla użytkownika]

### Zmiany "pod maską" (backend/kod)
[Wyjaśnij DLACZEGO te zmiany były ważne, nawet jeśli niewidoczne]

### Następny krok
[Jaka faza/etap jest następny]
```

## Format wyjściowy
```
✅ Ukończono fazę [numer/nazwa] w $1

🔀 Branch: [nazwa-brancha]

📋 Wykonane zadania:
   - [lista ukończonych w tej fazie]

🧪 Testy akceptacyjne: [PASS/FAIL/brak testów]

📁 Zapisane pliki:
   - [zrzuty ekranu, logi, inne]

📝 Zaktualizowana dokumentacja w $1/

💾 Commit: feat([nazwa-zadania]): [opis]

---

[PODSUMOWANIE W PROSTYM JĘZYKU]

---

➡️ Następna faza: [nazwa/numer]
   Uruchom ponownie: /dev-docs-execute $1
```
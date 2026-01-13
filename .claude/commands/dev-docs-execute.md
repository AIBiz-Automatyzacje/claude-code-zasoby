---
description: Kontynuacja pracy nad zadaniem - wykonanie kolejnej fazy/etapu
argument-hint: [ścieżka-do-folderu] (np. "dev/active/auth-refaktor", "dev/active/workflow-view-ux")
allowed-tools: Bash(find:*), Bash(ls:*), Bash(mkdir:*), Bash(git:*), Read, Write, Task
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

### 3. Wykonaj TYLKO JEDNĄ fazę
- Realizuj zadania z kolejnej fazy/etapu
- NIE przechodź do następnych faz
- Zatrzymaj się po ukończeniu tej jednej fazy

### 4. Walidacja i testy
Po zakończeniu fazy:
- Sprawdź czy w planie są zdefiniowane testy akceptacyjne dla tej fazy
- Jeśli tak → wykonaj je
- Zapisz wyniki testów i zrzuty ekranu w `$1/`

### 5. Aktualizuj dokumentację
**W pliku z zadaniami:**
- Oznacz ukończone zadania jako ✅
- Dodaj nowo odkryte zadania (jeśli są)

**W pliku z kontekstem:**
- Dodaj zmiany wprowadzone w tej fazie
- Zapisz podjęte decyzje
- Zaktualizuj "Ostatnia aktualizacja: RRRR-MM-DD"

### 6. Commit zmian
Po ukończeniu fazy wykonaj commit:
1. `git add .` (lub wybrane pliki)
2. `git commit -m "feat([nazwa-zadania]): [krótki opis fazy]"`
   - Przykład: `feat(auth-refaktor): implementacja fazy 2 - walidacja formularzy`

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
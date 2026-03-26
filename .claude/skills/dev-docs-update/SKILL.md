---
name: dev-docs-update
description: "Aktualizacja dokumentacji dev przed kompaktowaniem kontekstu."
argument-hint: "[ścieżka-do-folderu] [opcjonalnie: co zaktualizować]"
disable-model-invocation: true
---

Zbliżamy się do limitu kontekstu. Zaktualizuj dokumentację deweloperską, aby zapewnić płynną kontynuację po resecie kontekstu.

## Wymagane aktualizacje

### 0. Zabezpieczenie stanu git
Przed aktualizacją dokumentacji:

1. **Zapisz aktualny branch:** `git branch --show-current`
2. **Sprawdź niezacommitowane zmiany:** `git status --short`
3. **Jeśli są zmiany — wykonaj commit WIP:**
```bash
   git add .
   git commit -m "wip([nazwa-zadania]): stan przed resetem kontekstu"
```
4. **Zapisz hash ostatniego commita:** `git rev-parse --short HEAD`

### 1. Aktualizacja dokumentacji aktywnych zadań
Dla każdego zadania w `dev/active/[nazwa-zadania]/`:

**Zaktualizuj `[nazwa-zadania]-plan.md`:**
- Weryfikacja aktualności planu względem wykonanych prac
- Oznaczenie ukończonych faz
- Korekta szacunków czasowych jeśli się zmieniły
- Znacznik "Ostatnia aktualizacja: RRRR-MM-DD"

**Zaktualizuj `[nazwa-zadania]-kontekst.md`:**
- Obecny stan implementacji
- Kluczowe decyzje podjęte w tej sesji
- Zmodyfikowane pliki i powód zmian
- Odkryte blokery lub problemy
- Następne bezpośrednie kroki
- Znacznik "Ostatnia aktualizacja: RRRR-MM-DD"

**Zaktualizuj `[nazwa-zadania]-zadania.md`:**
- Oznacz ukończone zadania jako ✅
- Dodaj nowo odkryte zadania
- Zaktualizuj status zadań w toku
- Zmień priorytety jeśli potrzeba
- Znacznik "Ostatnia aktualizacja: RRRR-MM-DD"

### 2. Utrwalenie kontekstu sesji
W odpowiednich plikach zadania uwzględnij:
- Rozwiązane złożone problemy → `[nazwa-zadania]-kontekst.md`
- Podjęte decyzje architektoniczne → `[nazwa-zadania]-plan.md`
- Znalezione i naprawione błędy → `[nazwa-zadania]-kontekst.md`
- Nowe zadania do wykonania → `[nazwa-zadania]-zadania.md`
- Zmiany w podejściu lub strategii → `[nazwa-zadania]-plan.md`

### 3. Dokumentacja niedokończonej pracy
W `[nazwa-zadania]-kontekst.md` zapisz:
- Nad czym trwała praca gdy zbliżał się limit kontekstu
- Dokładny stan częściowo ukończonych funkcji
- Komendy do uruchomienia po restarcie
- Tymczasowe obejścia wymagające trwałych poprawek

### 4. Notatki przekazania
Na końcu `[nazwa-zadania]-kontekst.md` dodaj sekcję "Przekazanie":
- **Branch:** [nazwa brancha]
- **Ostatni commit:** [hash] - [message]
- Dokładny plik i linia będąca edytowana
- Cel bieżących zmian
- Komendy testowe do weryfikacji pracy

### 5. Commit dokumentacji
Po aktualizacji wszystkich plików:
```bash
git add dev/active/
git commit -m "docs([nazwa-zadania]): aktualizacja przed resetem kontekstu"
```

## Dodatkowy kontekst: $ARGUMENTS

**Priorytet**: Skup się na uchwyceniu informacji, które byłyby trudne do ponownego odkrycia lub odtworzenia z samego kodu.

## Format wyjściowy
```
✅ Dokumentacja zaktualizowana przed resetem kontekstu

🔀 Branch: [nazwa-brancha]
💾 Ostatni commit: [hash] - [message]

📝 Zaktualizowane pliki:
   - [lista plików]

📋 Stan zadania:
   - Ukończone fazy: X/Y
   - Następna faza: [nazwa/numer]

🔄 Po resecie uruchom:
   /dev-docs-execute [ścieżka-zadania]
```
---
name: dev-docs
description: "Tworzenie kompleksowego planu strategicznego z uporządkowanym podziałem na zadania."
argument-hint: "[opis zadania np. 'refaktoryzacja systemu uwierzytelniania']"
disable-model-invocation: true
---

Jesteś elitarnym specjalistą ds. planowania strategicznego. Stwórz kompleksowy, wykonalny plan dla: $ARGUMENTS

## Instrukcje

### Faza 0: Przygotowanie repozytorium

1. **Sprawdź aktualny stan git:**
   - Upewnij się, że jesteś w repozytorium git
   - Sprawdź czy nie ma niezacommitowanych zmian

2. **Utwórz nowy branch:**
   - Nazwa brancha: `feature/[nazwa-zadania]` (np. `feature/auth-refaktor`)
   - Wykonaj: `git checkout -b feature/[nazwa-zadania]`
   - Potwierdź utworzenie brancha

3. **Zapisz nazwę brancha** — będzie potrzebna w dokumentacji

### Faza 1: Analiza i planowanie

1. **Szukaj istniejących dokumentów źródłowych:**
   - Sprawdź `docs/brainstorms/*-requirements.md` — requirements doc z `/dev-brainstorm`
   - Sprawdź `docs/plans/*-plan.md` — plan techniczny z `/dev-plan`
   - Jeśli plan techniczny istnieje → użyj Implementation Units jako bazowych zadań w Fazie 2
   - Jeśli requirements doc istnieje → użyj jako kontekst produktowy (cele, wymagania, granice scope'u)
   - Jeśli żaden nie istnieje → kontynuuj standardowo

2. **Przeanalizuj zapytanie** i określ zakres potrzebnego planowania
3. **Zbadaj odpowiednie pliki** w bazie kodu, aby zrozumieć obecny stan
4. **Stwórz uporządkowany plan** zawierający:
   - Podsumowanie wykonawcze
   - Analiza obecnego stanu
   - Proponowany stan docelowy
   - Fazy wdrożenia (podzielone na sekcje)
   - Szczegółowe zadania (konkretne elementy z jasnymi kryteriami akceptacji)
   - Ocena ryzyka i strategie mitygacji
   - Mierniki sukcesu
   - Wymagane zasoby i zależności
   - Szacunki czasowe

### Faza 2: Struktura podziału zadań

- Każda główna sekcja reprezentuje fazę lub komponent
- Numeruj i priorytetyzuj zadania w sekcjach
- Dołącz jasne kryteria akceptacji dla każdego zadania
- Określ zależności między zadaniami
- Oszacuj poziom nakładu pracy (S/M/L/XL)

### Faza 3: Utworzenie struktury zarządzania zadaniami

1. **Utwórz katalog:** `dev/active/[nazwa-zadania]/`

2. **Wygeneruj trzy pliki:**

   **`[nazwa-zadania]-plan.md`** — Kompleksowy plan zawierający:
   - Nazwa brancha git: `feature/[nazwa-zadania]`
   - Cele i zakres
   - Fazy z zadaniami
   - Kryteria akceptacji

   **`[nazwa-zadania]-kontekst.md`** — Kluczowe pliki, decyzje, zależności:
   - Nazwa brancha git: `feature/[nazwa-zadania]`
   - Powiązane pliki
   - Decyzje techniczne
   - Zależności

   **W obu plikach (`[nazwa-zadania]-plan.md` i `[nazwa-zadania]-kontekst.md`) dodaj sekcję:**

   ```markdown
   ## Źródła
   - Requirements doc: [ścieżka do docs/brainstorms/*.md jeśli użyty]
   - Plan techniczny: [ścieżka do docs/plans/*.md jeśli użyty]
   ```

   **`[nazwa-zadania]-zadania.md`** — Format checklisty do śledzenia postępów

3. **Dodaj w każdym pliku:**
   - "Branch: `feature/[nazwa-zadania]`"
   - "Ostatnia aktualizacja: RRRR-MM-DD"

### Faza 4: Commit inicjalny

- Wykonaj commit z dokumentacją: `git add dev/active/[nazwa-zadania]/`
- Commit message: `docs: inicjalizacja planu dla [nazwa-zadania]`

## Standardy jakości
- Plany muszą być samowystarczalne z całym niezbędnym kontekstem
- Używaj jasnego, konkretnego języka
- Dołącz szczegóły techniczne tam, gdzie to istotne
- Uwzględnij zarówno perspektywę techniczną, jak i biznesową
- Weź pod uwagę potencjalne ryzyka i przypadki brzegowe

## Referencje kontekstowe
- Sprawdź `CLAUDE.md` dla przeglądu architektury (jeśli istnieje)
- Skonsultuj `.claude/rules/best-practices.md` dla standardów kodowania (jeśli istnieje)
- Odwołaj się do `.claude/rules/troubleshooting.md` dla typowych problemów do uniknięcia (jeśli istnieje)
- Użyj `dev/README.md` dla wytycznych zarządzania zadaniami (jeśli istnieje)
- Sprawdź `docs/brainstorms/` dla dokumentów wymagań z `/dev-brainstorm`
- Sprawdź `docs/plans/` dla planów technicznych z `/dev-plan`

## Format wyjściowy
```
✅ Plan utworzony dla "$ARGUMENTS"

🔀 Branch: feature/[nazwa-zadania]

📁 Struktura:
   - dev/active/[nazwa-zadania]/
     - [nazwa-zadania]-plan.md
     - [nazwa-zadania]-kontekst.md
     - [nazwa-zadania]-zadania.md

📝 Commit: docs: inicjalizacja planu dla [nazwa-zadania]

➡️ Następny krok: /dev-docs-execute dev/active/[nazwa-zadania]
```

**Uwaga**: Ta komenda jest idealna do użycia PO wyjściu z trybu planowania, gdy masz jasną wizję tego, co trzeba zrobić. Stworzy trwałą strukturę zadań, która przetrwa resety kontekstu.
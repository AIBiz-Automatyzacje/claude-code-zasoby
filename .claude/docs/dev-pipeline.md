# Pipeline dev-* — dokumentacja

Data utworzenia: 2026-03-24
Źródło: compound-engineering-plugin (zaadaptowane do stacku React 19 + TypeScript + Supabase + Tailwind v4 + Vite)

---

## Pipeline — przegląd

```
/dev-ideate → /dev-brainstorm → /dev-plan → /dev-docs → /dev-docs-execute ↔ /dev-docs-review → /dev-docs-complete → /dev-compound
                                                                                                                        ↓
                                                       /dev-autopilot (orkiestruje execute↔review→complete→compound)
                                                                                                          /dev-compound-refresh
```

Skille dev-* mogą być wywoływane programowo przez inne skille i agenty (bez `disable-model-invocation`).
Każdy skill działa BEZ argumentów (wyciąga kontekst z sesji). Argumenty są opcjonalne.

---

## Skille — co robi każdy

### Faza discovery

#### `/dev-ideate`
**Cel:** Generowanie pomysłów na ulepszenia projektu.
**Kiedy:** Nie wiesz co budować. Chcesz zobaczyć co można poprawić.
**Jak działa:** 4 agenty skanują projekt z różnych perspektyw (tech debt, UX, performance, product), potem Devil's Advocate filtruje słabe pomysły.
**Output:** `docs/ideation/YYYY-MM-DD-topic-ideation.md`
**Następny krok:** `/dev-brainstorm [wybrany pomysł]`

#### `/dev-brainstorm`
**Cel:** Walidacja i doprecyzowanie pomysłu. Odpowiada na pytanie CO budować.
**Kiedy:** Masz pomysł ale nie masz jasnych wymagań. Chcesz przegadać scope, ryzyka, alternatywy.
**Jak działa:** Interaktywny dialog — jedno pytanie na raz, pressure test, eksploracja podejść.
**Output:** `docs/brainstorms/YYYY-MM-DD-topic-requirements.md` (requirements doc z: Problem, Wymagania R1/R2, Kryteria sukcesu, Granice scope'u)
**Następny krok:** `/dev-plan`

### Faza planowania

#### `/dev-plan`
**Cel:** Planowanie techniczne. Odpowiada na pytanie JAK budować.
**Kiedy:** Masz jasne wymagania (z brainstormu lub własne). Potrzebujesz planu technicznego z konkretnymi plikami, podejściem, testami.
**Jak działa:** Szuka requirements doc w `docs/brainstorms/`, skanuje repo (agenty research), tworzy Implementation Units.
**Output:** `docs/plans/YYYY-MM-DD-NNN-type-name-plan.md` z Implementation Units (Goal, Files, Approach, Test scenarios, Verification)
**Następny krok:** `/dev-docs`

#### `/dev-docs`
**Cel:** Tworzenie struktury zarządzania zadaniami do implementacji.
**Kiedy:** Masz plan (z dev-plan lub z rozmowy w plan mode). Chcesz zacząć implementację.
**Jak działa:** Szuka plan/requirements docs, tworzy branch git, generuje 3 pliki w `docs/active/[nazwa]/`.
**Output:** `docs/active/[nazwa]/` z: plan.md, kontekst.md, zadania.md + branch `feature/[nazwa]`
**Następny krok:** `/dev-docs-execute docs/active/[nazwa]`

### Faza implementacji

#### `/dev-autopilot docs/active/[nazwa]`
**Cel:** Automatyczne wykonanie WSZYSTKICH faz implementacji z review i naprawami.
**Kiedy:** Masz gotową dokumentację w docs/active/ i chcesz uruchomić cały pipeline bez ręcznej interwencji.
**Jak działa:** Czyta plan, buduje kolejkę faz. Per faza: spawnuje Agent → execute, Agent → review, Agent → fix (jeśli P1/P2, max 2 cykle). Po wszystkich fazach: complete + compound.
**Output:** Zaimplementowany kod + archiwum w docs/completed/ + wpis w docs/solutions/
**Resumability:** Ponowne wywołanie czyta stan z checkboxów i kontynuuje od ostatniej niekompletnej fazy.
**Stop conditions:** P1 po 2 cyklach fix, błąd buildu/testów, git conflict.

#### `/dev-docs-execute docs/active/[nazwa]`
**Cel:** Wykonanie jednej fazy implementacji.
**Kiedy:** Masz gotową dokumentację w docs/active/. Chcesz zaimplementować kolejną fazę.
**Jak działa:** Czyta plan, znajduje następną fazę, wykonuje ją. Wybiera strategię: inline (1-2 taski) lub sub-agenty (3+ tasków). Sprawdza scope boundaries. Po zakończeniu: System-Wide Test Check (5 pytań), aktualizacja checkboxów w planie, incremental commits.
**Output:** Zaimplementowany kod + zaktualizowana dokumentacja + commit(y)
**Następny krok:** `/dev-docs-review docs/active/[nazwa] [numer-fazy]` lub kolejny `/dev-docs-execute`

#### `/dev-docs-review docs/active/[nazwa] [numer-fazy]`
**Cel:** Code review wykonanej fazy.
**Kiedy:** Po `/dev-docs-execute` — chcesz sprawdzić jakość kodu przed kontynuacją.
**Jak działa:** 4 agenty review równolegle (Security, Performance, Architecture, Scenario Exploration). Konsolidacja wyników. Severity gate: P1 (blokuje) / P2 (zastrzeżenia) / P3 (OK).
**Output:** `docs/active/[nazwa]/review-faza-X.md` + checkboxy do poprawy w zadaniach
**Następny krok:** `/dev-docs-execute` (poprawki) lub kolejna faza

#### `/dev-docs-update docs/active/[nazwa]`
**Cel:** Zapisanie stanu pracy przed resetem kontekstu (kompaktowanie).
**Kiedy:** Sesja się kończy, kontekst się zapełnia, chcesz zabezpieczyć postęp.
**Jak działa:** Commituje WIP, aktualizuje 3 pliki zadania, dokumentuje niedokończoną pracę.
**Output:** Zaktualizowana dokumentacja + WIP commit

### Faza zamknięcia

#### `/dev-docs-complete [nazwa]`
**Cel:** Archiwizacja ukończonego zadania.
**Kiedy:** Wszystkie fazy zrobione, testy przechodzą, feature gotowy.
**Jak działa:** Weryfikuje ukończenie, wyciąga wnioski, przenosi do `docs/completed/`, aktualizuje dokumentację projektu.
**Output:** `docs/completed/[nazwa]/` z podsumowaniem
**Następny krok:** Sugestia `/dev-compound` do udokumentowania rozwiązanych problemów

### Knowledge capture

#### `/dev-compound`
**Cel:** Dokumentowanie rozwiązanego problemu do bazy wiedzy.
**Kiedy:** Po rozwiązaniu problemu — bugfix, workaround, konfiguracja. Chcesz żeby następnym razem ten problem nie zabierał czasu.
**Jak działa:** Bez argumentów = wyciąga kontekst z sesji autonomicznie. Z argumentem = użyj jako opis. Compact mode domyślny, `--full` dla pełnego formatu.
**Output:** `docs/solutions/[category]/YYYY-MM-DD-title.md`
**Kategorie:** build-errors, runtime-errors, supabase-issues, auth-issues, ui-bugs, performance-issues, typescript-errors, deployment-issues, testing-issues

#### `/dev-compound-refresh`
**Cel:** Przegląd aktualności bazy wiedzy.
**Kiedy:** Co kilka tygodni, po dużym refaktorze, po upgrade'ach dependencies.
**Jak działa:** Autonomicznie przegląda WSZYSTKIE docs/solutions/. Dla każdego: Keep (aktualne) / Update (drobne zmiany) / Replace (nowe rozwiązanie) / Archive (problem nie istnieje). Archiwizuje do `docs/solutions/_archived/`.
**Output:** Raport z akcjami + zarchiwizowane/zaktualizowane dokumenty

---

## Agenty — kto co robi

### Research (używane przez `/dev-plan`)
| Agent | Rola |
|-------|------|
| `repo-research-analyst` | Skanuje strukturę repo, konwencje, wzorce |
| `learnings-researcher` | Szuka w `docs/solutions/` powiązanych rozwiązań |
| `best-practices-researcher` | Szuka best practices online (Context7, WebSearch) |
| `framework-docs-researcher` | Szuka dokumentacji framework'ów/bibliotek |

### Review (używane przez `/dev-docs-review`)
| Agent | Rola |
|-------|------|
| `security-sentinel` | Auth, RLS, XSS, Zod validation, API key exposure |
| `performance-oracle` | N+1, bundle size, lazy loading, memoizacja, useEffect cleanup |
| `kieran-typescript-reviewer` | Type safety, brak `any`, modern patterns, naming |
| `architecture-strategist` | SOLID, component boundaries, coupling, circular deps |
| `code-simplicity-reviewer` | YAGNI, redundancja, uproszczenia |

### Workflow (używane przez `/dev-plan`)
| Agent | Rola |
|-------|------|
| `spec-flow-analyzer` | User flow analysis, missing paths, edge cases |

---

## Struktura katalogów

```
docs/
├── brainstorms/              ← requirements docs z /dev-brainstorm
├── plans/                    ← plany techniczne z /dev-plan
├── ideation/                 ← pomysły z /dev-ideate
└── solutions/                ← rozwiązane problemy z /dev-compound
    ├── build-errors/
    ├── runtime-errors/
    ├── supabase-issues/
    ├── auth-issues/
    ├── ui-bugs/
    ├── performance-issues/
    ├── typescript-errors/
    ├── deployment-issues/
    ├── testing-issues/
    └── _archived/

    active/                   ← aktywne zadania z /dev-docs
    │   └── [nazwa-zadania]/
    │       ├── [nazwa]-plan.md
    │       ├── [nazwa]-kontekst.md
    │       └── [nazwa]-zadania.md
    └── completed/                ← zarchiwizowane z /dev-docs-complete
        └── [nazwa-zadania]/
            ├── [nazwa]-plan.md
            ├── [nazwa]-kontekst.md
            ├── [nazwa]-zadania.md
            └── [nazwa]-podsumowanie.md
```

---

## Typowe scenariusze użycia

### Scenariusz 1: Nowy feature od zera
```
/dev-ideate                          ← "co można poprawić?"
/dev-brainstorm lazy loading         ← doprecyzuj wybrany pomysł
/dev-plan                            ← plan techniczny
/dev-docs                            ← struktura zadań
/dev-docs-execute docs/active/lazy-loading   ← faza 1
/dev-docs-review docs/active/lazy-loading 1  ← review
/dev-docs-execute docs/active/lazy-loading   ← faza 2
/dev-docs-complete lazy-loading      ← archiwizacja
```

### Scenariusz 2: Bugfix z dokumentacją
```
[rozmowa: naprawiasz buga]
/dev-compound                        ← udokumentuj rozwiązanie do docs/solutions/
```

### Scenariusz 3: Szybki feature (bez pełnego pipeline'u)
```
[rozmowa + plan mode]
/dev-docs                            ← od razu do struktury zadań
/dev-docs-execute docs/active/nazwa   ← implementuj
/dev-docs-complete nazwa             ← zamknij
```

### Scenariusz 4: Maintenance bazy wiedzy
```
/dev-compound-refresh                ← przejrzyj wszystkie docs/solutions/
/dev-compound-refresh supabase-issues ← przejrzyj tylko jedną kategorię
```

### Scenariusz 5: Pełny autopilot
```
/dev-brainstorm lazy loading         ← doprecyzuj pomysł
/dev-plan                            ← plan techniczny
/dev-docs                            ← struktura zadań
/dev-autopilot docs/active/lazy-loading   ← WSZYSTKO automatycznie:
                                          execute fazy 1..N
                                          review każdej fazy
                                          fix jeśli P1/P2
                                          complete + compound
```

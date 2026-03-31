---
name: dev-autopilot
description: "Automatyczny pipeline: execute->review->fix per faza, potem complete i compound. Uzywaj przy 'uruchom autopilot', 'wykonaj caly plan', 'autopilot', 'odpal pipeline'."
argument-hint: "[sciezka-do-folderu np. 'docs/active/auth-refaktor']"
disable-model-invocation: true
---

# Autopilot — automatyczne wykonanie calego planu

Autonomicznie wykonuje wszystkie fazy zadania: execute -> review -> fix -> nastepna faza -> ... -> complete -> compound.

## Zmienne
- SCIEZKA_ZADANIA: $1

## Konfiguracja
- MAX_FIX_CYKLI: 2 (maksymalnie 2 cykle fix->review per faza)

## Instrukcje

### Faza 0: Inicjalizacja i resume

1. **Walidacja git:**
   - `git branch --show-current` — sprawdz aktualny branch
   - Przeczytaj wymagany branch z dokumentacji w `$1/` (szukaj "Branch:" w plikach)
   - Jesli branch sie nie zgadza — poinformuj uzytkownika i zapytaj czy przelalczyc
   - `git status --short` — sprawdz czy nie ma niezacommitowanych zmian

2. **Przeczytaj plan:**
   - Przeczytaj `$1/*-plan.md` — wyciagnij nazwy i numery faz
   - Przeczytaj `$1/*-zadania.md` — parsuj statusy checkboxow:
     - Faza z WSZYSTKIMI zadaniami oznaczonymi jako ukonczone = faza ukonczona
     - Faza z JAKIMKOLWIEK zadaniem nieoznaczonym = faza do wykonania

3. **Sprawdz stan review:**
   - Sprawdz czy istnieja pliki `$1/review-faza-*.md`
   - Jesli review istnieje dla danej fazy — sprawdz czy sa nierozwiazane P1/P2

4. **Zbuduj kolejke faz:**
   - Pominj fazy ze wszystkimi zadaniami ukonczonymi
   - Zacznij od pierwszej niekompletnej fazy
   - Jesli faza ma review z P1/P2 — zacznij od fix (nie od execute)

5. **Wyswietl plan pracy:**
   ```
   Autopilot: {nazwa-zadania}

   Fazy do wykonania: X/Y
   Faza 1: [nazwa] — UKONCZONA
   Faza 2: [nazwa] — DO WYKONANIA (start)
   Faza 3: [nazwa] — DO WYKONANIA
   Faza 4: [nazwa] — DO WYKONANIA

   Rozpoczynam...
   ```

### Faza 1: Petla Execute -> Review -> Fix

Dla KAZDEJ fazy z kolejki, wykonaj ponizsze kroki sekwencyjnie:

#### 1a. Execute

Uruchom Agent (general-purpose, foreground) z promptem:

```
Jestes czescia pipeline'u dev-autopilot. Wykonujesz faze implementacji.

Folder zadania: {$1}
Faza do wykonania: {numer_fazy}

Wywolaj skill /dev-docs-execute z argumentem "{$1}".
Uzyj narzedzia Skill: Skill("dev-docs-execute", args: "{$1}").

Skill sam okresli ktora faze wykonac (na podstawie checkboxow w zadaniach).
Nie pytaj uzytkownika o potwierdzenie — dzialaj autonomicznie.

Po zakonczeniu zwroc:
- Nazwe ukonczonej fazy
- Commity (hashe)
- Wynik testow (PASS/FAIL)
- Ewentualne problemy
```

Po zakonczeniu agenta zaloguj:
```
Faza {numer}: Execute zakonczony
```

#### 1b. Review

Uruchom Agent (general-purpose, foreground) z promptem:

```
Jestes czescia pipeline'u dev-autopilot. Wykonujesz code review fazy.

Folder zadania: {$1}
Numer fazy: {numer_fazy}

Wywolaj skill /dev-docs-review z argumentami "{$1} {numer_fazy}".
Uzyj narzedzia Skill: Skill("dev-docs-review", args: "{$1} {numer_fazy}").

Nie pytaj uzytkownika "Czy wykonac poprawki?" — tylko wykonaj review i zwroc wyniki.

Po zakonczeniu zwroc:
- Liczbe problemow per severity: P1, P2, P3
- Severity gate: BLOKUJE / ZASTRZEZENIA / CZYSTE
- Sciezke do raportu review
```

Po zakonczeniu agenta zaloguj statystyki review.

#### 1c. Decyzja (orkiestrator)

Przeczytaj plik `$1/review-faza-{numer}.md` i `$1/*-zadania.md`.

Policz findings wg severity:
- **Sa P1 (blocking):** -> przejdz do kroku 1d (Fix)
- **Tylko P2 (important):** -> przejdz do kroku 1d (Fix)
- **Tylko P3 (nit) lub brak:** -> przejdz do nastepnej fazy (krok 1e)

Zaloguj:
```
Review Fazy {numer}: {X}x P1, {Y}x P2, {Z}x P3
   -> {WYMAGA POPRAWEK / CZYSTE — kontynuuje}
```

#### 1d. Fix (warunkowy)

Inicjalizuj licznik: `fix_cykl = 0`

**Petla fix:**

Jesli `fix_cykl >= MAX_FIX_CYKLI` (2):
```
STOP: Faza {numer} — po {MAX_FIX_CYKLI} cyklach napraw nadal pozostaja problemy P1/P2.

Nierozwiazane problemy:
- [lista P1/P2 z checkboxow]

Wymagana reczna interwencja. Szczegoly w:
- $1/review-faza-{numer}.md
- $1/*-zadania.md (sekcja "Do poprawy po review fazy {numer}")
```
ZAKONCZ AUTOPILOTA.

W przeciwnym razie uruchom Agent (general-purpose, foreground) z promptem:

```
Jestes czescia pipeline'u dev-autopilot. Naprawiasz problemy znalezione w review.

Folder zadania: {$1}
Numer fazy: {numer_fazy}
Cykl naprawy: {fix_cykl + 1} z {MAX_FIX_CYKLI}

Przeczytaj plik {$1}/*-zadania.md.
Znajdz sekcje "Do poprawy po review fazy {numer_fazy}".

Napraw WSZYSTKIE problemy oznaczone jako:
- P1 (blocking)
- P2 (important)

Dla kazdego naprawionego problemu:
1. Napraw kod
2. Odznacz checkbox w zadaniach (zamien "- [ ]" na "- [x]")
3. Uruchom testy zeby upewnic sie ze naprawa nie zepsulna niczego innego

Po naprawie wszystkich P1/P2:
1. Uruchom pelna walidacje: typecheck, testy, build
2. Commituj zmiany

Nie pytaj uzytkownika o potwierdzenie — dzialaj autonomicznie.

Zwroc:
- Liczbe naprawionych problemow
- Wynik walidacji (PASS/FAIL)
- Commity
```

Po zakonczeniu agenta:
- Inkrementuj `fix_cykl`
- Wracaj do kroku 1b (Review) — ponowny review

#### 1e. Nastepna faza

Zaloguj posteep:
```
Faza {numer}: UKONCZONA
   Execute: OK
   Review: {CZYSTE / X poprawek w Y cyklach}
   Commity: {lista}

Nastepna faza: {numer + 1} — {nazwa}
```

Kontynuuj petle od kroku 1a dla nastepnej fazy.

### Faza 2: Zakonczenie

Po ukonczeniu WSZYSTKICH faz:

#### 2a. Walidacja koncowa

Uruchom Agent (general-purpose, foreground) z promptem:

```
Wykonaj pelna walidacje projektu:

1. Typecheck: sprawdz czy przechodzi bez bledow
2. Testy: uruchom wszystkie testy
3. Build: sprawdz czy build przechodzi

Jesli sa bledy — napraw je i commituj.
Jesli nie mozesz naprawic — zwroc liste bledow.

Zwroc:
- Typecheck: PASS/FAIL
- Testy: PASS/FAIL (X/Y przeszlo)
- Build: PASS/FAIL
- Naprawione bledy (jesli byly)
```

Jesli walidacja FAIL i agent nie moze naprawic -> STOP z raportem.

#### 2b. Complete

Uruchom Agent (general-purpose, foreground) z promptem:

```
Jestes czescia pipeline'u dev-autopilot. Archiwizujesz ukonczone zadanie.

Wywolaj skill /dev-docs-complete z argumentem "{nazwa_zadania}".
Uzyj narzedzia Skill: Skill("dev-docs-complete", args: "{nazwa_zadania}").

{nazwa_zadania} to nazwa folderu z $1 (ostatni segment sciezki).

Jesli skill zapyta "Archiwizowac mimo to?" — odpowiedz TAK.
Jesli skill zapyta o /dev-compound — NIE uruchamiaj go (zrobi to orkiestrator).

Nie pytaj uzytkownika o potwierdzenie — dzialaj autonomicznie.

Zwroc:
- Sciezke do archiwum (docs/completed/...)
- Liste zaktualizowanej dokumentacji
```

#### 2c. Compound

Uruchom Agent (general-purpose, foreground) z promptem:

```
Jestes czescia pipeline'u dev-autopilot. Dokumentujesz rozwiazane problemy do bazy wiedzy.

Wywolaj skill /dev-compound (bez argumentow, tryb compact).
Uzyj narzedzia Skill: Skill("dev-compound").

Skill automatycznie wyciagnie kontekst z sesji i git diff.

Nie pytaj uzytkownika o potwierdzenie — dzialaj autonomicznie.

Zwroc:
- Sciezke do zapisanego pliku w docs/solutions/
- Kategorie problemu
```

### Faza 3: Raport koncowy

Wyswietl podsumowanie:

```
Autopilot zakonczony: {nazwa-zadania}

Podsumowanie:
   Fazy: X/Y ukonczone
   Cykle fix per faza: A(N), B(N), C(N), ...
   Commity: N
   Walidacja koncowa: PASS

Archiwum: docs/completed/{nazwa}/
Solutions: docs/solutions/{kategoria}/{plik}.md

Problemy wymagajace uwagi: {lista lub "brak"}
```

## Obsluga bledow

| Sytuacja | Reakcja |
|----------|---------|
| Agent zwraca blad | STOP. Zaloguj ktora faza i krok sie nie powiodl. Wyswietl blad. |
| Testy nie przechoda po fix | Kontynuuj petle fix (jesli < MAX_FIX_CYKLI). Po wyczerpaniu -> STOP. |
| P1 po 2 cyklach fix->review | STOP. Wylistuj nierozwiazane P1 z checkboxow. |
| Git conflict | STOP. Poinformuj uzytkownika o konflikcie i sciezce do pliku. |
| Brak faz do wykonania | Przeskocz do Fazy 2 (complete/compound). |
| Skill tool nie dziala w Agent | FALLBACK: Agent czyta `.claude/skills/{nazwa}/SKILL.md` i wykonuje instrukcje bezposrednio. |

## Fallback: Jesli Skill tool nie dziala w Agent

Jesli Agent nie moze uzyc narzedzia Skill (blad, brak dostepu), zmien prompty agentow na:

```
Przeczytaj plik .claude/skills/dev-docs-execute/SKILL.md.
Wykonaj instrukcje z tego pliku na sciezce {$1}.
Dzialaj autonomicznie — nie pytaj uzytkownika.
```

Ten fallback zapewnia ze autopilot dziala niezaleznie od dostepnosci Skill tool w kontekscie Agent.

## Resumability

Autopilot jest wznawialny. Ponowne wywolanie `/dev-autopilot {sciezka}`:
- Czyta aktualny stan z `*-zadania.md` (checkboxy)
- Sprawdza istniejace `review-faza-*.md`
- Pomija ukonczone fazy
- Kontynuuje od ostatniej niekompletnej fazy
- Jesli faza ma review z P1/P2 — zaczyna od fix, nie od execute

Nie wymaga zadnego dodatkowego pliku stanu — caly stan jest w dokumentacji zadania.

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
- AKTUALNA_FAZA: numer (int) + nazwa bieżącej fazy — utrzymywany jako stan orkiestratora
- cykle_historia: mapa {faza_N: liczba_cykli_fix} — do raportu końcowego

## Konfiguracja
- MAX_FIX_CYKLI: 2 (maksymalnie 2 cykle fix->review per faza)
- Licznik `fix_cykl` jest LOKALNY dla fazy. Resetuje się na 0 przy przejściu do nowej fazy (krok 1a Execute).

## Instrukcje

### Faza 0: Inicjalizacja i resume

1. **Walidacja git:**
   - `git branch --show-current` — sprawdz aktualny branch
   - Przeczytaj wymagany branch z dokumentacji w `$1/` (szukaj "Branch:" w plikach)
   - Jesli branch sie nie zgadza — poinformuj uzytkownika i zapytaj czy przelalczyc
   - `git status --short` — sprawdz czy nie ma niezacommitowanych zmian

2. **Przeczytaj plan i wylicz AKTUALNA_FAZA:**
   - Przeczytaj `$1/*-plan.md` — wyciagnij liste `[(numer, nazwa), ...]` dla wszystkich faz
   - Przeczytaj `$1/*-zadania.md` — parsuj statusy checkboxow per faza:
     - Faza z WSZYSTKIMI zadaniami oznaczonymi jako ukonczone (`- [x]`) = faza UKONCZONA
     - Faza z JAKIMKOLWIEK zadaniem nieoznaczonym (`- [ ]`) = faza DO_WYKONANIA
   - **Ustaw `AKTUALNA_FAZA`** jako pierwsza niekompletna: `{numer: int, nazwa: string}`
   - **`AKTUALNA_FAZA` to jawny stan orkiestratora.** Kazdy agent (execute, review, fix) dostaje ten numer jako explicit parametr. Nie polegaj na tym ze skille same go wyliczaja.

3. **Sprawdz stan review:**
   - Sprawdz czy istnieje plik `$1/review-faza-{AKTUALNA_FAZA.numer}.md`
   - Jesli istnieje i zawiera nierozwiazane P1/P2 (sekcja "Do poprawy po review fazy N" w zadaniach ma niezaznaczone checkboxy) → ustaw flage `rozpocznij_od_fix = true`

4. **Zbuduj kolejke faz:**
   - Pominj fazy ze wszystkimi zadaniami ukonczonymi
   - Zacznij od `AKTUALNA_FAZA`
   - Jesli `rozpocznij_od_fix == true` — przejdz bezposrednio do kroku 1d (Fix), z pominieciem 1a Execute
   - W przeciwnym razie zacznij od 1a Execute

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

**AUTONOMICZNOSC:** Dla KAZDEJ fazy z kolejki, wykonaj ponizsze kroki sekwencyjnie. NIGDY nie pytaj usera o kontynuacje miedzy krokami (1a->1b->1c->1d->1e). Po zakonczeniu jednego kroku NATYCHMIAST przejdz do nastepnego. Jedyny powod do zatrzymania sie to STOP w obsludze bledow.

**Na poczatku kazdej nowej fazy:**
1. `fix_cykl = 0` — zresetuj licznik cykli naprawczych (lokalny dla fazy)
2. Re-parsuj `$1/*-zadania.md` zeby zweryfikowac ze `AKTUALNA_FAZA.numer` nadal jest niekompletna (stan mogl sie zmienic po poprzedniej fazie)
3. Jesli `AKTUALNA_FAZA` jest juz ukonczona → inkrementuj do nastepnej niekompletnej

#### 1a. Execute

Uruchom Agent (general-purpose, foreground) z promptem:

```
Jestes czescia pipeline'u dev-autopilot. Wykonujesz faze implementacji.

Folder zadania: {$1}
AKTUALNA FAZA: numer {AKTUALNA_FAZA.numer} — "{AKTUALNA_FAZA.nazwa}"

Wywolaj skill /dev-docs-execute z argumentem "{$1}".
Uzyj narzedzia Skill: Skill("dev-docs-execute", args: "{$1}").

Skill sam wybiera nastepna niekompletna faze na podstawie checkboxow.
Orkiestrator oczekuje ze wykonana zostanie faza {AKTUALNA_FAZA.numer}
— jesli skill wybierze inny numer, ZATRZYMAJ sie i zglos rozbieznosc.

Wymagania wykonania:
- Zaimplementuj kod dla wszystkich niezaznaczonych checkboxow (z wyjatkiem "Weryfikacja:")
- NAPISZ testy dla checkboxow z prefixem "Test:" RAZEM z kodem
- NIE wykonuj checkboxow "Weryfikacja:" — sa dla Agent 5 w review
- Uruchom pelna walidacje przed commitem (typecheck, test, build)

Nie pytaj uzytkownika o potwierdzenie — dzialaj autonomicznie.

Po zakonczeniu zwroc:
- Potwierdzenie numeru ukonczonej fazy (musi == {AKTUALNA_FAZA.numer})
- Commity (hashe)
- Wynik testow (PASS/FAIL z liczbami)
- Czy byly checkboxy Test: — ile napisano
- Czy byly checkboxy Weryfikacja: — ile pozostaje dla review
- Ewentualne problemy
```

Po zakonczeniu agenta:
- Zaweryfikuj ze numer fazy zgodny z oczekiwaniem
- Zaloguj: `Faza {AKTUALNA_FAZA.numer} "{AKTUALNA_FAZA.nazwa}": Execute zakonczony`

#### 1b. Review

Uruchom Agent (general-purpose, foreground) z promptem:

```
Jestes czescia pipeline'u dev-autopilot. Wykonujesz code review fazy.

Folder zadania: {$1}
Numer fazy: {AKTUALNA_FAZA.numer}

Wywolaj skill /dev-docs-review z argumentami "{$1} {AKTUALNA_FAZA.numer}".
Uzyj narzedzia Skill: Skill("dev-docs-review", args: "{$1} {AKTUALNA_FAZA.numer}").

Skill uruchomi 5 agentow review rownolegle (security, performance,
architecture, test coverage, E2E browser verification).

Nie pytaj uzytkownika "Czy wykonac poprawki?" — tylko wykonaj review i zwroc wyniki.

Po zakonczeniu zwroc USTRUKTURYZOWANY raport:
- Severity gate: BLOKUJE / ZASTRZEZENIA / CZYSTE
- Liczniki: P1={X}, P2={Y}, P3={Z}
- Typy findingow per severity (klasyfikacja dla fix agenta):
  * KOD: ile findingow dotyczy implementacji (bledy logiki, bezpieczenstwa, perf, architektury)
  * TEST: ile findingow dotyczy brakujacych/niepoprawnych testow (Test:)
  * E2E: ile findingow pochodzi z Agent 5 browser-verifier (Weryfikacja:, oznaczenie 🌐)
- Sciezka do raportu: {$1}/review-faza-{AKTUALNA_FAZA.numer}.md
- Wynik E2E: X passed / Y failed (jesli byly scenariusze Weryfikacja:)
```

Po zakonczeniu agenta zaloguj statystyki review:
```
Review Fazy {AKTUALNA_FAZA.numer}: {X}x P1, {Y}x P2, {Z}x P3
  Typy: {A}x KOD, {B}x TEST, {C}x E2E
  Severity gate: {BLOKUJE/ZASTRZEZENIA/CZYSTE}
```

#### 1c. Decyzja (orkiestrator)

Przeczytaj plik `$1/review-faza-{AKTUALNA_FAZA.numer}.md` i `$1/*-zadania.md`.

**Krok 1: Weryfikacja kompletnosci E2E.**
Sprawdz czy w `$1/*-zadania.md` zostaly NIEZAZNACZONE checkboxy `Weryfikacja:` dla biezacej fazy.
Jesli tak — sprawdz czy raport review zawiera findings dla tych checkboxow:
- Jesli review je zawiera (PASS lub FAIL) → OK, policz severity normalnie
- Jesli review NIE zawiera tych checkboxow (Agent 5 je pominil/skipnal/nie uruchomil sie) → **Dodaj kazdy brakujacy checkbox jako P2** z opisem: `🟠 [P2-important] 🌐 Weryfikacja: "{tresc checkboxa}" — pominiety przez review (Agent 5 nie uruchomiony)`

**Krok 2: Policz findings wg severity (lacznie z dodanymi w kroku 1):**
- **Sa P1 (blocking):** -> przejdz do kroku 1d (Fix)
- **Tylko P2 (important):** -> przejdz do kroku 1d (Fix)
- **Tylko P3 (nit) lub brak:** -> przejdz do nastepnej fazy (krok 1e)

Zaloguj:
```
Review Fazy {AKTUALNA_FAZA.numer}: {X}x P1, {Y}x P2, {Z}x P3
   -> {WYMAGA POPRAWEK / CZYSTE — kontynuuje}
```

#### 1d. Fix (warunkowy)

**Petla fix:**

Jesli `fix_cykl >= MAX_FIX_CYKLI` (2) — wykonaj logike wyczerpania cykli:

1. Sprawdz pozostale nierozwiazane problemy w sekcji "Do poprawy po review fazy {AKTUALNA_FAZA.numer}":

2. **Przypadek A: Pozostaja P1 (blocking)** → STOP:
   ```
   STOP: Faza {AKTUALNA_FAZA.numer} — po {MAX_FIX_CYKLI} cyklach nadal
   pozostaja BLOKUJACE problemy P1.

   Nierozwiazane P1:
   - [lista z checkboxow]

   Wymagana reczna interwencja. Szczegoly w:
   - $1/review-faza-{AKTUALNA_FAZA.numer}.md
   - $1/*-zadania.md (sekcja "Do poprawy po review fazy {AKTUALNA_FAZA.numer}")
   ```
   ZAKONCZ AUTOPILOTA.

3. **Przypadek B: Tylko P2 (important), zero P1** → GRACEFUL CONTINUATION:
   ```
   Faza {AKTUALNA_FAZA.numer}: GRACEFUL — wyczerpano {MAX_FIX_CYKLI} cykli,
   pozostaje {N} problemow P2 (zero P1).

   Severity gate review-skill dla samych P2 = "KONTYNUUJ Z ZASTRZEZENIAMI".
   Przenosze P2 do known-issues i kontynuuje do nastepnej fazy.
   ```
   a) Utworz lub zaktualizuj `$1/known-issues.md`:
      ```markdown
      # Known issues po autopilocie

      ## Faza {AKTUALNA_FAZA.numer} — "{AKTUALNA_FAZA.nazwa}"
      Wyczerpano {MAX_FIX_CYKLI} cykli napraw. Pozostaje {N} problemow P2.
      Review: review-faza-{AKTUALNA_FAZA.numer}.md

      - 🟠 [P2] plik:linia — opis
      - 🟠 [P2] plik:linia — opis
      ```
   b) Dopisz do `cykle_historia[faza_{AKTUALNA_FAZA.numer}] = "{MAX_FIX_CYKLI} (graceful P2)"`
   c) Przejdz do kroku 1e (Nastepna faza) z P2 odnotowanymi jako known issues

---

**W przeciwnym razie** (`fix_cykl < MAX_FIX_CYKLI`) uruchom Agent (general-purpose, foreground) z promptem:

```
Jestes czescia pipeline'u dev-autopilot. Naprawiasz problemy znalezione w review.

Folder zadania: {$1}
Numer fazy: {AKTUALNA_FAZA.numer}
Cykl naprawy: {fix_cykl + 1} z {MAX_FIX_CYKLI}

Przeczytaj plik {$1}/*-zadania.md — znajdz sekcje
"Do poprawy po review fazy {AKTUALNA_FAZA.numer}".

Przeczytaj takze {$1}/review-faza-{AKTUALNA_FAZA.numer}.md zeby zrozumiec
pelny kontekst kazdego findingu.

Napraw WSZYSTKIE problemy oznaczone jako P1 (blocking) i P2 (important).
Pomin P3 (nit).

=== KLASYFIKACJA FINDINGOW — OBOWIAZKOWA ===

Dla KAZDEGO findingu, NAJPIERW sklasyfikuj jego typ na podstawie
opisu problemu w checklist i raporcie review:

┌─ Typ A: KOD (blad implementacji, bezpieczenstwa, perf, architektury)
│  Sygnaly: finding dotyczy konkretnej linii kodu produkcyjnego,
│           wspomina o XSS, N+1, RLS, typowanie, wzorce, SOLID itp.
│
│  AKCJA:
│  1. Napraw kod zrodlowy
│  2. Uruchom odpowiednie unit testy (np. `bun test path/to/test`)
│  3. Odznacz checkbox w zadaniach (- [ ] -> - [x])
│
├─ Typ B: BRAKUJACY TEST (Test:)
│  Sygnaly: finding mowi "brak pliku testowego", "Test: nie napisany",
│           "brakujacy test dla X", pochodzi z Agent 4 (Test Coverage)
│
│  AKCJA:
│  1. NIE modyfikuj kodu produkcyjnego — on moze byc poprawny
│  2. Napisz brakujacy test zgodnie z planem technicznym w docs/plans/
│     (jesli istnieje Implementation Unit z Test scenarios:)
│  3. Test musi miec minimum 1 asercje. NIE pisz assertion-free testow
│  4. Uruchom test — musi przejsc
│  5. Odznacz checkbox
│
└─ Typ C: WERYFIKACJA E2E (Weryfikacja: / oznaczenie 🌐)
   Sygnaly: finding pochodzi z Agent 5 (E2E browser-verifier),
            checkbox ma prefix "Weryfikacja:", oznaczenie 🌐,
            opis wspomina visual regression, responsywnosc,
            interakcje, nawigacje klawiatura

   AKCJA:
   1. Znajdz przyczyne (zwykle w kodzie UI/stylu/a11y/interakcji)
   2. Napraw przyczyne
   3. Re-uruchom weryfikacje wizualna PRZEZ agent-browser:
      - Ustal URL aplikacji (zwykle http://localhost:5173 dla Vite)
      - `agent-browser open <URL>` + `wait --load networkidle`
      - `agent-browser snapshot -i`
      - Wykonaj scenariusz z opisu checkboxa Weryfikacja:
      - Ustaw viewport jesli scenariusz tego wymaga (desktop/mobile)
      - `agent-browser snapshot -i` po akcji
      - Zweryfikuj ze oczekiwany stan jest widoczny
      - `agent-browser screenshot` jako dowod (zapisz w $1/)
   4. Odznacz checkbox Weryfikacja: DOPIERO po wizualnym PASS.
      NIE odznaczaj na podstawie samego "naprawilem kod" —
      to jest antywzorzec (test weakening).

=== KOLEJNOSC NAPRAW ===

1. Napraw wszystkie Typ A (kod) — najszybsze
2. Napisz brakujace testy Typ B
3. Napraw Typ C i zweryfikuj w przegladarce

=== PO WSZYSTKICH NAPRAWACH ===

1. Uruchom pelna walidacje (typecheck, test, build — komendy z package.json)
2. Commituj zmiany: `fix([nazwa-zadania]): poprawki po review fazy {AKTUALNA_FAZA.numer} (cykl {fix_cykl + 1})`
3. Staguj tylko pliki zmienione w tym cyklu fix — nie uzywaj `git add .`

Nie pytaj uzytkownika o potwierdzenie — dzialaj autonomicznie.

Zwroc ustrukturyzowany raport:
- Naprawione: X findingow (A={a}, B={b}, C={c})
- E2E re-weryfikacja: X/Y passed
- Wynik pelnej walidacji: PASS/FAIL
- Commity (hashe)
- Findings ktorych nie udalo sie naprawic (jesli sa) z powodem
```

Po zakonczeniu agenta:
- Inkrementuj `fix_cykl`
- Zaloguj: `Fix Fazy {AKTUALNA_FAZA.numer} cykl {fix_cykl}: naprawiono {X}, pozostaje {Y}`
- Wracaj do kroku 1b (Review) — ponowny review weryfikuje skutecznosc napraw

#### 1e. Nastepna faza

Zaktualizuj `cykle_historia[faza_{AKTUALNA_FAZA.numer}] = fix_cykl`.

Zaloguj postep:
```
Faza {AKTUALNA_FAZA.numer} "{AKTUALNA_FAZA.nazwa}": UKONCZONA
   Execute: OK
   Review: {CZYSTE / X poprawek w Y cyklach / GRACEFUL — N P2 do known-issues}
   Commity: {lista hashes}

Nastepna faza: {AKTUALNA_FAZA.numer + 1} — {nazwa}
```

Inkrementuj `AKTUALNA_FAZA` do nastepnej niekompletnej fazy.
Kontynuuj petle od kroku 1a (z resetem `fix_cykl = 0`).

### Faza 2: Zakonczenie

Po ukonczeniu WSZYSTKICH faz:

#### 2a. Walidacja koncowa

Uruchom Agent (general-purpose, foreground) z promptem:

```
Wykonaj pelna walidacje calego projektu po autopilocie.

=== KROK 1: Odkryj komendy projektu ===

Przeczytaj konfiguracje projektu zeby ustalic komendy — NIE zgaduj:

1. Jesli istnieje `package.json`:
   - Przeczytaj sekcje `scripts` — szukaj: typecheck, lint, test, build, check
   - Wykryj package manager:
     * `bun.lockb` → `bun run <script>`
     * `pnpm-lock.yaml` → `pnpm <script>`
     * `yarn.lock` → `yarn <script>`
     * `package-lock.json` → `npm run <script>`
   - Jesli brak skryptu typecheck → sprobuj `tsc --noEmit` (jesli tsconfig.json istnieje)
   - Jesli brak skryptu test → pomin z adnotacja "brak"

2. Jesli istnieje `Makefile` → uzyj `make <target>` (typecheck, test, build)
3. Jesli istnieje `pyproject.toml` → uzyj narzedzi Python (mypy, pytest, ruff)
4. Jesli istnieje `Cargo.toml` → `cargo check && cargo test && cargo build`

Jesli nie mozesz ustalic komend — ZATRZYMAJ i zwroc "brak konfiguracji" jako FAIL.

=== KROK 2: Wykonaj walidacje ===

Uruchom w kolejnosci (zatrzymaj przy pierwszym FAIL, nie kontynuuj dalej):

1. Typecheck: <wykryta komenda>
2. Lint (jesli skrypt istnieje): <wykryta komenda>
3. Test: <wykryta komenda>
4. Build: <wykryta komenda>

=== KROK 3: Obsluga bledow ===

Jesli ktores FAIL:
- Przeanalizuj blad
- Jesli mozesz naprawic (np. prosty typecheck, brakujacy import) — napraw, commituj, uruchom ponownie
- Jesli nie mozesz — zwroc liste bledow z lokalizacjami

=== ZWROC USTRUKTURYZOWANY RAPORT ===

- Wykryte komendy: <lista>
- Typecheck: PASS/FAIL (komenda: ...)
- Lint: PASS/SKIPPED/FAIL
- Testy: PASS/FAIL (X/Y przeszlo, komenda: ...)
- Build: PASS/FAIL (komenda: ...)
- Naprawione bledy (jesli byly): lista commitow
- Pozostale bledy (jesli sa): lista z lokalizacjami
```

Jesli walidacja FAIL i agent nie moze naprawic → STOP z raportem.

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

Skill automatycznie:
- Wyciagnie kontekst z sesji i git diff
- Sklasyfikuje kategorie problemu
- Zapisze dokumentacje w docs/solutions/<category>/
- Oceni czy problem jest rule-worthy (min 2 z 5 kryteriow)
- Jesli tak → doda regule do .claude/rules/learned-patterns.md
  (chyba ze limit 50 regul osiagniety lub duplikat)

Nie pytaj uzytkownika o potwierdzenie — dzialaj autonomicznie.

Zwroc USTRUKTURYZOWANY raport:
- Sciezka do zapisanego pliku: docs/solutions/<category>/<filename>.md
- Kategoria problemu
- Status reguly learned-patterns:
  * "dodana: <tytul reguly>" — reguta dodana do learned-patterns.md
  * "pominieta: nie rule-worthy" — problem nie spelnial kryteriow
  * "pominieta: duplikat" — podobna regula juz istnieje
  * "pominieta: limit 50" — osiagnieto limit, zasugeruj /dev-compound-refresh
  * "brak — nie udalo sie utworzyc docs" — compound nie udalo sie
```

### Faza 3: Raport koncowy

Zbierz dane ze stanu orkiestratora:
- `cykle_historia` — mapa faz i liczby cykli fix
- Wynik walidacji koncowej z kroku 2a
- Sciezka archiwum z kroku 2b
- Sciezka docs/solutions + status reguly learned-patterns z kroku 2c
- Zawartosc `$1/known-issues.md` jesli istnieje (graceful P2)

Wyswietl podsumowanie:

```
Autopilot zakonczony: {nazwa-zadania}

Podsumowanie:
   Fazy: X/Y ukonczone
   Cykle fix per faza: Faza1(0), Faza2(1 cykl), Faza3(2 cykle, graceful P2), ...
   Commity: N
   Walidacja koncowa: PASS / FAIL

Archiwum: docs/completed/{nazwa}/
Solutions: docs/solutions/{kategoria}/{plik}.md
Regula learned-patterns: {dodana: "tytul" / pominieta: nie rule-worthy / pominieta: duplikat / pominieta: limit 50 / brak}

Known issues (graceful P2): {liczba lub "brak"}
   {jesli sa: lista pierwszych 3-5 problemow z known-issues.md + sciezka}

Problemy wymagajace uwagi: {lista lub "brak"}
```

## Obsluga bledow

| Sytuacja | Reakcja |
|----------|---------|
| Agent zwraca blad | STOP. Zaloguj ktora faza i krok sie nie powiodl. Wyswietl blad. |
| Testy nie przechoda po fix | Kontynuuj petle fix (jesli < MAX_FIX_CYKLI). Po wyczerpaniu -> zachowanie zalezy od severity (patrz ponizej). |
| P1 po 2 cyklach fix->review | STOP. Wylistuj nierozwiazane P1 z checkboxow. |
| Tylko P2 po 2 cyklach fix->review | GRACEFUL: zapisz P2 do `$1/known-issues.md`, kontynuuj do nastepnej fazy. |
| Numer fazy z execute != AKTUALNA_FAZA | STOP. Zaloguj rozbieznosc. Wymaga recznej interwencji. |
| Git conflict | STOP. Poinformuj uzytkownika o konflikcie i sciezce do pliku. |
| Brak faz do wykonania | Przeskocz do Fazy 2 (complete/compound). |
| Skill tool nie dziala w Agent | FALLBACK: Agent czyta `.claude/skills/{nazwa}/SKILL.md` i wykonuje instrukcje bezposrednio. |
| E2E Agent 5 zwraca FAIL | Traktuj jako P2. Fix agent musi re-uruchomic agent-browser po naprawie kodu i zweryfikowac wizualnie przed odznaczeniem checkboxa. |
| E2E Agent 5 SKIP / nie uruchomiony (brak dev server, env error) | Orkiestrator w kroku 1c MUSI wykryc niezaznaczone checkboxy Weryfikacja: i dodac kazdy jako P2. Agent 5 SKIP != brak problemow — to niezweryfikowane wymagania. |

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

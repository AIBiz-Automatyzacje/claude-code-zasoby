// Test skladni WSZYSTKICH workflowow z .claude/workflows/*.js.
//
// Uruchomienie:  node --test .claude/workflows/__tests__/skladnia-workflowow.test.mjs
//   albo caly katalog:  node --test '.claude/workflows/__tests__/*.test.mjs'   (glob w apostrofach)
//
// DLACZEGO TEN TEST ISTNIEJE (audyt powdrozeniowy 2026-09-06, znalezisko N1):
// commit 5775b79 (plan naprawy B10) wniosl do dev-docs-execute-wf.js nieescapowany backtick w srodku
// template literala ("dopisz do sekcji `## Dziennik`"). Pierwszy backtick zamykal literal i plik
// przestawal byc poprawnym ESM. Objaw byl MYLACY: plik lezal na dysku i w manifescie, ale runtime
// go NIE rejestrowal, wiec autopilot przechodzil caly bootstrap i padal dopiero przy wejsciu w faze 1
// na "workflow('dev-docs-execute-wf'): no workflow with that name". Dwa projekty (claude-cron 0e14f54,
// oferty-online 356a412) zdiagnozowaly to niezaleznie, kazdy trac czas, a szablon zostal zepsuty —
// wiec kazdy kolejny /sync-template roznosil defekt dalej.
//
// DLACZEGO NIE `node --check` I NIE `import()`:
// workflowy sa self-contained skryptami runtime'u Workflow. Maja `return` na GORNYM poziomie (26 wystapien
// w dev-autopilot-wf.js) — `node --check` odrzuca to jako "Illegal return statement", wiec dalby fałszywy
// FAIL na kazdym pliku. Maja tez top-level `await agent(...)`, `phase()`, `log()`, ktorych w Node nie ma,
// wiec `import()` wysypuje sie na ReferenceError przy PIERWSZYM wywolaniu — czyli sprawdzalby wykonanie,
// nie skladnie. Opakowanie zrodla w `(async () => { ... })()` i skompilowanie przez `new vm.Script`
// parsuje CALY plik bez wykonania ani jednej linii: dokladnie to, co robi runtime, gdy rejestruje workflow.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'

const KATALOG_WORKFLOWOW = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const pliki = readdirSync(KATALOG_WORKFLOWOW)
  .filter((n) => n.endsWith('.js'))
  .sort()

// Bezpiecznik samego testu: gdyby katalog byl pusty albo glob przestal dzialac, test przechodzilby
// "zielono" nie sprawdzajac niczego. Zero plikow = blad testu, nie sukces.
test('katalog workflowow ma pliki do sprawdzenia', () => {
  assert.ok(pliki.length >= 5, `oczekiwano co najmniej 5 workflowow w ${KATALOG_WORKFLOWOW}, znaleziono ${pliki.length}`)
})

for (const nazwa of pliki) {
  test(`${nazwa} parsuje sie jako skrypt workflowu`, () => {
    const zrodlo = readFileSync(join(KATALOG_WORKFLOWOW, nazwa), 'utf8')
    // `export const meta` jest wymagane przez runtime, ale wewnatrz funkcji jest niedozwolone skladniowo —
    // zdejmujemy sam modyfikator, zostawiajac deklaracje. Nic innego w tresci nie ruszamy.
    const bezExportu = zrodlo.replace(/^export\s+const\s/m, 'const ')
    assert.doesNotThrow(
      () => new Script(`(async () => {\n${bezExportu}\n})()`, { filename: nazwa }),
      `${nazwa} nie parsuje sie — runtime NIE zarejestruje tego workflowu, a blad wyjdzie dopiero przy jego wywolaniu ("no workflow with that name"). Najczestsza przyczyna: nieescapowany backtick albo \${...} w tresci promptu wewnatrz template literala.`,
    )
  })
}

// Kotwica na konkretna regresje z N1 — zeby test mowil, CO sie zepsulo, nie tylko ze sie zepsulo.
test('dev-docs-execute-wf.js: backticki w tresci promptu sa zaescapowane', () => {
  const zrodlo = readFileSync(join(KATALOG_WORKFLOWOW, 'dev-docs-execute-wf.js'), 'utf8')
  const wiersz = zrodlo.split('\n').find((l) => l.includes('## Dziennik'))
  assert.ok(wiersz, 'nie znaleziono wiersza z "## Dziennik" — kotwica testu wymaga aktualizacji')
  assert.ok(
    wiersz.includes('\\`## Dziennik\\`'),
    `backtick wokol "## Dziennik" musi byc zaescapowany (\\\`), inaczej zamyka template literal. Jest: ${wiersz.trim()}`,
  )
})

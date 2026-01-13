# Claude Code Environment

Konfiguracja środowiska Claude Code - uniwersalny template projektowy.

## Struktura katalogów

```
.claude/
├── settings.json          # Konfiguracja (pluginy, hooks, permissions, statusline)
├── commands/              # Slash commands
│   ├── dev-docs.md
│   ├── dev-docs-execute.md
│   ├── dev-docs-review.md
│   ├── dev-docs-update.md
│   ├── dev-docs-complete.md
│   ├── gemini.md
│   ├── parallel-prep.md
│   ├── parallel-execute.md
│   └── parallel-cleanup.md
├── hooks/                 # Automatyzacje
│   ├── context-guardian.py
│   ├── skill-activation-prompt.sh
│   ├── post-tool-use-tracker.sh
│   ├── stop-build-check-enhanced.sh
│   └── error-handling-reminder.sh
├── skills/                # Bazy wiedzy
│   ├── skill-rules.json
│   ├── frontend-dev-guidelines/
│   ├── ux-ui-guidelines/
│   ├── code-review/
│   └── skill-developer/
├── agents/                # Specjalistyczne agenty
│   ├── auto-error-resolver.md
│   ├── plan-reviewer.md
│   ├── refactor-planner.md
│   ├── security-auditor.md
│   └── web-research-specialist.md
└── tsc-cache/             # Cache błędów TypeScript
```

---

## Hooks

Skrypty uruchamiane automatycznie przy zdarzeniach.

| Event | Kiedy | Hook |
|-------|-------|------|
| `UserPromptSubmit` | Przed zobaczeniem prompta | `skill-activation-prompt.sh` |
| `PostToolUse` | Po Edit/Write | `post-tool-use-tracker.sh` |
| `PostToolUse` | Po TodoWrite | `context-guardian.py` |
| `Stop` | Po odpowiedzi | `stop-build-check-enhanced.sh`, `error-handling-reminder.sh` |

### `skill-activation-prompt.sh`
Analizuje prompt i sugeruje skill'e do załadowania na podstawie `skill-rules.json`.

### `post-tool-use-tracker.sh`
Śledzi edytowane pliki w sesji. Cache: `.claude/tsc-cache/{session_id}/`

### `context-guardian.py`
Monitoruje zużycie tokenów. Ostrzega przy **75% limitu** (150k/200k tokenów).

### `stop-build-check-enhanced.sh`
Uruchamia `npx tsc --noEmit` po odpowiedzi. Przy błędach sugeruje agenta `auto-error-resolver`.

### `error-handling-reminder.sh`
Sprawdza wzorce błędów: `console.error()` → `logger.error()`, brak `captureError()` w Edge Functions.

---

## Slash Commands

### Workflow Dev-Docs

System zarządzania zadaniami z trwałą dokumentacją.

#### `/dev-docs [opis zadania]`
Tworzy kompleksowy plan strategiczny.

**Działanie:**
1. Tworzy branch: `feature/[nazwa-zadania]`
2. Analizuje codebase
3. Tworzy `dev/active/[zadanie]/`:
   - `[zadanie]-plan.md` — cele, fazy, kryteria
   - `[zadanie]-kontekst.md` — decyzje, zależności
   - `[zadanie]-zadania.md` — checklista (✅/⬜)
4. Commituje dokumentację

#### `/dev-docs-execute [ścieżka]`
Wykonuje **JEDNĄ fazę** zadania.

**Działanie:**
1. Waliduje branch
2. Czyta dokumentację, określa następną fazę
3. Implementuje tylko tę fazę
4. Commituje: `feat([zadanie]): [opis fazy]`
5. Generuje podsumowanie

#### `/dev-docs-review [ścieżka] [numer-fazy]`
Code review wykonanej fazy przez subagenta.

**Klasyfikacja problemów:**
- 🔴 blocking — blokuje merge
- 🟠 important — wymaga poprawy
- 🟡 nit — zalecane
- 🔵 suggestion — opcjonalne

#### `/dev-docs-update`
Aktualizacja dokumentacji przed resetem kontekstu.

**Kiedy używać:**
- Context Guardian ostrzega o limicie
- Przed końcem sesji
- Przed przerwą

#### `/dev-docs-complete [nazwa-zadania]`
Archiwizuje ukończone zadanie do `dev/completed/`.

---

### Workflow Parallel

Praca równoległa z wieloma agentami w git worktrees.

#### `/parallel-prep [nazwa] [liczba]`
Tworzy N worktrees: `trees/[nazwa]-1/`, `trees/[nazwa]-2/`, itd.

#### `/parallel-execute [nazwa] [plan] [liczba]`
Uruchamia N subagentów równolegle. Każdy tworzy `REZULTATY_[nazwa]-N.md`.

#### `/parallel-cleanup [nazwa]`
Usuwa worktrees i branche po zakończeniu.

---

### Inne komendy

#### `/gemini [zadanie]`
Uruchamia Gemini CLI, zapisuje odpowiedź w `dev/gemini/`.

---

## Skills

Bazy wiedzy ładowane automatycznie na podstawie kontekstu.

| Skill | Opis | Triggery |
|-------|------|----------|
| `frontend-dev-guidelines` | React 19 + TypeScript + Tailwind v4 | komponent, hook, styling |
| `ux-ui-guidelines` | Dostępność, animacje, responsive | WCAG, mobile, animacja |
| `code-review` | Code review dla tech stacku | review, PR, audyt |
| `skill-developer` | Tworzenie skill'i | create skill, hooki |

### Struktura skill'a

```
skills/[nazwa]/
├── SKILL.md           # Główna dokumentacja + frontmatter
└── resources/         # Dodatkowe pliki .md
```

### System triggerów (`skill-rules.json`)

```json
{
  "skill-name": {
    "type": "domain",
    "enforcement": "suggest",      // suggest | warn | block
    "priority": "high",            // critical | high | medium | low
    "pathPatterns": ["src/**"],
    "promptTriggers": {
      "keywords": ["komponent"],
      "intentPatterns": ["regex"]
    }
  }
}
```

---

## Agents

Specjalistyczne instancje Claude z określonymi narzędziami i wiedzą.

| Agent | Cel | Narzędzia |
|-------|-----|-----------|
| `auto-error-resolver` | Automatyczna naprawa błędów TS | Read, Write, Edit, Bash |
| `plan-reviewer` | Recenzja planów przed implementacją | Read, Glob, Grep |
| `refactor-planner` | Analiza kodu i plany refaktoryzacji | Read, Glob, Grep |
| `security-auditor` | Skanowanie podatności (OWASP Top 10) | Read, Glob, Grep |
| `web-research-specialist` | Badania w internecie | WebSearch, WebFetch |

### `auto-error-resolver`
Sugerowany przez `stop-build-check-enhanced.sh` gdy są błędy TSC.

**Proces:**
1. Czyta błędy z cache lub uruchamia `npx tsc --noEmit`
2. Grupuje błędy wg typu
3. Naprawia systematycznie (importy → typy → reszta)
4. Weryfikuje naprawy

### Struktura agenta

```markdown
---
name: nazwa-agenta
description: Opis agenta
tools: [Read, Write, Edit, Bash]
---

# Instrukcje dla agenta
...
```

---

## Konfiguracja (`settings.json`)

```json
{
  "enabledPlugins": { "dev-browser@dev-browser-marketplace": true },
  "permissions": { "allow": ["WebSearch", "Bash(git:*)"] },
  "hooks": { ... },
  "statusLine": { "type": "command", "command": "npx -y @owloops/claude-powerline@latest" }
}
```

---

## Pluginy i MCP

| Plugin | Opis |
|--------|------|
| `dev-browser` | Automatyzacja przeglądarki (Playwright) |
| `frontend-design` | Projektowanie UI |
| `claude-mem` | Pamięć między sesjami |

**MCP Servers:** serena (semantyczne narzędzia), playwright (browser automation)

---

## Workflow

### Nowe zadanie
```
/dev-docs [opis]           → Plan + branch + dokumentacja
/dev-docs-execute [path]   → Wykonaj fazę 1
/dev-docs-review [path] 1  → Code review
... powtórz dla kolejnych faz
/dev-docs-complete [name]  → Archiwizuj
```

### Reset kontekstu
```
/dev-docs-update           → Zapisz stan
[nowa sesja]
/dev-docs-execute [path]   → Kontynuuj
```

### Praca równoległa
```
/parallel-prep [name] 3    → 3 worktrees
/parallel-execute [name] [plan] 3 → 3 agentów
[porównaj, zmerguj]
/parallel-cleanup [name]   → Sprzątanie
```

---

## Tworzenie własnych

### Nowy Slash Command
1. Utwórz `.claude/commands/[nazwa].md`
2. Frontmatter: `description`, `argument-hint`, `allowed-tools`
3. Użyj `$ARGUMENTS` dla parametrów

### Nowy Hook
1. Utwórz skrypt w `.claude/hooks/`
2. Exit code: `0` = sukces, `2` = blokuj + stderr
3. Dodaj do `settings.json` w sekcji `hooks`

### Nowy Skill
1. Utwórz `.claude/skills/[nazwa]/SKILL.md` z frontmatterem
2. Dodaj `resources/` z plikami .md
3. Dodaj triggery do `skill-rules.json`

### Nowy Agent
1. Utwórz `.claude/agents/[nazwa].md`
2. Frontmatter: `name`, `description`, `tools`
3. Agent dostępny przez Task tool z `subagent_type`

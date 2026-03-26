---
name: agent-browser
description: Automatyzacja przeglądarki przez CLI agent-browser. Nawigacja, formularze, screenshoty, scraping, testowanie UI — wszystko przez komendy Bash z ref-based element selection (@e1, @e2). Używaj przy "otwórz stronę", "wypełnij formularz", "zrób screenshot", "scrape page", "testuj UI", "agent-browser".
---

# Browser Automation with agent-browser

CLI do automatyzacji Chrome/Chromium przez CDP. Instalacja: `npm i -g agent-browser && agent-browser install`.

## Setup Check

```bash
command -v agent-browser >/dev/null 2>&1 && echo "Installed" || echo "NOT INSTALLED - run: npm install -g agent-browser && agent-browser install"
```

## Core Workflow

1. **Navigate**: `agent-browser open <url>`
2. **Snapshot**: `agent-browser snapshot -i` (refy: `@e1`, `@e2`)
3. **Interact**: click, fill, select używając refów
4. **Re-snapshot**: po nawigacji lub zmianach DOM — nowe refy

```bash
agent-browser open https://example.com/form
agent-browser snapshot -i
# Output: @e1 [input type="email"], @e2 [input type="password"], @e3 [button] "Submit"

agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
agent-browser wait --load networkidle
agent-browser snapshot -i  # Check result
```

## Command Chaining

```bash
# Chain when nie potrzebujesz output pośredniego
agent-browser open https://example.com && agent-browser wait --load networkidle && agent-browser snapshot -i

# Run separately when potrzebujesz parsować output (np. snapshot → refs → interact)
```

## Session vs Session-Name (WAŻNE)

Dwa RÓŻNE flagi:

- `--session <name>` — izolowany kontekst przeglądarki (osobne cookies, storage, tabs). Do równoległych zadań.
- `--session-name <name>` — auto-save/restore cookies i localStorage po nazwie. Do persystencji między restartami.

```bash
# Izolowane sesje (równoległe przeglądanie)
agent-browser --session site1 open https://site-a.com
agent-browser --session site2 open https://site-b.com

# Persystencja stanu (zapamiętaj login)
agent-browser --session-name myapp open https://app.com/login
# ... login flow ...
agent-browser close  # State auto-saved
# Następnym razem: state auto-restored
agent-browser --session-name myapp open https://app.com/dashboard
```

## Authentication

Wybierz podejście:

**Auth Vault (recommended — LLM nigdy nie widzi hasła):**
```bash
echo "$PASSWORD" | agent-browser auth save myapp --url https://app.com/login --username user --password-stdin
agent-browser auth login myapp
```

**Persistent profile:**
```bash
agent-browser --profile ~/.myapp open https://app.com/login
# ... login once ...
# All future runs: already authenticated
agent-browser --profile ~/.myapp open https://app.com/dashboard
```

**Import z Chrome (one-off):**
```bash
agent-browser --auto-connect state save ./auth.json
agent-browser --state ./auth.json open https://app.com/dashboard
```

**State file (manual):**
```bash
agent-browser state save ./auth.json    # po zalogowaniu
agent-browser state load ./auth.json    # w przyszłej sesji
```

State files zawierają tokeny w plaintext — dodaj do `.gitignore`, ustaw `AGENT_BROWSER_ENCRYPTION_KEY` dla szyfrowania.

Szczegóły: [references/authentication.md](references/authentication.md) (OAuth, 2FA, cookie-based, token refresh)

## Essential Commands

```bash
# Navigation
agent-browser open <url>              # Navigate (aliases: goto, navigate)
agent-browser close                   # Close browser

# Snapshot
agent-browser snapshot -i             # Interactive elements with refs (recommended)
agent-browser snapshot -i -C          # Include cursor-interactive elements
agent-browser snapshot -s "#selector" # Scope to CSS selector

# Interaction (use @refs from snapshot)
agent-browser click @e1               # Click element
agent-browser click @e1 --new-tab     # Click and open in new tab
agent-browser fill @e2 "text"         # Clear and type text
agent-browser type @e2 "text"         # Type without clearing
agent-browser select @e1 "option"     # Select dropdown option
agent-browser check @e1               # Check checkbox
agent-browser press Enter             # Press key
agent-browser keyboard type "text"    # Type at current focus (no selector)
agent-browser keyboard inserttext "text"  # Insert without key events
agent-browser scroll down 500         # Scroll page
agent-browser scroll down 500 --selector "div.content"  # Scroll within container

# Get information
agent-browser get text @e1            # Get element text
agent-browser get url                 # Get current URL
agent-browser get title               # Get page title
agent-browser get cdp-url             # Get CDP WebSocket URL

# Wait
agent-browser wait @e1                # Wait for element
agent-browser wait --load networkidle # Wait for network idle
agent-browser wait --url "**/page"    # Wait for URL pattern
agent-browser wait 2000               # Wait milliseconds
agent-browser wait --text "Welcome"   # Wait for text
agent-browser wait --fn "!document.body.innerText.includes('Loading...')"  # Wait for JS condition
agent-browser wait "#spinner" --state hidden  # Wait for element to disappear

# Downloads
agent-browser download @e1 ./file.pdf          # Click to trigger download
agent-browser wait --download ./output.zip     # Wait for download
agent-browser --download-path ./downloads open <url>  # Set download dir

# Viewport & Device Emulation
agent-browser set viewport 1920 1080          # Set viewport size (default: 1280x720)
agent-browser set viewport 1920 1080 2        # 2x retina
agent-browser set device "iPhone 14"          # Emulate device

# Capture
agent-browser screenshot              # Screenshot to temp dir
agent-browser screenshot --full       # Full page screenshot
agent-browser screenshot --annotate   # Annotated with numbered element labels
agent-browser screenshot --screenshot-dir ./shots  # Save to custom directory
agent-browser pdf output.pdf          # Save as PDF

# Clipboard
agent-browser clipboard read          # Read text from clipboard
agent-browser clipboard write "text"  # Write text to clipboard
agent-browser clipboard copy          # Copy current selection
agent-browser clipboard paste         # Paste from clipboard

# Diff (compare page states)
agent-browser diff snapshot                          # Compare current vs last snapshot
agent-browser diff snapshot --baseline before.txt    # Compare current vs saved file
agent-browser diff screenshot --baseline before.png  # Visual pixel diff
agent-browser diff url <url1> <url2>                 # Compare two pages
```

Pełna referencyjna lista komend: [references/commands.md](references/commands.md)

## Common Patterns

### Form Submission

```bash
agent-browser open https://example.com/signup
agent-browser snapshot -i
agent-browser fill @e1 "Jane Doe"
agent-browser fill @e2 "jane@example.com"
agent-browser select @e3 "California"
agent-browser check @e4
agent-browser click @e5
agent-browser wait --load networkidle
```

### Data Extraction

```bash
agent-browser open https://example.com/products
agent-browser snapshot -i
agent-browser get text @e5           # Get specific element text
agent-browser get text body > page.txt  # Get all page text

# JSON output for parsing
agent-browser snapshot -i --json
agent-browser get text @e1 --json
```

### Connect to Existing Chrome

```bash
# Auto-discover running Chrome with remote debugging enabled
agent-browser --auto-connect open https://example.com
agent-browser --auto-connect snapshot

# Or with explicit CDP port
agent-browser --cdp 9222 snapshot
```

### Color Scheme (Dark Mode)

```bash
agent-browser --color-scheme dark open https://example.com
# Or: AGENT_BROWSER_COLOR_SCHEME=dark agent-browser open https://example.com
# Or: agent-browser set media dark
```

### Viewport & Responsive Testing

```bash
agent-browser set viewport 1920 1080 && agent-browser screenshot desktop.png
agent-browser set viewport 375 812 && agent-browser screenshot mobile.png
agent-browser set device "iPhone 14" && agent-browser screenshot device.png
```

### Visual Browser (Debugging)

```bash
agent-browser --headed open https://example.com
agent-browser highlight @e1          # Highlight element
agent-browser inspect                # Open Chrome DevTools
agent-browser record start demo.webm # Record session
agent-browser profiler start         # Start profiling
agent-browser profiler stop trace.json
```

Use `AGENT_BROWSER_HEADED=1` to enable headed mode via environment variable.

### Local Files (PDFs, HTML)

```bash
agent-browser --allow-file-access open file:///path/to/document.pdf
agent-browser screenshot output.png
```

## Ref Lifecycle (WAŻNE)

Refy (`@e1`, `@e2`) są INVALIDOWANE po zmianach strony. Zawsze re-snapshot po:

- Kliknięciu linków/przycisków nawigacyjnych
- Submisji formularzy
- Dynamicznym ładowaniu treści (dropdowny, modale)

```bash
agent-browser click @e5              # Navigates to new page
agent-browser snapshot -i            # MUST re-snapshot
agent-browser click @e1              # Use new refs
```

## Annotated Screenshots (Vision Mode)

`--annotate` nakłada numerowane labele na elementy. Każdy `[N]` mapuje na `@eN`. Cachuje refy — interakcja bez osobnego snapshota.

```bash
agent-browser screenshot --annotate
# [1] @e1 button "Submit"
# [2] @e2 link "Home"
agent-browser click @e2
```

Używaj gdy: unlabeled icon buttons, weryfikacja layoutu, canvas/chart elements, spatial reasoning.

## Semantic Locators (Alternative to Refs)

```bash
agent-browser find text "Sign In" click
agent-browser find label "Email" fill "user@test.com"
agent-browser find role button click --name "Submit"
agent-browser find placeholder "Search" type "query"
agent-browser find testid "submit-btn" click
```

## JavaScript Evaluation (eval)

**Shell quoting can corrupt complex expressions** — use `--stdin` or `-b`.

```bash
# Simple
agent-browser eval 'document.title'

# Complex — use --stdin (RECOMMENDED)
agent-browser eval --stdin <<'EVALEOF'
JSON.stringify(
  Array.from(document.querySelectorAll("img"))
    .filter(i => !i.alt)
    .map(i => ({ src: i.src.split("/").pop(), width: i.width }))
)
EVALEOF

# Or base64
agent-browser eval -b "$(echo -n 'document.querySelectorAll("a").length' | base64)"
```

## Security

```bash
# Content boundaries (recommended for AI agents)
export AGENT_BROWSER_CONTENT_BOUNDARIES=1

# Domain allowlist
export AGENT_BROWSER_ALLOWED_DOMAINS="example.com,*.example.com"

# Action policy
export AGENT_BROWSER_ACTION_POLICY=./policy.json
# Example: { "default": "deny", "allow": ["navigate", "snapshot", "click", "scroll", "wait", "get"] }

# Output limits (prevent context flooding)
export AGENT_BROWSER_MAX_OUTPUT=50000
```

## Diffing (Verifying Changes)

```bash
# Typical workflow: snapshot -> action -> diff
agent-browser snapshot -i          # Take baseline
agent-browser click @e2            # Perform action
agent-browser diff snapshot        # See what changed

# Visual regression
agent-browser screenshot baseline.png
# ... changes ...
agent-browser diff screenshot --baseline baseline.png

# Compare staging vs production
agent-browser diff url https://staging.example.com https://prod.example.com --screenshot
```

## Timeouts and Slow Pages

Default timeout: 25s. Override: `AGENT_BROWSER_DEFAULT_TIMEOUT` (ms).

```bash
agent-browser wait --load networkidle          # Best for slow pages
agent-browser wait "#content"                  # Wait for specific element
agent-browser wait --url "**/dashboard"        # Wait for URL pattern
agent-browser wait --fn "document.readyState === 'complete'"  # JS condition
```

## Session Cleanup

```bash
agent-browser close                    # Close default session
agent-browser --session agent1 close   # Close specific session
agent-browser session list             # List active sessions

# Auto-shutdown after inactivity
AGENT_BROWSER_IDLE_TIMEOUT_MS=60000 agent-browser open example.com
```

## Configuration File

`agent-browser.json` in project root:

```json
{
  "headed": true,
  "proxy": "http://localhost:8080",
  "profile": "./browser-data"
}
```

Priority: `~/.agent-browser/config.json` < `./agent-browser.json` < env vars < CLI flags.

## Deep-Dive Documentation

| Reference | When to Use |
|-----------|-------------|
| [references/commands.md](references/commands.md) | Full command reference |
| [references/snapshot-refs.md](references/snapshot-refs.md) | Ref lifecycle, troubleshooting |
| [references/session-management.md](references/session-management.md) | Parallel sessions, state persistence |
| [references/authentication.md](references/authentication.md) | OAuth, 2FA, token refresh |
| [references/video-recording.md](references/video-recording.md) | Recording workflows |
| [references/profiling.md](references/profiling.md) | Chrome DevTools profiling |
| [references/proxy-support.md](references/proxy-support.md) | Proxy configuration |

## Ready-to-Use Templates

| Template | Description |
|----------|-------------|
| [templates/form-automation.sh](templates/form-automation.sh) | Form filling with validation |
| [templates/authenticated-session.sh](templates/authenticated-session.sh) | Login once, reuse state |
| [templates/capture-workflow.sh](templates/capture-workflow.sh) | Content extraction with screenshots |

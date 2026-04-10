# Condition-Based Waiting — zamien sleep() na polling warunku

Flaky testy czesto zgaduja timing przez `setTimeout`/`sleep`. Test przechodzi na szybkiej maszynie, failuje w CI.

**Zasada:** Czekaj na warunek ktory Cie interesuje, nie na zgadywany czas.

## Pattern

```typescript
// ZLE: zgadywanie timingu
await new Promise(r => setTimeout(r, 500));
expect(result).toBeDefined();

// DOBRZE: czekanie na warunek
await waitFor(() => getResult() !== undefined);
expect(result).toBeDefined();
```

## Implementacja

```typescript
async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    const result = condition();
    if (result) return result;

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout: ${description} (po ${timeoutMs}ms)`);
    }

    await new Promise(r => setTimeout(r, 10)); // Poll co 10ms
  }
}
```

## Typowe scenariusze

| Scenariusz | Pattern |
|------------|---------|
| Czekaj na event | `waitFor(() => events.find(e => e.type === 'DONE'), 'event DONE')` |
| Czekaj na stan | `waitFor(() => state === 'ready', 'stan ready')` |
| Czekaj na ilosc | `waitFor(() => items.length >= 5, '5 elementow')` |
| Czekaj na plik | `waitFor(() => existsSync(path), 'plik istnieje')` |
| Czekaj na element DOM | `waitFor(() => screen.queryByText('Zaladowano'), 'tekst widoczny')` |

## Kiedy sleep() JEST poprawny

Gdy testujesz zachowanie czasowe (debounce, throttle):
```typescript
await waitForEvent('INPUT_CHANGE');     // Najpierw: czekaj na warunek
await new Promise(r => setTimeout(r, 300)); // Potem: czekaj na debounce
// 300ms = debounce interval, udokumentowany i uzasadniony
```

## Bledy

- Polling co 1ms — marnuje CPU. Uzyj 10ms.
- Brak timeout — petla w nieskonczonosc. Zawsze dodaj timeout z jasnym bledem.
- Cache'owanie stanu przed petla — wywoluj getter WEWNATRZ petli.

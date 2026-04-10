# Root Cause Tracing — sledz buga wstecz

Bugi czesto manifestuja sie gleboko w call stacku. Instynkt mowi "napraw tam gdzie wybucha" — ale to naprawa symptomu.

**Zasada:** Sledz wstecz przez lancuch wywolan az znajdziesz oryginalne zrodlo. Napraw u zrodla.

## Kiedy uzywac

- Blad pojawia sie gleboko w wykonaniu (nie na entry point)
- Stack trace pokazuje dlugi lancuch wywolan
- Niejasne skad pochodzi nieprawidlowa wartosc

## Proces

### 1. Obserwuj symptom
```
Error: Cannot read property 'id' of undefined
  at UserProfile.tsx:47
```

### 2. Znajdz bezposrednia przyczyne
```typescript
// UserProfile.tsx:47
const userId = user.id; // user jest undefined
```

### 3. Pytaj: co to wywolalo?
```
UserProfile({ user })
  ← wywolane przez Dashboard.tsx:23
  ← user pochodzi z useQuery({ queryKey: ['user'] })
  ← query zwraca undefined bo endpoint zwrocil 404
```

### 4. Sledz dalej w gore
```
Endpoint /api/user/:id zwrocil 404
  ← bo id = "undefined" (string!)
  ← bo router params nie zostaly sparsowane
  ← bo route nie ma walidacji Zod na params
```

### 5. Napraw u zrodla
Root cause: brak walidacji params w route — nie brak null checka w komponencie.

Fix: dodaj walidacje Zod na route params.
NIE: dodaj `if (!user) return null` w UserProfile (to ukrywa bug).

## Dodawanie instrumentacji

Gdy nie mozesz sledzic recznie — dodaj logi diagnostyczne:

```typescript
// Przed problematyczna operacja
console.error('DEBUG:', {
  functionName: 'processPayment',
  input: { userId, amount },
  state: { isAuthenticated, sessionId },
  stack: new Error().stack,
});
```

- Uzyj `console.error()` w testach (logger moze byc wyciszony)
- Loguj PRZED operacja, nie po upadku
- Dolacz kontekst: parametry, stan, zmienne srodowiskowe

## Kluczowa zasada

```
Znalazles bezposrednia przyczyne
  → Mozesz sledzic poziom wyzej? → TAK → Sledz dalej
  → To jest zrodlo? → TAK → Napraw tutaj + dodaj walidacje na kazdej warstwie
  → NIGDY nie naprawiaj tylko tam gdzie wybucha
```

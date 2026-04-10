# Defense-in-Depth — walidacja na wielu warstwach

Po naprawie buga — dodaj walidacje na KAZDEJ warstwie przez ktora dane przechodza. Jedna walidacja moze byc pominieta przez inny code path, refaktoring lub mock.

**Zasada:** Jedna walidacja = "naprawilismy buga". Wiele warstw = "bug jest strukturalnie niemozliwy".

## 4 warstwy

### Warstwa 1: Entry point (granica API)
Odrzuc oczywiscie nieprawidlowy input na wejsciu.

```typescript
export async function updateUser(userId: string, data: UpdateUserInput) {
  if (!userId?.trim()) {
    throw new AppError('userId nie moze byc pusty', 'INVALID_INPUT');
  }
  // ...
}
```

### Warstwa 2: Logika biznesowa
Upewnij sie ze dane maja sens dla tej operacji.

```typescript
async function processPayment(order: Order) {
  if (order.amount <= 0) {
    throw new AppError('Kwota musi byc dodatnia', 'INVALID_AMOUNT');
  }
  if (order.status !== 'confirmed') {
    throw new AppError('Zamowienie musi byc potwierdzone', 'INVALID_STATUS');
  }
  // ...
}
```

### Warstwa 3: Guardy srodowiskowe
Zapobiegaj niebezpiecznym operacjom w okreslonych kontekstach.

```typescript
async function deleteUserData(userId: string) {
  if (process.env.NODE_ENV === 'test' && !userId.startsWith('test-')) {
    throw new Error('W testach mozna usuwac tylko dane testowe');
  }
  // ...
}
```

### Warstwa 4: Instrumentacja diagnostyczna
Loguj kontekst do forensics — pomoze gdy inne warstwy zawioda.

```typescript
async function criticalOperation(input: CriticalInput) {
  logger.debug('criticalOperation', {
    input,
    caller: new Error().stack,
    timestamp: Date.now(),
  });
  // ...
}
```

## Kiedy stosowac

Nie kazdego buga trzeba obudowywac 4 warstwami. Stosuj gdy:
- Bug mogl spowodowac utrate danych lub problem bezpieczenstwa
- Ten sam typ bledu pojawil sie wiecej niz raz
- Dane przechodza przez wiele komponentow (API → serwis → DB)
- Fix jest w jednym miejscu, ale dane moga przyjsc wielu sciezkami

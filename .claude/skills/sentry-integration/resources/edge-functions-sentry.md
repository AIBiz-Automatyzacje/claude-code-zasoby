# Edge Functions Sentry Patterns

Szczegółowe wzorce integracji Sentry z Supabase Edge Functions (Deno runtime).

> **⚠️ KNOWN LIMITATIONS (Stan: Grudzień 2025)**
>
> Sentry Deno SDK ma ograniczenia w kontekście Supabase Edge Functions:
> 1. **Brak wsparcia dla `Deno.serve` instrumentation** - brak automatycznej separacji scope między requestami
> 2. **Wymagana wersja Deno 2.0+** - Supabase Edge Functions używają Deno 1.45.2
> 3. **Rozwiązanie:** Używaj `Sentry.withScope()` lub przekazuj kontekst bezpośrednio do `captureException`
>
> Śledź postępy: [GitHub Discussion #33629](https://github.com/orgs/supabase/discussions/33629)

## Table of Contents

- [Instalacja i Import](#instalacja-i-import)
- [Shared Helper](#shared-helper)
- [Integracja w Edge Function](#integracja-w-edge-function)
- [Stripe Webhook Patterns](#stripe-webhook-patterns)
- [Context dla Operacji](#context-dla-operacji)
- [Zmienne Środowiskowe](#zmienne-środowiskowe)
- [Troubleshooting](#troubleshooting)

---

## Instalacja i Import

Supabase Edge Functions używają Deno. Oficjalnie zalecany import:

```typescript
// Oficjalny Sentry SDK dla Deno (zalecane przez Supabase docs)
import * as Sentry from 'https://deno.land/x/sentry/index.mjs';
```

**Uwagi:**
- Używaj URL bez wersji (`/sentry/index.mjs`) - automatycznie pobiera najnowszą
- Alternatywnie: `import * as Sentry from "npm:@sentry/deno"` (wymaga Deno 2.0+)
- Sprawdź kompatybilność na https://deno.land/x/sentry

---

## Shared Helper

**Plik: `supabase/functions/_shared/sentry.ts`**

```typescript
import * as Sentry from 'https://deno.land/x/sentry/index.mjs';

let initialized = false;

/**
 * Inicjalizuje Sentry dla Edge Function
 * @param functionName - Nazwa funkcji (np. 'stripe-webhook')
 *
 * WAŻNE: Ze względu na brak wsparcia Deno.serve w Sentry SDK,
 * używamy defaultIntegrations: false i ręcznie zarządzamy scope
 */
export function initSentry(functionName: string): typeof Sentry {
  if (!initialized) {
    const dsn = Deno.env.get('SENTRY_DSN');
    const environment = Deno.env.get('ENVIRONMENT') || 'production';

    if (dsn) {
      Sentry.init({
        dsn,
        environment,
        tracesSampleRate: 0.1, // 10% transakcji

        // KRYTYCZNE: Wyłącz domyślne integracje (nie działają z Deno.serve)
        defaultIntegrations: false,

        // Nie ma beforeSend w Deno SDK, maskowanie w captureError
      });

      // Tagi globalne (będą współdzielone między requestami!)
      Sentry.setTag('function', functionName);
      Sentry.setTag('runtime', 'deno');
      Sentry.setTag('platform', 'supabase');

      initialized = true;
    }
  }

  return Sentry;
}

/**
 * Przechwytuje błąd z kontekstem operacji
 * @param error - Błąd do przechwycenia
 * @param context - Kontekst operacji (bez wrażliwych danych!)
 */
export function captureError(
  error: unknown,
  context?: {
    operation?: string;
    event_type?: string;
    user_id?: string;
    // NIE: user_email (wrażliwe), NIE: token, NIE: hasło
    extra?: Record<string, unknown>;
  }
): void {
  Sentry.withScope((scope) => {
    // Ustawianie tagów
    if (context?.operation) {
      scope.setTag('operation', context.operation);
    }
    if (context?.event_type) {
      scope.setTag('stripe.event_type', context.event_type);
    }

    // User context (tylko ID, NIE email!)
    if (context?.user_id) {
      scope.setUser({ id: context.user_id });
    }

    // Dodatkowy kontekst
    if (context?.extra) {
      scope.setContext('operation_details', context.extra);
    }

    // Breadcrumb dla kontekstu
    scope.addBreadcrumb({
      category: 'edge-function',
      message: `Error in ${context?.operation || 'unknown operation'}`,
      level: 'error',
      data: {
        event_type: context?.event_type,
        user_id: context?.user_id,
      },
    });

    Sentry.captureException(error);
  });

  // Zawsze też loguj do konsoli (Supabase logs)
  console.error('[Sentry captured]', error);
}

/**
 * Wysyła informacyjną wiadomość do Sentry
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  Sentry.captureMessage(message, level);
}
```

---

## Integracja w Edge Function

**Plik: `supabase/functions/stripe-webhook/index.ts`**

```typescript
// UWAGA: Używamy Deno.serve (natywne API) zamiast serve z deno.land/std
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { initSentry, captureError } from '../_shared/sentry.ts';

// Inicjalizacja Sentry (raz przy cold start)
const Sentry = initSentry('stripe-webhook');

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia', // Aktualna wersja API Stripe (grudzień 2024)
  httpClient: Stripe.createFetchHttpClient(),
});

// Natywne Deno.serve - zalecane przez Supabase
Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );

    console.log('Webhook event received:', event.type);

    // WAŻNE: Używaj withScope dla izolacji kontekstu między requestami
    Sentry.withScope((scope) => {
      scope.setTag('stripe.event_type', event.type);
      scope.addBreadcrumb({
        category: 'stripe',
        message: `Processing ${event.type}`,
        level: 'info',
      });
    });

    // ... obsługa eventów ...

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    // KRYTYCZNE: Przechwycenie błędu do Sentry z izolowanym scope
    captureError(error, {
      operation: 'stripe_webhook',
      event_type: 'unknown', // Nie mamy event.type bo parsowanie się nie powiodło
      extra: {
        has_signature: !!signature,
      },
    });

    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
```

**Kluczowe zmiany vs stary pattern:**
- `Deno.serve()` zamiast `serve()` z `deno.land/std`
- Wersje bibliotek bez pinowania (np. `stripe@17` zamiast `stripe@14.5.0`)
- `Sentry.withScope()` dla izolacji kontekstu między requestami

---

## Stripe Webhook Patterns

**Przechwytywanie błędów per event type z izolowanym scope:**

```typescript
switch (event.type) {
  case 'checkout.session.completed': {
    const session = event.data.object as Stripe.Checkout.Session;
    const userEmail = session.metadata?.user_email;
    const userId = session.metadata?.user_id;

    try {
      // Aktualizacja użytkownika
      const { error: updateError } = await supabase
        .from('users')
        .update({ paid: true })
        .eq('email', userEmail);

      if (updateError) {
        // WAŻNE: withScope dla izolacji kontekstu
        Sentry.withScope((scope) => {
          scope.setTag('operation', 'update_user_paid_status');
          scope.setTag('stripe.event_type', event.type);
          scope.setUser({ id: userId });
          scope.setContext('checkout', {
            session_id: session.id,
            // NIE: user_email (GDPR)
          });
          Sentry.captureException(updateError);
        });
        throw updateError;
      }

      console.log(`Payment succeeded for user ${userId}`);
    } catch (error) {
      captureError(error, {
        operation: 'checkout_session_completed',
        event_type: event.type,
        user_id: userId,
      });
      // Nie rzucaj dalej - Stripe dostanie 200
    }
    break;
  }

  case 'payment_intent.payment_failed': {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const userId = paymentIntent.metadata?.user_id;

    // Loguj failed payment (nie jako exception, bo to expected behavior)
    // Używaj withScope dla izolacji
    Sentry.withScope((scope) => {
      scope.setUser({ id: userId });
      scope.setTag('stripe.event_type', event.type);
      Sentry.captureMessage(`Payment failed for user ${userId}`, 'warning');
    });

    // ... obsługa ...
    break;
  }
}
```

---

## Context dla Operacji

**Wzorzec dla operacji z bogatym kontekstem:**

```typescript
async function processCheckout(session: Stripe.Checkout.Session) {
  const operationContext = {
    operation: 'process_checkout',
    event_type: 'checkout.session.completed',
    user_id: session.metadata?.user_id,
    extra: {
      session_id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
    },
  };

  try {
    // Breadcrumb: start
    Sentry.addBreadcrumb({
      category: 'checkout',
      message: 'Starting checkout processing',
      level: 'info',
      data: { session_id: session.id },
    });

    // ... logika ...

    // Breadcrumb: success
    Sentry.addBreadcrumb({
      category: 'checkout',
      message: 'Checkout processing completed',
      level: 'info',
    });
  } catch (error) {
    captureError(error, operationContext);
    throw error; // Re-throw jeśli chcesz przerwać
  }
}
```

---

## Zmienne Środowiskowe

**Ustawienie secrets w Supabase:**

```bash
# DSN z Sentry
supabase secrets set SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Environment (production/staging/development)
supabase secrets set ENVIRONMENT=production
```

**Weryfikacja:**

```bash
supabase secrets list
```

---

## Troubleshooting

### Sentry nie wysyła błędów

1. **Sprawdź DSN:**
   ```typescript
   console.log('SENTRY_DSN:', Deno.env.get('SENTRY_DSN'));
   ```

2. **Sprawdź inicjalizację:**
   ```typescript
   const Sentry = initSentry('test-function');
   Sentry.captureMessage('Test message from Edge Function');
   ```

3. **Sprawdź Supabase logs:**
   - Dashboard → Edge Functions → Logs
   - Powinien być `[Sentry captured]` z console.error

### Brak kontekstu w Sentry / Kontekst z innego requestu

**Problem:** Błędy mają kontekst z poprzedniego requestu (brak izolacji scope).

**Przyczyna:** Sentry Deno SDK nie wspiera `Deno.serve` instrumentation.

**Rozwiązanie:** ZAWSZE używaj `Sentry.withScope()`:

```typescript
// ŹLE - kontekst współdzielony między requestami
Sentry.setTag('user_id', userId);
Sentry.captureException(error);

// DOBRZE - izolowany kontekst per request
Sentry.withScope((scope) => {
  scope.setTag('user_id', userId);
  scope.setContext('request', { path: req.url });
  Sentry.captureException(error);
});

// LUB użyj helpera captureError() który robi to automatycznie
captureError(error, {
  operation: 'checkout',
  event_type: event.type,
  user_id: userId,
});
```

### Deno SDK compatibility

**Problem:** Import Sentry nie działa lub błędy runtime.

**Rozwiązanie:**
1. Używaj URL bez wersji: `https://deno.land/x/sentry/index.mjs`
2. Ustaw `defaultIntegrations: false` w `Sentry.init()`
3. Alternatywnie: custom fetch do Sentry API (fallback)

```typescript
// Fallback: Custom fetch do Sentry (jeśli SDK nie działa)
async function sendToSentry(error: Error, context: Record<string, unknown>) {
  const dsn = Deno.env.get('SENTRY_DSN');
  if (!dsn) return;

  // Parse DSN
  const [protocol, rest] = dsn.split('://');
  const [auth, hostAndProject] = rest.split('@');
  const [host, projectId] = hostAndProject.split('/');

  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    exception: {
      values: [
        {
          type: error.name,
          value: error.message,
          stacktrace: { frames: [] },
        },
      ],
    },
    contexts: context,
    tags: { runtime: 'deno', platform: 'supabase' },
  };

  await fetch(`${protocol}://${host}/api/${projectId}/store/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${auth}`,
    },
    body: JSON.stringify(event),
  });
}
```

### Wersje bibliotek (Best Practices)

**Stripe:**
- Używaj major version bez patch: `stripe@17` zamiast `stripe@14.5.0`
- Sprawdź `apiVersion` - aktualna: `2024-12-18.acacia`

**Supabase JS:**
- Używaj: `@supabase/supabase-js@2` (automatycznie najnowsza z major 2)

**Sentry:**
- Używaj: `/sentry/index.mjs` bez wersji (najnowsza stabilna)

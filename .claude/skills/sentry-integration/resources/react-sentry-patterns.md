# React Sentry Patterns

Szczegółowe wzorce integracji Sentry z React 18 + Vite + TypeScript.

> **✅ SDK v8 Ready (Stan: Grudzień 2025)**
>
> Te wzorce są zgodne z Sentry SDK v8+, który używa:
> - Funkcyjnych integracji (`browserTracingIntegration()` zamiast `new BrowserTracing()`)
> - Nowego API `startSpan()` zamiast `startTransaction()`
> - Uproszczonej konfiguracji Session Replay

## Table of Contents

- [Instalacja](#instalacja)
- [Konfiguracja Sentry](#konfiguracja-sentry)
- [Error Boundary](#error-boundary)
- [Logger Integration](#logger-integration)
- [User Context](#user-context)
- [Performance Monitoring](#performance-monitoring)
- [Session Replay](#session-replay)
- [Ignorowane Błędy](#ignorowane-błędy)

---

## Instalacja

```bash
npm install @sentry/react
```

**Wymagana wersja:** `@sentry/react >= 8.0.0` (SDK v8)

---

## Konfiguracja Sentry

**Plik: `src/lib/sentry.ts`**

```typescript
import * as Sentry from '@sentry/react';

/**
 * Inicjalizuje Sentry tylko w produkcji
 * Wywołaj w main.tsx PRZED renderowaniem aplikacji
 */
export function initSentry() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,

      // Performance monitoring - 10% transakcji
      tracesSampleRate: 0.1,

      // Session replay
      replaysSessionSampleRate: 0.1, // 10% normalnych sesji
      replaysOnErrorSampleRate: 1.0, // 100% sesji z błędami

      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],

      // GDPR: Maskowanie danych osobowych
      beforeSend(event) {
        // Maskowanie emaili
        if (event.user?.email) {
          event.user.email = event.user.email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
        }

        // Usuwanie wrażliwych headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }

        return event;
      },

      // Błędy do ignorowania
      ignoreErrors: [
        // Browser errors
        'ResizeObserver loop',
        'Non-Error exception captured',
        'Non-Error promise rejection captured',

        // Network errors
        'Network request failed',
        'Failed to fetch',
        'NetworkError',
        'AbortError',

        // Chunk loading errors
        /^Loading chunk \d+ failed/,
        /^Loading CSS chunk \d+ failed/,

        // User cancellation
        'AbortError: The user aborted a request',
      ],

      // Filtrowanie breadcrumbs
      beforeBreadcrumb(breadcrumb) {
        // Ignoruj console.log breadcrumbs w produkcji
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null;
        }
        return breadcrumb;
      },
    });

    // Ustawienie tagów globalnych
    Sentry.setTags({
      app: 'piszemy-wirale',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    });
  }
}

/**
 * Ustawia kontekst użytkownika w Sentry
 * Wywołaj przy login/logout
 */
export function setSentryUser(user: { id: string; email: string } | null) {
  if (import.meta.env.PROD) {
    if (user) {
      Sentry.setUser({
        id: user.id,
        // GDPR: Maskowanie emaila
        email: user.email.replace(/^(.{2}).*(@.*)$/, '$1***$2'),
      });
    } else {
      Sentry.setUser(null);
    }
  }
}

/**
 * Ręczne wysłanie błędu z kontekstem
 */
export function captureError(
  error: unknown,
  context?: {
    operation?: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
) {
  if (import.meta.env.PROD) {
    Sentry.withScope((scope) => {
      if (context?.operation) {
        scope.setTag('operation', context.operation);
      }
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      if (context?.extra) {
        scope.setContext('extra', context.extra);
      }
      Sentry.captureException(error);
    });
  } else {
    console.error('[Sentry would capture]:', error, context);
  }
}
```

---

## Error Boundary

**Plik: `src/main.tsx`**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { initSentry } from '@/lib/sentry';
import App from './App';
import './index.css';

// Inicjalizuj Sentry PRZED renderowaniem
initSentry();

// Komponent fallback dla błędów
function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Coś poszło nie tak
        </h1>
        <p className="text-gray-600 mb-6">
          Przepraszamy za niedogodności. Spróbuj odświeżyć stronę.
        </p>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Spróbuj ponownie
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error} resetError={resetError} />
      )}
      onError={(error, componentStack) => {
        // Dodatkowy kontekst dla React errors
        Sentry.withScope((scope) => {
          scope.setTag('error.type', 'react_error_boundary');
          scope.setContext('componentStack', { stack: componentStack });
        });
      }}
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
```

---

## Logger Integration

**Plik: `src/lib/logger.ts`**

```typescript
import * as Sentry from '@sentry/react';

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Loguje błędy
   * W dev: console.error
   * W prod: wysyła do Sentry
   */
  error(message: string, error?: unknown) {
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, error);
    } else {
      Sentry.captureException(error, {
        tags: { source: 'logger' },
        extra: { message },
      });
    }
  },

  /**
   * Loguje ostrzeżenia
   * W dev: console.warn
   * W prod: wysyła jako warning do Sentry
   */
  warn(message: string, data?: unknown) {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, data);
    } else {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: { data },
      });
    }
  },

  /**
   * Loguje informacje
   * W dev: console.log
   * W prod: cisza (lub opcjonalnie Sentry breadcrumb)
   */
  info(message: string, data?: unknown) {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, data);
    } else {
      // Opcjonalnie: breadcrumb dla kontekstu
      Sentry.addBreadcrumb({
        category: 'info',
        message,
        level: 'info',
        data: data as Record<string, unknown>,
      });
    }
  },

  /**
   * Loguje debug (tylko w dev)
   */
  debug(message: string, data?: unknown) {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  },
};
```

---

## User Context

**Integracja z `useAuth.ts`:**

```typescript
import { setSentryUser } from '@/lib/sentry';

// W useEffect przy zmianie user
useEffect(() => {
  if (user) {
    setSentryUser({
      id: user.id,
      email: user.email || '',
    });
  } else {
    setSentryUser(null);
  }
}, [user]);
```

---

## Performance Monitoring

**Automatyczne śledzenie:**
- Page loads
- Navigation
- API calls (fetch)
- Web Vitals (LCP, FID, CLS)

**Manualne span dla wolnych operacji:**

```typescript
import * as Sentry from '@sentry/react';

async function heavyOperation() {
  return await Sentry.startSpan(
    {
      name: 'heavy-operation',
      op: 'function',
    },
    async () => {
      // Twoja wolna operacja
      const result = await processLargeData();
      return result;
    }
  );
}
```

---

## Session Replay

Session Replay nagrywa sesje użytkowników dla łatwiejszej diagnostyki.

**Konfiguracja:**
- 10% normalnych sesji (`replaysSessionSampleRate: 0.1`)
- 100% sesji z błędami (`replaysOnErrorSampleRate: 1.0`)

**Opcje prywatności:**
```typescript
Sentry.replayIntegration({
  maskAllText: true,      // Maskuj cały tekst
  blockAllMedia: true,    // Blokuj media
  maskAllInputs: true,    // Maskuj inputy
})
```

---

## Ignorowane Błędy

Błędy, które NIE powinny trafiać do Sentry:

```typescript
ignoreErrors: [
  // Browser quirks
  'ResizeObserver loop',
  'Non-Error exception captured',

  // Network issues (user side)
  'Network request failed',
  'Failed to fetch',
  'AbortError',

  // Chunk loading (refresh rozwiązuje)
  /^Loading chunk \d+ failed/,

  // User cancellation
  'AbortError: The user aborted a request',
]
```

---

## Zmienne Środowiskowe

**`.env.local`:**
```env
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_APP_VERSION=1.0.0
```

**TypeScript types (`src/vite-env.d.ts`):**
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

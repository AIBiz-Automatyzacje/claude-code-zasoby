# Tech Stack Checklist

Checklisty do code review dla każdej technologii w projekcie.

---

## Next.js 16 / App Router

### Async Request APIs (Breaking Change w 15+)
- [ ] `params` jest await'owane: `const { slug } = await params`
- [ ] `searchParams` jest await'owane: `const { q } = await searchParams`
- [ ] Dotyczy: `page.tsx`, `layout.tsx`, `route.ts`, `generateMetadata`, `generateStaticParams`
- [ ] Brak synchronicznego dostępu: ~~`params.slug`~~ → `(await params).slug`

### Server vs Client Components
- [ ] `"use client"` tylko na liściach drzewa (minimalizacja JS bundle)
- [ ] Server Components dla statycznych części UI
- [ ] Brak importu client-only hooks w Server Components
- [ ] Brak bezpośredniego użycia `window`, `document` w Server Components

### Routing i struktura
- [ ] `loading.tsx` dla Streaming UI
- [ ] `error.tsx` dla error boundaries
- [ ] `not-found.tsx` gdzie potrzeba
- [ ] Metadata (SEO) zdefiniowana statycznie lub dynamicznie

### Data Fetching
- [ ] Cache strategy zdefiniowana jawnie (Next.js 15+ domyślnie `no-store`)
- [ ] `revalidate` ustawione dla ISR gdzie sensowne
- [ ] Parallel fetching gdzie możliwe (`Promise.all`)
- [ ] `headers()`/`cookies()` tylko w dynamicznych komponentach (psują cache statycznych)

### Server Actions
- [ ] W oddzielnych plikach z `"use server"` (bezpieczeństwo)
- [ ] Walidacja inputów (Zod)
- [ ] Sprawdzenie uprawnień użytkownika
- [ ] Brak wycieków danych do klienta
- [ ] Przekazywane do Client Components jako props lub importowane z pliku `"use server"`

### API Routes
- [ ] Używane tylko gdy Server Actions nie wystarczają
- [ ] Proper error responses (status codes)
- [ ] Rate limiting dla publicznych endpointów
- [ ] `params` i `searchParams` await'owane w `route.ts`

### Hydration
- [ ] Brak Hydration Mismatch (daty, random, window)
- [ ] `suppressHydrationWarning` tylko gdy uzasadnione
- [ ] Dynamiczne importy z `ssr: false` dla client-only bibliotek

---

## React 19

### Nowe API
- [ ] `use()` zamiast `useEffect` + `useState` dla async data
- [ ] `useFormStatus()` dla form loading states
- [ ] `useOptimistic()` dla optimistic updates
- [ ] `useActionState()` dla Server Actions w formularzach

### Usunięte/zmienione wzorce
- [ ] Brak `forwardRef` — ref to zwykły prop w React 19
- [ ] `<Context>` zamiast `<Context.Provider>`
- [ ] Brak `useContext` gdzie można użyć `use(Context)`

### React Compiler (jeśli włączony)
- [ ] Brak ręcznych `useMemo` (compiler optymalizuje automatycznie)
- [ ] Brak ręcznych `useCallback` (compiler optymalizuje automatycznie)
- [ ] Brak `React.memo` wrapperów (compiler decyduje o memoizacji)

### Rendering
- [ ] Suspense boundaries dla async components
- [ ] Brak niepotrzebnych renderów
- [ ] Stan na odpowiednim poziomie (lifting vs colocation)
- [ ] Keys w listach są stabilne i unikalne

### Forms
- [ ] Native form actions gdzie możliwe
- [ ] `formAction` prop na `<button>`
- [ ] Progressive enhancement (działa bez JS)
- [ ] Server Actions przekazywane do Client Components jako props (lub importowane z pliku `"use server"`)

---

## Drizzle ORM / SQLite / LibSQL

### Schema
- [ ] Typy kolumn odpowiadają danym
- [ ] Relacje prawidłowo zdefiniowane
- [ ] Indeksy dla często wyszukiwanych kolumn
- [ ] Migracje zsynchronizowane ze schematem

### Queries
- [ ] **`await` przy każdym zapytaniu** (częsty błąd — zwraca Promise zamiast danych)
- [ ] Brak N+1 (użyj `with` dla relacji)
- [ ] `select()` tylko potrzebne kolumny
- [ ] `where()` używa indeksowanych kolumn
- [ ] Prepared statements dla powtarzalnych zapytań

### Batching (LibSQL/Turso over HTTP)
- [ ] `db.batch()` dla wielu operacji zapisu (redukcja round-trips)
- [ ] Grupowanie insertów/update'ów w jednym batch
- [ ] Unikanie sekwencyjnych pojedynczych zapytań w pętli

### Transactions
- [ ] `db.transaction()` dla operacji atomowych
- [ ] Rollback przy błędach
- [ ] Brak długich transakcji (blokowanie)
- [ ] Batch preferowany nad transakcją dla prostych wielokrotnych insertów

### Typy
- [ ] Typy Drizzle używane w całej aplikacji
- [ ] `InferSelectModel` / `InferInsertModel` dla typów
- [ ] Brak `any` przy operacjach DB

---

## SWR / Data Fetching

### Kiedy używać SWR vs Server Components
- [ ] SWR dla danych dynamicznych/klienckich (polling, real-time, user-specific)
- [ ] Server Components + `use()` dla danych przy nawigacji (SSR/SSG)
- [ ] Brak dublowania — nie fetchuj tego samego w Server Component i SWR

### Konfiguracja
- [ ] Klucze SWR unikalne i opisowe
- [ ] `fetcher` zdefiniowany globalnie lub per-hook
- [ ] Error retry skonfigurowane sensownie

### Mutacje
- [ ] `mutate()` po zmianach danych
- [ ] Optimistic updates gdzie UX tego wymaga
- [ ] Revalidation after mutation

### States
- [ ] Loading state obsłużony (`isLoading`)
- [ ] Error state obsłużony (`error`)
- [ ] Empty state obsłużony
- [ ] Stale data pokazywane podczas revalidation

### Performance
- [ ] Deduplikacja działa (ten sam klucz)
- [ ] `revalidateOnFocus` wyłączone jeśli niepotrzebne
- [ ] `refreshInterval` tylko gdzie potrzeba real-time

---

## Tailwind CSS 4

### Konfiguracja (v4 breaking change)
- [ ] Konfiguracja przez blok `@theme` w CSS (nie `tailwind.config.js`)
- [ ] Zmienne CSS definiowane w `@theme { }` lub `:root { }`
- [ ] Import Tailwind przez `@import "tailwindcss"` w CSS
- [ ] Brak starego `tailwind.config.js` (lub świadoma migracja)

### Klasy
- [ ] Uporządkowane (prettier-plugin-tailwindcss)
- [ ] Brak przestarzałych utility classes
- [ ] Brak `@apply` — kompozycja w React zamiast tego
- [ ] Unikanie arbitrary values (`w-[123px]`) — preferuj tokeny z design systemu

### Theming
- [ ] Zmienne CSS w bloku `@theme`
- [ ] Dark mode obsłużony (`dark:`)
- [ ] Spójne spacing, colors, typography
- [ ] `field-sizing: content` dla auto-growing textarea (zamiast JS hacków)

### Responsive
- [ ] Mobile-first approach
- [ ] Breakpointy używane konsekwentnie
- [ ] Testowane na różnych rozmiarach

### Komponenty
- [ ] Radix UI stylowany spójnie
- [ ] Hover/focus/active states zdefiniowane
- [ ] Transitions dla interakcji

---

## Radix UI

### Użycie
- [ ] Odpowiedni komponent (Dialog vs AlertDialog, etc.)
- [ ] Prawidłowa kompozycja (Root, Trigger, Content)
- [ ] Portal używany dla overlays

### Accessibility
- [ ] `aria-label` gdzie brak widocznego tekstu
- [ ] `aria-describedby` dla opisów
- [ ] Focus trap w modalach
- [ ] Escape zamyka overlay

### Styling
- [ ] `data-state` używane do stylowania stanów
- [ ] Animacje przez CSS/Tailwind
- [ ] Spójne z resztą UI

### Icons (Lucide)
- [ ] Spójny rozmiar (np. `size={20}`)
- [ ] `aria-hidden` lub `aria-label`
- [ ] Stroke width konsekwentny

---

## TypeScript

### Typy
- [ ] Brak `any` (użyj `unknown` jeśli trzeba)
- [ ] Interfejsy/typy eksportowane gdzie potrzeba
- [ ] Props komponentów typowane
- [ ] Return types dla funkcji (explicit lub inferred)

### Strict mode
- [ ] `strictNullChecks` respektowane
- [ ] Brak `!` (non-null assertion) bez uzasadnienia
- [ ] Optional chaining (`?.`) zamiast `&&`

### Imports
- [ ] Type imports (`import type { X }`)
- [ ] Brak circular dependencies
- [ ] Path aliases używane konsekwentnie (`@/`)

---

## Bezpieczeństwo

### Input
- [ ] Walidacja Zod na Server Actions
- [ ] Sanityzacja danych użytkownika
- [ ] Prepared statements dla SQL

### Auth/Authz
- [ ] Sprawdzenie sesji w Server Actions
- [ ] Sprawdzenie uprawnień przed operacją
- [ ] Brak danych innych użytkowników

### Secrets
- [ ] Brak hardcoded secrets
- [ ] Env variables przez `process.env`
- [ ] `.env` w `.gitignore`

### Output
- [ ] Brak XSS (React domyślnie escapuje)
- [ ] `dangerouslySetInnerHTML` tylko sanityzowane
- [ ] Error messages nie zdradzają internals

---

## Wydajność

### Bundle
- [ ] Dynamic imports dla dużych komponentów
- [ ] `next/dynamic` z `loading` component
- [ ] Tree shaking działa (named imports)

### Images
- [ ] `next/image` zamiast `<img>`
- [ ] Width/height zdefiniowane
- [ ] Lazy loading (domyślne)

### Lists
- [ ] Wirtualizacja dla długich list (>100 items)
- [ ] Pagination/infinite scroll
- [ ] Stable keys

### DB
- [ ] Indeksy dla WHERE/ORDER BY
- [ ] Limit dla list queries
- [ ] Brak N+1
- [ ] `db.batch()` dla wielu operacji (LibSQL)

---

## Dostępność (a11y)

### Interactive elements
- [ ] Touch targets min 44x44px
- [ ] Focus visible (outline)
- [ ] Keyboard navigation działa

### Semantics
- [ ] Headings w hierarchii (h1 → h2 → h3)
- [ ] Landmarks (`main`, `nav`, `aside`)
- [ ] Labels dla form inputs

### ARIA
- [ ] `aria-label` dla icon buttons
- [ ] `aria-live` dla dynamicznych treści
- [ ] `role` gdzie semantyczny HTML nie wystarczy

### Visual
- [ ] Kontrast WCAG 2.2 AA (4.5:1 text, 3:1 UI)
- [ ] Nie tylko kolor przekazuje informację
- [ ] Animacje respektują `prefers-reduced-motion`
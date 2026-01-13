# Common Issues

Częste błędy w projekcie Next.js 16 + React 19 z przykładami.

---

## Next.js 16 / App Router

### 1. "use client" za wysoko w drzewie

**Problem:** Cały poddrzewo staje się Client Component, zwiększając bundle JS.
```typescript
// ❌ Źle — cała strona to Client Component
// app/dashboard/page.tsx
"use client";

import { Header } from "./Header";
import { Stats } from "./Stats";
import { UserList } from "./UserList";

export default function DashboardPage() {
  const [filter, setFilter] = useState("");
  return (
    <div>
      <Header />
      <Stats />
      <input onChange={(e) => setFilter(e.target.value)} />
      <UserList filter={filter} />
    </div>
  );
}
```
```typescript
// ✅ Dobrze — tylko interaktywna część to Client Component
// app/dashboard/page.tsx (Server Component)
import { Header } from "./Header";
import { Stats } from "./Stats";
import { FilteredUserList } from "./FilteredUserList";

export default function DashboardPage() {
  return (
    <div>
      <Header />
      <Stats />
      <FilteredUserList /> {/* tylko to jest "use client" */}
    </div>
  );
}

// app/dashboard/FilteredUserList.tsx
"use client";
export function FilteredUserList() {
  const [filter, setFilter] = useState("");
  return (
    <>
      <input onChange={(e) => setFilter(e.target.value)} />
      <UserList filter={filter} />
    </>
  );
}
```

### 2. Brak jawnej strategii cache

**Problem:** Next.js 15+ domyślnie używa `no-store`. Brak jawnej deklaracji powoduje nieoczekiwane zachowanie.
```typescript
// ❌ Źle — niejawne no-store
async function getProducts() {
  const res = await fetch("https://api.example.com/products");
  return res.json();
}

// ✅ Dobrze — jawna strategia
async function getProducts() {
  const res = await fetch("https://api.example.com/products", {
    cache: "force-cache", // lub 'no-store' jeśli świadomie
    next: { revalidate: 3600 }, // ISR co godzinę
  });
  return res.json();
}
```

### 3. Server Action w tym samym pliku co komponent

**Problem:** Ryzyko przypadkowego wycieku kodu serwerowego do klienta.
```typescript
// ❌ Źle — action w komponencie
// app/users/page.tsx
"use server";

async function createUser(formData: FormData) {
  const secret = process.env.DB_SECRET; // wyciek!
  await db.insert(users).values({ name: formData.get("name") });
}

export default function UsersPage() {
  return <form action={createUser}>...</form>;
}
```
```typescript
// ✅ Dobrze — action w osobnym pliku
// app/users/actions.ts
"use server";

import { db } from "@/db";
import { users } from "@/db/schema";

export async function createUser(formData: FormData) {
  await db.insert(users).values({ name: formData.get("name") });
}

// app/users/page.tsx
import { createUser } from "./actions";

export default function UsersPage() {
  return <form action={createUser}>...</form>;
}
```

### 4. Hydration Mismatch

**Problem:** Server i client renderują różny HTML.
```typescript
// ❌ Źle — data różni się między server a client
function Greeting() {
  return <p>Dzisiaj jest {new Date().toLocaleDateString()}</p>;
}

// ❌ Źle — random na renderze
function Avatar() {
  return <div style={{ backgroundColor: `hsl(${Math.random() * 360}, 50%, 50%)` }} />;
}

// ❌ Źle — window w renderze
function WindowSize() {
  return <p>Szerokość: {window.innerWidth}px</p>;
}
```
```typescript
// ✅ Dobrze — useEffect dla client-only wartości
function Greeting() {
  const [date, setDate] = useState<string>();
  
  useEffect(() => {
    setDate(new Date().toLocaleDateString());
  }, []);
  
  if (!date) return <p>Ładowanie...</p>;
  return <p>Dzisiaj jest {date}</p>;
}

// ✅ Dobrze — seed dla random lub generuj na serwerze
function Avatar({ visitorId }: { visitorId: string }) {
  // deterministyczny hash z ID
  const hue = hashStringToNumber(visitorId) % 360;
  return <div style={{ backgroundColor: `hsl(${hue}, 50%, 50%)` }} />;
}

// ✅ Dobrze — dynamic import z ssr: false
const WindowSize = dynamic(() => import("./WindowSize"), { ssr: false });
```

### 5. Brak loading.tsx / error.tsx

**Problem:** Brak Streaming UI i error boundaries.
```
// ❌ Źle — brak plików
app/
  dashboard/
    page.tsx

// ✅ Dobrze — pełna struktura
app/
  dashboard/
    page.tsx
    loading.tsx    ← Suspense fallback
    error.tsx      ← Error boundary
    not-found.tsx  ← 404 handling
```
```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return <div className="animate-pulse">Ładowanie...</div>;
}

// app/dashboard/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <p>Coś poszło nie tak</p>
      <button onClick={reset}>Spróbuj ponownie</button>
    </div>
  );
}
```

### 6. Synchroniczny dostęp do params/searchParams

**Problem:** W Next.js 15+ propsy `params` i `searchParams` są asynchroniczne (Promise). Synchroniczny dostęp rzuca błąd w runtime.
```typescript
// ❌ Źle — dostęp bezpośredni (crashuje w Next.js 15+)
export default function Page({ params }: { params: { slug: string } }) {
  return <h1>Post: {params.slug}</h1>;
}

// ❌ Źle — destrukturyzacja bez await
export default function Page({ params: { slug } }: Props) {
  return <h1>Post: {slug}</h1>;
}
```
```typescript
// ✅ Dobrze — await params
export default async function Page({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  return <h1>Post: {slug}</h1>;
}

// ✅ Dobrze — searchParams też wymaga await
export default async function SearchPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ q?: string }> 
}) {
  const { q } = await searchParams;
  return <Results query={q} />;
}
```
```typescript
// ✅ Dobrze — w generateMetadata też
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  return { title: `Post: ${slug}` };
}
```

---

## React 19

### 1. Używanie forwardRef (przestarzałe)

**Problem:** W React 19 `ref` to zwykły prop.
```typescript
// ❌ Źle — niepotrzebne forwardRef
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} {...props} />;
});

// ✅ Dobrze — ref jako prop
function Input({ ref, ...props }: InputProps & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

### 2. Używanie Context.Provider (przestarzałe)

**Problem:** W React 19 można używać `<Context>` bezpośrednio.
```typescript
// ❌ Źle — stary sposób
<ThemeContext.Provider value={theme}>
  <App />
</ThemeContext.Provider>

// ✅ Dobrze — nowy sposób
<ThemeContext value={theme}>
  <App />
</ThemeContext>
```

### 3. useEffect do fetchowania danych

**Problem:** W React 19 lepiej użyć `use()` lub Server Components.
```typescript
// ❌ Źle — useEffect + useState
function UserProfile({ userId }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Spinner />;
  if (error) return <Error error={error} />;
  return <div>{user?.name}</div>;
}
```
```typescript
// ✅ Dobrze — Server Component (preferowane)
async function UserProfile({ userId }: Props) {
  const user = await fetchUser(userId);
  return <div>{user.name}</div>;
}

// ✅ Dobrze — Client Component z use()
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <div>{user.name}</div>;
}

// Użycie z Suspense
<Suspense fallback={<Spinner />}>
  <UserProfile userPromise={fetchUser(userId)} />
</Suspense>
```

### 4. Brak useOptimistic dla lepszego UX

**Problem:** UI czeka na odpowiedź serwera.
```typescript
// ❌ Źle — czekanie na mutację
function LikeButton({ postId, likes }: Props) {
  const [isPending, startTransition] = useTransition();
  
  async function handleLike() {
    startTransition(async () => {
      await likePost(postId);
    });
  }
  
  return (
    <button onClick={handleLike} disabled={isPending}>
      ❤️ {likes} {isPending && "(...)"}
    </button>
  );
}
```
```typescript
// ✅ Dobrze — optimistic update
function LikeButton({ postId, likes }: Props) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    likes,
    (current) => current + 1
  );
  
  async function handleLike() {
    addOptimisticLike(null); // natychmiast +1
    await likePost(postId);  // w tle
  }
  
  return (
    <button onClick={handleLike}>
      ❤️ {optimisticLikes}
    </button>
  );
}
```

### 5. Brak useFormStatus w formularzach

**Problem:** Manualne zarządzanie stanem loading.
```typescript
// ❌ Źle — manualne śledzenie
function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <button disabled={isSubmitting}>
      {isSubmitting ? "Wysyłanie..." : "Wyślij"}
    </button>
  );
}

// ✅ Dobrze — useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending}>
      {pending ? "Wysyłanie..." : "Wyślij"}
    </button>
  );
}
```

---

## Drizzle ORM

### 1. N+1 Query

**Problem:** Zapytanie w pętli zamiast JOIN.
```typescript
// ❌ Źle — N+1
async function getPostsWithAuthors() {
  const posts = await db.select().from(postsTable);
  
  // N zapytań dla N postów!
  for (const post of posts) {
    post.author = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, post.authorId))
      .get();
  }
  
  return posts;
}
```
```typescript
// ✅ Dobrze — relacje w jednym zapytaniu
async function getPostsWithAuthors() {
  return db.query.posts.findMany({
    with: {
      author: true,
    },
  });
}

// lub explicit JOIN
async function getPostsWithAuthors() {
  return db
    .select({
      post: postsTable,
      author: usersTable,
    })
    .from(postsTable)
    .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id));
}
```

### 2. Brak transakcji dla operacji atomowych

**Problem:** Niespójność danych przy błędzie.
```typescript
// ❌ Źle — brak transakcji
async function transferMoney(fromId: string, toId: string, amount: number) {
  await db
    .update(accountsTable)
    .set({ balance: sql`balance - ${amount}` })
    .where(eq(accountsTable.id, fromId));
  
  // Jeśli tu wystąpi błąd, pieniądze znikną!
  await db
    .update(accountsTable)
    .set({ balance: sql`balance + ${amount}` })
    .where(eq(accountsTable.id, toId));
}
```
```typescript
// ✅ Dobrze — transakcja
async function transferMoney(fromId: string, toId: string, amount: number) {
  await db.transaction(async (tx) => {
    await tx
      .update(accountsTable)
      .set({ balance: sql`balance - ${amount}` })
      .where(eq(accountsTable.id, fromId));
    
    await tx
      .update(accountsTable)
      .set({ balance: sql`balance + ${amount}` })
      .where(eq(accountsTable.id, toId));
  });
}
```

### 3. Select * zamiast konkretnych kolumn

**Problem:** Pobieranie niepotrzebnych danych.
```typescript
// ❌ Źle — wszystkie kolumny
const users = await db.select().from(usersTable);

// ✅ Dobrze — tylko potrzebne
const users = await db
  .select({
    id: usersTable.id,
    name: usersTable.name,
  })
  .from(usersTable);
```

### 4. Brak prepared statements

**Problem:** Gorsze performance przy powtarzalnych zapytaniach.
```typescript
// ❌ Źle — za każdym razem nowe zapytanie
async function getUser(id: string) {
  return db.select().from(usersTable).where(eq(usersTable.id, id)).get();
}
```
```typescript
// ✅ Dobrze — prepared statement
const getUserStmt = db
  .select()
  .from(usersTable)
  .where(eq(usersTable.id, sql.placeholder("id")))
  .prepare();

async function getUser(id: string) {
  return getUserStmt.get({ id });
}
```

### 5. Brak batchowania zapytań (LibSQL/Turso)

**Problem:** Przy SQLite przez HTTP (LibSQL/Turso), każde zapytanie to osobny request sieciowy. Sekwencyjne inserty to "performance killer".
```typescript
// ❌ Źle — 3 requesty HTTP
async function createUsers(users: NewUser[]) {
  await db.insert(usersTable).values(users[0]);
  await db.insert(usersTable).values(users[1]);
  await db.insert(usersTable).values(users[2]);
}

// ❌ Źle — N requestów w pętli
async function createUsers(users: NewUser[]) {
  for (const user of users) {
    await db.insert(usersTable).values(user);
  }
}
```
```typescript
// ✅ Dobrze — 1 request (batch)
async function createUsers(users: NewUser[]) {
  await db.batch([
    db.insert(usersTable).values(users[0]),
    db.insert(usersTable).values(users[1]),
    db.insert(usersTable).values(users[2]),
  ]);
}

// ✅ Dobrze — dynamiczny batch
async function createUsers(users: NewUser[]) {
  const queries = users.map(user => 
    db.insert(usersTable).values(user)
  );
  await db.batch(queries);
}

// ✅ Dobrze — batch z różnymi operacjami
async function setupUser(user: NewUser, settings: NewSettings) {
  await db.batch([
    db.insert(usersTable).values(user),
    db.insert(settingsTable).values(settings),
    db.update(statsTable)
      .set({ userCount: sql`user_count + 1` })
      .where(eq(statsTable.id, 'global')),
  ]);
}
```
```typescript
// 💡 Kiedy batch vs transaction?
// - batch: wiele niezależnych operacji (wydajność)
// - transaction: operacje zależne, wymaga rollback przy błędzie

// Batch — OK jeśli częściowy sukces jest akceptowalny
await db.batch([insertA, insertB, insertC]);

// Transaction — gdy wszystko albo nic
await db.transaction(async (tx) => {
  await tx.insert(...);
  await tx.update(...); // używa wyniku insert
});
```

---

## SWR

### 1. Brak mutate po zmianach

**Problem:** Stale data po mutacji.
```typescript
// ❌ Źle — brak revalidacji
function UserProfile() {
  const { data: user } = useSWR("/api/user", fetcher);
  
  async function updateName(name: string) {
    await fetch("/api/user", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    // UI pokazuje stare dane!
  }
}
```
```typescript
// ✅ Dobrze — mutate po zmianie
function UserProfile() {
  const { data: user, mutate } = useSWR("/api/user", fetcher);
  
  async function updateName(name: string) {
    await fetch("/api/user", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    mutate(); // revalidate
  }
}

// ✅ Jeszcze lepiej — optimistic update
async function updateName(name: string) {
  mutate(
    async (currentUser) => {
      await fetch("/api/user", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      return { ...currentUser, name };
    },
    { optimisticData: { ...user, name } }
  );
}
```

### 2. Niespójne klucze SWR

**Problem:** Brak deduplikacji, cache miss.
```typescript
// ❌ Źle — różne formaty klucza
useSWR(`/api/users/${id}`, fetcher);
useSWR(`/api/users/${id}/`, fetcher);  // trailing slash
useSWR(["user", id], fetcher);          // array format

// ✅ Dobrze — spójny format
const userKey = (id: string) => `/api/users/${id}`;
useSWR(userKey(id), fetcher);
```

### 3. Brak obsługi stanów

**Problem:** Brak loading/error UI.
```typescript
// ❌ Źle — tylko happy path
function Users() {
  const { data } = useSWR("/api/users", fetcher);
  return <ul>{data?.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```
```typescript
// ✅ Dobrze — wszystkie stany
function Users() {
  const { data, error, isLoading } = useSWR("/api/users", fetcher);
  
  if (isLoading) return <Skeleton />;
  if (error) return <Error message="Nie udało się załadować użytkowników" />;
  if (!data?.length) return <Empty message="Brak użytkowników" />;
  
  return <ul>{data.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

---

## Tailwind CSS 4

### 1. Używanie @apply

**Problem:** Trudniejsze do utrzymania, gorsze tree-shaking.
```css
/* ❌ Źle — @apply w CSS */
.btn-primary {
  @apply bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600;
}
```
```typescript
// ✅ Dobrze — kompozycja w React
const buttonStyles = {
  base: "px-4 py-2 rounded transition-colors",
  primary: "bg-blue-500 text-white hover:bg-blue-600",
  secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
};

function Button({ variant = "primary", children }: Props) {
  return (
    <button className={`${buttonStyles.base} ${buttonStyles[variant]}`}>
      {children}
    </button>
  );
}
```

### 2. Przestarzałe klasy w v4

**Problem:** Niektóre klasy zostały usunięte lub zmienione.
```typescript
// ❌ Źle — przestarzałe w v4
<div className="bg-opacity-50" />      // usunięte
<div className="text-opacity-75" />    // usunięte

// ✅ Dobrze — nowy syntax
<div className="bg-black/50" />        // slash notation
<div className="text-black/75" />
```

### 3. Brak uporządkowania klas

**Problem:** Trudne do czytania i utrzymania.
```typescript
// ❌ Źle — chaos
<div className="hover:bg-blue-600 p-4 bg-blue-500 text-white flex rounded-lg items-center mt-4 justify-between" />

// ✅ Dobrze — uporządkowane (prettier-plugin-tailwindcss)
<div className="mt-4 flex items-center justify-between rounded-lg bg-blue-500 p-4 text-white hover:bg-blue-600" />
```

---

## Radix UI

### 1. Brak aria-label dla icon buttons

**Problem:** Niedostępne dla screen readers.
```typescript
// ❌ Źle — brak opisu
<Button>
  <TrashIcon />
</Button>

// ✅ Dobrze — aria-label
<Button aria-label="Usuń element">
  <TrashIcon aria-hidden />
</Button>
```

### 2. Brak Portal dla overlays

**Problem:** Z-index issues, clipping.
```typescript
// ❌ Źle — bez Portal
<Dialog.Content className="...">
  Modal content
</Dialog.Content>

// ✅ Dobrze — z Portal
<Dialog.Portal>
  <Dialog.Overlay className="..." />
  <Dialog.Content className="...">
    Modal content
  </Dialog.Content>
</Dialog.Portal>
```

### 3. Niespójne rozmiary ikon

**Problem:** Ikony różnej wielkości.
```typescript
// ❌ Źle — różne rozmiary
<HomeIcon />                    // default
<SettingsIcon size={24} />      // 24px
<UserIcon className="w-6 h-6" /> // 24px ale inaczej

// ✅ Dobrze — spójny system
const ICON_SIZE = 20;

<HomeIcon size={ICON_SIZE} />
<SettingsIcon size={ICON_SIZE} />
<UserIcon size={ICON_SIZE} />

// lub wrapper
function Icon({ icon: IconComponent, size = 20 }: Props) {
  return <IconComponent size={size} aria-hidden />;
}
```

---

## Bezpieczeństwo

### 1. Brak walidacji w Server Actions

**Problem:** Niezaufany input trafia do bazy.
```typescript
// ❌ Źle — brak walidacji
"use server";

export async function createPost(formData: FormData) {
  await db.insert(posts).values({
    title: formData.get("title") as string, // może być cokolwiek!
    content: formData.get("content") as string,
  });
}
```
```typescript
// ✅ Dobrze — walidacja Zod
"use server";

import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
});

export async function createPost(formData: FormData) {
  const result = createPostSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });
  
  if (!result.success) {
    return { error: result.error.flatten() };
  }
  
  await db.insert(posts).values(result.data);
}
```

### 2. Wyciek danych server → client

**Problem:** Wrażliwe dane trafiają do klienta.
```typescript
// ❌ Źle — cały obiekt user
async function UserProfile({ userId }: Props) {
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  // user zawiera hashedPassword, email, etc.!
  return <ClientComponent user={user} />;
}
```
```typescript
// ✅ Dobrze — tylko publiczne dane
async function UserProfile({ userId }: Props) {
  const user = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  
  return <ClientComponent user={user} />;
}
```

### 3. Brak sprawdzenia uprawnień

**Problem:** Każdy może wykonać akcję.
```typescript
// ❌ Źle — brak auth check
"use server";

export async function deletePost(postId: string) {
  await db.delete(posts).where(eq(posts.id, postId));
}
```
```typescript
// ✅ Dobrze — sprawdzenie uprawnień
"use server";

import { auth } from "@/lib/auth";

export async function deletePost(postId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  
  const post = await db.select().from(posts).where(eq(posts.id, postId)).get();
  if (post?.authorId !== session.user.id) {
    throw new Error("Forbidden");
  }
  
  await db.delete(posts).where(eq(posts.id, postId));
}
```

---

## TypeScript

### 1. Używanie `any`

**Problem:** Brak type safety.
```typescript
// ❌ Źle
function processData(data: any) {
  return data.value.nested.property; // może crashnąć
}

// ✅ Dobrze
interface DataPayload {
  value: {
    nested: {
      property: string;
    };
  };
}

function processData(data: DataPayload) {
  return data.value.nested.property;
}

// lub unknown + type guard
function processData(data: unknown) {
  if (isDataPayload(data)) {
    return data.value.nested.property;
  }
  throw new Error("Invalid data format");
}
```

### 2. Brak typów dla props

**Problem:** Niejasne API komponentu.
```typescript
// ❌ Źle
function UserCard({ user, onEdit, showActions }) {
  // co to są za typy?
}

// ✅ Dobrze
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  showActions?: boolean;
}

function UserCard({ user, onEdit, showActions = true }: UserCardProps) {
  // jasne API
}
```

### 3. Non-null assertion bez uzasadnienia

**Problem:** Potencjalny runtime crash.
```typescript
// ❌ Źle — ślepe !
const user = users.find((u) => u.id === id)!;
console.log(user.name); // crash jeśli nie znaleziono

// ✅ Dobrze — explicit handling
const user = users.find((u) => u.id === id);
if (!user) {
  throw new Error(`User ${id} not found`);
}
console.log(user.name);
```

# Animation Polish

Micro-detale animacji uzupełniające [animations.md](animations.md) (macro patterns, Motion, View Transitions): interruptibility, subtelne wyjścia, ikony cross-fade, scale on press, skip-on-load.

---

## Interruptible Animations

Użytkownicy zmieniają intencję w trakcie interakcji. Jeśli animacje nie są przerywalne, interfejs wydaje się zepsuty.

### CSS Transitions vs. Keyframes

| | CSS Transitions | CSS Keyframe Animations |
| --- | --- | --- |
| **Zachowanie** | Interpolują w stronę najnowszego stanu | Działają na stałej osi czasu |
| **Przerywalność** | Tak — retargetują w trakcie | Nie — restartują od początku |
| **Użycie** | Zmiany stanu interaktywnego (hover, toggle, open/close) | Stage'owane sekwencje uruchamiane raz (enter, loading) |
| **Czas trwania** | Adaptuje się do pozostałego dystansu | Stały niezależnie od stanu |

```css
/* Good — interruptible transition for a toggle */
.drawer {
  transform: translateX(-100%);
  transition: transform 200ms ease-out;
}
.drawer.open {
  transform: translateX(0);
}

/* Clicking again mid-animation smoothly reverses — no jank */
```

```css
/* Bad — keyframe animation for interactive element */
.drawer.open {
  animation: slideIn 200ms ease-out forwards;
}

/* Closing mid-animation snaps or restarts — feels broken */
```

**Reguła:** Zawsze preferuj CSS transitions dla interaktywnych elementów. Rezerwuj keyframes dla one-shot sekwencji.

---

## Enter Animations: Split and Stagger

Nie animuj jednego dużego kontenera. Podziel zawartość na semantyczne kawałki i animuj każdy osobno.

### Krok po kroku

1. **Podziel** na logiczne grupy (tytuł, opis, przyciski)
2. **Stagger** z ~100ms opóźnieniem między grupami
3. **Dla tytułów** rozważ podział na pojedyncze słowa z ~80ms staggerem
4. **Połącz** `opacity`, `blur` i `translateY` dla efektu wejścia

### Code Example

```tsx
// Motion (Framer Motion) — staggered enter
function PageHeader() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.1 } },
      }}
    >
      <motion.h1
        variants={{
          hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
          visible: { opacity: 1, y: 0, filter: "blur(0px)" },
        }}
      >
        Welcome
      </motion.h1>

      <motion.p
        variants={{
          hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
          visible: { opacity: 1, y: 0, filter: "blur(0px)" },
        }}
      >
        A description of the page.
      </motion.p>

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
          visible: { opacity: 1, y: 0, filter: "blur(0px)" },
        }}
      >
        <Button>Get started</Button>
      </motion.div>
    </motion.div>
  );
}
```

### CSS-Only Stagger

```css
.stagger-item {
  opacity: 0;
  transform: translateY(12px);
  filter: blur(4px);
  animation: fadeInUp 400ms ease-out forwards;
}

.stagger-item:nth-child(1) { animation-delay: 0ms; }
.stagger-item:nth-child(2) { animation-delay: 100ms; }
.stagger-item:nth-child(3) { animation-delay: 200ms; }

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}
```

---

## Exit Animations

Wyjścia powinny być subtelniejsze i mniej przyciągające uwagę niż wejścia. Fokus użytkownika przesuwa się do następnej rzeczy — nie walcz o uwagę.

### Subtle Exit (Rekomendowane)

```tsx
// Small fixed translateY — indicates direction without drama
<motion.div
  exit={{
    opacity: 0,
    y: -12,
    filter: "blur(4px)",
    transition: { duration: 0.15, ease: "easeIn" },
  }}
>
  {content}
</motion.div>
```

### Full Exit (Gdy kontekst ma znaczenie)

```tsx
// Slide fully out — use when spatial context is important
// (e.g., a card returning to a list, a drawer closing)
<motion.div
  exit={{
    opacity: 0,
    x: "-100%",
    transition: { duration: 0.2, ease: "easeIn" },
  }}
>
  {content}
</motion.div>
```

### Good vs. Bad

```css
/* Good — subtle exit */
.item-exit {
  opacity: 0;
  transform: translateY(-12px);
  transition: opacity 150ms ease-in, transform 150ms ease-in;
}

/* Bad — dramatic exit that steals focus */
.item-exit {
  opacity: 0;
  transform: translateY(-100%) scale(0.5);
  transition: all 400ms ease-in;
}

/* Bad — no exit animation at all (element just vanishes) */
.item-exit {
  display: none;
}
```

**Kluczowe punkty:**
- Używaj małego stałego `translateY` (np. `-12px`) zamiast pełnej wysokości kontenera
- Zachowaj kierunkowy ruch żeby wskazać dokąd element się przeniósł
- Czas trwania exit powinien być krótszy niż enter (150ms vs 300ms)
- Nie usuwaj animacji exit całkowicie — subtelny ruch zachowuje kontekst

---

## Contextual Icon Animations

Gdy ikony pojawiają się lub znikają kontekstowo (na hover, na zmianę stanu), animuj je z `opacity`, `scale` i `blur` zamiast tylko przełączać visibility.

### Motion

```tsx
import { AnimatePresence, motion } from "motion/react";

function IconButton({ isActive, icon: Icon }) {
  return (
    <button>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={isActive ? "active" : "inactive"}
          initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        >
          <Icon />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
```

### CSS Transition Approach (bez Motion)

Jeśli projekt nie używa Motion (Framer Motion), trzymaj obie ikony w DOM i cross-fade je z CSS transitions. Ponieważ żadna ikona się nie unmount-uje, oba enter i exit animują się płynnie.

Trick: jedna ikona jest absolutnie pozycjonowana na drugiej. Toggle stanu cross-fade'uje je — wchodząca ikona skaluje się od `0.25`, wychodząca skaluje do `0.25`, obie z opacity i blur.

```tsx
function IconButton({ isActive, ActiveIcon, InactiveIcon }) {
  return (
    <button>
      <div className="relative">
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "transition-[opacity,filter,scale] duration-300",
            "cubic-bezier(0.2, 0, 0, 1)",
            isActive
              ? "scale-100 opacity-100 blur-0"
              : "scale-[0.25] opacity-0 blur-[4px]"
          )}
        >
          <ActiveIcon />
        </div>
        <div
          className={cn(
            "transition-[opacity,filter,scale] duration-300",
            "cubic-bezier(0.2, 0, 0, 1)",
            isActive
              ? "scale-[0.25] opacity-0 blur-[4px]"
              : "scale-100 opacity-100 blur-0"
          )}
        >
          <InactiveIcon />
        </div>
      </div>
    </button>
  );
}
```

Non-absolutna ikona (InactiveIcon) definiuje rozmiar layoutu. Absolutna ikona (ActiveIcon) nakłada się na nią bez wpływu na flow.

### Wybór między Motion i CSS

| | Motion (Framer Motion) | CSS transitions (obie ikony w DOM) |
| --- | --- | --- |
| **Enter animation** | Tak | Tak |
| **Exit animation** | Tak (przez `AnimatePresence`) | Tak (cross-fade — ikona nigdy nie unmount-uje) |
| **Spring physics** | Tak | Nie — użyj `cubic-bezier(0.2, 0, 0, 1)` jako przybliżenia |
| **Kiedy używać** | Projekt już używa `motion/react` | Brak motion dependency lub trzymanie małego bundle |

**Reguła:** Sprawdź `package.json` projektu pod `motion` lub `framer-motion`. Jeśli jest, użyj Motion. Jeśli nie, użyj CSS cross-fade pattern — nie dodawaj dependency tylko dla przejść ikon.

### Kiedy animować ikony

| Animuj | Nie animuj |
| --- | --- |
| Ikony pojawiające się na hover (action buttons) | Statyczne ikony nawigacji |
| Ikony zmiany stanu (play → pause, like → liked) | Dekoracyjne ikony |
| Ikony w kontekstowych toolbarach | Ikony zawsze widoczne |
| Wskaźniki stanu loading/success | Etykiety ikon (tekst obok ikony) |

**Ważne:** Zawsze używaj dokładnie tych wartości dla kontekstowych animacji ikon — nie odchylaj:
- `scale`: `0.25` → `1` (nigdy `0.5` ani `0.6`)
- `opacity`: `0` → `1`
- `filter`: `"blur(4px)"` → `"blur(0px)"`
- `transition`: `{ type: "spring", duration: 0.3, bounce: 0 }` — **bounce zawsze musi być `0`**, nigdy `0.1` ani inne

---

## Scale on Press

Subtelne scale-down na klik daje przyciskom dotykowy feedback. Zawsze używaj `scale(0.96)`. Nigdy nie używaj wartości mniejszej niż `0.95` — cokolwiek poniżej wygląda przesadnie. Używaj CSS transitions dla przerywalności — jeśli użytkownik puści w trakcie, powinno płynnie wrócić.

Nie każdy przycisk tego potrzebuje. Dodaj prop `static` do komponentu Button, który wyłącza scale gdy ruch byłby rozpraszający.

### CSS

```css
.button {
  transition-property: scale;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}

.button:active {
  scale: 0.96;
}
```

### Tailwind

```tsx
<button className="transition-transform duration-150 ease-out active:scale-[0.96]">
  Click me
</button>
```

### Motion

```tsx
<motion.button whileTap={{ scale: 0.96 }}>
  Click me
</motion.button>
```

### Pattern z `static` prop

Wyciągnij klasę scale do zmiennej i warunkowo aplikuj na podstawie propa `static`:

```tsx
const tapScale = "active:not-disabled:scale-[0.96]";

function Button({ static: isStatic, className, children, ...props }) {
  return (
    <button
      className={cn(
        "transition-transform duration-150 ease-out",
        !isStatic && tapScale,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Usage
<Button>Click me</Button>           {/* scales on press */}
<Button static>Submit</Button>       {/* no scale */}
```

---

## Skip Animation on Page Load

Użyj `initial={false}` na `AnimatePresence`, żeby zapobiec uruchomieniu enter animacji na pierwszym renderze. Elementy będące już w domyślnym stanie nie powinny animować się przy załadowaniu strony — tylko przy kolejnych zmianach stanu.

### Kiedy działa

```tsx
// Good — icon doesn't animate in on mount, only on state change
<AnimatePresence initial={false} mode="popLayout">
  <motion.span
    key={isActive ? "active" : "inactive"}
    initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
    exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
  >
    <Icon />
  </motion.span>
</AnimatePresence>
```

Działa dobrze dla: icon swap, toggle, tabs, segmented controls — wszystkiego co ma stan domyślny przy załadowaniu strony.

### Kiedy się wywala

Nie używaj `initial={false}`, gdy komponent polega na propie `initial` żeby ustawić pierwsze enter animation, jak staggered hero strony albo loading state. W tych przypadkach usunięcie initial pomija całe wejście.

```tsx
// Bad — initial={false} would skip the staggered page enter entirely
<AnimatePresence initial={false}>
  <motion.div initial="hidden" animate="visible" variants={...}>
    ...
  </motion.div>
</AnimatePresence>
```

Zweryfikuj, że komponent nadal wygląda dobrze przy pełnym refreshu strony przed zastosowaniem.

---

## Zobacz Także

- [animations.md](animations.md) — Motion macro patterns, View Transitions, scroll-driven, prefers-reduced-motion
- [performance.md](performance.md) — transition specificity, will-change
- [polish-checklist.md](polish-checklist.md) — pełna checklista polish

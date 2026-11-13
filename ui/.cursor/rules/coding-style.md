# Coding Style Rules

Use these rules so code matches the existing codebase and stays consistent.

---

## Language

* **TypeScript only.** No JavaScript files for app code.
* **Strict typing**: Keep `strict: true` (see `tsconfig.json`). Avoid `any`; use `unknown` or proper types. Use `Schema` from `@amplify/data/resource` for Amplify model types when applicable.
* **Explicit return types** on exported functions when the type is not obvious; rely on inference for simple helpers.

---

## Naming

| Kind | Convention | Examples |
|------|------------|----------|
| **Components** | PascalCase | `DocumentViewer`, `CurioLoading`, `Button` |
| **Hooks** | camelCase, prefix `use` | `useDocumentApi`, `useAmplifyApiClient` |
| **Functions / variables** | camelCase | `getItemFunc`, `documentToCheck` |
| **Constants** | UPPER_SNAKE or camelCase for config objects | `MathJaxConfig`, `selectionSet` |
| **Types / interfaces** | PascalCase | `StudentDocument`, `ButtonProps` |
| **Files (components)** | kebab-case for multi-word | `curio-loading.tsx`, `document-viewer.tsx` |
| **Files (hooks)** | kebab-case, suffix `.api.ts` for API hooks | `use-document.api.ts`, `use-messages-by-chat.api.ts` |
| **Folders** | kebab-case or single word | `design-system/`, `hooks/api/documents/` |

---

## React

* **Functional components only.** Use function declarations or arrow functions; no class components.
* **Client components**: Add `'use client';` at the top of the file when the component uses hooks, browser APIs, or event handlers. Pages under `src/app/` that use hooks are typically client components.
* **Keep components small**: Prefer under ~200 lines; split into smaller components or custom hooks when logic or JSX grows.
* **Hooks**: Put reusable state and side-effect logic in custom hooks (e.g. under `src/hooks/` or `src/hooks/api/`). Follow Rules of Hooks (no conditional calls, only at top level).
* **Refs**: Use `React.forwardRef` when the component must forward a ref; set `displayName` on the component for debugging (e.g. `Button.displayName = "Button"`).
* **Props**: Prefer explicit props interfaces or types (e.g. `interface ButtonProps extends React.ButtonHTMLAttributes<...>`). Use `children` when the component wraps content.
* **Memoization**: Use `useMemo` / `useCallback` when needed to avoid unnecessary re-renders or to satisfy dependency arrays; don’t over-memoize simple values.

---

## Imports

* **Use path aliases**: Prefer `@/` for `src/` (e.g. `@/components/ui/button`, `@/hooks/api/documents`, `@/lib/utils`, `@/providers`). See `tsconfig.json` for `@amplify/*`, `@ai/*`, etc.
* **Order** (recommended):
  1. React / Next.js (e.g. `react`, `next/navigation`)
  2. Third-party libraries (e.g. `framer-motion`, `lucide-react`)
  3. Internal aliased imports (`@/components/`, `@/hooks/`, `@/lib/`, `@/providers/`, `@/design-system/`)
  4. Relative imports (e.g. `../use-item.api`) — use when inside the same feature/hook domain
* **Group logically**: Keep related imports together; separate external vs internal if it helps readability.

---

## Styling

* **TailwindCSS** for all UI styling. Use utility classes; avoid inline `style={{}}` except for dynamic values (e.g. width/height from props).
* **Combining classes**: Use the `cn()` helper from `@/lib/utils` (it uses `tailwind-merge` + `clsx`). Example: `className={cn("base-classes", variantClass, className)}` so parent `className` can override.
* **Variants**: Use **class-variance-authority (CVA)** for components with multiple visual variants (see `src/components/ui/button.tsx` and `src/design-system/curio-button.tsx`). Define `cva(...)` with `variants` and `defaultVariants`, then pass result to `cn(componentVariants({ variant, size }), className)`.
* **Design system**: Use Curio components from `src/design-system/` (e.g. `curio-button`, `curio-panel`) for branded UI; use `src/components/ui/` for generic primitives. Use **@radix-ui** for UI primitives—only the packages already installed (see `ui-components.md`); do not install new Radix or other UI libraries unless needed.

---

## Async & Data

* **Async code**: Prefer `async/await` over raw `.then()` chains for readability.
* **Data fetching**: Use React Query in hooks under `src/hooks/api/*`. Use `useQuery` for reads and `useMutation` for writes; call Amplify client or `fetch('/api/...')` inside the query/mutation function. Don’t fetch in presentational components (see `architecture.md`).
* **Errors**: Handle errors in hooks or API routes; surface loading and error state to UI via hook return values or React Query state.

---

## File & Export Conventions

* **One main component or hook per file** for top-level exports (e.g. `Button` in `button.tsx`, `useDocumentApi` in `use-document.api.ts`). Co-locate small, file-specific helpers in the same file if they’re not reused.
* **Barrel files**: Use `index.ts` in a folder to re-export public API (e.g. `src/hooks/api/documents/index.ts` exporting document hooks).
* **Types**: Export types/interfaces that are part of the module’s public API; keep internal types in the file or in a nearby `types.ts` in the same domain.

---

## Formatting & Style

* **Quotes**: Either double or single is fine; be consistent within a file. Many files use double quotes for JSX and strings.
* **Semicolons**: Use semicolons at the end of statements (matches existing code).
* **Trailing commas**: Use in multiline objects, arrays, and argument lists for cleaner diffs.
* **Line length**: Prefer wrapping long lines (e.g. long props, long class strings) rather than one very long line; break at natural points (after `,`, `(`, `{`).

---

## Simplicity (KISS)

* Prefer the simplest solution that works; avoid over-engineering or "enterprise-grade" complexity. Before refactoring or adding abstraction, ask whether a smaller change would suffice. See the **KISS principle** rule in this project.

---

## Don’t

* Don’t use `any` without a good reason; prefer proper types or `unknown`.
* Don’t put business or data-fetching logic inside presentational components; use hooks and pass data as props.
* Don’t fetch in deeply nested components; fetch in hooks and pass data down.
* Don’t use inline styles for layout/visual styling; use Tailwind and `cn()`.
* Don’t introduce new UI or state libraries; use the stack in `stack.md`.
* Don’t use React hooks inside API route handlers (`src/app/api/**/route.ts`); those run on the server only.

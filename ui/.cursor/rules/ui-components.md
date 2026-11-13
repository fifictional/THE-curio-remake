# UI Component Rules

We use **@radix-ui** for UI primitives. Use the packages already installed in this project; do not add new Radix (or other UI) packages unless there is a clear need that existing ones cannot cover.

---

## Installed UI Packages (use these; do not install others unless needed)

**Radix UI (primitives):**

* `@radix-ui/react-checkbox` – checkboxes
* `@radix-ui/react-label` – form labels
* `@radix-ui/react-select` – select dropdowns
* `@radix-ui/react-switch` – toggle switches
* `@radix-ui/react-tabs` – tabs
* `@radix-ui/react-tooltip` – tooltips

**Radix Themes:**

* `@radix-ui/themes` – theme wrapper and themed components (used in root layout via `<Theme>`)

**Other UI-related (already in project):**

* **TailwindCSS** v4 – styling
* **class-variance-authority** (CVA) – component variants
* **lucide-react** – icons
* **tailwind-merge**, **clsx** – class merging (via `cn()` from `@/lib/utils`)
* **Recharts** – chart rendering (use for data visualizations; do not add another chart library)

---

## Rules

* **Prefer @radix-ui**: For dropdowns, dialogs, tooltips, tabs, select, checkbox, switch, and labels, use the **installed** `@radix-ui/*` packages above. Do not add new `@radix-ui/react-*` packages (e.g. dialog, dropdown-menu) without confirming they are needed and not duplicating existing patterns.
* **Do not create custom UI primitives** when an installed Radix primitive already covers the use case.
* **Styling**: Use TailwindCSS for all styling. Use `cn()` from `@/lib/utils` to merge classes. Use CVA for components with multiple variants (see `coding-style.md`).
* **Icons**: Use **lucide-react**; do not add another icon library unless necessary.
* **Design system**: Use Curio components from `src/design-system/` and shared primitives from `src/components/ui/` before building new ones.

---

## Z-index

* Dropdowns and popovers must render above surrounding content.
* Ensure overlays do not block expected UI interactions.

---

## Accessibility

* Radix components provide built-in accessibility; preserve their behavior (keyboard, focus, ARIA).
* Ensure keyboard interaction works; do not remove or override Radix’s accessibility attributes without good reason.

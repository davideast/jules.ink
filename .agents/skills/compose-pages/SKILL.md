---
name: compose-pages
description: Composes extracted React components into stateful page orchestrators. Takes a component library (from decompose-pages or similar) and wires it into thin Astro page routes with proper state management, event threading, and layout shells. Use after decomposing raw HTML pages into components.
metadata:
  author: davideast
  version: "1.0"
---

# Compose Pages

Composes extracted React components into stateful page orchestrators. Takes a component library (from `decompose-pages` or similar) and wires it into thin Astro page routes with proper state management, event threading, and layout shells.

## When to Use

After extracting a component library from raw HTML pages. The components exist as stateless presentation units — this skill turns them into working pages.

## Phases

### Phase 1: Inventory and Map

1. Read all components in `src/components/`, catalog exported names and props interfaces.
2. Read screen specs (`screens/*.md`, `plan.md`, or equivalent UX docs).
3. Build a component-to-page mapping table — which components appear on which screens.

### Phase 2: Identify Page Architecture

1. Determine which HTML pages are **separate routes** vs. **states of the same page**.
   - Multiple pages with the same layout but different panel contents = **one route with conditional rendering**.
   - Pages with fundamentally different layouts = **separate routes**.
2. Identify state variables needed to toggle between states (e.g., `rightPanelMode`, `selectedTone`, `dropdownOpen`).
3. Identify shared layout shells (common `<head>`, body classes, global CSS).

### Phase 3: Configure Framework

1. Add framework integration to `package.json` (e.g., `@astrojs/react`, `react`, `react-dom`).
2. Update `astro.config.mjs` to register the integration.
3. Extract shared CSS into `src/styles/global.css` (scrollbar styles, card styles, utility classes).
4. Extract theme tokens into proper Tailwind config (currently duplicated inline in every page).
5. Ensure shared fonts/icons load from the layout shell.

### Phase 4: Create Layout Shell

1. Create `src/layouts/AppLayout.astro` with:
   - Proper `<html>`, `<head>` with fonts, meta tags, global CSS imports.
   - Body classes matching the design system.
   - `<slot />` for page content.

### Phase 5: Compose Page Components

1. Create page component files in `src/components/pages/`.
2. Each page component:
   - Owns all state for that route.
   - Composes child components via props and callbacks.
   - Contains no raw HTML — only component composition and layout wrappers.
3. Wire events: callbacks flow down, state updates flow up.
4. Use mock/demo data for initial implementation.

### Phase 6: Rewrite Astro Pages

1. Replace raw HTML in `src/pages/*.astro` with thin wrappers:
   - Import the layout shell.
   - Import the page component with `client:load`.
2. Delete/archive pages that collapsed into state variants of other pages.

### Phase 7: Verify

1. Run `npm install && npm run dev`.
2. Visit each route and visually compare against original HTML pages.
3. Verify state transitions work (toggles, selections, overlays).
4. Run `npm run build` to ensure no type/build errors.

## References

- `references/COMPOSITION_PATTERNS.md` — patterns for state collapse, thin pages, overlay-as-state, and prop drilling guidelines.

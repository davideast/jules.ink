# Composition Patterns

## State Collapse

When multiple HTML pages share the same layout but differ only in panel contents or overlay visibility, they are **one route with different state**, not separate pages.

**Signal:** Pages with identical top bars, sidebars, and footers where only one panel changes.

**Pattern:** Collapse into a single page component with a state variable controlling the variant:
```tsx
const [rightPanelMode, setRightPanelMode] = useState<'reading' | 'creating'>('reading');
// Render ReadingPane or ToneCreator based on mode
```

## Thin Page Components

Page components are orchestration layers. They:
- Own state
- Wire callbacks between children
- Choose which children to render
- Apply layout containers (flex, grid)

They do **not** contain raw HTML elements like `<input>`, `<button>`, `<span>`. All UI lives in the child components.

## Layout Shell Extraction

Shared HTML structure across all pages — `<html>`, `<head>`, fonts, body classes, global styles — belongs in an Astro layout component, not duplicated per page.

**Extract into `AppLayout.astro`:**
- `<html class="dark">` wrapper
- Font imports (Inter, JetBrains Mono, Material Symbols)
- Global CSS (scrollbar, card, utility styles)
- Tailwind theme config
- `<body>` with shared classes

## Overlay as State

Popovers, dropdowns, and modal-like panels are **boolean state**, not routes.

```tsx
const [printerDropdownOpen, setPrinterDropdownOpen] = useState(false);
// Render PrinterDropdown conditionally, positioned absolutely
```

Don't create separate pages/routes for overlay states.

## Prop Drilling vs Context

For small apps (< 3 nesting levels between state owner and consumer), prefer **prop drilling**. It's explicit, traceable, and doesn't add abstraction.

Use React Context only when:
- State is consumed 3+ levels deep
- Multiple unrelated subtrees need the same state
- The app has grown to 20+ components

For Jules Ink's scale (14 components, 2 page orchestrators), prop drilling is the right choice.

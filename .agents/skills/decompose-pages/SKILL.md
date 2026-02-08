---
name: decompose-pages
description: Decomposes full-page HTML files (from Stitch, design tools, or prototypes) into modular React components. Inventories shared UI blocks across pages, diffs variations, resolves conflicts, and extracts a component library. Use when converting raw HTML pages into a component-based React architecture.
metadata:
  author: davideast
  version: "1.0"
---

# Decompose Pages into React Components

You are a **UI Component Architect**. Your job is to analyze multiple full-page HTML files that represent different states of the same app, identify shared UI blocks, reconcile subtle variations, and extract clean, modular React components.

## When to Use This Skill

Activate when:
- Converting Stitch-generated pages into React components
- Breaking down HTML prototypes into a component library
- Refactoring multi-page HTML into shared components
- Migrating static HTML to a React architecture

## Prerequisites

Before starting, understand the project context:
- Read the project's `plan.md` or design document if one exists
- Check for a `DESIGN.md` with design tokens
- Identify the CSS approach (Tailwind, CSS Modules, inline styles)
- Note the target framework (React, Next.js, etc.)

## Process

Follow these 5 phases strictly in order:

### Phase 1: Inventory

Read every page file in the target directory. For each page:

1. **Catalog every UI section** — header, nav, sidebar, content area, cards, footers, modals, popovers, status bars
2. **Record for each block:**
   - Semantic purpose (e.g., "session controls", "tone selector")
   - HTML structure (element hierarchy)
   - CSS classes and inline styles
   - Content/data it displays
   - Interactive elements (buttons, inputs, dropdowns)
3. **Note which pages each block appears in**

Output: A markdown table of all blocks, which pages contain them, and a 1-line description.

### Phase 2: Diff

Group blocks by function. For each group:

1. **Compare implementations across pages** — exact HTML diff
2. **Categorize each difference:**
   - **Cosmetic**: spacing, sizing, minor class differences → unify to the latest version
   - **State-driven**: different content based on app state → these become props/slots
   - **Structural**: fundamentally different layouts → flag for user decision
3. **Identify the canonical version** — typically the most recent or most complete implementation

Output: A diff report showing each variation and the recommended resolution.

### Phase 3: Decide

For each component:

1. **Define the component API:**
   - Props (with TypeScript types)
   - Children/slots
   - Variants (if any)
   - Default values
2. **Resolve conflicts:**
   - Cosmetic: pick latest
   - State-driven: design prop interface
   - Structural: ask user if unclear
3. **Produce a component manifest** — name, file path, props interface, which pages use it

Output: Component manifest as a markdown table with prop signatures.

### Phase 4: Extract

Create React component files. For each component:

1. **Follow these rules:**
   - One component per file
   - TypeScript interfaces for all props
   - Use explicit conditional rendering (ternary, not `&&` for numbers/falsy values)
   - Hoist static JSX outside component functions when possible
   - Use `memo()` for components that receive complex objects and render expensively
   - Direct imports only — never barrel file re-exports
   - Minimal props — only pass what the component actually uses
2. **Preserve all CSS classes** from the source pages — do not invent new styles
3. **Use composition over configuration** — prefer children/slots over boolean prop sprawl
4. **Keep components focused** — a component should do one thing

See [Component Patterns](references/COMPONENT_PATTERNS.md) for detailed patterns.

### Phase 5: Compose

After extraction, use the `compose-pages` skill to build page components from your component library. It handles state ownership, event wiring, route consolidation, and layout shell creation.

## Output Format

When done, provide:
1. The component manifest table
2. List of files created
3. Any decisions that need user input
4. Any blocks that were intentionally not extracted (with reason)

## Tips

- **Start with the smallest, most reused components** (buttons, badges, chips) and work up to larger compositions (panels, layouts)
- **Don't over-abstract** — if a block only appears in one page, leave it inline unless it's complex enough to warrant its own file
- **Preserve the source CSS exactly** — the goal is structural decomposition, not a visual redesign
- **Name components by purpose**, not by visual appearance (e.g., `ReadingPane` not `RightPanel`)

# Component Patterns Reference

## Props vs Children/Slots Decision Tree

Use **props** when:
- The variation is a simple value (string, number, boolean, enum)
- The component controls the rendering of the value
- The value affects component behavior, not just content

Use **children** when:
- The variation is arbitrary JSX content
- The parent should control what renders inside
- Multiple content areas need filling (use named slots via props)

## Component Naming

- Name by **purpose**, not appearance: `ReadingPane` not `RightPanel`
- Use PascalCase for component files and exports
- Prefix interfaces with component name: `TopBarProps`, `ToneChipProps`

## TypeScript Patterns

```tsx
// Props interface — always exported, always explicit
export interface ToneChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

// Component — named export, no default exports
export function ToneChip({ label, selected = false, onClick }: ToneChipProps) {
  return (
    <button
      className={selected ? 'chip chip-selected' : 'chip'}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
```

## Conditional Rendering

Use explicit ternaries, not `&&`:

```tsx
// Good — explicit ternary
{isActive ? <PulsingDot /> : null}

// Bad — && can render 0 or empty string
{isActive && <PulsingDot />}
```

## Static JSX Hoisting

Hoist static content outside the component function:

```tsx
const PLACEHOLDER_TEXT = (
  <span className="text-muted">No labels yet</span>
);

export function EmptyState() {
  return (
    <div className="empty-state">
      {PLACEHOLDER_TEXT}
    </div>
  );
}
```

## Memoization

Use `memo()` for components that:
- Receive complex objects as props
- Render expensively (many children, canvas operations)
- Are children of frequently re-rendering parents

```tsx
import { memo } from 'react';

export const LabelCard = memo(function LabelCard({ label }: LabelCardProps) {
  return <div className="label-card">...</div>;
});
```

## Imports

- **Direct imports only** — never barrel file re-exports
- Import from the component file directly

```tsx
// Good
import { ToneChip } from './ToneChip';
import { TopBar } from './TopBar';

// Bad — barrel file
import { ToneChip, TopBar } from './components';
```

## CSS Class Preservation

- Preserve all CSS classes from source HTML exactly
- Do not invent new utility classes
- When variations exist across pages, use the canonical (most recent/complete) version
- Use conditional className joining for state-driven class differences

```tsx
const className = [
  'base-class',
  selected ? 'selected-class' : 'default-class',
].filter(Boolean).join(' ');
```

## Composition Over Configuration

Prefer children and render props over boolean prop sprawl:

```tsx
// Good — composition
<TopBar>
  <SessionBadge id="7058525" state="streaming" />
</TopBar>

// Bad — boolean props
<TopBar
  showSessionBadge
  sessionId="7058525"
  sessionState="streaming"
  showInput={false}
/>
```

## File Organization

```
src/components/
  TopBar.tsx
  ToneBar.tsx
  ToneChip.tsx
  LabelCard.tsx
  TimelineEntry.tsx
  ReadingPane.tsx
  ToneCreator.tsx
  PrinterDropdown.tsx
  StatusBar.tsx
  EmptyState.tsx
  PulsingDot.tsx
```

One component per file. No `index.ts` barrel files.

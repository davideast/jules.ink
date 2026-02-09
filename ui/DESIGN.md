# Jules Ink Design System

## Color Palette

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `content-bg` | `#16161a` | Page background, input backgrounds, main content areas |
| `sidebar-bg` | `#1e1e24` | Sidebar panels, header bar, status bar, dropdown surfaces |
| `label-white` | `#ffffff` | Label card backgrounds (print preview) |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `soft-white` | `#fbfbfe` | Primary text, headings, active labels |
| `slate-gray` | `#72728a` | Secondary text, timestamps, metadata, placeholders, muted labels |

### Borders & Surfaces
| Hex | Usage |
|-----|-------|
| `#2a2a35` | Primary border color (panels, cards, dividers, header bottom border) |
| `#2a2a32` | Secondary border color (inputs, subtle dividers, dashed borders) |
| `#2a2a35/50` | Faded surface (inactive badges) |
| `#33333f` | Scrollbar thumb |
| `#444455` | Scrollbar thumb hover |

### Accent
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#19cc61` | Online status dots, radio button accents, pulsing indicators |

### Semantic Status (used in TopBar session states)
| State | Color | Usage |
|-------|-------|-------|
| Streaming | `#19cc61` (primary) | Pulsing dot indicator |
| Paused | `yellow-500` | Pause icon fill |
| Failed | `red-500` | Error icon |
| Complete | `#72728a` (slate-gray) | Check icon |

### Diff Colors (FileStatRow)
| Color | Usage |
|-------|-------|
| `green-500` | File additions (+N) |
| `red-500` | File deletions (-N) |
| `gray-600` | Zero additions/deletions |

## Typography

### Font Families
- **Display/Body:** `Inter` (weights: 300 light, 400 regular, 500 medium, 600 semibold, 700 bold)
- **Monospace:** `JetBrains Mono` (weights: 400 regular, 500 medium, 700 bold)
- **Icons:** Material Symbols Outlined (variable: opsz 20-48, wght 100-700, FILL 0-1)

### Type Scale (from components)
| Size | Weight | Usage |
|------|--------|-------|
| `22px` | light (300) | ReadingPane body text |
| `18px` | mono | Inline code spans |
| `16px` | medium | EmptyState primary text |
| `14px` | medium | Share button text |
| `13px` | mono, semibold | TopBar brand "jules.ink", pill button labels, session ID, timeline time |
| `12px` | mono, medium | FileStatRow paths, StatusBar text |
| `11px` | bold, uppercase, tracking-widest | Section headers ("PRINTER", "NAME", "YOUR TONES") |
| `10px` | bold, uppercase, tracking-wider | Timeline event type badges, tone pills in ReadingPane |

## Component Patterns

### Buttons

**Pill Button (transport controls)**
```
flex items-center gap-1.5 px-3 py-1.5 rounded-full
border border-[#fbfbfe]/40 bg-transparent text-[#fbfbfe]
hover:bg-white/5 transition-colors h-8
```

**Primary CTA (full-width)**
```
w-full py-2.5 rounded-full bg-[#fbfbfe] text-[#16161a]
text-sm font-semibold hover:bg-white transition-colors
```

**Ghost/Outline Button**
```
flex items-center gap-2 px-8 py-2 rounded-full
border border-[#fbfbfe]/20 bg-transparent text-[#fbfbfe]
hover:bg-[#fbfbfe] hover:text-[#16161a] transition-all text-[14px] font-medium
```

### Chips

**ToneChip (selected)**
```
px-4 py-1.5 rounded-full text-sm font-medium
bg-[#fbfbfe] text-[#16161a] shadow-sm
```

**ToneChip (unselected)**
```
px-4 py-1.5 rounded-full text-sm font-medium
bg-transparent border border-[#2a2a32] text-slate-gray
hover:text-soft-white hover:border-slate-gray
```

**InspirationChip (dashed)**
```
px-3 py-1.5 rounded-full border border-dashed border-[#2a2a32]
text-[#72728a] text-xs hover:text-soft-white hover:border-slate-gray
```

### Cards

**SavedToneEntry**
```
bg-[#16161a] border border-[#2a2a32] rounded-lg p-4
hover:border-[#72728a] transition-colors cursor-pointer
```

**Label Card**
```
width: 340px, aspect-ratio: 2/3, bg: #ffffff
box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)
border-radius: 2px, border: 1px solid #e5e5e5
```

### Inputs

**Text Input**
```
bg-[#16161a] border border-[#2a2a32] rounded(-md) px-3/4 py-2/2.5
text-sm text-soft-white placeholder-[#72728a](/60)
focus:outline-none focus:border-[#72728a] font-mono transition-colors
```

### Layout

**TopBar:** 52px height, `bg-sidebar-bg`, bottom border `#2a2a35`
**StatusBar:** 32px height, `bg-[#1e1e24]`, top border `#2a2a32`
**Body:** `bg-content-bg font-display text-soft-white overflow-hidden h-screen flex flex-col`
**Sidebar panel:** `bg-sidebar-bg`
**Content area:** `bg-[#16161a]` with `border-r border-[#2a2a35]`

### Scrollbars
```css
width: 4px
track: #1e1e24
thumb: #33333f (hover: #444455)
border-radius: 2px
```

### Logo
Octopus SVG icon (18x20px viewport 84x95), `text-white/80`, paired with "jules.ink" in `text-white/60 text-[13px] font-mono tracking-[-0.02em]`

## Key Principles
- **No bright accent colors for UI chrome.** The only accent is `#19cc61` (primary green) used sparingly for status indicators.
- **White-on-dark contrast.** Interactive elements use `#fbfbfe` (soft-white) text/borders on dark backgrounds. Selected states invert to white bg / dark text.
- **Monospace for data.** Session IDs, timestamps, file paths, stats use JetBrains Mono.
- **Minimal border radius.** Chips/buttons use `rounded-full`. Cards use `rounded-lg` (8px). Inputs use `rounded-md` (6px). Label cards use `rounded-sm` (2px).
- **Transition everything.** All interactive states use `transition-colors` or `transition-all`.
- **Muted secondary chrome.** Borders, labels, and metadata all use `#72728a` or `#2a2a32` — never bright colors.

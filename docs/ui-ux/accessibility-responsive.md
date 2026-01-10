# Accessibility & Responsive Design

This document ensures NLB+ is usable by all users, on all devices.

## 1. Accessibility (WCAG 2.1 AA Compliance)

### 1.1 Color Contrast
All text must meet minimum contrast ratios:
*   **Normal text**: 4.5:1 (e.g., `slate-200` on `slate-950`)
*   **Large text** (18px+): 3:1
*   **Status colors**: Never rely on color alone (use icons + text)

### 1.2 Keyboard Navigation
*   **Tab Order**: Logical flow (top-to-bottom, left-to-right)
*   **Focus Indicators**: 2px violet ring (`ring-2 ring-violet-500`)
*   **Skip Links**: "Skip to main content" for screen readers

### 1.3 Screen Reader Support
*   **ARIA Labels**: All interactive elements
    ```tsx
    <button aria-label="Analyze root cause">
      <SparkleIcon />
    </button>
    ```
*   **Live Regions**: Announce dynamic updates
    ```tsx
    <div aria-live="polite" aria-atomic="true">
      {threatCount} new threats detected
    </div>
    ```

### 1.4 Motion & Animation
*   **Respect `prefers-reduced-motion`**:
    ```css
    @media (prefers-reduced-motion: reduce) {
      * { animation: none !important; }
    }
    ```

## 2. Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
| :--- | :--- | :--- |
| **Mobile** | <640px | Single column, collapsible nav |
| **Tablet** | 640-1024px | 2-column grid, drawer nav |
| **Desktop** | 1024-1440px | 3-column grid, sidebar nav |
| **Wide** | >1440px | 4-column grid, expanded sidebar |

### 2.1 Mobile-Specific Patterns
*   **Copilot**: Full-screen modal (not drawer)
*   **Topology Graph**: Simplified view (hide labels, show on tap)
*   **Tables**: Horizontal scroll with sticky first column

### 2.2 Touch Targets
*   **Minimum size**: 44x44px (Apple HIG / Material Design)
*   **Spacing**: 8px between interactive elements

## 3. Performance Budget

To ensure fast load times:
*   **Initial JS bundle**: <200KB (gzipped)
*   **Time to Interactive**: <3s on 3G
*   **Lighthouse Score**: >90 (Performance, Accessibility)

### 3.1 Optimization Strategies
*   **Code Splitting**: Load Copilot/Topology only when needed
*   **Image Optimization**: WebP with fallback, lazy loading
*   **Font Loading**: `font-display: swap` for Inter

# NLB+ Design System "Neon Edge"

This document defines the visual language ensuring a "Premium, Intelligent, and Trustworthy" aesthetic.

## 1. Visual Philosophy
*   **Default Mode**: Dark Mode (mandatory for the "Cyberpunk/Edge" feel).
*   **Materiality**: Glassmorphism (blur backgrounds) for overlays and floating panels.
*   **Motion**: Subtle layout transitions; rigid for data updates.

## 2. Typography
**Font Family**: `Inter` (Variable)
*   *Why?* rigorous legibility for dense data tables and logs.

| Scale | Size | Weight | Usage |
| :--- | :--- | :--- | :--- |
| **Heading 1** | 24px | Bold | Page Titles |
| **Heading 2** | 20px | SemiBold | Section Headers |
| **Heading 3** | 16px | Medium | Card Titles |
| **Body** | 14px | Regular | General Text |
| **Mono** | 13px | Regular | Logs, Configs, IP Addresses |
| **Label** | 12px | Medium | Metadata, Badges |

## 3. Color Palette

### 3.1 Primitives (Dark Mode Base)
*   **Background**: `slate-950` (#020617) - Deep, almost black blue.
*   **Surface**: `slate-900` (#0f172a) - Cards and panels.
*   **Overlay**: `slate-800` (#1e293b) with 80% opacity + `backdrop-blur-md`.

### 3.2 Brand Colors (The "Intelligent" Feel)
*   **Primary (Action)**: `violet-600` (#7c3aed) -> `violet-500` (Hover).
*   **Accent (AI/Copilot)**: Linear Gradient `cyan-500` to `purple-500`.
*   **Selection**: `indigo-500` (#6366f1).

### 3.3 Semantic Colors (Status)
*   **Healthy/Safe**: `emerald-500` (#10b981)
*   **Warning/Degraded**: `amber-500` (#f59e0b)
*   **Critical/Attack**: `rose-500` (#f43f5e)
*   **Info/Trace**: `sky-500` (#0ea5e9)

## 4. Spacing & Radius
*   **Base Unit**: 4px (`0.25rem`).
*   **Radius**:
    *   `md` (6px) for inner elements (inputs, buttons).
    *   `lg` (8px) for cards.
    *   `xl` (12px) for modals.
*   **Padding**:
    *   Card Body: `p-6` (24px).
    *   Table Cell: `px-4 py-3`.

## 5. Components

### 5.1 Buttons
*   **Primary**: Solid Violet background, White text.
*   **Ghost**: Transparent background, Slate-200 text, Slate-800 hover.
*   **Copilot Trigger**: Gradient border, "sparkle" icon.

### 5.2 Cards
*   Border: `1px solid slate-800`.
*   Background: `slate-900`.
*   Shadow: `shadow-lg` (black diffuse).

### 5.3 Data Visualization
*   **Charts**: Recharts / Tremor styles. Minimal grid lines.
*   **Topology Nodes**: Circular nodes specific to role (Service=Circle, DB=Cylinder, Gateway=Hexagon).

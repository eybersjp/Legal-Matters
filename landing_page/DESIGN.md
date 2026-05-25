---
name: Legal Matters
colors:
  surface: '#fdf9f0'
  surface-dim: '#dddad1'
  surface-bright: '#fdf9f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ea'
  surface-container: '#f1eee5'
  surface-container-high: '#ece8df'
  surface-container-highest: '#e6e2d9'
  on-surface: '#1c1c16'
  on-surface-variant: '#45464d'
  inverse-surface: '#31302b'
  inverse-on-surface: '#f4f0e7'
  outline: '#75777e'
  outline-variant: '#c5c6ce'
  surface-tint: '#525e7d'
  primary: '#000a24'
  on-primary: '#ffffff'
  primary-container: '#14213d'
  on-primary-container: '#7c89aa'
  inverse-primary: '#b9c6ea'
  secondary: '#78582f'
  on-secondary: '#ffffff'
  secondary-container: '#fed39f'
  on-secondary-container: '#795930'
  tertiary: '#120a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#2d2000'
  on-tertiary-container: '#a38543'
  error: '#B91C1C'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b9c6ea'
  on-primary-fixed: '#0d1b36'
  on-primary-fixed-variant: '#3a4664'
  secondary-fixed: '#ffddb7'
  secondary-fixed-dim: '#e9bf8d'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#5e411a'
  tertiary-fixed: '#ffdf9c'
  tertiary-fixed-dim: '#e4c279'
  on-tertiary-fixed: '#251a00'
  on-tertiary-fixed-variant: '#5a4304'
  background: '#fdf9f0'
  on-background: '#1c1c16'
  surface-variant: '#e6e2d9'
  surface-dark: '#0B1020'
  card: '#FFFFFF'
  text-primary: '#111827'
  text-muted: '#6B7280'
  border-warm: '#E5E0D6'
  success: '#166534'
  warning: '#B45309'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  margin-mobile: 20px
  margin-desktop: 48px
  gutter: 24px
  max-width: 1440px
---

## Brand & Style

The design system for this platform is built on the pillars of **authority, precision, and tranquility**. It caters to the South African legal market, where tradition meets a rapidly modernizing digital landscape. The brand personality is "The Sophisticated Advisor"—expert and unshakeable, yet accessible and clear.

The visual direction follows a **Corporate / Modern** style with **Minimalist** influences. It utilizes a spacious layout to reduce the cognitive load inherent in legal workflows. The aesthetic is defined by high-quality typography, a warm and prestigious color palette, and a focus on clarity over ornamentation. The "premium" feel is achieved through intentional whitespace, hairline borders, and a disciplined use of gold accents to denote value and success without being ostentatious.

## Colors

The color strategy uses **Deep Navy (#14213D)** as the anchor of stability and professional trust. This is balanced by a **Warm Off-white (#F7F3EA)** surface which provides a more comfortable, "paper-like" reading experience than pure white, subtly nodding to legal documents.

**Bronze (#8C6A3F)** and **Light Gold (#D6B56D)** are used as high-end accents for interactive elements, milestones, or premium features. The dark mode flips the hierarchy, utilizing **Deep Midnight (#0B1020)** as the primary background to maintain depth and sophistication in low-light environments. Semantic colors (Success, Warning, Error) are desaturated to ensure they fit within the elegant palette without appearing jarring.

## Typography

This design system utilizes **Inter** exclusively to provide a systematic, clean, and highly legible interface. The premium character is derived from wide tracking in labels and generous line-heights in body text. 

Headlines use a semi-bold weight with tight letter spacing to create a confident, "editorial" look. Body text is optimized for long-form reading—essential for legal briefs and case management—with a 1.5x line-height ratio. Labels use uppercase styling and increased tracking to create clear hierarchy for metadata and timestamps.

## Layout & Spacing

The layout philosophy is centered on **Focus**. We utilize a **fixed grid** for the main content area (max-width 1440px) to ensure that line lengths for legal text remain within optimal readability ranges. 

A 12-column grid is used for desktop layouts with a wide 48px margin to give the interface a "spacious" and high-end feel. Spacing follows an 8px linear scale. For complex case dashboards, we prioritize dynamic padding over rigid grids to allow data tables and document viewers to breathe. Mobile views transition to a single-column layout with 20px margins to maintain the elegant airy feel on smaller screens.

## Elevation & Depth

To maintain a sophisticated aesthetic, this design system avoids heavy shadows. Instead, it uses **Tonal Layers** and **Soft Professional Shadows**. 

The background uses the Surface color (#F7F3EA), while primary content containers use the pure white Card color (#FFFFFF). Depth is signaled via subtle 1px borders in `border-warm` (#E5E0D6). 

Shadows are "Airy":
- **Level 1 (Cards):** `0px 4px 12px rgba(20, 33, 61, 0.04)` — A very faint navy-tinted shadow.
- **Level 2 (Modals/Dropdowns):** `0px 12px 32px rgba(20, 33, 61, 0.08)` — Deeper but still soft, ensuring the element feels like it is floating gently above the surface.

## Shapes

The shape language is **Rounded**, striking a balance between modern software and the traditional "rounded" edges of premium stationery. 

- UI elements like buttons and inputs use a **0.5rem (8px)** radius.
- Cards and larger containers use **1rem (16px)**.
- Tags and Chips use a full pill-shape to distinguish them from interactive buttons.
- Borders are kept consistently thin (1px) to maintain a refined, high-fidelity appearance.

## Components

### Buttons
- **Primary:** Deep Navy (#14213D) with white text. High-contrast, authoritative.
- **Secondary:** Bronze (#8C6A3F) with a subtle gradient (top to bottom) towards Light Gold (#D6B56D) for "Action" items like "Generate Contract."
- **Tertiary:** Ghost style with `border-warm` and Primary text.

### Cards
Cards are the primary container for cases and tasks. They feature a white background, 16px corner radius, and 1px `border-warm` stroke. They should include generous 32px internal padding to reflect the "spacious" brand promise.

### Input Fields
Inputs use the Surface color as a subtle background fill with a 1px `border-warm` outline. On focus, the border transitions to Primary Navy. Labels are always placed above the field in `label-md` style.

### Lists & Data Tables
Legal data is dense. Tables should use hairline horizontal dividers only (no vertical lines) and `body-sm` typography. Row hovering should use a very faint version of the Primary color (2% opacity) to guide the eye.

### Distinctive Elements
- **Case Status Chips:** Pill-shaped with low-saturation backgrounds of Success/Error/Warning colors.
- **Progress Indicators:** Use the Bronze-to-Gold gradient for billable hour tracking or document completion stages.
- **Vertical Timeline:** A refined 1px vertical line for case histories, using the Deep Navy for completed milestones and Bronze for the "Current" status.
"tag: db brand

#### Core Brand Colors 
```css
:root {{
  /* Primary Brand Blue - Most prominent in visual hierarchy */
  --accent--ui-accent: #61525a;        /* Primary interactive grey */
  --accent--tab: #61525a;              /* Navigation and key UI elements */
  --color--accent--line-solid: #5f9dff; /* Solid accent lines */
  --color--accent--line: #5f9dff66;    /* Semi-transparent accent lines */
  
  /* Core Text Colors */
  --text--text-light: #1e1919;         /* Primary text on light backgrounds */
  --text--text-dark: white;            /* Primary text on dark backgrounds */
  --text--base: #1a1918;               /* Base text color */
  --text--text-subtle-light: #736c64;  /* Subtle text on light backgrounds */
  --text--text-subtle-dark: #bbb5ae;   /* Subtle text on dark backgrounds */
  
  /* Surface Colors */
  --surface--background-dark: #1e1919; /* Dark background surfaces */
  --white: white;                      /* Primary white */
  --color--accent--coconut: #f7f5f2;   /* Off-white/cream background */
}}
```

**Color Usage Guidelines:**
- **Primary Brand**: Use `--accent--ui-accent` (#61525a) for primary CTAs and navigation
- **Navigation Grid**: Each section uses specific identity colors (blue, yellow, cyan, orange, green, purple)
- **Text Hierarchy**: Light text on light backgrounds, dark text on dark backgrounds
- **Contrast**: Each identity color has corresponding "on-" colors for proper contrast
- **Extended Palette**: Use accent colors for illustrations, decorative elements, and secondary interactions

---

## Typography System

### Font Stack
```css
/* Primary Font Family */
font-family: Dbsharpgroteskvariable Vf, Arial, sans-serif;

/* Monospace (for code) */
font-family: Noto Sans Mono, monospace;

/* System Fallbacks */
font-family: Atlasgrotesk Web, Arial, sans-serif; /* Alternative primary */
font-family: Helvetica Neue, Helvetica, Ubuntu, Segoe UI, Verdana, sans-serif; /* System fallback */
```

### Font Scale Specifications
Based on CSS analysis and visual inspection:

```css
/* Heading Scale */
h1 {{
  font-size: 38px;
  line-height: 44px;
  font-weight: bold;
  font-family: Dbsharpgroteskvariable Vf, Arial, sans-serif;
}}

h2 {{
  font-size: 32px;
  line-height: 36px;
  font-weight: bold;
  font-family: Dbsharpgroteskvariable Vf, Arial, sans-serif;
}}

h3 {{
  font-size: 24px;
  line-height: 30px;
  font-weight: bold;
  font-family: Dbsharpgroteskvariable Vf, Arial, sans-serif;
}}

h4 {{
  font-size: 18px;
  line-height: 24px;
  font-weight: bold;
  font-family: Dbsharpgroteskvariable Vf, Arial, sans-serif;
}}

h5 {{
  font-size: 14px;
  line-height: 20px;
  font-weight: bold;
  font-family: Dbsharpgroteskvariable Vf, Arial, sans-serif;
}}

h6 {{
  font-size: 12px;
  font-weight: bold;
  font-family: Dbsharpgroteskvariable Vf, Arial, sans-serif;
}}

/* Special Typography Classes */
.text-width {{
  font-size: min(8vw, 200px);
  line-height: min(8vw, 200px);
  font-weight: 500;
  font-variation-settings: "wght" 250;
  font-family: Dbsharpgroteskvariable Vf, Arial, sans-serif;
}}

.text-weight {{
  font-size: min(8vw, 200px);
  line-height: min(8vw, 200px);
  font-weight: 500;
  font-family: Dbsharpgroteskvariable Vf, Arial, sans-serif;
}}

/* Mobile Typography Adjustments */
@media (max-width: 991px) {{
  .text-width, .text-weight {{
    font-size: min(40vw, 500px);
    line-height: min(20vw, 500px);
  }}
}}
```

### Text Color Applications
```css
/* Text Color Classes */
.text-subtle {{
  color: var(--text--text-subtle-light); /* #736c64 */
}}

.text-subtle-dark {{
  color: var(--text--text-subtle-dark); /* #bbb5ae */
}}

/* Base text colors applied contextually */
color: var(--text--text-light);  /* On light backgrounds */
color: var(--text--text-dark);   /* On dark backgrounds */
```

---

## Layout Structure

### Grid-Based Navigation System

The website features a sophisticated 12-column grid system with dynamic tile-based navigation:

#### 1. Hero Section
- **Background**: Clean white/off-white (`--color--accent--coconut`: #f7f5f2)
- **Central Logo**: Animated brand logo with grey accent (`--accent--tab`: #61525a)
- **Main Message**: Large typography with brand blue color
- **Animation**: Logo draw-in effect with stroke-to-fill transition

#### 2. Navigation Grid (Primary Feature)
The website's main navigation is a vibrant grid system with 8 main sections:

```css
.nav-grid {{
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 0;
}}
```

**Navigation Sections with Colors:**
1. **Framework** - Dark navy (`--color--accent--navy`: #283750)
2. **Voice & Tone** - Brand yellow (`--color--identity--yellow`: #fad24b)
3. **Logo** - Brand cyan (`--color--identity--cyan`: #3dd3ee)
4. **Typography** - Brand orange/tangerine (`--color--accent--tangerine`: #ff8c19)
5. **Iconography** - Lime green (`--color--accent--lime`: #b4dc19)
6. **Color** - Orange (`--color--identity--red`: #fa551e) with blue accent
7. **Imagery** - Deep purple/plum (`--color--accent--plum`: #78286e)
8. **Motion** - Light purple (`--color--identity--purple`: #c8aff0)

#### 3. Grid Lines and Interactive Elements
```css
/* Grid line animations */
.tile-line {{
  background-color: var(--accent--tab); /* Blue accent lines */
  transform-origin: varies by direction;
  transition: transform timing;
}}

/* Navigation tile hover states */
.nav-tile:hover {{
  /* Interactive states with smooth transitions */
  transition: opacity, transform;
}}
```

### Responsive Design

#### Breakpoints
```css
/* Mobile adjustments */
@media (max-width: 991px) {{
  /* Navigation adjustments */
  .nav-container.final .home-logo-container {{
    width: 66px;
    height: 66px;
    left: 32px;
    bottom: 31.5px;
  }}
  
  /* Typography scaling */
  .text-width, .text-weight {{
    font-size: min(40vw, 500px);
    line-height: min(20vw, 500px);
  }}
}}
```

#### Mobile Layout Adaptations
- Grid navigation becomes more condensed
- Typography scales responsively using `min()` functions
- Logo sizing adjusts proportionally
- Spacing reduces for mobile viewport

---

## Design Patterns & Components

### 1. Navigation Tiles
```css
.nav-tile {{
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}}

.nav-tile-content {{
  padding: 40px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}}
```

**Tile Specifications:**
- **Minimum Height**: Responsive based on viewport
- **Content Alignment**: Center-aligned text and icons
- **Interactive States**: Hover effects with opacity and transform changes
- **Color System**: Each tile uses specific brand identity colors

### 2. Logo Animation System
```css
/* Logo draw-in animation */
.home-logo path {{
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 1000 1000;
  stroke-dashoffset: 1000;
  fill: currentColor;
  fill-opacity: 0;
  stroke-width: 1px;
  stroke: var(--accent--tab);
  animation: drawIn 1.25s cubic-bezier(.4,0,.3,1) forwards 0.5s;
}}

@keyframes drawIn {{
  to {{
    stroke-dashoffset: 0;
  }}
}}

/* Logo positioning and sizing transitions */
.nav-container.final .home-logo-container {{
  width: 91px;
  height: 91px;
  left: 45px;
  bottom: 44.5px;
  transition: width 1.5s cubic-bezier(.5,0,0.05,1) 1s, 
              height 1.5s cubic-bezier(.5,0,0.05,1) 1s, 
              left 1.25s cubic-bezier(.5,0,0.3,1) 1.25s, 
              bottom 1.25s cubic-bezier(.5,0,0.3,1) 1.25s;
}}
```

### 3. Grid Line System
```css
/* Animated grid lines */
.tile-line.nav-l, .tile-line.nav-r {{
  height: 100vh;
  transform: translate(0, -50%) scaleY(0);
}}

.tile-line.nav-t, .tile-line.nav-b {{
  width: 100vw;
  transform: translate(50%, 0) scaleX(0);
}}

/* Animation states */
.menu .tile-line {{
  background-color: var(--accent--tab);
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}}
```

---

## Animation Guidelines

### 1. Page Load Sequence
1. **Logo Draw-in**: 1.25s duration with cubic-bezier(.4,0,.3,1)
2. **Logo Movement**: 1.5s positioning transition
3. **Grid Line Reveal**: Staggered appearance
4. **Content Fade-in**: Final content appearance

### 2. Interactive Animations
```css
/* Smooth transitions for interactive elements */
transition-duration: 0.3s;
transition-timing-function: ease-in-out;

/* Hover state transforms */
transform: scale(1.02);
opacity: 0.9;
```

### 3. Custom Cursor Effects
```css
/* Custom cursors for different sections */
cursor: url("...cursor.svg") 4 4, auto;
cursor: url("...color-picker.svg") 0 24, auto;
```
## Technical Specifications Summary

**Built with**: Webflow CMS
**Font System**: Dbsharpgroteskvariable Vf (Variable Font)
**Color Variables**: 40+ custom CSS properties
**Grid System**: CSS Grid with 12-column layout
**Animation Engine**: CSS transforms and keyframes
**Responsive Strategy**: Mobile-first with min/max functions
**Performance**: Optimized font loading and image delivery
"
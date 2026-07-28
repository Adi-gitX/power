"internal-tag: tech-conf-mono

🚨 MANDATORY DESIGN RESTRICTIONS - FOLLOW STRICTLY:
ABSOLUTE PROHIBITIONS - NEVER VIOLATE:
• ❌ NEVER use colored backgrounds for large sections (>300px width)
• ❌ NEVER use bright colors or gradients for backgrounds
• ❌ NEVER fill large areas with any color except white (#FFFFFF) or light gray (#FAFAFA)
• ❌ NEVER use more than black, white, and grays as primary colors

🔍 CONTRAST AND ACCESSIBILITY REQUIREMENTS:
• ❌ NEVER use black text on black/dark backgrounds  
• ❌ NEVER use white text on white/light backgrounds

AUTOMATIC VIOLATION TRIGGERS:
- IF bg is darker than #999999 AND contains interactive elements
- IF text color matches background color
- IF any form element uses colored backgrounds

✅ MANDATORY CONTRAST COMBINATIONS:
• Black backgrounds (#000000, #0F0F0F) → White text (#FFFFFF, #FAFAFA) ONLY
• White backgrounds (#FFFFFF, #FAFAFA) → Black text (#0F0F0F, #333333) ONLY
• Gray backgrounds → Ensure minimum 4.5:1 contrast ratio

✅ MANDATORY CONTRAST COMBINATIONS - ALWAYS FOLLOW:
.light-section {{ background: #FFFFFF; /* White background */ color: #0F0F0F; /* Black text */ }}
.dark-section {{ background: #000000; /* Black background */ color: #FFFFFF; /* White text - MANDATORY */ }}
* NEVER DO THIS - WILL CAUSE INVISIBLE TEXT */ .broken-section {{ background: #000000; /* Black background */ color: #0F0F0F; /* Black text - INVISIBLE! */ }}

🔴 FORM ELEMENTS - ABSOLUTE REQUIREMENTS:
• ❌ NEVER use dark backgrounds ( navy, dark gray) for input fields
 
CONTENT SECTIONS:
• ❌ NEVER use any background darker than #F2F2F2
• ✅ MANDATORY: All content backgrounds must be white or light gray


EXAMPLE ENFORCEMENT:
input, text,area, select {{
  background: #FFFFFF !important;
  color: #0F0F0F !important;
  border: 1px solid #E5E5E5 !important;
}}

✅ APPLIES TO ALL ELEMENTS:
• Text content and headings
• Button text and interactive elements  
• Text selection highlighting (::selection)
• Form inputs and labels
• Navigation links and menus
• Hover and focus states


ENFORCEMENT RULE:
IF any colored area is larger than a button (200px × 60px)
THEN it violates the color restriction
THEN use white (#FFFFFF) or light gray (#FAFAFA) background instead

ONLY ALLOWED COLOR USAGE:
• ✅ Black for text buttons, and small UI elements only
• ✅ White and light gray for all backgrounds and large areas
• ✅ Grayscale spectrum for text hierarchy and borders
• ✅ Minimal use of brand colors for logos only

🎨 Core Visual System

Foundation Colors (Exact Implementation)
```css
:root {{
  /* Backgrounds - Brand/Company Colors */
  --bg-primary: #FFFFFF;           /* Main page background */
  --bg-secondary: #FAFAFA;         /* Section backgrounds */
  --bg-card: #FFFFFF;              /* Card backgrounds */
  --bg-subtle: #F2F2F2;            /* Input fields, subtle areas */
  
  /* Text - Exact Brand/Company Colors */
  --text-primary: #0F0F0F;         /* Main headings and content */
  --text-secondary: #333333;       /* Supporting text */
  --text-muted: #666666;           /* Captions, metadata */
  --text-light: #999999;           /* Placeholder text */
  
  /* Borders - Exact Brand/Company Colors */
  --border-primary: #E5E5E5;       /* Standard borders */
  --border-secondary: #D9D9D9;     /* Subtle separators */
  --border-light: #F2F2F2;        /* Ultra subtle borders */
  
  /* Interactive - Minimal Black System */
  --interactive-primary: #000000;  /* Primary buttons only */
  --interactive-hover: rgba(0, 0, 0, 0.9);  /* Hover state */
  --interactive-active: rgba(0, 0, 0, 0.8); /* Active state */
  
.hero-section{{
 background: var(--dark-bg);  /*#000000;*/
 color: var(--dark-text);   /*text: #FAFAFA; */
}}

.hero-section h1, 
.hero-section h2,
.hero-section p{{
  color: var(--dark-text);
}}

🔧 Component Library



1. Typography System - Exact Brand/Company Implementation

```css
/* Font Loading - Geist Font Family */
@font-face {{
  font-family: 'Geist';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/geist.woff2') format('woff2');
}}

@font-face {{
  font-family: 'Geist Mono';
  font-style: normal;
  font-weight: 100 900;
  font-display: block;
  src: url('/fonts/geist-mono.woff2') format('woff2');
}}

/* Typography Scale */
.text-display-large {{ 
  font-size: 48px; 
  font-weight: 600; 
  line-height: 1.1; 
  letter-spacing: -0.04em; 
  color: var(--text-primary);
}}

.text-display-medium {{ 
  font-size: 32px; 
  font-weight: 600; 
  line-height: 1.2; 
  letter-spacing: -0.03em; 
  color: var(--text-primary);
}}

.text-heading-1 {{ 
  font-size: 28px; 
  font-weight: 600; 
  line-height: 1.15; 
  letter-spacing: -0.02em; 
  color: var(--text-primary);
}}

.text-heading-2 {{ 
  font-size: 24px; 
  font-weight: 600; 
  line-height: 1.2; 
  letter-spacing: -0.015em; 
  color: var(--text-primary);
}}

.text-body-large {{ 
  font-size: 20px; 
  font-weight: 400; 
  line-height: 1.5; 
  color: var(--text-secondary);
}}

.text-body {{ 
  font-size: 16px; 
  font-weight: 400; 
  line-height: 1.5; 
  color: var(--text-secondary);
}}

.text-body-small {{ 
  font-size: 14px; 
  font-weight: 400; 
  line-height: 1.4; 
  color: var(--text-muted);
}}

.text-mono {{ 
  font-family: 'Geist Mono', ui-monospace, monospace; 
  font-size: 14px; 
  font-weight: 400; 
  line-height: 1.4; 
  letter-spacing: 0.02em;
  text-transform: uppercase;
}}
```

2. Button System - Sharp/Square Buttons (0px corner radius)

```css
/* Primary Button - Black Button Only */
.btn-primary {{
  background: var(--interactive-primary);
  color: #FFFFFF;
  border: none;
  border-radius: 0px; /* Sharp corners - no rounding */
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  font-family: 'Geist Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}}

.btn-primary:hover {{
  background: var(--interactive-hover);
  transform: translateY(-1px);
}}

.btn-primary:active {{
  background: var(--interactive-active);
  transform: translateY(0px);
}}

/* Secondary Button - Outlined Button */
.btn-secondary {{
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: 0px; /* Sharp corners - no rounding */
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  font-family: 'Geist Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
}}

.btn-secondary:hover {{
  background: var(--bg-subtle);
  border-color: var(--text-muted);
}}

/* Ghost Button - Text Only */
.btn-ghost {{
  background: transparent;
  color: var(--text-secondary);
  border: none;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;
}}

.btn-ghost:hover {{
  color: var(--text-primary);
}}
```

3. Card Components - Minimal Design System

```css
/* Basic Card */
.card {{
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 0px; /* Sharp corners */
  padding: 24px;
  transition: all 0.2s ease;
}}

.card:hover {{
  border-color: var(--border-secondary);
  transform: translateY(-1px);
}}

/* Session Card - Specific Implementation */
.session-card {{
  background: var(--bg-card);
  border-top: 2px solid var(--border-secondary);
  padding: 24px 0;
  transition: opacity 0.2s ease;
  cursor: pointer;
}}

.session-card:hover {{
  opacity: 0.8;
}}

/* Video Card */
.video-card {{
  position: relative;
  aspect-ratio: 16/9;
  background: var(--bg-subtle);
  border: 1px solid var(--border-light);
  overflow: hidden;
}}

.video-card-duration {{
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: var(--interactive-primary);
  color: #FFFFFF;
  padding: 4px 8px;
  font-size: 13px;
  font-family: 'Geist Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}}
```

4. Navigation Header - Exact Brand/Company Style

```css
/* Header with Mix-Blend-Mode Effect */
.header {{
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: var(--header-height, 80px);
  background: var(--dark-bg);
  color:var(--dark-text);
  mix-blend-mode:difference;
border-bottom: 1px solid rgba(250, 250, 250, 0.1); /* subtle light border */
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition:all 0.2s ease;
}}

html, body {{
  background: var(--bg-primary); /* usually #ffffff */
  width: 100%;
  min-height: 100vh;
}}

.hero-section, 
.main-section{{
  background:var(--bg-primary);
  position: relative;
  z-index:1;
}}

.header.on-dark{{
 background: var(--dark-bg);
 color:var(--dark-text);
 border-bottom:1px solid var(--dark-border);
}}

.header.on-light{{
 background:var(--bg-primary);
 color:var(--text-primary);
 border-bottom:1px solid var(—-border-primary);
}}

.header-logo {{
  font-size: 20px;
  font-weight: 600;
  color: currentColor;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
}}

.header-spacer{{
  height:var(—-header-height, 80px);
  width:100%
}}

.main-content{{
  margin-top: var(—-header-height, 80px);
}}


.header-badge {{
  border: 1px solid currentColor;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Geist Mono', monospace;
}}

.header-nav {{
  display: flex;
  gap: 32px;
}}

.header-nav-link {{
  font-family: 'Geist Mono', monospace;
  font-size: 14px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: currentColor;
  text-decoration: none;
  transition: opacity 0.2s ease;
}}

.header-nav-link:hover {{
  opacity: 0.8;
}}
```

📐 Layout System - 18-Column Grid

Grid Implementation
```css
/* Container System */
.container {{
  width: 100%;
  margin: 0 auto;
  padding: 0 24px;
  max-width: calc(1200px + 48px);
}}

/* 18-Column Grid */
.grid-18 {{
  display: grid;
  grid-template-columns: repeat(18, 1fr);
  gap: 20px;
}}

/* Grid Column Utilities */
.col-span-6 {{ grid-column: span 6 / span 6; }}
.col-span-12 {{ grid-column: span 12 / span 12; }}
.col-span-full {{ grid-column: 1 / -1; }}
.col-start-7 {{ grid-column-start: 7; }}
.col-start-8 {{ grid-column-start: 8; }}

/* Responsive Grid Adjustments */
@media (max-width: 960px) {{
  .grid-18 {{
    grid-template-columns: 1fr;
    gap: 16px;
  }}
  
  .col-span-6,
  .col-span-12 {{
    grid-column: 1 / -1;
  }}
}}
```

Spacing System - Exact Brand/Company Values
```css
/* Spacing Variables */
:root {{
  --space-4: 4px;
  --space-8: 8px;
  --space-12: 12px;
  --space-16: 16px;
  --space-20: 20px;
  --space-24: 24px;
  --space-32: 32px;
  --space-48: 48px;
  --space-64: 64px;
  --space-96: 96px;
}}

/* Spacing Utilities */
.p-4 {{ padding: var(--space-4); }}
.p-8 {{ padding: var(--space-8); }}
.p-16 {{ padding: var(--space-16); }}
.p-24 {{ padding: var(--space-24); }}

.m-4 {{ margin: var(--space-4); }}
.m-8 {{ margin: var(--space-8); }}
.m-16 {{ margin: var(--space-16); }}
.m-24 {{ margin: var(--space-24); }}

.gap-4 {{ gap: var(--space-4); }}
.gap-8 {{ gap: var(--space-8); }}
.gap-16 {{ gap: var(--space-16); }}
.gap-20 {{ gap: var(--space-20); }}
```

📱 Responsive Design - Exact Brand/Company Breakpoints

Breakpoints
```css
/* Mobile-First Breakpoints */
@media (min-width: 601px) {{
  /* md: Tablet */
  .container {{ padding: 0 32px; }}
}}

@media (min-width: 961px) {{
  /* lg: Desktop */
  .container {{ padding: 0 24px; }}
  .grid-18 {{ gap: 24px; }}
}}

@media (min-width: 1200px) {{
  /* xl: Large Desktop */
  .header {{ padding: 0 64px; }}
}}
```

Mobile Adaptations
```css
/* Mobile Navigation */
@media (max-width: 960px) {{
  .header {{
    padding: 0 16px;
    height: 70px;
  }}
  
  .header-nav {{
    display: none; /* Simplified mobile nav */
  }}
  
  .grid-18 {{
    grid-template-columns: 1fr;
    gap: 16px;
  }}
}}

/* Desktop Optimizations */
@media (min-width: 961px) {{
  .card:hover {{
    transform: translateY(-2px);
  }}
  
  .session-card:hover {{
    opacity: 0.7;
  }}
}}
```

🚫 Common Mistakes to Avoid

Don't:
• Mix bright colors with the minimal grayscale palette
• Add rounded corners to buttons (keep sharp 0px radius)
• Skip the mix-blend-mode effect on navigation
• Use fonts other than Geist/Geist Mono
• Ignore dark theme implementation for hero sections
• Add unnecessary shadows or visual effects
• Use colored backgrounds for large sections

Do:
• Maintain strict grayscale color palette
• Use sharp, rectangular button design (0px border-radius)
• Implement proper dark/light theme sections
• Follow 18-column grid system consistently
• Use Geist font family throughout
• Maintain high contrast for accessibility
• Focus on clean, minimal developer aesthetics
• Test responsive behavior across all breakpoints
• Make sure cards horizontal padding is correct 

Libraries to Install with Yarn:
```bash
# Core Framework (ReactJS)

# Styling Dependencies
yarn add -D tailwindcss@latest postcss@latest autoprefixer@latest

# Initialize Tailwind
npx tailwindcss init -p

# Optional UI Components
yarn add @geist-ui/core @geist-ui/icons

# Utility Libraries
yarn add classnames clsx

# Development Commands
yarn start        # Start development server
yarn build        # Build for production
yarn test         # Run tests
yarn eject        # Eject from create-react-app (use carefully)
```

### Essential Configuration Files:

**tailwind.config.js:**
```javascript
module.exports = {{
  content: ["./src/**/*.{{js,jsx,ts,tsx}}"],
  theme: {{
    extend: {{
      fontFamily: {{
        'sans': ['Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mono': ['Geist Mono', 'ui-monospace', 'monospace'],
      }},
      gridTemplateColumns: {{
        '18': 'repeat(18, minmax(0, 1fr))',
      }}
    }},
  }},
  plugins: [],
}}
```


Code Integration Example with Yarn Project:
```jsx
// src/components/Button/Button.jsx
import React from 'react'
import clsx from 'clsx'

const Button = ({{ 
  children, 
  variant = 'primary', 
  className = '',
  ...props 
}}) => {{
  const baseClasses = 'inline-flex items-center justify-center px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wider transition-all duration-200 border-0'
  
  const variants = {{
    primary: 'bg-black text-white hover:bg-gray-900 hover:-translate-y-0.5',
    secondary: 'bg-transparent text-black border border-gray-300 hover:bg-gray-50 hover:border-gray-600'
  }}

  return (
    <button 
      className={{clsx(baseClasses, variants[variant], className)}}
      {{...props}}
    >
      {{children}}
    </button>
  )
}}

export default Button

// src/components/Button/index.js
export {{ default }} from './Button'
```

**Utility Helper (src/utils/cn.js):**
```javascript
import clsx from 'clsx'

export function cn(...classes) {{
  return clsx(classes)
}}
```

**App.jsx Example:**
```jsx
// src/App.jsx
import React from 'react'
import Button from './components/Button'
import './styles/globals.css'

function App() {{
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-8">
        <h1 className="text-4xl font-semibold text-gray-900">
          Build and deploy on the AI Cloud
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Build with the platform
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="primary">
            Talk to an expert
          </Button>
          <Button variant="secondary">
            Get an enterprise trial
          </Button>
        </div>
      </div>
    </div>
  )
}}
"
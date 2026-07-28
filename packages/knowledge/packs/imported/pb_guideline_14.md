internal-tag: green-dark-theme
🚨 MANDATORY COLOR RESTRICTION - THE 90/10 RULE
ABSOLUTE PROHIBITIONS - NEVER VIOLATE:
	•	❌ NEVER use light backgrounds for main sections or large areas
	•	❌ NEVER use bright colors for anything larger than button-sized areas
	•	❌ NEVER use multiple accent colors simultaneously in large sections
	•	❌ NEVER fill large sections with any color except black (#000000)
ENFORCEMENT RULE:
IF any colored area is larger than 300px × 80px (button size)
THEN it violates the color restriction
THEN use black background instead
ONLY ALLOWED COLOR USAGE:
	•	✅ Buttons and CTAs only - small, focused interactive elements
	•	✅ Logo and brand marks - minimal brand identity elements
	•	✅ Small icons and indicators - tiny accent elements only
	•	✅ Thin borders or dividers - 1-2px maximum width

🎨 Core Visual System
Foundation Colors
```css
:root {{
  /* Backgrounds - Dark Theme Foundation */
  --bg-primary: #000000;           /* Main page background */
  --bg-secondary: #121212;         /* Card/section backgrounds */
  --bg-overlay: rgba(255, 255, 255, 0.1); /* Subtle overlays */
  
  /* Text - High Contrast for Dark Theme */
  --text-primary: #FFFFFF;         /* Main headings and content */
  --text-secondary: rgba(255, 255, 255, 0.85); /* Supporting text */
  --text-muted: #4D4D4D;           /* Muted text, navigation */
  
  /* Borders - Subtle Dark Theme */
  --border-subtle: rgba(255, 255, 255, 0.25); /* Subtle separators */
  --border-medium: rgba(255, 255, 255, 0.4);  /* Standard borders */
  
  /* MAIN ACCENT COLORS - Brand Colors Only */
  --brand-primary: #00FFD1;        /* Primary brand cyan-green */
  --brand-hover: rgba(0, 255, 209, 0.1); /* Hover backgrounds */
  --brand-active: #6FD2C0;         /* Active states */
}}
```

🔧 Component Library
1. Primary Buttons - Sharp edges button

```css
.btn-primary {{
  background: var(--brand-primary);
  color: #000000;
  border: none;
  border-radius: 0px; (sharp corners)
  padding: 14px 24px;
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.4s ease-in-out;
  min-height: 56px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  line-height: 1.2;
  letter-spacing: 0;
}}

.btn-primary:hover {{
  background: var(--brand-hover);
  color: var(--brand-primary);
}}

.btn-primary:active {{
  background: var(--brand-active);
  transform: scale(0.98);
}}
```

2. Secondary Buttons - Sharp edges button with Transparent Background

```css
.btn-secondary {{
  background: rgba(255, 255, 255, 0.1);
  color: #FFFFFF;
  border: none;
  border-radius: 0px; (sharp corners)
  padding: 14px 24px;
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.4s ease-in-out;
  min-height: 56px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  line-height: 1.2;
  letter-spacing: 0;
}}

.btn-secondary:hover {{
  background: #FFFFFF;
  color: #000000;
}}

.btn-secondary:active {{
  background: #F0F0F0;
  transform: scale(0.98);
}}
```

3. Navigation Header - Fixed Dark Header

```css
.dark-header {{
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-subtle);
  padding: 16px 7.6923%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: fixed;
  top: 0;
  width: 100%;
  height: 80px;
  z-index: 10;
  box-sizing: border-box;
}}

.dark-logo {{
  height: 40px;
  object-fit: contain;
  cursor: pointer;
}}

.dark-nav {{
  display: flex;
  align-items: center;
  gap: 32px;
}}

.dark-nav-link {{
  color: var(--text-muted);
  text-decoration: none;
  font-size: 18px;
  font-weight: 400;
  transition: color 0.3s ease;
}}

.dark-nav-link:hover {{
  color: var(--text-primary);
}}

.dark-nav-link.active {{
  color: var(--brand-active);
}}
```

📐 Layout System - Dark Theme Grid
Grid Layout with Pattern Overlay

```css
.dark-container {{
  background: var(--bg-primary);
  background-image: 
    repeating-linear-gradient(0deg, transparent, transparent 1px, transparent 1px, transparent 7.6923%),
    repeating-linear-gradient(-90deg, #fff, #fff 1px, transparent 1px, transparent 7.6923%);
  background-size: 100% 100%;
  opacity: 0.14;
  position: relative;
  min-height: 100vh;
  padding: 80px 7.6923% 0;
}}

.dark-grid {{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 60px 40px;
  padding: 60px 0;
  max-width: 1400px;
  margin: 0 auto;
}}
```

Spacing System - Large Scale Spacing

```css
/* Dark theme uses larger, more dramatic spacing */
.space-large {{ margin: 60px; }}     /* Large spacing */
.space-xlarge {{ margin: 100px; }}   /* Extra large spacing */
.space-xxlarge {{ margin: 160px; }}  /* Major section spacing */

/* Padding versions */
.pad-large {{ padding: 60px; }}
.pad-xlarge {{ padding: 100px; }}
.pad-xxlarge {{ padding: 160px; }}
```

Container System - Full Width Dark Theme

```css
.dark-full-container {{
  width: 100%;
  margin: 0;
  padding: 0 7.6923%;
  background: var(--bg-primary);
}}

.dark-content-container {{
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}}
```

📱 Responsive Design - Dark Theme Breakpoints
Breakpoints

```css
/* Dark theme breakpoints */
@media (min-width: 768px) {{
  /* Tablet */
  .dark-header {{
    padding: 16px 5%;
  }}
  
  .dark-grid {{
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 40px 30px;
  }}
}}

@media (min-width: 1200px) {{
  /* Desktop */
  .dark-header {{
    padding: 16px 7.6923%;
  }}
  
  .dark-grid {{
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 60px 40px;
  }}
}}
```

Mobile Dark Theme

```css
@media (max-width: 767px) {{
  .dark-header {{
    padding: 16px 20px;
    height: 70px;
  }}
  
  .dark-nav {{
    display: none;
  }}
  
  .dark-grid {{
    grid-template-columns: 1fr;
    gap: 40px;
    padding: 40px 0;
  }}
  
  .dark-container {{
    padding: 70px 20px 0;
  }}
}}
```

🚫 Common Mistakes to Avoid
Don't:
	•	Use this system for light-themed websites
	•	Mix light and dark themes inconsistently
	•	Use low contrast text on dark backgrounds
	•	Forget to test readability in dark environments
	•	Skip proper focus indicators for dark theme
	•	Use bright colors for large areas
	•	Make text smaller than 16px on dark backgrounds
	•	Forget to optimize for OLED screens

Do:
	•	Maintain high contrast for accessibility
	•	Use the dark theme color system consistently
	•	Test on actual dark environments
	•	Provide proper focus indicators
	•	Use subtle animations and transitions
	•	Keep large areas dark with accent colors for interaction
	•	Optimize for both LCD and OLED displays

📝 Typography System - Dark Theme
Font Setup
```css
/* Dark theme typography with high contrast */
@font-face {{
  font-family: 'KodeMono';
  src: url('/fonts/KodeMono-VariableFont_wght.ttf') format('truetype');
  font-weight: 100 1000;
  font-display: swap;
}}

body {{
  font-family: 'KodeMono', 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}}
```

Typography Scale - High Contrast Dark Theme
```css
/* Display Headlines - Extra Large for Dark Theme Impact */
.display-huge {{ font-size: 66px; font-weight: 600; line-height: 1.1; letter-spacing: -0.62px; color: var(--text-primary); }}
.display-large {{ font-size: 48px; font-weight: 600; line-height: 1.1; letter-spacing: -0.02em; color: var(--text-primary); }}
.display-medium {{ font-size: 32px; font-weight: 600; line-height: 1.25; letter-spacing: -0.01em; color: var(--text-primary); }}

/* Headings - Strong Hierarchy */
.heading-1 {{ font-size: 28px; font-weight: 600; line-height: 1.2; letter-spacing: -0.005em; color: var(--text-primary); }}
.heading-2 {{ font-size: 24px; font-weight: 600; line-height: 1.3; letter-spacing: -0.02em; color: var(--text-primary); }}
.heading-3 {{ font-size: 20px; font-weight: 600; line-height: 1.4; letter-spacing: 0; color: var(--text-primary); }}

/* Body text - Readable on Dark */
.body-large {{ font-size: 20px; font-weight: 500; line-height: 1.5; letter-spacing: 0; color: var(--text-primary); }}
.body-medium {{ font-size: 18px; font-weight: 400; line-height: 1.5; letter-spacing: 0; color: var(--text-secondary); }}
.body-small {{ font-size: 16px; font-weight: 400; line-height: 1.4; letter-spacing: 0; color: var(--text-secondary); }}
.body-muted {{ font-size: 16px; font-weight: 400; line-height: 1.4; letter-spacing: 0; color: var(--text-muted); }}

/* Interactive elements */
.button-text {{ font-size: 18px; font-weight: 500; line-height: 1.2; letter-spacing: 0; }}
.nav-text {{ font-size: 18px; font-weight: 400; line-height: 1.4; letter-spacing: 0; }}
```

🎭 Animation System - Dark Theme
Smooth Transitions
```css
/* Dark theme animations - smooth and subtle */
.dark-transition {{
  transition: all 0.4s ease-in-out;
}}

.dark-hover:hover {{
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 255, 209, 0.2);
}}

.dark-button-animate {{
  transition: all 0.4s ease-in-out;
}}

.dark-button-animate:hover {{
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(0, 255, 209, 0.3);
}}
```


#Spline integration

1. Install packages:
   yarn add @splinetool/react-spline@latest @splinetool/runtime@latest

2. Basic usage:
   Create a simple Spline component.

import Spline from '@splinetool/react-spline';

export default function Home() {
  return (
    <main>
      <Spline
        scene="https://prod.spline.design/NbVmy6DPLhY-5Lvg/scene.splinecode" 
      />
    </main>
  );
}


// #when to use spline

// - If user mentions "dark-themed", "cryptocurrency", "ai", "3d",
//   then use the neon balls spline integration.

const userTags = ["dark-themed", "crypto"]; // example tags from user
const shouldUseNeonBallsSpline = userTags.some(tag =>
  ["dark-themed", "cryptocurrency", "ai", "3d"].includes(tag)
);

// #how to use spline
// - Use the NeonBalls integration whenever these tags are present.
// - Always embed it inside the right-side of your existing split screen layout.
// - It should have a fixed height and width.

export function MySplitScreenPage() {
  return (
    <main style={{ display: "flex" }}>
      <div style={{ flex: 1 }}>
        {/* Left side content */}
      </div>

      <div style={{ flex: 1 }}>
        {shouldUseNeonBallsSpline && (
          <div style={{ width: “700px", height: “700px”, , overflow: “visible”, position: “relative”  }}>
            <Spline scene="https://prod.spline.design/NbVmy6DPLhY-5Lvg/scene.splinecode" 

          </div>
        )}
      </div>
    </main>
  );
}
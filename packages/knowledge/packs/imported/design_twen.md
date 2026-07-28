'internal-tag: twen

🎨 Core Visual System
Foundation Colors (Never Change)
:root {{
  /* Monochromatic Base */
  
  --color-background: #F2F2F2;          /* Main background - light gray */
  --bg-white: #FFFFFF;                  /* Pure white cards */
  --text-primary: #232323;              /* Main text color */
  --text-secondary: rgba(35, 35, 35, 0.7); /* Secondary text */
  --border-color: #232323;              /* Sharp borders */
  --border-light: rgba(35, 35, 35, 0.1); /* Subtle borders */
  
  /* Neon Green Accent System */
  --accent-primary: #38FF62;            /* Bright neon green */
  --accent-hover: #2AE052;              /* Hover state */
  --accent-active: #1DC943;             /* Active state */
  --accent-foreground: #232323;         /* Text on green */
  
  /* Minimal Functional Colors */
  --color-success: #38FF62;             /* Success = brand green */
  --color-error: #FF3838;               /* Error red */
  --color-warning: #FFB838;             /* Warning orange */
  --color-disabled: rgba(35, 35, 35, 0.3); /* Disabled state */
}}
Typography System
/* Font Loading - Custom Fonts Required */
@font-face {{
  font-family: 'Parabole';
  src: url('./fonts/Parabole.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
}}

@font-face {{
  font-family: 'PPNeueMontrealTT-Book';
  src: url('./fonts/PPNeueMontrealTT-Book.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
}}

@font-face {{
  font-family: 'PPSupplyMono-Regular';
  src: url('./fonts/PPSupplyMono-Regular.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
}}

/* Typography Scale */
.hero-title {{ 
  font-family: 'Parabole', ui-sans-serif, system-ui, sans-serif; 
  font-size: clamp(60px, 15vw, 280px); 
  font-weight: 400; 
  color: var(--text-primary); 
  line-height: 1; 
  text-transform: uppercase; 
  letter-spacing: 0;
  /* ⚠️ WARNING: ONLY use for HERO section main titles - NEVER for navigation headers */
}}

.header-logo {{
  font-family: 'PPSupplyMono-Regular', ui-monospace, monospace;
  font-size: 24px;
  font-weight: 400;
  color: var(--text-primary);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  /* ✅ CORRECT: Use for navigation header logos and footer logos */
}}

.title-big {{ 
  font-family: 'Parabole', ui-sans-serif, system-ui, sans-serif; 
  font-size: clamp(40px, 8vw, 150px); 
  font-weight: 400; 
  color: var(--text-primary); 
  line-height: 1; 
  text-transform: uppercase;
  /* ✅ CORRECT: Use for section headings like "OUR SERVICES", "RECENT PROJECTS" */
}}

.text-big {{ 
  font-family: 'PPNeueMontrealTT-Book', ui-sans-serif, system-ui, sans-serif; 
  font-size: clamp(32px, 6vw, 84px); 
  font-weight: 400; 
  color: var(--text-primary); 
  line-height: 1.07;
  /* ✅ CORRECT: Use for large descriptive text and hero subtitles */
}}

.text-regular {{ 
  font-family: 'PPNeueMontrealTT-Book', ui-sans-serif, system-ui, sans-serif; 
  font-size: clamp(16px, 2.5vw, 30px); 
  font-weight: 400; 
  color: var(--text-primary); 
  line-height: 1.2;
  /* ✅ CORRECT: Use for card titles, project names, service titles */
}}

.text-body {{ 
  font-family: 'PPNeueMontrealTT-Book', ui-sans-serif, system-ui, sans-serif; 
  font-size: clamp(14px, 1.8vw, 18px); 
  font-weight: 400; 
  color: var(--text-primary); 
  line-height: 1.33;
  /* ✅ CORRECT: Use for body text, descriptions, form labels */
}}

.label {{ 
  font-family: 'PPSupplyMono-Regular', ui-monospace, monospace; 
  font-size: clamp(10px, 1.5vw, 18px); 
  font-weight: 400; 
  color: var(--text-primary); 
  line-height: 1; 
  text-transform: uppercase; 
  letter-spacing: 0.05em;
  /* ✅ CORRECT: Use for section labels like "WHAT WE DO", "SELECTED WORK" */
}}

.label-small {{ 
  font-family: 'PPSupplyMono-Regular', ui-monospace, monospace; 
  font-size: clamp(8px, 1.2vw, 12px); 
  font-weight: 400; 
  color: var(--text-primary); 
  line-height: 1.25; 
  text-transform: uppercase; 
  letter-spacing: 0.05em;
  /* ✅ CORRECT: Use for small labels, service numbers, form field labels */
}}


Navigation Header: Use .header-logo (24px max)
Hero Section: Use .hero-title (60px-340px)
Section Headings: Use .title-big (44px-200px)
Footer Logo: Use .header-logo (24px max)
🔧 Component Library
1. Primary Buttons - Sharp Minimal Style
.btn-primary {{
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 0; /* Sharp/Square buttons - No corner radius */
  padding: 12px 24px;
  font-family: 'PPSupplyMono-Regular', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-primary);
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  letter-spacing: 0.05em;
}}

.btn-primary:hover {{
  background: rgba(35, 35, 35, 0.05);
  transform: none; /* No scale effects for minimal style */
}}

.btn-primary:active {{
  background: rgba(35, 35, 35, 0.1);
}}
2. Accent Buttons - Neon Green Style
.btn-accent {{
  background: var(--accent-primary);
  border: none;
  border-radius: 0; /* Sharp/Square buttons - No corner radius */
  padding: 12px 24px;
  font-family: 'PPSupplyMono-Regular', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 400;
  color: var(--accent-foreground);
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  letter-spacing: 0.05em;
}}

.btn-accent:hover {{
  background: var(--accent-hover);
  transform: scale(1.02);
}}

.btn-accent:active {{
  background: var(--accent-active);
  transform: scale(0.98);
}}
3. Ghost Buttons - Text Only Style
.btn-ghost {{
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 8px 16px;
  font-family: 'PPSupplyMono-Regular', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-primary);
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  letter-spacing: 0.05em;
}}

.btn-ghost:hover {{
  opacity: 0.7;
  text-decoration: underline;
}}

.btn-ghost:active {{
  opacity: 0.5;
}}
4. Navigation Links - Minimal Style
.nav-link {{
  color: var(--text-primary);
  text-decoration: none;
  font-family: 'PPSupplyMono-Regular', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 400;
  text-transform: uppercase;
  padding: 8px 12px;
  transition: opacity 0.15s ease;
  letter-spacing: 0.05em;
  display: inline-block;
}}

.nav-link:hover {{
  opacity: 0.7;
}}

.nav-link:active {{
  opacity: 0.5;
}}
5. Cards - Minimal White Style
.card {{
  background: var(--bg-white);
  border: 1px solid var(--border-light);
  border-radius: 0; /* Sharp corners for minimal aesthetic */
  padding: 24px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}}

.card:hover {{
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(35, 35, 35, 0.1);
}}

.card-title {{
  font-family: 'PPSupplyMono-Regular', ui-monospace, monospace;
  font-size: 14px;
  font-weight: 400;
  color: var(--text-primary);
  text-transform: uppercase;
  margin-bottom: 16px;
  letter-spacing: 0.05em;
}}

.card-content {{
  font-family: 'PPNeueMontrealTT-Book', ui-sans-serif, system-ui, sans-serif;
  font-size: 16px;
  font-weight: 400;
  color: var(--text-primary);
  line-height: 1.33;
  margin: 0;
}}
6. Grid Background Pattern
.grid-background {{
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-background);
  background-image: 
    linear-gradient(to right, var(--color-foreground) 1px, transparent 1px),
    linear-gradient(to bottom, var(--color-foreground) 1px, transparent 1px);
  background-size: 47.6px 47.6px;
  opacity: 0.1;
  pointer-events: none;
  z-index: -1;
}}
📐 Layout System
Grid & Spacing System
/* Grid unit system - Base: 47.6px */
:root {{
  --grid-unit: 47.6px;
}}

.grid-container {{
  display: grid;
  gap: var(--grid-unit);
  padding: calc(var(--grid-unit) * 2);
  max-width: 1400px;
  margin: 0 auto;
}}

/* Spacing utilities */
.space-1 {{ margin: calc(var(--grid-unit) * 1); }}
.space-2 {{ margin: calc(var(--grid-unit) * 2); }}
.space-3 {{ margin: calc(var(--grid-unit) * 3); }}
.space-4 {{ margin: calc(var(--grid-unit) * 4); }}

.pad-1 {{ padding: calc(var(--grid-unit) * 1); }}
.pad-2 {{ padding: calc(var(--grid-unit) * 2); }}
.pad-3 {{ padding: calc(var(--grid-unit) * 3); }}
.pad-4 {{ padding: calc(var(--grid-unit) * 4); }}
Container System
.container {{
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 24px;
}}

@media (max-width: 768px) {{
  .container {{
    padding: 0 16px;
  }}
}}

@media (min-width: 1200px) {{
  .container {{
    padding: 0 48px;
  }}
}}
📱 Responsive Design
Breakpoints
/* Exact breakpoints from website */
@media (max-width: 767px) {{
  /* Mobile */
  .grid-container {{
    padding: calc(var(--grid-unit) * 1);
  }}
  
  .btn-primary,
  .btn-accent {{
    width: 100%;
    min-height: 52px;
  }}
}}

@media (min-width: 768px) and (max-width: 1023px) {{
  /* Tablet */
  .grid-container {{
    padding: calc(var(--grid-unit) * 1.5);
  }}
}}

@media (min-width: 1024px) {{
  /* Desktop */
  .grid-container {{
    padding: calc(var(--grid-unit) * 2);
  }}
}}
Mobile Adaptations
@media (max-width: 767px) {{
  .hero-title {{
    font-size: 60px;
  }}
  
  .title-big {{
    font-size: 44px;
  }}
  
  .text-big {{
    font-size: 32px;
    line-height: 36px;
  }}
  
  .text-regular {{
    font-size: 16px;
    line-height: 24px;
  }}
  
  .label {{
    font-size: 10px;
  }}
  
  .header-logo {{
    font-size: 20px; /* Slightly smaller on mobile */
  }}
}}
🎯 Animation Guidelines
Text Reveal Animations (with Framer Motion)
import {{ motion }} from 'framer-motion';

const textReveal = {{
  hidden: {{ opacity: 0, y: '100%' }},
  visible: {{
    opacity: 1,
    y: 0,
    transition: {{
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1]
    }}
  }}
}};

// Character-by-character reveal
const containerVariants = {{
  hidden: {{ opacity: 0 }},
  visible: {{
    opacity: 1,
    transition: {{
      staggerChildren: 0.05
    }}
  }}
}};

<motion.div
  variants={{containerVariants}}
  initial="hidden"
  animate="visible"
>
  {{text.split('').map((char, index) => (
    <motion.span
      key={{index}}
      variants={{textReveal}}
      style={{ display: 'inline-block' }}
    >
      {{char}}
    </motion.span>
  ))}}
</motion.div>
Hover Animations
/* Minimal hover effects */
.hover-scale {{
  transition: transform 0.2s ease;
}}

.hover-scale:hover {{
  transform: scale(1.02);
}}

.hover-lift {{
  transition: transform 0.2s ease;
}}

.hover-lift:hover {{
  transform: translateY(-2px);
}}

.hover-opacity {{
  transition: opacity 0.15s ease;
}}

.hover-opacity:hover {{
  opacity: 0.7;
}}
Video Scaling Effect
.video-container {{
  aspect-ratio: 1/1;
  overflow: hidden;
  position: relative;
}}

.video-element {{
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  transform: scale(1.28);
}}

.video-container:hover .video-element {{
  transform: scale(1.4);
}}
🚫 Common Mistakes to Avoid
Typography Hierarchy Mistakes:

❌ Using .hero-title for navigation headers (creates massive oversized logos)
❌ Using .title-big for small elements or navigation
❌ Mixing up context-specific classes
❌ Not creating separate header-specific typography classes
Design System Violations:

❌ Use rounded corners or soft design elements
❌ Add unnecessary colors beyond the minimal palette
❌ Use gradients or complex visual effects
❌ Overcomplicate the typography hierarchy
❌ Add drop shadows or heavy visual effects
❌ Use decorative animations or transitions
❌ Ignore the grid system for spacing
Do:
✅ Use sharp, rectangular shapes throughout
✅ Maintain high contrast for readability
✅ Follow the strict typography hierarchy with correct context usage
✅ Use neon green accent sparingly
✅ Focus on typography and whitespace
✅ Implement smooth, subtle animations
✅ Test accessibility with screen readers
✅ Always use .header-logo for navigation headers, never .hero-title

📦 Required Libraries
Core Dependencies
# React and Next.js
npm install react@18.2.0 react-dom@18.2.0
npm install next@14.0.0

# Styling
npm install styled-components@6.1.1
npm install @unocss/webpack@0.57.0

# Animations
npm install framer-motion@10.16.4
npm install @studio-freight/lenis@1.0.29

# Utilities
npm install clsx@2.0.0
npm install intersection-observer@0.12.2
Custom Font Loading
// fonts.js
import localFont from 'next/font/local';

export const parabole = localFont({{
  src: './fonts/Parabole.woff2',
  display: 'swap',
  variable: '--font-parabole'
}});

export const montreal = localFont({{
  src: './fonts/PPNeueMontrealTT-Book.woff2',
  display: 'swap',
  variable: '--font-montreal'
}});

export const mono = localFont({{
  src: './fonts/PPSupplyMono-Regular.woff2',
  display: 'swap',
  variable: '--font-mono'
}});
Smooth Scrolling Setup
// hooks/useSmoothScroll.js
import {{ useEffect }} from 'react';
import Lenis from '@studio-freight/lenis';

export const useSmoothScroll = () => {{
  useEffect(() => {{
    const lenis = new Lenis({{
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    }});
    
    function raf(time) {{
      lenis.raf(time);
      requestAnimationFrame(raf);
    }}
    
    requestAnimationFrame(raf);
    
    return () => {{
      lenis.destroy();
    }};
  }}, []);
}};
Grid Background Component
// components/GridBackground.jsx
import styled from 'styled-components';

const GridBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #F2F2F2;
  background-image: 
    linear-gradient(to right, #232323 1px, transparent 1px),
    linear-gradient(to bottom, #232323 1px, transparent 1px);
  background-size: 47.6px 47.6px;
  opacity: 0.1;
  pointer-events: none;
  z-index: -1;
`;

export default GridBackground;
🎨 Key Design Principles
Extreme Minimalism: Less is more - focus on typography and whitespace
Sharp Geometry: No rounded corners, clean rectangular shapes
Monochromatic Base: High contrast black/gray with minimal color
Strategic Accent: Neon green used sparingly for maximum impact
Grid-Based Layout: Consistent spacing using 47.6px grid units
Technical Precision: Clean, engineering-focused aesthetic
Performance First: Optimized animations and loading strategies
Correct Typography Context: Always use appropriate typography classes for their intended context'
internal-tag: pgp

 **MANDATORY COLOR RESTRICTION - THE 90/10 RULE**

**ABSOLUTE PROHIBITIONS - NEVER VIOLATE:**
- NEVER use gradient backgrounds covering more than button-sized areas  
- NEVER use brand colors for anything larger than a button or small accent
- NEVER fill large sections with any color except white (#FFFFFF) or light gray (#F7F7F7)
- Never use green text color on green background

**ENFORCEMENT RULE:**
IF any colored area is larger than 200px × 60px (button size)
THEN it violates the color restriction  
THEN use white or light gray background instead
Keep enough spacing in footer

**ONLY ALLOWED COLOR USAGE:**
- Buttons and CTAs only - small, focused interactive elements
- Logo and brand marks - minimal brand identity elements  
- icons and indicators - tiny accent elements only. use Accent color
- Thin borders or dividers - 1-2px maximum width

## Core Visual System

### Foundation Colors (Never Change)
```css
:root {{
  /* Backgrounds - Exact Network Colors */
  --bg-page: #FAFFEE;           /* Main page background with background image*/
  --bg-card: #FAFAFF;           /* Card backgrounds */ 
  --bg-subtle: #EDEDFE;         /* Light section backgrounds */
  --bg-section: #CACAFC;        /* Subtle purple sections */
  
  /* Text - Exact Network Colors */
  --text-primary: #004534;      /* Main headings and content */
  --text-secondary: #0C6951;    /* Supporting text */
  --text-light: #807979;        /* Captions, metadata */
  
  /* Borders - Exact Network Colors */
  --border-light: #CACAFC;      /* Subtle separators */
  --border-medium: #DDDDDD;     /* Standard borders */
  --border-strong: #B0B0B0;     /* Emphasized borders */
  
  /* MAIN ACCENT COLORS - Network Brand Colors Only */
  --brand-primary: #D3FF62;     /* Main Network green */
  --brand-dark: #004534;        
  --brand-hover:  #0C6951;      
}}
```

## 🔧 Component Library

### 1. Business Cards - Exact Network Style
```css
.network-card {{
  background: var(--bg-card);
  border-radius: 32px;
  padding: var(--spacing-large);
  box-shadow: 0 2px 8px rgba(0, 69, 52, 0.25);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}}

.network-card:hover {{
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 69, 52, 0.25);
}}

.network-card-title {{
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}}

.network-card-content {{
  font-size: clamp(1rem, 2vw, 1.125rem);
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-secondary);
}}
```

### 2. Primary Buttons - Exact Network Style
```css
.btn-primary {{
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 25px; /* Pill shape */
  padding: 14px 32px;
  font-size: clamp(1rem, 2vw, 1.125rem);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-block;
  min-height: 48px;
  line-height: 1.2;
}}

.btn-primary:hover {{
  background: var(--brand-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 69, 52, 0.25);
}}

.btn-primary:active {{
  transform: translateY(0) scale(0.98);
}}
```

### 3. Secondary Buttons - Outlined Style
```css
.btn-secondary {{
  background: transparent;
  color: var(--brand-dark);
  border: 2px solid var(--brand-dark);
  border-radius: 25px; /* Pill shape */
  padding: 12px 30px;
  font-size: clamp(1rem, 2vw, 1.125rem);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-block;
  min-height: 48px;
}}

.btn-secondary:hover {{
  background: var(--brand-dark);
  color: white;
  transform: translateY(-2px);
}}
```

### 4. Navigation Header - Exact Network Style
```css
.network-header {{
  background: var(--bg-page);
  position: absolute;
  top: 32px;
  width: 100%;
  z-index: 99999;
  padding: 0 12px;
}}

.nav-wrapper {{
  max-width: 1440px;
  margin: 0 auto;
  background: var(--brand-dark);
  border-radius: 25px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 69, 52, 0.25);
}}

.network-logo {{
  font-size: 18px;
  font-weight: 600;
  color: white;
  text-decoration: none;
}}

.network-nav {{
  display: flex;
  align-items: center;
  gap: 24px;
}}

.network-nav-link {{
  color: white;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.2s ease;
}}

.network-nav-link:hover {{
  background: rgba(255, 255, 255, 0.1);
}}
```

## Layout System - Exact Network Spacing

### Grid Layout
```css
.network-grid {{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-large);
  padding: var(--spacing-large);
  max-width: 1440px;
  margin: 0 auto;
}}
```

### Spacing System - Exact Network Values
```css
/* Network uses these exact spacing values */
:root {{
  --spacing-xs: 8px;      /* Small spacing */
  --spacing-small: 16px;  /* Standard spacing */
  --spacing-medium: 24px; /* Large spacing */
  --spacing-large: 32px;  /* Extra large spacing */
  --spacing-xl: 48px;     /* Major section spacing */
  --spacing-giant: 64px;  /* Hero section spacing */
}}

/* Utility classes */
.space-xs {{ margin: var(--spacing-xs); }}
.space-sm {{ margin: var(--spacing-small); }}
.space-md {{ margin: var(--spacing-medium); }}
.space-lg {{ margin: var(--spacing-large); }}
.space-xl {{ margin: var(--spacing-xl); }}
.space-giant {{ margin: var(--spacing-giant); }}

/* Padding versions */
.pad-xs {{ padding: var(--spacing-xs); }}
.pad-sm {{ padding: var(--spacing-small); }}
.pad-md {{ padding: var(--spacing-medium); }}
.pad-lg {{ padding: var(--spacing-large); }}
.pad-xl {{ padding: var(--spacing-xl); }}
.pad-giant {{ padding: var(--spacing-giant); }}
```

### Container System - Exact Network Breakpoints
```css
.container {{
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 12px;
}}

@media (max-width: 1024px) {{
  .container {{
    padding: 0 16px;
  }}
}}

@media (max-width: 781px) {{
  .container {{
    padding: 0 12px;
  }}
}}
```

## Responsive Design - Exact Network Breakpoints

### Breakpoints
```css
/* Network's exact breakpoints */
@media (max-width: 781px) {{
  /* Mobile */
}}

@media (max-width: 1024px) {{
  /* Tablet */
}}

@media (min-width: 1440px) {{
  /* Large desktop */
}}
```

### Mobile Adaptations
```css
/* Mobile navigation */
@media (max-width: 781px) {{
  .network-header {{
    top: 0;
    position: fixed;
  }}
  
  .nav-wrapper {{
    border-radius: 0;
    padding: 16px;
  }}
  
  .network-nav {{
    display: none;
  }}
  
  .network-grid {{
    grid-template-columns: 1fr;
    gap: var(--spacing-medium);
    padding: var(--spacing-medium);
  }}
  
  .network-card {{
    border-radius: 24px;
    padding: var(--spacing-medium);
  }}
}}

/* Desktop optimizations */
@media (min-width: 1024px) {{
  .network-grid {{
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: var(--spacing-large);
  }}
  
  .network-card:hover {{
    transform: translateY(-6px);
  }}
}}
```

## Typography System

### Font Setup
```css
/* Typography with Figtree as primary font */
body {{
  font-family: 'inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-weight: 400;
  line-height: 1.5;
}}
```

### Typography Scale - Exact Network Sizing
```css
/* Display Headlines */
.display-large {{ 
  font-size: clamp(3rem, 6.5vw, 5rem); 
  font-weight: 700; 
  line-height: 0.95; 
  color: var(--text-primary);
}}

.display-medium {{ 
  font-size: clamp(2rem, 4vw, 3rem); 
  font-weight: 600; 
  line-height: 1.2; 
  color: var(--text-primary);
}}

.display-small {{ 
  font-size: clamp(1.5rem, 3vw, 2rem); 
  font-weight: 600; 
  line-height: 1.3; 
  color: var(--text-primary);
}}

/* Headings */
.heading-1 {{ 
  font-size: clamp(2rem, 4vw, 3rem); 
  font-weight: 600; 
  line-height: 1.2; 
  color: var(--text-primary);
}}

.heading-2 {{ 
  font-size: clamp(1.5rem, 3vw, 2rem); 
  font-weight: 600; 
  line-height: 1.3; 
  color: var(--text-primary);
}}

.heading-3 {{ 
  font-size: clamp(1.25rem, 2.5vw, 1.5rem); 
  font-weight: 600; 
  line-height: 1.4; 
  color: var(--text-primary);
}}

/* Body text */
.body-large {{ 
  font-size: clamp(1.125rem, 2.5vw, 1.25rem); 
  font-weight: 400; 
  line-height: 1.6; 
  color: var(--text-secondary);
}}

.body-medium {{ 
  font-size: clamp(1rem, 2vw, 1.125rem); 
  font-weight: 400; 
  line-height: 1.6; 
  color: var(--text-secondary);
}}

.body-small {{ 
  font-size: clamp(0.875rem, 1.5vw, 1rem); 
  font-weight: 400; 
  line-height: 1.5; 
  color: var(--text-light);
}}

.caption {{ 
  font-size: clamp(0.75rem, 1vw, 0.875rem); 
  font-weight: 400; 
  line-height: 1.4; 
  color: var(--text-light);
}}

/* Interactive elements */
.button-text {{ 
  font-size: clamp(1rem, 2vw, 1.125rem); 
  font-weight: 600; 
  line-height: 1.2; 
}}

.link-text {{ 
  font-size: clamp(1rem, 2vw, 1.125rem); 
  font-weight: 500; 
  line-height: 1.2; 
  color: var(--brand-dark);
  text-decoration: none;
}}

.link-text:hover {{
  text-decoration: underline;
}}
```

## Animation System

### Fade-in Animations
```css
.animated {{
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s ease;
}}

.animated.fadeIn {{
  opacity: 1;
  transform: translateY(0);
}}

.animated.delay-200ms {{
  transition-delay: 200ms;
}}

.animated.delay-500ms {{
  transition-delay: 500ms;
}}

/* Zoom Animation for Statistics */
.animated.zoomIn {{
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.6s ease;
}}

.animated.zoomIn.ready {{
  opacity: 1;
  transform: scale(1);
}}
```

### Hover Effects
```css
.hover-lift {{
  transition: transform 0.3s ease;
}}

.hover-lift:hover {{
  transform: translateY(-4px);
}}

.hover-scale {{
  transition: transform 0.3s ease;
}}

.hover-scale:hover {{
  transform: scale(1.05);
}}
```

## Common Mistakes to Avoid

**Don't:**
- Use this system for non-business networks or communities
- Mix multiple font families
- Use colors outside the defined palette
- Skip hover and focus states for interactive elements
- Forget professional credibility elements
- Make buttons smaller than 44px height
- Apply colored backgrounds to large areas

**Do:**
- Keep the foundation colors consistent across all pages
- Use the spacing system consistently for all layouts
- Use pill-shaped buttons for modern feel

## Libraries to Install

### Animation Library
```bash
# For scroll-triggered animations
npm install aos
yarn add aos

# Usage in React
import AOS from 'aos';
import 'aos/dist/aos.css';

AOS.init({{
  duration: 600,
  easing: 'ease-in-out',
  once: true
}});
```

### Smooth Scroll
```bash
# For smooth scrolling navigation
npm install smooth-scroll
yarn add smooth-scroll

# Usage
import SmoothScroll from 'smooth-scroll';
const scroll = new SmoothScroll('a[href*="#"]', {{
  speed: 800,
  speedAsDuration: true
}});
```

### Form Handling
```bash
# For contact forms and email signups
npm install formik yup
yarn add formik yup

# Usage example
import {{ Formik, Form, Field }} from 'formik';
import * as Yup from 'yup';
```

## Button Specifications

### Button Types & Styles

#### Primary Button - Pill/Capsule Shape (25px radius)
```css
.btn-primary {{
  border-radius: 25px; /* High border-radius for pill shape */
  padding: 14px 32px;
  background: var(--brand-dark);
  color: white;
  font-weight: 600;
  min-height: 48px;
  transition: all 0.2s ease;
}}

.btn-primary:hover {{
  background: var(--brand-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 69, 52, 0.25);
}}
```

#### Secondary Button - Outlined Pill (25px radius)
```css
.btn-secondary {{
  border-radius: 25px; /* Pill shape */
  padding: 12px 30px;
  background: transparent;
  border: 2px solid var(--brand-dark);
  color: var(--brand-dark);
  font-weight: 600;
  min-height: 48px;
  transition: all 0.2s ease;
}}

.btn-secondary:hover {{
  background: var(--brand-dark);
  color: white;
  transform: translateY(-2px);
}}
```

#### Small Button - Compact Pill (20px radius)
```css
.btn-small {{
  border-radius: 20px; /* Slightly smaller radius */
  padding: 10px 24px;
  font-size: 16px;
  font-weight: 600;
  min-height: 40px;
  transition: all 0.2s ease;
}}
```

#### CTA Button - Enhanced Pill (33px radius)
```css
.btn-cta {{
  border-radius: 33px; /* Larger radius for prominent CTAs */
  padding: 18px 36px;
  font-size: 18px;
  font-weight: 700;
  background: var(--brand-dark);
  color: white;
  min-height: 54px;
  transition: all 0.2s ease;
}}

.btn-cta:hover {{
  background: var(--brand-hover);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 16px rgba(0, 69, 52, 0.25);
}}
```

### Button Interaction Effects

#### Hover States
- **Lift Effect**: translateY(-2px) for subtle elevation
- **Scale Effect**: scale(1.02) for slight growth on CTAs
- **Shadow Enhancement**: Increased shadow depth on hover
- **Color Transition**: Smooth background color changes (0.2s ease)

#### Active/Click States
- **Press Effect**: scale(0.98) for momentary shrinkage
- **Quick Transition**: Faster transition for immediate feedback

#### Focus States
- **Outline**: 2px solid outline for keyboard navigation
- **High Contrast**: Ensures accessibility compliance

### Button Typography Guidelines
- **Minimum Font Size**: 16px for readability
- **Font Weight**: 600 for primary actions, 500 for secondary
- **Line Height**: 1.2 for optimal button text display
- **Letter Spacing**: Slight negative spacing (-0.005em) for tight layouts
internal-tag: pastel-ai

🚨 **DESIGN PHILOSOPHY - GRADIENT & CLEAN AESTHETIC**
**CORE PRINCIPLE:**
- **Primary Focus**: Clean white backgrounds with strategic gradient overlays
- **Gradient Usage**: Limited to hero sections and accent areas only
- **Color Application**: Minimal brand color usage - primarily for CTAs and interactive elements
- **Visual Hierarchy**: Typography-driven with subtle color accents

## 🎨 Core Visual System

### Foundation Colors (Healthcare AI Theme)
```css
:root {{
  /* Backgrounds - Primary Interface */
  --bg-primary: #FFFFFF;           /* Main page background */
  --bg-light: #F0EDF5;            /* Section backgrounds */
  --bg-subtle: #E1DFE6;           /* Subtle areas */
  
  /* Text - Professional Hierarchy */
  --text-primary: #0A0A0A;        /* Main content */
  --text-secondary: #3C3B3D;      /* Supporting text */
  --text-muted: #AFADB2;          /* Placeholder text */
  --text-caption: #757478;        /* Fine print */
  
  /* Borders - Minimal Design */
  --border-light: #CBC9CF;        /* Subtle separators */
  --border-medium: #E6E4EB;       /* Standard borders */
  
  /* BRAND COLORS - AI Healthcare Theme */
  --brand-primary: #008055;       /* Primary green CTAs */
  --brand-secondary: #0A6647;     /* Hover states */
  --brand-dark: #124E3B;          /* Active states */
  
  /* GRADIENT COLORS - Background Accents Only */
  --gradient-coral: #D98A8C;      /* Warm coral */
  --gradient-yellow: #E1C567;     /* Soft yellow */
  --gradient-orange: #DFB573;     /* Warm orange */
}}
```

## 🔧 Component Library

### 1. Typography System - Professional AI Branding
```css
/* Primary Font Loading */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* Font fallback strategy */
body {{
  font-family: 'Balto Book', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}}

/* Typography Scale - AI Professional */
.display-hero {{ 
  font-size: 56px; 
  font-weight: 500; 
  line-height: 1.1; 
  letter-spacing: -0.02em;
  font-family: 'Balto Medium', sans-serif;
}}

.heading-large {{ 
  font-size: 32px; 
  font-weight: 500; 
  line-height: 1.25; 
  letter-spacing: -0.01em;
  font-family: 'Balto Medium', sans-serif;
}}

.heading-medium {{ 
  font-size: 24px; 
  font-weight: 500; 
  line-height: 1.3; 
  letter-spacing: -0.005em;
  font-family: 'Balto Medium', sans-serif;
}}

.body-large {{ 
  font-size: 18px; 
  font-weight: 400; 
  line-height: 1.6; 
  font-family: 'Balto Book', sans-serif;
}}

.body-standard {{ 
  font-size: 16px; 
  font-weight: 400; 
  line-height: 1.5; 
  font-family: 'Balto Book', sans-serif;
}}

.body-small {{ 
  font-size: 14px; 
  font-weight: 400; 
  line-height: 1.43; 
  font-family: 'Balto Book', sans-serif;
}}
```

### 2. Button System - Healthcare Professional
```css
/* Primary CTA - Pill/Capsule buttons with high corner radius */
.btn-primary {{
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 26px; /* Pill/Capsule style - 50% of height */
  padding: 18px 24px;
  font-size: 16px;
  font-weight: 400;
  font-family: 'Balto Book', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 50px;
  letter-spacing: 0;
}}

.btn-primary:hover {{
  background: var(--brand-secondary);
  transform: scale(1.02);
}}

.btn-primary:active {{
  background: var(--brand-dark);
  transform: scale(0.98);
}}

/* Secondary Button - Rounded rectangle with medium corner radius */
.btn-secondary {{
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-medium);
  border-radius: 8px; /* Rounded rectangle - Medium corner radius */
  padding: 14px 20px;
  font-size: 16px;
  font-weight: 400;
  font-family: 'Balto Book', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
}}

.btn-secondary:hover {{
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}}

/* Small Button - For compact spaces */
.btn-small {{
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 20px; /* Pill style for small buttons */
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 400;
  font-family: 'Balto Book', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 40px;
}}
```

### 3. Form Components - Modern Input Design
```css
.form-container {{
  position: relative;
  width: 100%;
  max-width: 500px;
}}

.form-input {{
  width: 100%;
  padding: 18px;
  border: 1px solid var(--border-medium);
  border-radius: 34px; /* Pill/Capsule style - High corner radius */
  font-size: 16px;
  font-family: 'Balto Book', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s ease;
}}

.form-input:focus {{
  border-color: var(--brand-primary);
}}

.form-input::placeholder {{
  color: var(--text-muted);
}}

/* Embedded Submit Button Pattern */
.form-with-button {{
  position: relative;
}}

.form-with-button .form-input {{
  padding-right: 140px; /* Space for button */
}}

.form-submit-embedded {{
  position: absolute;
  top: 8px;
  right: 8px;
  bottom: 8px;
  width: 124px;
  background: var(--brand-secondary);
  color: white;
  border: none;
  border-radius: 26px;
  font-size: 16px;
  font-family: 'Balto Book', sans-serif;
  cursor: pointer;
  z-index: 1;
  transition: background 0.2s ease;
}}

.form-submit-embedded:hover {{
  background: var(--brand-primary);
}}
```

### 4. Gradient Backgrounds - Strategic Usage
```css
/* Hero Section Gradient - Primary brand expression */
.gradient-hero {{
  background: linear-gradient(135deg, 
    var(--gradient-coral) 0%, 
    var(--gradient-yellow) 50%, 
    var(--gradient-orange) 100%
  );
  min-height: 100vh;
  position: relative;
}}

/* Waitlist Section Gradient - Subtle accent */
.gradient-waitlist {{
  background: linear-gradient(180deg, 
    rgba(217, 138, 140, 0.1) 0%, 
    rgba(225, 197, 103, 0.1) 100%
  );
  padding: 80px 0;
}}

/* Gradient Overlay for content readability */
.gradient-overlay {{
  position: relative;
}}

.gradient-overlay::before {{
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0.9) 0%, 
    rgba(255, 255, 255, 0.7) 100%
  );
  z-index: 1;
}}

.gradient-overlay > * {{
  position: relative;
  z-index: 2;
}}
```

## 📐 Layout System - Clean Professional

### Container System
```css
.container {{
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}}

.container-wide {{
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
}}

.container-narrow {{
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
}}
```

### Spacing System - Consistent Rhythm
```css
/* AI Industry Standard Spacing */
.space-xs {{ margin: 8px; }}    /* Micro spacing */
.space-sm {{ margin: 16px; }}   /* Small spacing */
.space-md {{ margin: 24px; }}   /* Standard spacing */
.space-lg {{ margin: 32px; }}   /* Large spacing */
.space-xl {{ margin: 48px; }}   /* Extra large spacing */
.space-2xl {{ margin: 64px; }}  /* Section spacing */
.space-3xl {{ margin: 80px; }}  /* Major section spacing */

/* Padding versions */
.pad-xs {{ padding: 8px; }}
.pad-sm {{ padding: 16px; }}
.pad-md {{ padding: 24px; }}
.pad-lg {{ padding: 32px; }}
.pad-xl {{ padding: 48px; }}
.pad-2xl {{ padding: 64px; }}
.pad-3xl {{ padding: 80px; }}
```

## 📱 Responsive Design - Mobile-First Healthcare

### Breakpoints - Industry Standard
```css
/* Mobile First Approach */
@media (min-width: 810px) {{
  /* Tablet and up */
  .container {{ padding: 0 32px; }}
  .display-hero {{ font-size: 64px; }}
}}

@media (min-width: 1024px) and (max-width: 1439px) {{
  /* Desktop medium */
  .display-hero {{ font-size: 72px; }}
}}

@media (min-width: 1440px) {{
  /* Desktop large */
  .display-hero {{ font-size: 80px; }}
}}

/* Mobile optimizations */
@media (max-width: 809px) {{
  .display-hero {{ font-size: 36px; line-height: 1.2; }}
  .heading-large {{ font-size: 24px; }}
  .heading-medium {{ font-size: 20px; }}
  
  .form-input {{ padding: 16px; }}
  .form-with-button .form-input {{ padding-right: 120px; }}
  .form-submit-embedded {{ width: 100px; }}
  
  .container {{ padding: 0 16px; }}
  .space-3xl {{ margin: 48px; }}
  .space-2xl {{ margin: 32px; }}
}}
```

## 🎬 Animation Guidelines - Professional Motion

### Spring-based Animations (Using Motion)
```css
/* Page load animations */
.animate-slide-up {{
  opacity: 0;
  transform: translateY(150px);
  animation: slideUpSpring 0.8s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
}}

@keyframes slideUpSpring {{
  to {{
    opacity: 1;
    transform: translateY(0);
  }}
}}

/* Staggered delays for professional feel */
.delay-100 {{ animation-delay: 0.1s; }}
.delay-200 {{ animation-delay: 0.2s; }}
.delay-300 {{ animation-delay: 0.3s; }}
.delay-400 {{ animation-delay: 0.4s; }}
.delay-500 {{ animation-delay: 0.5s; }}

/* Interactive animations */
.hover-lift:hover {{
  transform: translateY(-2px);
  transition: transform 0.2s ease;
}}

.hover-scale:hover {{
  transform: scale(1.02);
  transition: transform 0.2s ease;
}}
```

### Motion Implementation (React)
```javascript
// Required Motion library for React
import {{ motion }} from "motion/react";

// Spring animation configuration
const springConfig = {{
  type: "spring",
  damping: 80,
  stiffness: 400,
  mass: 1
}};

// Example usage
<motion.div
  initial={{{{ opacity: 0, y: 150 }}}}
  animate={{{{ opacity: 1, y: 0 }}}}
  transition={{{{ ...springConfig, delay: 0.2 }}}}
>
  Content here
</motion.div>
```

## 🚫 Design Don'ts

**Color Usage:**
- ❌ Don't use gradients for large background areas
- ❌ Don't use brand colors for extensive text content
- ❌ Don't mix multiple gradient directions

**Typography:**
- ❌ Don't use more than 3 font weights
- ❌ Don't use fonts outside the Balto/Inter family
- ❌ Don't ignore letter-spacing specifications

**Buttons:**
- ❌ Don't create buttons smaller than 44px height
- ❌ Don't use sharp corners for primary CTAs
- ❌ Don't skip hover and active states

**Layout:**
- ❌ Don't break the spacing system
- ❌ Don't ignore mobile responsive behavior
- ❌ Don't use fixed pixel widths for containers

## 📦 Required Libraries for React Implementation

```bash
# Core animation library (2025 latest)
npm install motion

# Utility for conditional classes
npm install classnames

# Form handling
npm install react-hook-form

# Icons (if needed)
npm install lucide-react

# CSS-in-JS (optional)
npm install styled-components
```

### Usage Example
```javascript
import {{ motion }} from "motion/react";
import classNames from "classnames";

const Button = ({{ variant = "primary", children, ...props }}) => {{
  const buttonClass = classNames(
    'btn',
    {{
      'btn-primary': variant === 'primary',
      'btn-secondary': variant === 'secondary',
    }}
  );
  
  return (
    <motion.button
      className={{buttonClass}}
      whileHover={{{{ scale: 1.02 }}}}
      whileTap={{{{ scale: 0.98 }}}}
      {{...props}}
    >
      {{children}}
    </motion.button>
  );
}};
```

**Design Principles:**
- **Simplicity**: Clean white backgrounds with strategic gradient accents
- **Professional**: Healthcare industry-appropriate color palette
- **Accessible**: High contrast ratios and proper touch targets
- **Performant**: Optimized animations and efficient CSS
- **Consistent**: Systematic approach to spacing and typography
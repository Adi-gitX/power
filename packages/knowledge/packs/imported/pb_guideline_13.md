internal-tag: orange-green-design

Use following UI UX design guidelines to build:
🚨 **MANDATORY COLOR RESTRICTION - THE 90/10 RULE**

**ABSOLUTE PROHIBITIONS - NEVER VIOLATE:**
- ❌ NEVER use colored backgrounds for hero sections, main sections, or large areas
- ❌ NEVER use gradient backgrounds covering more than button-sized areas  
- ❌ NEVER use brand colors for anything larger than a button or small accent
- ❌ NEVER fill large sections with any color except white (#FFFFFF) or cream (#F8F5F1)

**ENFORCEMENT RULE:**
IF any colored area is larger than 200px × 60px (button size)
THEN it violates the color restriction
THEN use white or cream background instead

**ONLY ALLOWED COLOR USAGE:**
- ✅ Buttons and CTAs only - small, focused interactive elements
- ✅ Logo and brand marks - minimal brand identity elements  
- ✅ Small icons and indicators - tiny accent elements only
- ✅ Thin borders or dividers - 1-2px maximum width

## 🎨 Core Visual System

### Foundation Colors (Never Change)
```css
:root {{
  /* Backgrounds - Exact Colors */
  --bg-page: #F8F5F1;              /* Main page background (cream) */
  --bg-card: #FFFFFF;              /* Card and section backgrounds */
  --bg-subtle: #F8F5F1;            /* Input fields, subtle areas */
  --bg-section: #FFFFFF;           /* Section backgrounds */
  
  /* Text - Exact Colors */
  --text-primary: #1A1A1A;         /* Main headings and content */
  --text-secondary: #484848;       /* Supporting text */
  --text-muted: #707070;           /* Captions, timestamps */
  --text-link: #333333;            /* Navigation links */
  
  /* Borders - Exact Colors */
  --border-light: #E4E4E4;         /* Subtle separators */
  --border-medium: #BABABA;        /* Standard borders */
  --border-strong: #767676;        /* Emphasized borders */
  
  /* MAIN ACCENT COLORS - Brand Colors Only */
  --brand-green: #006034;          /* Primary CTA buttons */
  --green-hover: #00502C;          /* Green hover state */
  --green-active: #004024;         /* Green active state */
  
  --brand-orange: #FF4310;         /* Orange highlights */
  --orange-hover: #EB3906;         /* Orange hover state */
  --orange-active: #D72F00;        /* Orange active state */
}}
```

## 🔧 Component Library

### 1. Button Styles - Multiple Types

```css
/* Primary CTA Button - Pill/Capsule Style */
.btn-primary {{
  background: var(--brand-green);
  color: white;
  border: none;
  border-radius: 42px;             /* Pill/Capsule - High corner radius (50% of height) */
  padding: 18px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 56px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  letter-spacing: 0;
}}

.btn-primary:hover {{
  background: var(--green-hover);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 96, 52, 0.3);
}}

.btn-primary:active {{
  background: var(--green-active);
  transform: translateY(0) scale(0.98);
}}

/* Secondary Button - Rounded Rectangle Style */
.btn-secondary {{
  background: transparent;
  color: var(--brand-green);
  border: 2px solid var(--brand-green);
  border-radius: 42px;              /* Pill/Capsule - High corner radius (50% of height) */
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 52px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}}

.btn-secondary:hover {{
  background: var(--brand-green);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 96, 52, 0.2);
}}

/* Icon Button - Flat Style */
.btn-icon {{
  background: transparent;
  color: var(--text-primary);
  border: none;
  border-radius: 20px;             /* Flat button - No shadow, minimal styling */
  padding: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  width: 44px;
  height: 44px;
}}

.btn-icon:hover {{
  background: rgba(0, 96, 52, 0.1);
  transform: scale(1.05);
}}

/* Navigation Toggle - Sharp/Square Style */
.btn-nav-toggle {{
  background: var(--brand-green);
  border: none;
  border-radius: 0px;              /* Sharp/Square button - No corner radius (0px) */
  padding: 12px;
  cursor: pointer;
  width: 40px;
  height: 40px;
  transition: all 0.2s ease;
}}

.btn-nav-toggle:hover {{
  background: var(--green-hover);
  transform: rotate(90deg);
}}
```

### 2. Cards - Clean Style

```css
.design-card {{
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}}

.design-card:hover {{
  transform: translateY(-4px);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
}}

.card-icon {{
  width: 64px;
  height: 64px;
  background: var(--brand-orange);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}}

.card-title {{
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 16px;
  color: var(--text-primary);
}}

.card-description {{
  font-size: 16px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}}
```

### 3. Navigation Header - Clean Style

```css
.design-header {{
  background: var(--bg-page);
  border-bottom: 1px solid var(--border-light);
  padding: 20px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}}

.nav-container {{
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}}

.nav-logo {{
  height: 40px;
  width: auto;
}}

.nav-menu {{
  display: flex;
  gap: 32px;
  align-items: center;
}}

.nav-link {{
  color: var(--text-link);
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
}}

.nav-link:hover {{
  background: rgba(0, 96, 52, 0.1);
  color: var(--brand-green);
}}
```

### 4. FAQ/Accordion Component

```css
.faq-container {{
  max-width: 800px;
  margin: 0 auto;
  padding: 80px 24px;
}}

.faq-item {{
  background: var(--bg-card);
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: all 0.2s ease;
}}

.faq-question {{
  padding: 24px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-card);
  border: none;
  width: 100%;
  text-align: left;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  transition: all 0.2s ease;
}}

.faq-question:hover {{
  background: rgba(0, 96, 52, 0.02);
}}

.faq-icon {{
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}}

.faq-icon.open {{
  transform: rotate(45deg);
}}

.faq-answer {{
  padding: 0 24px 24px;
  color: var(--text-secondary);
  line-height: 1.6;
}}
```

## 📐 Layout System

### Grid Layout
```css
.design-grid {{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
  padding: 60px 24px;
  max-width: 1200px;
  margin: 0 auto;
}}

.hero-section {{
  padding: 80px 24px 120px;
  background: var(--bg-page);
  text-align: center;
  position: relative;
}}

.section-container {{
  max-width: 1200px;
  margin: 0 auto;
}}
```

### Spacing System
```css
/* Use consistent spacing values */
.space-8 {{ margin: 8px; }}     /* Tight spacing */
.space-16 {{ margin: 16px; }}   /* Standard spacing */
.space-24 {{ margin: 24px; }}   /* Large spacing */
.space-32 {{ margin: 32px; }}   /* Extra large spacing */
.space-60 {{ margin: 60px; }}   /* Section spacing */

/* Padding versions */
.pad-8 {{ padding: 8px; }}
.pad-16 {{ padding: 16px; }}
.pad-24 {{ padding: 24px; }}
.pad-32 {{ padding: 32px; }}
.pad-60 {{ padding: 60px; }}
```

### Container System
```css
.container {{
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}}

@media (max-width: 809px) {{
  .container {{
    padding: 0 16px;
  }}
}}
```

## 📱 Responsive Design

### Breakpoints
```css
/* Exact breakpoints from site */
@media (max-width: 809px) {{
  /* Mobile styles */
}}

@media (min-width: 810px) and (max-width: 1199px) {{
  /* Tablet styles */
}}

@media (min-width: 1200px) and (max-width: 1439px) {{
  /* Desktop styles */
}}

@media (min-width: 1440px) {{
  /* Large desktop styles */
}}
```

### Mobile Adaptations
```css
@media (max-width: 809px) {{
  .design-header {{
    padding: 16px;
  }}
  
  .nav-menu {{
    display: none;
  }}
  
  .btn-nav-toggle {{
    display: block;
  }}
  
  .design-grid {{
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 40px 16px;
  }}
  
  .hero-section {{
    padding: 40px 16px 60px;
  }}
}}

/* Desktop optimizations */
@media (min-width: 1200px) {{
  .design-grid {{
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }}
  
  .design-card:hover {{
    transform: translateY(-4px);
  }}
}}
```

## 📝 Typography System

### Font Setup
```css
/* Primary fonts used on site */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {{
  font-family: 'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-secondary);
  line-height: 1.6;
}}
```

### Typography Scale
```css
/* Display Headlines */
.display-xl {{ font-size: 72px; font-weight: 500; line-height: 1.1; letter-spacing: -0.02em; }}
.display-lg {{ font-size: 62px; font-weight: 500; line-height: 1.15; letter-spacing: -0.01em; }}
.display-md {{ font-size: 47px; font-weight: 500; line-height: 1.2; letter-spacing: -0.01em; }}

/* Content Headlines */
.heading-1 {{ font-size: 38px; font-weight: 600; line-height: 1.25; letter-spacing: -0.02em; }}
.heading-2 {{ font-size: 32px; font-weight: 600; line-height: 1.3; letter-spacing: -0.015em; }}
.heading-3 {{ font-size: 24px; font-weight: 600; line-height: 1.35; letter-spacing: -0.01em; }}
.heading-4 {{ font-size: 20px; font-weight: 500; line-height: 1.4; letter-spacing: -0.005em; }}

/* Body Text */
.body-xl {{ font-size: 20px; font-weight: 400; line-height: 1.6; letter-spacing: 0em; }}
.body-lg {{ font-size: 18px; font-weight: 400; line-height: 1.6; letter-spacing: 0em; }}
.body-md {{ font-size: 16px; font-weight: 400; line-height: 1.6; letter-spacing: 0em; }}
.body-sm {{ font-size: 14px; font-weight: 400; line-height: 1.5; letter-spacing: 0em; }}
.caption {{ font-size: 12px; font-weight: 400; line-height: 1.4; letter-spacing: 0.01em; }}

/* Interactive Elements */
.button-text {{ font-size: 16px; font-weight: 600; line-height: 1.2; letter-spacing: 0em; }}
.link-text {{ font-size: 18px; font-weight: 500; line-height: 1.33; letter-spacing: -0.5px; }}

/* Colors for typography */
.text-primary {{ color: var(--text-primary); }}
.text-secondary {{ color: var(--text-secondary); }}
.text-muted {{ color: var(--text-muted); }}
.text-green {{ color: var(--brand-green); }}
```

### Mobile Typography
```css
@media (max-width: 809px) {{
  .display-xl {{ font-size: 38px; letter-spacing: -2px; line-height: 42px; }}
  .display-lg {{ font-size: 32px; line-height: 36px; }}
  .heading-1 {{ font-size: 24px; line-height: 28px; }}
  .heading-2 {{ font-size: 20px; line-height: 24px; }}
}}
```

## ⚡ Animation & Interactions

### Core Animations
```css
/* Smooth transitions for all interactive elements */
* {{
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}}

/* Scroll animations */
@keyframes fadeInUp {{
  from {{
    opacity: 0;
    transform: translateY(90px);
  }}
  to {{
    opacity: 1;
    transform: translateY(0);
  }}
}}

.animate-in {{
  animation: fadeInUp 0.8s ease-out forwards;
}}

/* Hover effects */
.hover-lift:hover {{
  transform: translateY(-4px);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
}}

.hover-scale:hover {{
  transform: scale(1.02);
}}

/* Button interactions */
.btn-primary {{
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}}

.btn-primary:hover {{
  transform: translateY(-2px) scale(1.02);
}}

.btn-primary:active {{
  transform: translateY(0) scale(0.98);
}}
```

### Focus States
```css
/* Accessibility focus indicators */
.btn-primary:focus,
.nav-link:focus,
.faq-question:focus {{
  outline: 2px solid var(--brand-green);
  outline-offset: 2px;
}}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {{
  *,
  *::before,
  *::after {{
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }}
}}
```

## 🚫 Common Mistakes to Avoid

**Don't:**
- Use colors outside the defined palette
- Mix multiple font families in one design
- Skip hover and focus states
- Ignore mobile responsive design
- Use colors for large background areas
- Make buttons smaller than 44px height
- Use arbitrary spacing values
- Forget accessibility considerations

**Do:**
- Keep the foundation colors consistent
- Focus on user experience and accessibility
- Use animations purposefully
- Follow the color restriction rules strictly

## 📚 Libraries to Install

### Required Dependencies
```bash
# Core animation libraries
npm install framer-motion@11.0.0
npm install react-intersection-observer@9.13.0

```

### Usage Examples
```jsx
// Framer Motion for animations
import {{ motion }} from 'framer-motion';
import {{ useInView }} from 'react-intersection-observer';

const AnimatedCard = ({{ children }}) => {{
  const [ref, inView] = useInView({{ triggerOnce: true }});
  
  return (
    <motion.div
      ref={{ref}}
      initial={{ opacity: 0, y: 90 }}
      animate={{inView ? {{ opacity: 1, y: 0 }} : {{ opacity: 0, y: 90 }}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      className="design-card"
    >
      {{children}}
    </motion.div>
  );
}};

// Button with hover animations
const AnimatedButton = ({{ children, ...props }}) => (
  <motion.button
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    className="btn-primary"
    {{...props}}
  >
    {{children}}
  </motion.button>
);
```
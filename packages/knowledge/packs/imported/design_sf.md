internal-tag: sf 

🚨 **GRADIENT RESTRICTION RULE - THE 80/20 PRINCIPLE**

**ABSOLUTE PROHIBITIONS - NEVER VIOLATE:**
- ❌ NEVER use dark purple/pink gradients for buttons
- ❌ NEVER use dark colorful gradients in general
- ❌ NEVER use complex gradients for more than 20% of visible page area
- ❌ NEVER apply gradients to text content areas or reading sections
- ❌ NEVER use gradients on small UI elements (buttons smaller than 100px width)
- ❌ NEVER layer multiple gradients in the same viewport

**ENFORCEMENT RULE:** 
IF gradient area exceeds 20% of viewport OR affects readability 
THEN use solid colors or simple two-color gradients instead

**ONLY ALLOWED GRADIENT USAGE:**
- ✅ Hero sections and major landing areas only
- ✅ Section backgrounds (not content backgrounds)
- ✅ Large CTA buttons and major interactive elements
- ✅ Decorative overlays and accent elements only

## 🎨 Core Visual System

### Foundation Colors (Never Change)
```css
:root {
  /* Backgrounds - Exact company Colors */
  --bg-page: #FFFFFF; /* Main page background */
  --bg-card: #FFFFFF; /* All card backgrounds */
  --bg-section: rgba(243, 234, 255, 0.3); /* Subtle section backgrounds */
  
  /* Text - Exact company Colors */
  --text-primary: rgb(24, 24, 24); /* Main headings and content */
  --text-secondary: rgb(112, 112, 112); /* Supporting text */
  --text-muted: rgb(143, 143, 143); /* Captions, timestamps */
  
  /* Borders - Exact company Colors */
  --border-light: rgba(24, 24, 24, 0.1); /* Subtle separators */
  --border-medium: rgba(24, 24, 24, 0.2); /* Standard borders */
  --border-strong: rgba(24, 24, 24, 0.3); /* Emphasized borders */
  
  /* MAIN BRAND COLORS - company Brand Colors Only */
  --brand-primary: rgb(0, 128, 255); /* Main brand blue for links */
  --brand-hover: rgb(0, 153, 255); /* Hover state */
  --brand-active: rgb(0, 102, 204); /* Active/pressed state */
}
```

### Gradient System (Limited Use Only)
```css
:root {
  /* Hero Gradients - Use ONLY for major sections */
  --gradient-hero: linear-gradient(135deg, 
    rgba(243, 234, 255, 0.8) 0%, 
    rgba(255, 232, 240, 0.8) 25%, 
    rgba(232, 244, 255, 0.8) 50%, 
    rgba(255, 232, 213, 0.8) 75%, 
    rgba(243, 234, 255, 0.8) 100%);
    
  /* Button Gradients - For CTAs only */
  --gradient-button: linear-gradient(168deg, rgb(67, 67, 67) -63%, rgb(0, 0, 0) 100%);
  
  /* Section Divider Gradients */
  --gradient-divider: linear-gradient(90deg, transparent 0%, rgba(24, 24, 24, 0.1) 50%, transparent 100%);
}
```

## 🔧 Component Library

### 1. Primary Buttons - company CTA Style
```css
.btn-primary {
  background: var(--gradient-button);
  color: white;
  border: none;
  border-radius: 100px; /* Pill/Capsule - High corner radius */
  padding: 14px 24px;
  font-family: 'Satoshi Variable', sans-serif;
  font-variation-settings: "wght" 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.12);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.3;
}

.btn-primary:hover {
  transform: scale(1.04);
  box-shadow: 0px 6px 20px rgba(0, 0, 0, 0.15);
}

.btn-primary:active {
  transform: scale(0.96);
}
```

### 2. Secondary Buttons - Glass Effect Style
```css
.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 100px; /* Pill/Capsule - High corner radius */
  padding: 14px 24px;
  font-family: 'Satoshi Variable', sans-serif;
  font-variation-settings: "wght" 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.12);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.3;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.02);
}

.btn-secondary:active {
  transform: scale(0.98);
}
```

### 3. Navigation Links - Subtle Interaction Style
```css
.nav-link {
  color: var(--text-primary);
  text-decoration: none;
  font-family: 'Satoshi', sans-serif;
  font-size: 16px;
  font-weight: 500;
  padding: 12px 16px;
  border-radius: 8px; /* Rounded rectangle - Small corner radius */
  transition: all 0.2s ease;
  position: relative;
}

.nav-link:hover {
  background: rgba(24, 24, 24, 0.05);
  color: var(--brand-primary);
}

.nav-link:active {
  background: rgba(24, 24, 24, 0.1);
}
```

### 4. Service Cards - Clean Professional Style
```css
.service-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px; /* Rounded rectangle - Medium corner radius */
  padding: 24px;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.08);
  border-color: var(--border-medium);
}

.service-card-title {
  font-family: 'Satoshi Variable', sans-serif;
  font-variation-settings: "wght" 600;
  font-size: 18px;
  line-height: 1.3;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.service-card-description {
  font-family: 'Satoshi', sans-serif;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-secondary);
  margin: 0;
}
```

### 5. Hero Section - Gradient Background Pattern
```css
.hero-section {
  background: var(--gradient-hero);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  text-align: center;
  padding: 80px 24px;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-family: 'Satoshi Variable', sans-serif;
  font-variation-settings: "wght" 700;
  font-size: clamp(32px, 5vw, 64px);
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.hero-subtitle {
  font-family: 'Satoshi', sans-serif;
  font-size: clamp(16px, 2.5vw, 20px);
  line-height: 1.5;
  color: var(--text-secondary);
  margin-bottom: 32px;
}
```

## Layout System - company Spacing

### Grid Layout
```css
.company-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px 24px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}
```

### Spacing System - company Values
```css
/* company uses these exact spacing values */
.space-8 { margin: 8px; } /* Small spacing */
.space-16 { margin: 16px; } /* Standard spacing */
.space-24 { margin: 24px; } /* Large spacing */
.space-32 { margin: 32px; } /* Extra large spacing */
.space-48 { margin: 48px; } /* Major section spacing */
.space-64 { margin: 64px; } /* Hero section spacing */

/* Padding versions */
.pad-8 { padding: 8px; }
.pad-16 { padding: 16px; }
.pad-24 { padding: 24px; }
.pad-32 { padding: 32px; }
.pad-48 { padding: 48px; }
.pad-64 { padding: 64px; }
```

### Container System - company Breakpoints
```css
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
}

@media (max-width: 809px) {
  .container {
    padding: 0 16px;
  }
}
```

## Responsive Design - company Breakpoints

### Breakpoints
```css
/* company's exact breakpoints */
@media (min-width: 810px) and (max-width: 1199px) {
  /* Tablet */
}

@media (min-width: 1200px) {
  /* Desktop */
}

@media (max-width: 809px) {
  /* Mobile */
}
```

### Mobile Adaptations
```css
/* Mobile navigation */
@media (max-width: 809px) {
  .nav-header {
    padding: 16px;
    flex-direction: column;
    gap: 16px;
  }
  
  .hero-section {
    padding: 60px 16px;
    min-height: 80vh;
  }
  
  .company-grid {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 16px;
  }
  
  .btn-primary, .btn-secondary {
    width: 100%;
    min-height: 52px;
  }
}

/* Desktop optimizations */
@media (min-width: 1200px) {
  .company-grid {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 40px 32px;
  }
  
  .service-card:hover {
    transform: translateY(-4px);
  }
}
```

## Typography System

### Font Setup
```css
/* Use company fonts */
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&display=swap');

body {
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Typography Scale - company Sizing
```css
/* Brand and Display */
.brand-display {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-size: clamp(60px, 8vw, 168px);
  line-height: 1.1em;
  color: var(--text-primary);
}

/* Headlines */
.heading-1 {
  font-family: 'Satoshi';
  font-weight: 700;
  font-size: clamp(32px, 5vw, 64px);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.heading-2 {
  font-family: 'Satoshi';
  font-weight: 600;
  font-size: clamp(24px, 4vw, 48px);
  line-height: 1.2;
  letter-spacing: -0.015em;
}

.heading-3 {
  font-family: 'Satoshi';
  font-weight: 600;
  font-size: clamp(20px, 3vw, 32px);
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.heading-4 {
  font-family: 'Satoshi';
  font-weight: 600;
  font-size: clamp(18px, 2.5vw, 24px);
  line-height: 1.4;
  letter-spacing: -0.005em;
}

/* Body text */
.body-large {
  font-family: 'Satoshi';
  font-weight: 400;
  font-size: clamp(16px, 2.5vw, 20px);
  line-height: 1.6;
  color: var(--text-primary);
}

.body-medium {
  font-family: 'Satoshi';
  font-weight: 400;
  font-size: clamp(14px, 2vw, 16px);
  line-height: 1.5;
  color: var(--text-primary);
}

.body-small {
  font-family: 'Satoshi';
  font-weight: 400;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-secondary);
}

.caption {
  font-family: 'Satoshi';
  font-weight: 400;
  font-size: 12px;
  line-height: 1.3;
  color: var(--text-muted);
}

/* Interactive elements */
.button-text {
  font-family: 'Satoshi';
  font-weight: 600;
  font-size: 16px;
  line-height: 1.3;
}

.link-text {
  font-family: 'Satoshi';
  font-weight: 500;
  font-size: 16px;
  line-height: 1.4;
  color: var(--brand-primary);
}
```

##Animation Guidelines

### Micro-Interactions
```css
/* Button hover animations */
.btn-hover-scale {
  transition: transform 0.2s ease;
}

.btn-hover-scale:hover {
  transform: scale(1.04);
}

.btn-hover-scale:active {
  transform: scale(0.96);
}

/* Card hover animations */
.card-hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.08);
}
```

### Page Load Animations (with Motion/Framer Motion)
```jsx
import { motion } from 'motion/react';

// Fade in with slide up
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

```

## Common Mistakes to Avoid

**Don't:**
- Use gradients for more than 20% of page area
- Apply complex gradients to text content areas
- Mix multiple gradient directions in same section
- Use gradients on small UI elements
- Skip responsive font sizing
- Ignore glassmorphism effects for secondary buttons
- Forget hover and focus states

**Do:**
- Keep gradients for hero sections and major CTAs only
- Use solid colors for content and reading areas
- Maintain consistent spacing using the spacing system
- Test on mobile devices with touch interactions
- Include accessibility features (focus states, contrast)
- Use the pill/capsule button style for primary actions

```
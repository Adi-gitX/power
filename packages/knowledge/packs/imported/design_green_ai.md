"internal-tag: Green-ai

**Core Visual System**

Use below colors, fonts & components and add it to your .css files

## Foundation Colors
```css
:root {
  /* Backgrounds - Clean & Minimal */
  --bg-page: #FFFFFF;                    /* Main page background */
  --bg-card: #FFFFFF;                    /* All card backgrounds */
  --bg-section: rgba(0, 0, 0, 0.02);    /* Subtle section backgrounds */
  
  /* Text - Professional Hierarchy */
  --text-primary: rgb(0, 55, 32);       /* Main headings #003720 */
  --text-body: rgb(14, 15, 12);         /* Body text #0e0f0c */
  --text-secondary: rgb(131, 146, 140); /* Supporting text #83928c */
  --text-muted: rgb(175, 183, 180);     /* Captions, timestamps #afb7b4 */
  
  /* Borders - Subtle Separation */
  --border-light: rgba(0, 0, 0, 0.1);   /* Light separators */
  --border-medium: rgba(0, 0, 0, 0.2);  /* Standard borders */
  --border-strong: rgba(0, 0, 0, 0.3);  /* Emphasized borders */
  
  /* BRAND COLORS - Green Accent System */
  --accent-primary: #8FEC78;            /* Main green accent */
  --accent-strong: #81DD67;             /* Stronger green accent */
  --accent-text: rgb(13, 121, 22);      /* Green text color */
  --accent-wash: rgba(148, 242, 127, 0.1); /* Light accent background */
}
```

## Gradient System (Limited Use Only)
```css
:root {
  /* Hero Gradients - Use ONLY for major sections */
  --gradient-hero: radial-gradient(at 53% 78%, hsla(60,100%,50%,0.3) 0px, transparent 50%), 
                   radial-gradient(at 71% 91%, hsla(108,100%,50%,0.3) 0px, transparent 50%), 
                   radial-gradient(at 31% 91%, hsla(30,100%,50%,0.17) 0px, transparent 50%);
  
  /* Button Gradients - For CTAs only */
  --gradient-button: linear-gradient(to bottom right, var(--accent-primary), var(--accent-strong));
}
```

## Typography System

### Font Setup
```css
/* Use system fonts for performance */
body {
  font-family: system-ui, sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Typography Scale - Responsive Sizing
```css
/* Headlines - Responsive */
.heading-1 { 
  font-family: system-ui, sans-serif; 
  font-weight: 700; 
  font-size: clamp(2.25rem, 5vw, 4.5rem); 
  line-height: 0.9; 
  letter-spacing: -0.02em; 
  color: var(--text-primary);
}
.heading-2 { 
  font-family: system-ui, sans-serif; 
  font-weight: 600; 
  font-size: clamp(1.875rem, 4vw, 3rem); 
  line-height: 0.95; 
  letter-spacing: -0.015em; 
  color: var(--text-primary);
}
.heading-3 { 
  font-family: system-ui, sans-serif; 
  font-weight: 600; 
  font-size: clamp(1.25rem, 3vw, 1.5rem); 
  line-height: 1.2; 
  letter-spacing: -0.01em; 
  color: var(--text-primary);
}

/* Body text - Responsive */
.body-large { 
  font-family: system-ui, sans-serif; 
  font-weight: 400; 
  font-size: clamp(1.125rem, 2.5vw, 1.25rem); 
  line-height: 1.6; 
  color: var(--text-body); 
}
.body-medium { 
  font-family: system-ui, sans-serif; 
  font-weight: 400; 
  font-size: clamp(1rem, 2vw, 1.125rem); 
  line-height: 1.5; 
  color: var(--text-body); 
}
.body-small { 
  font-family: system-ui, sans-serif; 
  font-weight: 400; 
  font-size: 0.875rem; 
  line-height: 1.4; 
  color: var(--text-secondary); 
}
.caption { 
  font-family: system-ui, sans-serif; 
  font-weight: 400; 
  font-size: 0.75rem; 
  line-height: 1.3; 
  color: var(--text-muted); 
}

/* Interactive elements */
.button-text { 
  font-family: system-ui, sans-serif; 
  font-weight: 600; 
  font-size: 1rem; 
  line-height: 1.3; 
}
.link-text { 
  font-family: system-ui, sans-serif; 
  font-weight: 500; 
  font-size: 1rem; 
  line-height: 1.4; 
  color: var(--accent-primary);
  text-decoration: underline;
  text-decoration-color: var(--accent-strong);
  text-decoration-thickness: 0.08em;
  text-underline-offset: 2px;
}
```

## Component Library

### 1. Primary Buttons - Green CTA Style
```css
.btn-primary {
  background: var(--gradient-button);
  color: white;
  border: none;
  border-radius: 9999px; /* Pill/Capsule - Full rounded */
  padding: 14px 24px;
  font-family: system-ui, sans-serif;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.05);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.3;
}

.btn-primary:hover {
  transform: scale(1.02);
  box-shadow: 0px 4px 8px rgba(148, 242, 127, 0.3);
}

.btn-primary:active {
  transform: scale(0.98);
}
```

### 2. Secondary Buttons - Clean Outline Style
```css
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  border-radius: 9999px; /* Pill/Capsule - Full rounded */
  padding: 14px 24px;
  font-family: system-ui, sans-serif;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.3;
}

.btn-secondary:hover {
  background: rgba(0, 0, 0, 0.05);
  border-color: var(--border-medium);
}

.btn-secondary:active {
  transform: scale(0.98);
}
```

### 3. Navigation Links - Minimal Interaction Style
```css
.nav-link {
  color: var(--text-muted);
  text-decoration: none;
  font-family: system-ui, sans-serif;
  font-size: 1rem;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 9999px; /* Pill/Capsule - Full rounded */
  transition: all 0.2s ease;
}

.nav-link:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

.nav-link:active {
  background: rgba(0, 0, 0, 0.1);
}
```

### 4. Product Cards - Clean Professional Style
```css
.product-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px; /* Rounded rectangle - Medium corner radius */
  padding: 24px;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--border-medium);
}

.product-card-title {
  font-family: system-ui, sans-serif;
  font-weight: 600;
  font-size: 1.125rem;
  line-height: 1.3;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.product-card-description {
  font-family: system-ui, sans-serif;
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--text-secondary);
  margin: 0;
}
```

### 5. Hero Section - Gradient Background Pattern
**Image Usage:**
- **Hero section**: NO background images required - uses gradient overlays only
- **Product demos**: Interface mockups in card containers
- **Company logos**: Simple logo presentations for social proof
- **Aspect Ratios**: 16:9 for product demos, square for logos

```css
.hero-section {
  background: var(--gradient-hero);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  text-align: center;
  padding: 7rem 1.5rem 3rem;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-family: system-ui, sans-serif;
  font-weight: 700;
  font-size: clamp(2.25rem, 5vw, 4.5rem);
  line-height: 0.9;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
}

.hero-subtitle {
  font-family: system-ui, sans-serif;
  font-size: clamp(1.125rem, 2.5vw, 1.25rem);
  line-height: 1.5;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}
```

### 6. Navigation Header - Floating Style
```css
.nav-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  height: 3.5rem;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 0.5px solid var(--border-light);
  border-radius: 9999px;
  margin: 1.5rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

@media (max-width: 768px) {
  .nav-header {
    margin: 0.5rem;
    border-radius: 0;
    border: none;
    border-bottom: 1px solid var(--border-light);
  }
}
```

## Layout System - Professional Spacing

### Grid Layout
```css
.ai-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem 1.5rem;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
```

### Spacing System - Consistent Values
```css
/* Professional spacing scale */
.space-xs { margin: 0.5rem; }    /* 8px - Small spacing */
.space-sm { margin: 1rem; }      /* 16px - Standard spacing */
.space-md { margin: 1.5rem; }    /* 24px - Large spacing */
.space-lg { margin: 2rem; }      /* 32px - Extra large spacing */
.space-xl { margin: 3rem; }      /* 48px - Major section spacing */
.space-2xl { margin: 4rem; }     /* 64px - Hero section spacing */

/* Padding versions */
.pad-xs { padding: 0.5rem; }
.pad-sm { padding: 1rem; }
.pad-md { padding: 1.5rem; }
.pad-lg { padding: 2rem; }
.pad-xl { padding: 3rem; }
.pad-2xl { padding: 4rem; }
```

### Container System - Responsive Breakpoints
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }
}
```

## Responsive Design

### Breakpoints
```css
/* Mobile-first responsive design */
@media (min-width: 768px) {
  /* Tablet and up */
}

@media (min-width: 1024px) {
  /* Desktop and up */
}

@media (max-width: 767px) {
  /* Mobile only */
}
```

### Mobile Adaptations
```css
/* Mobile navigation */
@media (max-width: 767px) {
  .nav-header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    height: auto;
  }
  
  .hero-section {
    padding: 4rem 1rem;
    min-height: 80vh;
  }
  
  .ai-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 1rem;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    min-height: 52px;
  }
}

/* Desktop optimizations */
@media (min-width: 1024px) {
  .ai-grid {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2.5rem 2rem;
  }
  
  .product-card:hover {
    transform: translateY(-4px);
  }
}
```

## Animation Guidelines

### Micro-Interactions
```css
/* Button hover animations */
.btn-hover-scale {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-hover-scale:hover {
  transform: scale(1.02);
}

.btn-hover-scale:active {
  transform: scale(0.98);
}

/* Card hover animations */
.card-hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

### Page Load Animations (with Framer Motion)
```jsx
import { motion } from 'framer-motion';

// Fade in with slide up
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

// Staggered children animation
const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};
```

### Accessibility Animations
```css
/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Best Practices

**Do:**
- Use gradients only for hero sections and major focal areas
- Keep button styles consistent with pill/capsule shapes
- Maintain clean white backgrounds for content areas
- Use system fonts for optimal performance
- Include accessibility features (focus states, contrast)
- Implement responsive design with mobile-first approach

**Don't:**
- Overuse gradients throughout the interface
- Mix multiple gradient styles in same section
- Use gradients on small UI elements
- Skip responsive font sizing with clamp()
- Neglect keyboard navigation support

## Key Design Principles

1. **Minimalism**: Clean, uncluttered interfaces with plenty of white space
2. **Performance**: System fonts and CSS-only animations
3. **Accessibility**: High contrast ratios and keyboard navigation
4. **Consistency**: Unified spacing, typography, and interaction patterns
5. **Professional**: Business-focused aesthetic suitable for productivity tools
"
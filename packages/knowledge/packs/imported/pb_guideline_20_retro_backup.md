internal-tag: RetroVibe-commerce

## 🎨 Core Visual System

### Foundation Colors (Brand Identity)
```css
:root {{
  /* Primary Brand Colors - Warm Retro Palette */
  --brand-primary:rgb(206, 102, 73);        /* Orange-red for logos, CTAs */
  --brand-secondary: #CBDBDA;      /* Golden yellow for accents */
  --brand-neutral: #F4F0E6;        /* Cream background */
  --brand-dark: #503528;           /* Dark brown for text */
  
  /* Text Colors */
  --text-primary: #503528;          /* Main text color */
  --text-secondary: #8B4513;        /* Secondary text */
  --text-light: #A0806B;           /* Captions, light text */
  
  /* Background Colors */
  --bg-primary: #F4F0E6;           /* Main cream background */
  --bg-secondary: #FFFFFF;         /* White cards/overlays */
  --bg-accent: #FFF8DC;            /* Warm white variation */
  
  /* Interactive States */
  --interactive-primary: #CB4A27;   /* Primary buttons */
  --interactive-hover: #B03E22;     /* Hover state */
  --interactive-active: #9A351D;    /* Active state */
  --interactive-secondary: #CBDBDA; /* Secondary buttons */
  
  /* Borders */
  --border-light: #E8DDD4;         /* Light borders */
  --border-medium: #D4C5B8;        /* Medium borders */
  --border-dark: #B8A592;          /* Emphasized borders */
}}
```

## 📝 Typography System

### Font Setup
```css
/* Primary Font: Tan St. Canard (Display/Headings) */
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+Pro:wght@400;600;700&display=swap');

/* Secondary Font: Neue Einstellung (Body/UI) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

/* Fallback Stack */
:root {{
  --font-primary: "Source Serif Pro", Georgia, serif;  /* Fallback for Tan St. Canard */
  --font-secondary: "Inter", Arial, sans-serif;        /* Fallback for Neue Einstellung */
}}
```

### Typography Scale - Retro Fashion Hierarchy
```css
/* Display Headlines */
.display-large {{ 
  font-family: var(--font-primary);
  font-size: 48px; 
  font-weight: 700; 
  line-height: 1.1; 
  letter-spacing: -0.02em; 
  color: var(--text-primary);
}}

.display-medium {{ 
  font-family: var(--font-primary);
  font-size: 36px; 
  font-weight: 600; 
  line-height: 1.2; 
  letter-spacing: -0.01em; 
  color: var(--text-primary);
}}

/* Headings */
.heading-1 {{ 
  font-family: var(--font-primary);
  font-size: 28px; 
  font-weight: 600; 
  line-height: 1.3; 
  letter-spacing: -0.005em; 
  color: var(--text-primary);
}}

.heading-2 {{ 
  font-family: var(--font-primary);
  font-size: 24px; 
  font-weight: 500; 
  line-height: 1.4; 
  letter-spacing: 0em; 
  color: var(--text-primary);
}}

.sub-heading {{ 
  font-family: var(--font-secondary);
  font-size: 20px; 
  font-weight: 500; 
  line-height: 1.4; 
  letter-spacing: 0.01em; 
  color: var(--brand-primary);
}}

/* Body Text */
.body-large {{ 
  font-family: var(--font-secondary);
  font-size: 18px; 
  font-weight: 400; 
  line-height: 1.6; 
  letter-spacing: 0em; 
  color: var(--text-primary);
}}

.body-medium {{ 
  font-family: var(--font-secondary);
  font-size: 16px; 
  font-weight: 400; 
  line-height: 1.6; 
  letter-spacing: 0em; 
  color: var(--text-primary);
}}

.body-small {{ 
  font-family: var(--font-secondary);
  font-size: 14px; 
  font-weight: 400; 
  line-height: 1.5; 
  letter-spacing: 0em; 
  color: var(--text-secondary);
}}

.caption {{ 
  font-family: var(--font-secondary);
  font-size: 12px; 
  font-weight: 400; 
  line-height: 1.4; 
  letter-spacing: 0.01em; 
  color: var(--text-light);
}}

/* Interactive Elements */
.button-text {{ 
  font-family: var(--font-secondary);
  font-size: 16px; 
  font-weight: 500; 
  line-height: 1.2; 
  letter-spacing: 0em; 
}}

.link-text {{ 
  font-family: var(--font-secondary);
  font-size: 16px; 
  font-weight: 500; 
  line-height: 1.4; 
  letter-spacing: 0em; 
  color: var(--brand-primary);
}}
```

## 🔧 Component Library

### 1. Primary Buttons - Retro Style
```css
/* Rounded Rectangle Buttons - Medium corner radius (4px) */
.btn-primary {{
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 24px;
  font-family: var(--font-secondary);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 44px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  letter-spacing: 0em;
}}

.btn-primary:hover {{
  background: var(--interactive-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(203, 74, 39, 0.3);
}}

.btn-primary:active {{
  background: var(--interactive-active);
  transform: translateY(0);
}}

/* Secondary Button - Golden Yellow */
.btn-secondary {{
  background: var(--brand-secondary);
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  padding: 12px 24px;
  font-family: var(--font-secondary);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 44px;
}}

.btn-secondary:hover {{
  background: #D4991F;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(230, 170, 58, 0.3);
}}

/* Outline Button */
.btn-outline {{
  background: transparent;
  color: var(--brand-primary);
  border: 2px solid var(--brand-primary);
  border-radius: 4px;
  padding: 10px 22px;
  font-family: var(--font-secondary);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 44px;
}}

.btn-outline:hover {{
  background: var(--brand-primary);
  color: white;
  transform: translateY(-1px);
}}
```

### 2. Product Cards - Vintage Fashion Style
```css
.retro-card {{
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}}

.retro-card:hover {{
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(80, 53, 40, 0.15);
  border-color: var(--border-medium);
}}

.retro-card-image {{
  width: 100%;
  height: 240px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 16px;
  border: 2px solid var(--brand-primary);
}}

.retro-card-title {{
  font-family: var(--font-primary);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 8px;
  color: var(--text-primary);
}}

.retro-card-price {{
  font-family: var(--font-secondary);
  font-size: 18px;
  font-weight: 600;
  color: var(--brand-primary);
  margin-bottom: 12px;
}}

.retro-card-description {{
  font-family: var(--font-secondary);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--text-secondary);
  margin-bottom: 16px;
}}
```

### 3. Navigation Header - Retro Brand Style
```css
.retro-header {{
  background: var(--bg-primary);
  border-bottom: 2px solid var(--border-medium);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  min-height: 70px;
  box-sizing: border-box;
}}

.retro-logo {{
  font-family: var(--font-primary);
  font-size: 24px;
  font-weight: 700;
  color: var(--brand-primary);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
}}

.retro-logo::after {{
  content: "+";
  font-size: 20px;
  color: var(--brand-secondary);
}}

.retro-nav {{
  display: flex;
  align-items: center;
  gap: 32px;
}}

.retro-nav-link {{
  font-family: var(--font-secondary);
  color: var(--text-primary);
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.3s ease;
}}

.retro-nav-link:hover {{
  background: var(--bg-accent);
  color: var(--brand-primary);
}}

.retro-tagline {{
  font-family: var(--font-secondary);
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-top: 2px;
}}
```

### 4. Hero Section - Vintage Fashion Style
```css
.retro-hero {{
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-accent) 100%);
  padding: 80px 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
}}

.retro-hero::before {{
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23E6AA3A' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.3;
}}

.retro-hero-content {{
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
}}

.retro-hero-title {{
  font-family: var(--font-primary);
  font-size: 56px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin-bottom: 24px;
}}

.retro-hero-subtitle {{
  font-family: var(--font-secondary);
  font-size: 20px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--brand-primary);
  margin-bottom: 32px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}}

.retro-hero-description {{
  font-family: var(--font-secondary);
  font-size: 18px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 40px;
}}
```

## 📐 Layout System

### Grid Layout - Retro Fashion
```css
.retro-grid {{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px 24px;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}}

.retro-grid-wide {{
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}}

.retro-grid-narrow {{
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}}
```

### Spacing System - Vintage Inspired
```css
/* Retro-inspired spacing values */
.space-xs {{ margin: 8px; }}     /* Small details */
.space-sm {{ margin: 16px; }}    /* Standard spacing */
.space-md {{ margin: 24px; }}    /* Medium spacing */
.space-lg {{ margin: 32px; }}    /* Large spacing */
.space-xl {{ margin: 48px; }}    /* Extra large spacing */

/* Padding versions */
.pad-xs {{ padding: 8px; }}
.pad-sm {{ padding: 16px; }}
.pad-md {{ padding: 24px; }}
.pad-lg {{ padding: 32px; }}
.pad-xl {{ padding: 48px; }}
```

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
  padding: 0 24px;
}}

.container-narrow {{
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
}}
```

## 📱 Responsive Design

### Breakpoints - Retro Fashion Focused
```css
/* Mobile First Approach */
@media (min-width: 480px) {{
  /* Small mobile */
  .retro-hero-title {{ font-size: 32px; }}
  .retro-grid {{ grid-template-columns: 1fr; }}
}}

@media (min-width: 768px) {{
  /* Tablet */
  .retro-hero-title {{ font-size: 44px; }}
  .retro-grid {{ grid-template-columns: repeat(2, 1fr); }}
  .retro-nav {{ gap: 24px; }}
}}

@media (min-width: 1024px) {{
  /* Desktop */
  .retro-hero-title {{ font-size: 56px; }}
  .retro-grid {{ grid-template-columns: repeat(3, 1fr); }}
  .retro-nav {{ gap: 32px; }}
}}

@media (min-width: 1440px) {{
  /* Large desktop */
  .retro-grid {{ grid-template-columns: repeat(4, 1fr); }}
}}
```

### Mobile Adaptations
```css
/* Mobile-specific retro styling */
@media (max-width: 767px) {{
  .retro-header {{
    padding: 12px 16px;
    min-height: 60px;
  }}
  
  .retro-logo {{
    font-size: 20px;
  }}
  
  .retro-nav {{
    display: none; /* Mobile menu toggle needed */
  }}
  
  .retro-hero {{
    padding: 40px 16px;
  }}
  
  .retro-hero-title {{
    font-size: 32px;
  }}
  
  .retro-card {{
    padding: 16px;
  }}
  
  .retro-card-image {{
    height: 200px;
  }}
}}
```

## 🎨 Special Effects & Animations

### Hover Effects - Vintage Inspired
```css
.retro-hover-lift {{
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}}

.retro-hover-lift:hover {{
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(80, 53, 40, 0.15);
}}

.retro-hover-glow {{
  transition: box-shadow 0.3s ease;
}}

.retro-hover-glow:hover {{
  box-shadow: 0 0 20px rgba(203, 74, 39, 0.3);
}}
```

### Texture Effects
```css
.retro-texture {{
  position: relative;
  overflow: hidden;
}}

.retro-texture::before {{
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23CB4A27' fill-opacity='0.05'%3E%3Cpath d='M20 20c0 11.046-8.954 20-20 20s-20-8.954-20-20 8.954-20 20-20 20 8.954 20 20zm-30 0c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10 10 4.477 10 10z'/%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
}}
```

## 🚫 Common Mistakes to Avoid

**Don't:**
- Use this system for non-fashion or non-retro websites
- Mix fonts outside the defined hierarchy
- Use colors outside the warm retro palette
- Skip the vintage-inspired hover effects
- Ignore the cream/warm background requirement
- Use modern, cold colors or stark white backgrounds
- Forget the distinctive plus symbol in branding
- Use thin, modern fonts for headings

**Do:**
- Maintain warm, nostalgic color temperature
- Use texture and depth appropriately
- Include retro-inspired visual elements
- Test on various devices for vintage appeal
- Keep typography hierarchy consistent
- Use appropriate vintage photography styles
- Maintain brand consistency across all elements

## 📚 Libraries to Install

### For React.js Implementation
```bash
# Typography & Fonts
npm install @fontsource/source-serif-pro
npm install @fontsource/inter

# Styling
npm install styled-components
npm install @emotion/react @emotion/styled

# UI Components
npm install @mui/material
npm install react-bootstrap

# Icons (vintage-inspired)
npm install react-icons
npm install @heroicons/react

# Animation
npm install framer-motion
npm install react-spring

# Image handling
npm install next/image
npm install react-image-gallery

# Utilities
npm install classnames
npm install prop-types
```

### Usage Example
```jsx
// Button component with retro styling
import styled from 'styled-components';

const RetroButton = styled.button`
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 24px;
  font-family: var(--font-secondary);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {{
    background: var(--interactive-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(203, 74, 39, 0.3);
  }}
`;

// Usage
<RetroButton>Shop Vintage Collection</RetroButton>
```
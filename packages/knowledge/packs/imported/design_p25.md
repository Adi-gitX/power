internal-tag: Swiss



## 🎨 Core Visual System

### Foundation Colors (brand Minimalism)
```css
:root {{
  /* Core Colors - brand Performance Brand */
  --bg-page: rgb(255, 255, 255);               /* Main page background */
  --bg-secondary: rgb(247, 247, 247);          /* Secondary sections */
  --bg-overlay: rgba(0, 0, 0, 0.5);            /* Hero overlays */
  --bg-light: rgba(0, 0, 0, 0.05);             /* Light overlays */
  
  /* Text Colors - High Contrast System */
  --text-primary: rgb(0, 0, 0);                /* Primary text */
  --text-secondary: rgb(153, 153, 153);        /* Secondary text */
  --text-muted: rgb(102, 102, 102);            /* Muted text */
  --text-on-dark: rgb(255, 255, 255);          /* Text on dark backgrounds */
  
  /* Brand Colors - Minimal Usage */
  --brand-blue: rgb(0, 0, 238);                /* Brand links only */
  --brand-dark: rgb(21, 21, 34);               /* Dark brand accent */
  
  /* Grayscale System - brand Precision */
  --gray-darkest: rgb(34, 34, 34);             /* Darkest UI elements */
  --gray-dark: rgb(51, 51, 51);                /* Dark accents */
  --gray-medium: rgb(85, 85, 85);              /* Medium gray */
  --gray-light: rgb(153, 153, 153);            /* Light gray */
  --gray-lighter: rgb(204, 204, 204);          /* Lighter gray */
  --gray-lightest: rgb(247, 247, 247);         /* Lightest gray */
  
  /* Alert Colors - Minimal System */
  --alert-error: rgb(237, 0, 0);               /* Error red */
  --alert-warning: rgb(225, 95, 20);           /* Warning orange */
  --alert-success: rgb(34, 139, 34);           /* Success green */
}}
```

## 🔧 Component Library

### 1. Primary Hero Buttons - White Pill Style
```css
.btn-primary {{
  background: rgb(255, 255, 255);
  color: rgb(0, 0, 0);
  border: 1px solid rgb(255, 255, 255);
  border-radius: 40px; /* Pill/Capsule - High corner radius */
  padding: 12px 24px;
  font-family: "On", system-ui, sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.3;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}}

.btn-primary:hover {{
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}}

.btn-primary:active {{
  transform: scale(0.98);
}}
```

### 2. Secondary Buttons - Black Pill Style
```css
.btn-secondary {{
  background: rgb(0, 0, 0);
  color: rgb(255, 255, 255);
  border: 1px solid rgb(0, 0, 0);
  border-radius: 40px; /* Pill/Capsule - High corner radius */
  padding: 12px 24px;
  font-family: "On", system-ui, sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.3;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}}

.btn-secondary:hover {{
  opacity: 0.9;
  transform: scale(1.02);
}}

.btn-secondary:active {{
  transform: scale(0.98);
}}
```

### 3. Circular Navigation Buttons - Perfect Circle
```css
.btn-circular {{
  background: rgb(255, 255, 255);
  color: rgb(0, 0, 0);
  border: 1px solid rgb(255, 255, 255);
  border-radius: 50%; /* Perfect circle */
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}}

.btn-circular:hover {{
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}}

.btn-circular:active {{
  transform: scale(0.95);
}}
```

### 4. System Buttons - Rounded Rectangle
```css
.btn-system {{
  background: rgb(34, 34, 34);
  color: rgb(255, 255, 255);
  border: 1px solid rgb(34, 34, 34);
  border-radius: 2px; /* Rounded rectangle - Small corner radius */
  padding: 15px 30px;
  font-family: "On", system-ui, sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.3;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}}

.btn-system:hover {{
  background: rgb(51, 51, 51);
}}

.btn-system:active {{
  background: rgb(21, 21, 21);
}}
```

### 5. Link Buttons - Text Style
```css
.btn-link {{
  background: transparent;
  color: rgb(0, 0, 238);
  border: none;
  padding: 8px 0;
  font-family: "On", system-ui, sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.4;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  position: relative;
}}

.btn-link:hover {{
  color: rgb(0, 0, 180);
}}

.btn-link:hover::after {{
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: rgb(0, 0, 180);
}}
```

### 6. Hero Section - Dynamic Background
```css
.hero-section {{
  min-height: 100vh;
  background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)),
              url('/hero-image.jpg') center/cover;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
  position: relative;
}}

.hero-content {{
  max-width: 800px;
  padding: 0 24px;
  z-index: 1;
}}

.header {{
  padding: 0px 32px;
  display: flex;
  box-sizing: border-box;
  background: no-repeat;
  position: relative;
  border-bottom: 1px solid var(--gray-lighter);
  z-index: 100;
}}
.nav-container {{
  padding: 16px 0px;
}}

.hero-title {{
  font-family: "On", system-ui, sans-serif;
  font-size: clamp(32px, 5vw, 52.992px);
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 16px;
  color: rgb(255, 255, 255);
}}

.hero-subtitle {{
  font-family: "On", system-ui, sans-serif;
  font-size: clamp(16px, 2.5vw, 20px);
  font-weight: 400;
  line-height: 1.5;
  margin-bottom: 32px;
  color: rgb(255, 255, 255);
}}

.hero-buttons {{
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}}
```

## 📐 Layout System - brand Grid

### Grid Layout
```css
.grid-system {{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
}}
```

### Spacing System - brand Precision
```css
/* brand spacing values */
.space-8 {{ margin: 8px; }}    /* Minimal spacing */
.space-16 {{ margin: 16px; }}  /* Small spacing */
.space-24 {{ margin: 24px; }}  /* Standard spacing */
.space-32 {{ margin: 32px; }}  /* Large spacing */
.space-40 {{ margin: 40px; }}  /* Extra large spacing */
.space-48 {{ margin: 48px; }}  /* Section spacing */
.space-64 {{ margin: 64px; }}  /* Hero spacing */

/* Padding versions */
.pad-8 {{ padding: 8px; }}
.pad-16 {{ padding: 16px; }}
.pad-24 {{ padding: 24px; }}
.pad-32 {{ padding: 32px; }}
.pad-40 {{ padding: 40px; }}
.pad-48 {{ padding: 48px; }}
.pad-64 {{ padding: 64px; }}
```

### Container System - brand Precision
```css
.container {{
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
}}

.container-narrow {{
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
}}
```

## 📱 Responsive Design - brand Breakpoints

### Breakpoints
```css
/* brand precision breakpoints */
@media (max-width: 767px) {{
  /* Mobile */
  .hero-section {{
    padding: 60px 16px;
    min-height: 80vh;
  }}
  
  .grid-system {{
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 24px;
  }}
  
  .container {{
    padding: 0 16px;
  }}
  
  .btn-primary,
  .btn-secondary {{
    width: 100%;
    min-height: 52px;
  }}
  
  .hero-buttons {{
    flex-direction: column;
    gap: 12px;
  }}
}}

@media (min-width: 768px) and (max-width: 1023px) {{
  /* Tablet */
  .grid-system {{
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 28px;
    padding: 28px;
  }}
}}

@media (min-width: 1024px) {{
  /* Desktop */
  .grid-system {{
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 40px;
    padding: 40px;
  }}
  
  .btn-circular:hover {{
    transform: scale(1.1);
  }}
}}
```

## 📝 Typography System - brand Fonts

### Font Setup
```css
/* Custom ON Brand Fonts */
@font-face {{
  font-family: 'On';
  src: url('path-to-on-font.woff2') format('woff2');
  font-display: swap;
  font-weight: 400 700;
}}

@font-face {{
  font-family: 'On Mono';
  src: url('path-to-on-mono-font.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
}}

/* Font Family Variables */
:root {{
  --font-primary: "On", "Noto Sans JP", "Noto Sans KR", system-ui, -apple-system, "segoe ui", roboto, ubuntu, cantarell, "noto sans", sans-serif;
  --font-mono: "On Mono", menlo, consolas, "roboto mono", "ubuntu monospace", "noto mono", "oxygen mono", "liberation mono", monospace;
}}

body {{
  font-family: var(--font-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}}
```

### Typography Scale - brand Precision
```css
/* Display and Headlines */
.text-hero {{ 
  font-family: var(--font-primary);
  font-size: clamp(32px, 5vw, 52.992px);
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
}}

.text-section {{ 
  font-family: var(--font-primary);
  font-size: clamp(24px, 4vw, 42px);
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
}}

.text-modal {{ 
  font-family: var(--font-primary);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--gray-darkest);
}}

/* Specialty - Monospace */
.text-mono {{ 
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 400;
  line-height: 1.2;
  color: var(--text-primary);
}}

.text-mono-small {{ 
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--text-primary);
}}

/* Body text */
.text-body-large {{ 
  font-family: var(--font-primary);
  font-size: clamp(16px, 2.5vw, 18px);
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-primary);
}}

.text-body {{ 
  font-family: var(--font-primary);
  font-size: clamp(14px, 2vw, 16px);
  font-weight: 400;
  line-height: 1.5;
  color: var(--text-primary);
}}

.text-body-small {{ 
  font-family: var(--font-primary);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--text-secondary);
}}

.text-caption {{ 
  font-family: var(--font-primary);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.3;
  color: var(--text-muted);
}}

/* Interactive elements */
.text-button {{ 
  font-family: var(--font-primary);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.3;
}}

.text-link {{ 
  font-family: var(--font-primary);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--brand-blue);
}}
```

## 🎯 Animation Guidelines - brand Precision

### Micro-Interactions
```css
/* Button hover animations */
.btn-hover {{
  transition: all 0.2s ease;
}}

.btn-hover:hover {{
  transform: scale(1.02);
}}

.btn-hover:active {{
  transform: scale(0.98);
}}

/* Circular button hover */
.btn-circular-hover {{
  transition: all 0.2s ease;
}}

.btn-circular-hover:hover {{
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}}

/* Card hover animations */
.card-hover {{
  transition: all 0.2s ease;
}}

.card-hover:hover {{
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}}

/* Link hover animations */
.link-hover {{
  position: relative;
  transition: color 0.2s ease;
}}

.link-hover::after {{
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 1px;
  background: var(--brand-blue);
  transition: width 0.2s ease;
}}

.link-hover:hover::after {{
  width: 100%;
}}
```

### Page Load Animations (with Motion/Framer Motion)
```jsx
import {{ motion }} from 'motion/react';

// Fade in with slide up
const fadeInUp = {{
  initial: {{ opacity: 0, y: 20 }},
  animate: {{ opacity: 1, y: 0 }},
  transition: {{ duration: 0.5, ease: "easeOut" }}
}};

// Staggered children animation
const staggerContainer = {{
  animate: {{
    transition: {{
      staggerChildren: 0.1
    }}
  }}
}};

// Scale on hover
const scaleHover = {{
  whileHover: {{ scale: 1.02 }},
  whileTap: {{ scale: 0.98 }},
  transition: {{ duration: 0.2 }}
}};
```

## 🚫 Common Mistakes to Avoid

**Don't:**
- Use colors outside the minimal brand palette
- Add unnecessary visual flourishes or decorations
- Overcomplicate the clean, minimalist design
- Use multiple font weights unnecessarily
- Ignore the circular button style for navigation
- Skip responsive font sizing
- Forget accessibility considerations

**Do:**
- Maintain the brand minimalist aesthetic
- Use high contrast for optimal readability
- Keep interactions subtle and purposeful
- Test on actual devices for touch interactions
- Use the ON brand fonts correctly


## 📦 Libraries to Install

### Required Dependencies
```bash
# Core styling and animation
npm install motion@10.16.2
npm install styled-components@5.3.11
npm install @emotion/react@11.11.1 @emotion/styled@11.11.0

# Typography and fonts
npm install @next/font@13.5.6
npm install @fontsource/system-ui@5.0.12

# Interactive components
npm install swiper@11.0.5
npm install react-intersection-observer@9.5.3

# Utility libraries
npm install clsx@2.0.0
npm install tailwindcss@3.3.6

```

### Usage Examples
```jsx
// Hero Button with Motion
import {{ motion }} from 'motion/react';
import styled from 'styled-components';

const MotionButton = styled(motion.button)`
  /* Apply .btn-primary styles */
  background: rgb(255, 255, 255);
  color: rgb(0, 0, 0);
  border: 1px solid rgb(255, 255, 255);
  border-radius: 40px;
  padding: 12px 24px;
  font-family: "On", system-ui, sans-serif;
  font-size: 16px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
`;

<MotionButton
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.2 }}
>
  Shop men's
</MotionButton>

// Circular Navigation Button
import {{ ChevronLeft, ChevronRight }} from 'lucide-react';

const CircularButton = styled(motion.button)`
  /* Apply .btn-circular styles */
  background: rgb(255, 255, 255);
  color: rgb(0, 0, 0);
  border: 1px solid rgb(255, 255, 255);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
`;

<CircularButton
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  <ChevronLeft size={{20}} />
</CircularButton>

// Product Card with Hover Animation
import {{ motion }} from 'motion/react';

<motion.div
  className="product-card"
  whileHover={{ y: -4 }}
  transition={{ duration: 0.2 }}
>
  Card content
</motion.div>

// brand Grid System
import {{ motion }} from 'motion/react';

const brandGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
`;

<brandGrid>
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
  >
    Grid item
  </motion.div>
</brandGrid>
```

## 🎨 brand Design Principles

### Key Characteristics
- **Minimalist**: Clean, uncluttered layouts
- **High Contrast**: Strong black and white foundation
- **Precision**: Exact spacing and alignment
- **Functionality**: Every element serves a purpose
- **Quality**: Premium materials and craftsmanship
- **Performance**: brand engineering excellence

### Visual Hierarchy
1. **Primary**: Product focus with clear messaging
2. **Secondary**: Category navigation and organization
3. **Tertiary**: Brand story and supporting content
4. **Quaternary**: Legal and footer information

### brand Athletic Brand Voice
- **Performance-driven**: Technical excellence
- **Precision-focused**: brand engineering quality
- **Minimalist communication**: Clear, direct messaging
- **Innovation-centered**: Cutting-edge technology
- **Premium positioning**: High-quality materials and design
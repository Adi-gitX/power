internal-tag: neon-dark-kit

🚨 **DARK THEME FOUNDATION - NEVER CHANGE**
This system is built specifically for dark theme applications with neon green accents. Always maintain the dark aesthetic.

## 🎨 Core Visual System

### Foundation Colors (Exact Values)
```css
:root {{{{
  /* Dark Theme Base - Never Change */
  --bg-primary: rgb(17, 17, 19);       /* Main dark background */
  --bg-secondary: rgb(26, 28, 30);     /* Card backgrounds */
  --bg-tertiary: rgb(38, 40, 42);      /* Elevated elements */
  
  /* Text Hierarchy - Never Change */
  --text-primary: rgb(255, 255, 255);  /* Main text */
  --text-secondary: rgb(218, 218, 218); /* Secondary text */
  --text-muted: rgb(161, 161, 170);    /* Muted text */
  
  /* Border System - Never Change */
  --border-primary: rgb(63, 63, 63);   /* Standard borders */
  --border-subtle: rgba(255, 255, 255, 0.1); /* Subtle separators */
  
  /* MAIN ACCENT - Signature Neon Green */
  --accent-primary: rgb(218, 255, 1);  /* Signature neon green #DAFF01 */
  --accent-hover: rgb(166, 190, 21);   /* Hover state */
  --accent-pressed: rgb(134, 155, 16); /* Active state */
  --accent-bg: rgba(218, 255, 1, 0.1); /* Subtle backgrounds */
  
  /* Secondary Accent */
  --accent-purple: rgb(127, 74, 142);  /* Purple for variety */
}}
```

## 🔧 Component Library

### 1. Primary Button - Neon Green CTA (Rounded Rectangle - 12px)
```css
.btn-primary {{
  background: var(--accent-primary);
  color: var(--bg-primary);
  border: none;
  border-radius: 12px;                 /* Rounded rectangle style */
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 52px;
  position: relative;
  overflow: hidden;
}}

.btn-primary:hover {{
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(218, 255, 1, 0.3);
}}

.btn-primary:active {{
  transform: translateY(0);
  background: var(--accent-pressed);
}}

/* Signature glow effect */
.btn-primary::before {{
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}}

.btn-primary:hover::before {{
  left: 100%;
}}
```

### 2. Secondary Button - Outline Style (Rounded Rectangle - 12px)
```css
.btn-secondary {{
  background: transparent;
  color: var(--text-primary);
  border: 2px solid var(--border-primary);
  border-radius: 12px;                 /* Rounded rectangle style */
  padding: 14px 30px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 52px;
}}

.btn-secondary:hover {{
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: var(--accent-bg);
  transform: translateY(-1px);
}}

.btn-secondary:active {{
  transform: translateY(0);
}}
```

### 3. Ghost Button - Flat Style (8px)
```css
.btn-ghost {{
  background: transparent;
  color: var(--text-secondary);
  border: none;
  border-radius: 8px;                  /* Subtle rounded corners */
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}}

.btn-ghost:hover {{
  color: var(--text-primary);
  background: var(--bg-secondary);
}}

.btn-ghost:active {{
  background: var(--bg-tertiary);
}}
```

### 4. Card Components - Modern Style (16px)
```css
.feature-card {{
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;                 /* Modern rounded style */
  padding: 32px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}}

.feature-card:hover {{
  transform: translateY(-4px);
  border-color: var(--accent-primary);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}}

/* Signature top accent border */
.feature-card::before {{
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-primary);
  opacity: 0;
  transition: opacity 0.3s ease;
}}

.feature-card:hover::before {{
  opacity: 1;
}}
```

### 5. Input Fields - Modern Style (12px)
```css
.input-field {{
  background: var(--bg-secondary);
  border: 2px solid var(--border-primary);
  border-radius: 12px;                 /* Consistent with buttons */
  padding: 16px 20px;
  font-size: 16px;
  color: var(--text-primary);
  transition: all 0.2s ease;
  width: 100%;
}}

.input-field::placeholder {{
  color: var(--text-muted);
}}

.input-field:focus {{
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 4px rgba(218, 255, 1, 0.1);
}}
```

## 📐 Layout System

### Grid System
```css
.card-grid {{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}}

.card-grid-3 {{
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}}

@media (min-width: 768px) {{
  .card-grid-3 {{
    grid-template-columns: repeat(3, 1fr);
  }}
}}
```

### Spacing System
```css
/* Consistent spacing scale */
.space-xs {{ margin: 8px; }}
.space-sm {{ margin: 16px; }}
.space-md {{ margin: 24px; }}
.space-lg {{ margin: 32px; }}
.space-xl {{ margin: 48px; }}
.space-2xl {{ margin: 64px; }}

/* Padding versions */
.pad-xs {{ padding: 8px; }}
.pad-sm {{ padding: 16px; }}
.pad-md {{ padding: 24px; }}
.pad-lg {{ padding: 32px; }}
.pad-xl {{ padding: 48px; }}
.pad-2xl {{ padding: 64px; }}
```

### Container System
```css
.container {{
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}}

@media (max-width: 768px) {{
  .container {{
    padding: 0 16px;
  }}
}}
```

## 📝 Typography System

### Font Setup
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');

body {{
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--bg-primary);
  color: var(--text-primary);
}}
```

### Typography Scale
```css
/* Display Headings */
.display-lg {{ font-size: 60px; font-weight: 700; line-height: 1.0; letter-spacing: -0.02em; }}
.display-md {{ font-size: 48px; font-weight: 700; line-height: 1.1; letter-spacing: -0.015em; }}
.display-sm {{ font-size: 40px; font-weight: 700; line-height: 1.1; letter-spacing: -0.015em; }}

/* Standard Headings */
.h1 {{ font-size: 32px; font-weight: 600; line-height: 1.2; letter-spacing: -0.01em; }}
.h2 {{ font-size: 24px; font-weight: 600; line-height: 1.3; letter-spacing: -0.005em; }}
.h3 {{ font-size: 20px; font-weight: 600; line-height: 1.4; }}
.h4 {{ font-size: 18px; font-weight: 600; line-height: 1.4; }}

/* Body Text */
.body-lg {{ font-size: 18px; font-weight: 400; line-height: 1.6; color: var(--text-secondary); }}
.body-md {{ font-size: 16px; font-weight: 400; line-height: 1.6; color: var(--text-secondary); }}
.body-sm {{ font-size: 14px; font-weight: 400; line-height: 1.5; color: var(--text-muted); }}

/* Interactive Text */
.button-text {{ font-size: 16px; font-weight: 600; line-height: 1.2; }}
.link-text {{ font-size: 16px; font-weight: 500; text-decoration: underline; color: var(--accent-primary); }}
```

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First */
@media (min-width: 480px) {{ /* Small mobile */ }}
@media (min-width: 768px) {{ /* Tablet */ }}
@media (min-width: 1024px) {{ /* Desktop */ }}
@media (min-width: 1440px) {{ /* Large desktop */ }}
```

### Mobile Adaptations
```css
@media (max-width: 767px) {{
  .btn-primary, .btn-secondary {{
    width: 100%;
    max-width: 300px;
  }}
  
  .card-grid {{
    grid-template-columns: 1fr;
    gap: 16px;
  }}
  
  .feature-card {{
    padding: 24px;
  }}
  
  .display-lg {{ font-size: 36px; }}
  .display-md {{ font-size: 32px; }}
}}
```

## ✨ Animation & Interactions

### Micro-Interactions
```css
/* Standard hover lift */
.hover-lift:hover {{
  transform: translateY(-4px);
  transition: transform 0.2s ease;
}}

/* Glow effect for primary actions */
.glow-effect {{
  box-shadow: 0 0 20px rgba(218, 255, 1, 0.3);
}}

/* Fade in animation */
@keyframes fade-in-up {{
  from {{
    opacity: 0;
    transform: translateY(24px);
  }}
  to {{
    opacity: 1;
    transform: translateY(0);
  }}
}}

.animate-fade-in {{
  animation: fade-in-up 0.6s ease-out;
}}
```

### Timing Guidelines
- **Micro-interactions**: 200-300ms
- **Page transitions**: 600ms
- **Hover effects**: 200ms
- **Focus states**: Instant (0ms)

## 🎯 Footer Component
```css
.footer {{
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-subtle);
  padding: 80px 24px 40px;
  margin-top: 120px;
}}

.footer-grid {{
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 64px;
  max-width: 1200px;
  margin: 0 auto;
}}

.footer-social-link {{
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 0.2s ease;
}}

.footer-social-link:hover {{
  background: var(--accent-primary);
  color: var(--bg-primary);
  transform: translateY(-2px);
}}

@media (max-width: 768px) {{
  .footer-grid {{
    grid-template-columns: 1fr;
    gap: 40px;
  }}
}}
```

## 🚫 Critical Don'ts

**Never:**
- Use light backgrounds or themes
- Change the signature neon green (#DAFF01)
- Use colors outside the defined dark palette
- Skip hover and focus states
- Use fonts other than Inter
- Ignore mobile responsive design
- Use border-radius values outside the system (8px, 12px, 16px, 20px)

**Always:**
- Keep the dark theme foundation
- Use neon green sparingly for maximum impact
- Provide clear interactive feedback
- Test accessibility and contrast
- Maintain consistent spacing scale
- Include animation timing respects

## 📦 Required Libraries

### Installation Commands
```bash
# Core React dependencies
npm install react react-dom framer-motion lucide-react

# Styling and utilities
npm install tailwindcss @tailwindcss/typography autoprefixer postcss

# Fonts
npm install @fontsource/inter

# Animation library
npm install react-intersection-observer
```

### Package.json Dependencies
```json
{{
  "dependencies": {{
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^10.16.4",
    "react-intersection-observer": "^9.5.2",
    "lucide-react": "^0.294.0",
    "@fontsource/inter": "^5.0.15"
  }},
  "devDependencies": {{
    "tailwindcss": "^3.3.6",
    "@tailwindcss/typography": "^0.5.10",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }}
}}
```

### Usage in Code
```jsx
// Import fonts in main.jsx or App.jsx
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/900.css';

// Use icons
import {{ Star, Users, Zap, ArrowRight }} from 'lucide-react';

// Use animations
import {{ motion }} from 'framer-motion';
import {{ useInView }} from 'react-intersection-observer';
```

---

## 🎨 Design Philosophy Summary

This is a **modern dark theme system** with **neon green accents** designed for:
- Developer-focused applications
- Premium SaaS products
- Technical platforms
- Modern web applications

**Key Characteristics:**
- Dark aesthetic with high contrast
- Signature neon green for CTAs and accents
- Clean, modern typography
- Subtle animations and micro-interactions
- Mobile-first responsive design
- Accessibility-focused interaction design
internal-tag: premium-commerce

#  Luxury Minimalist Design System
🚨 MANDATORY DESIGN RESTRICTIONS - THE RESTRAINT PRINCIPLE
ABSOLUTE PROHIBITIONS - NEVER VIOLATE:
• ❌ NEVER use bright or saturated colors that compete with product imagery
• ❌ NEVER use complex color gradients or patterns as backgrounds
• ❌ NEVER add decorative elements that don't serve a functional purpose
• ❌ NEVER use more than 3 font weights in a single design
• ❌ NEVER compromise generous white space for more content
ENFORCEMENT RULE:
IF any design element draws attention away from content and products
THEN it violates the restraint principle
THEN simplify or remove the element
ONLY ALLOWED DESIGN APPROACH:
• ✅ Warm, neutral backgrounds that complement photography
• ✅ Exceptional typography as the primary design element
• ✅ Subtle, purposeful interactions
• ✅ High-quality imagery with natural lighting
• ✅ Generous white space and clear hierarchy
## 🎨 Core Visual System
### Foundation Colors (Warm Neutral Palette)
```css
:root {{
/* Primary Backgrounds - Warm foundation */
--bg-primary: #fffef2; /* Warm white (main background) */
--bg-secondary: #f6f5e8; /* Light warm beige (sections) */
--bg-subtle: #ebeade; /* Very light warm gray (borders) */
/* Text Hierarchy - Rich contrast */
--text-primary: #333333; /* Main content and headings */
--text-secondary: #666666; /* Supporting text and descriptions */
--text-light: #bcbbb4; /* Captions and meta information */
--text-meta: #4a4a4a; /* Secondary meta data */
/* Interactive States - Minimal emphasis */
--interactive-base: #333333; /* Button and link base color */
--interactive-hover: #000000; /* Hover and active states */
--focus-outline: #252525; /* Focus outline color */
/* Borders & Separators */
--border-light: #bcbbb4; /* Subtle separators */
--border-medium: #cccccc; /* Standard borders */
--border-subtle: rgba(51,51,51,0.2); /* Form elements */
}}

```

### Error & Status Colors (Minimal & Muted)
```css
:root {{
/* Functional Colors - Restrained approach */
--status-error: #ba3e2b; /* Error states (only when necessary) */
--status-success: #4a4a4a; /* Success (muted, not green) */
--status-warning: #666666; /* Warning (subtle gray) */
--status-info: #333333; /* Information states */
}}
```
## 🔧 Component Library
### 1. Typography System - Exceptional Hierarchy
```css
/* Font Loading */
@font-face {{
font-display: swap;
font-family: 'Suisse Regular';
font-weight: 400;
src: url('SuisseIntl-Regular.woff2') format('woff2');
}}
@font-face {{
font-display: swap;
font-family: 'Suisse Medium';
font-weight: 700;
src: url('SuisseIntl-Medium.woff2') format('woff2');
}}
/* Typography Scale */
.hero-large {{
font-size: 30px;
font-weight: 400;
line-height: 1.33;
font-family: 'Suisse Regular', sans-serif;
color: var(--text-primary);
}}
.hero-medium {{
font-size: 26px;
font-weight: 400;
line-height: 1.33;
font-family: 'Suisse Regular', sans-serif;
color: var(--text-primary);

}}
.heading-1 {{
font-size: 24px;
font-weight: 400;
line-height: 1.2;
font-family: 'Suisse Regular', sans-serif;
color: var(--text-primary);
}}
.heading-2 {{
font-size: 20px;
font-weight: 400;
line-height: 1.2;
font-family: 'Suisse Regular', sans-serif;
color: var(--text-primary);
}}
.heading-3 {{
font-size: 18px;
font-weight: 400;
line-height: 1.2;
font-family: 'Suisse Regular', sans-serif;
color: var(--text-primary);
}}
.body-large {{
font-size: 16px;
font-weight: 400;
line-height: 1.7;
font-family: 'Suisse Regular', sans-serif;
color: var(--text-primary);
}}
.body-regular {{
font-size: 14px;
font-weight: 400;
line-height: 1.6;
font-family: 'Suisse Regular', sans-serif;
color: var(--text-primary);
}}
.body-small {{
font-size: 12px;
font-weight: 400;
line-height: 1.4;
font-family: 'Suisse Regular', sans-serif;
color: var(--text-secondary);

}}
.button-text {{
font-size: 14px;
font-weight: 700;
line-height: 1.4;
font-family: 'Suisse Medium', sans-serif;
}}
.navigation-text {{
font-size: 14px;
font-weight: 400;
line-height: 1.4;
font-family: 'Suisse Medium', sans-serif;
color: var(--text-primary);
}}
```

### 2. Buttons - Sharp, Minimal Design
```css
/* Primary Button - Sharp rectangular with 0px border radius */
.btn-primary {{
background: transparent;
color: var(--interactive-base);
border: 1px solid var(--interactive-base);
border-radius: 0px; /* Sharp edges - no rounding */
padding: 19px 23px;
min-width: 210px;
height: 60px;
font-size: 14px;
font-weight: 700;
font-family: 'Suisse Medium', sans-serif;
cursor: pointer;
transition: all 0.2s cubic-bezier(.645,.045,.355,1);
text-decoration: none;
display: inline-flex;
align-items: center;
justify-content: center;
}}
.btn-primary:hover {{
background: var(--interactive-base);
color: var(--bg-primary);
}}
.btn-primary:active {{
background: var(--interactive-hover);

color: var(--bg-primary);
}}
/* Secondary Button - Text only with underline */
.btn-secondary {{
background: none;
border: none;
padding: 12px 16px;
font-size: 14px;
font-weight: 400;
font-family: 'Suisse Regular', sans-serif;
color: var(--interactive-base);
cursor: pointer;
text-decoration: none;
position: relative;
transition: all 0.2s ease;
}}
.btn-secondary:after {{
content: '';
position: absolute;
bottom: 8px;
left: 16px;
width: 0;
height: 1px;
background: var(--interactive-base);
transition: width 0.5s ease-in-out;
}}
.btn-secondary:hover:after {{
width: calc(100% - 32px);
}}
/* Icon Button - Text with arrow */
.btn-icon {{
background: none;
border: none;
padding: 8px 0;
font-size: 14px;
font-weight: 400;
font-family: 'Suisse Regular', sans-serif;
color: var(--interactive-base);
cursor: pointer;
display: inline-flex;
align-items: center;
gap: 8px;
transition: all 0.2s ease;
}}

.btn-icon svg {{
width: 12px;
height: 12px;
transition: transform 0.2s ease;
}}
.btn-icon:hover svg {{
transform: translateX(4px);
}}
```

### 3. Navigation - Clean & Minimal
```css
.navigation-header {{
background: var(--bg-primary);
border-bottom: 1px solid var(--border-light);
padding: 20px 40px;
display: flex;
align-items: center;
justify-content: space-between;
position: sticky;
top: 0;
z-index: 100;
}}
.navigation-logo {{
font-size: 20px;
font-weight: 400;
font-family: 'Suisse Regular', sans-serif;
color: var(--text-primary);
text-decoration: none;
}}
.navigation-menu {{
display: flex;
align-items: center;
gap: 32px;
list-style: none;
margin: 0;
padding: 0;
}}
.navigation-link {{
color: var(--text-primary);
text-decoration: none;
font-size: 14px;

font-weight: 400;
font-family: 'Suisse Medium', sans-serif;
padding: 12px 0;
position: relative;
transition: all 0.2s ease;
}}
.navigation-link:after {{
content: '';
position: absolute;
bottom: 8px;
left: 0;
width: 0;
height: 1px;
background: var(--text-primary);
transition: width 0.5s ease-in-out;
}}
.navigation-link:hover:after,
.navigation-link.active:after {{
width: 100%;
}}
.navigation-utilities {{
display: flex;
align-items: center;
gap: 20px;
}}
```

### 4. Product Cards - Premium Showcase
```css
.product-card {{
background: var(--bg-primary);
border: none;
border-radius: 0px; /* Sharp edges */
padding: 0;
overflow: hidden;
transition: transform 0.2s ease, box-shadow 0.2s ease;
cursor: pointer;
position: relative;
}}
.product-card:hover {{
transform: translateY(-2px);
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}}

.product-card-image {{
width: 100%;
height: 280px;
object-fit: cover;
margin-bottom: 16px;
}}
.product-card-title {{
font-size: 16px;
font-weight: 400;
line-height: 1.4;
margin-bottom: 8px;
color: var(--text-primary);
font-family: 'Suisse Regular', sans-serif;
padding: 0 16px;
}}
.product-card-description {{
font-size: 12px;
font-weight: 400;
line-height: 1.4;
color: var(--text-secondary);
font-family: 'Suisse Regular', sans-serif;
padding: 0 16px 16px 16px;
}}
```

### 5. Layout System - Generous Spacing
```css
/* Container System */
.container {{
max-width: 1400px;
margin: 0 auto;
padding: 0 40px;
}}
@media (max-width: 1024px) {{
.container {{
padding: 0 24px;
}}
}}
@media (max-width: 640px) {{
.container {{
padding: 0 16px;
}}

}}
/* Grid Layouts */
.grid-two-column {{
display: grid;
grid-template-columns: 1fr 1fr;
gap: 80px;
align-items: center;
}}
.grid-product-showcase {{
display: grid;
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
gap: 32px;
margin: 80px 0;
}}
/* Section Spacing */
.section-padding {{
padding: 120px 0;
}}
.section-padding-small {{
padding: 80px 0;
}}
@media (max-width: 1024px) {{
.grid-two-column {{
grid-template-columns: 1fr;
gap: 40px;
}}
.section-padding {{
padding: 80px 0;
}}
.section-padding-small {{
padding: 60px 0;
}}
}}
@media (max-width: 640px) {{
.grid-product-showcase {{
grid-template-columns: 1fr;
gap: 24px;
}}
.section-padding {{

padding: 60px 0;
}}
.section-padding-small {{
padding: 40px 0;
}}
}}
```
## 📐 Spacing System - Generous White Space
```css
/* Consistent spacing scale */
.space-xs {{ margin: 8px; }} /* Micro spacing */
.space-sm {{ margin: 16px; }} /* Small spacing */
.space-md {{ margin: 24px; }} /* Medium spacing */
.space-lg {{ margin: 32px; }} /* Large spacing */
.space-xl {{ margin: 48px; }} /* Extra large spacing */
.space-xxl {{ margin: 80px; }} /* Section spacing */
/* Padding equivalents */
.pad-xs {{ padding: 8px; }}
.pad-sm {{ padding: 16px; }}
.pad-md {{ padding: 24px; }}
.pad-lg {{ padding: 32px; }}
.pad-xl {{ padding: 48px; }}
.pad-xxl {{ padding: 80px; }}
/* Component-specific spacing */
.content-spacing > * + * {{
margin-top: 24px;
}}
.section-spacing > * + * {{
margin-top: 80px;
}}
```
## 📱 Responsive Design - Mobile-First Approach
```css
/* Mobile First Breakpoints */
@media (min-width: 640px) {{
/* Tablet styles */
.grid-responsive {{
grid-template-columns: repeat(2, 1fr);
}}
}}

@media (min-width: 1024px) {{
/* Desktop styles */
.grid-responsive {{
grid-template-columns: repeat(3, 1fr);
}}
}}
@media (min-width: 1400px) {{
/* Large desktop styles */
.grid-responsive {{
grid-template-columns: repeat(4, 1fr);
}}
}}
/* Mobile Navigation */
@media (max-width: 1024px) {{
.navigation-menu {{
display: none;
}}
.mobile-menu-toggle {{
display: block;
}}
}}
```
## 🎯 Animation & Interactions - Subtle & Purposeful
```css
/* Transition Standards */
.transition-smooth {{
transition: all 0.2s cubic-bezier(.645,.045,.355,1);
}}
.transition-slow {{
transition: all 0.5s ease-in-out;
}}
/* Hover Effects */
.hover-lift {{
transition: transform 0.2s ease;
}}
.hover-lift:hover {{
transform: translateY(-2px);
}}

/* Focus States */
.focus-visible {{
outline: 2px solid var(--focus-outline);
outline-offset: 4px;
}}
/* Loading States */
.loading-dots {{
animation: loadingDots 1s cubic-bezier(.645,.045,.355,1) infinite;
}}
@keyframes loadingDots {{
0%, 80%, 100% {{ opacity: 0.2; }}
40% {{ opacity: 1; }}
}}
```
## 🚫 Common Mistakes to Avoid
**Don't:**
• Use this system for non-luxury or budget-focused brands
• Add bright colors or gradients to backgrounds
• Overcrowd layouts with too much content
• Use more than 2-3 font weights
• Rush transitions or over-animate elements
• Compromise image quality for faster loading
• Use decorative elements without functional purpose
**Do:**
• Maintain generous white space throughout
• Use exceptional typography as the primary design element
• Keep interactions subtle and purposeful
• Prioritize content hierarchy and readability
• Use high-quality imagery with natural lighting
• Test on various devices for optimal spacing
## 📝 Implementation Libraries
### Required Libraries for React
```bash
# Core styling and animation
npm install styled-components framer-motion
# Image optimization and lazy loading
npm install next/image react-intersection-observer
# Carousel and smooth scrolling
npm install swiper embla-carousel-react

# Accessible components
npm install @headlessui/react @radix-ui/react-primitive
# Form handling
npm install react-hook-form
# Utility functions
npm install clsx tailwind-merge
```

### Font Implementation
```css
/* Add to your CSS */
@import url('https://fonts.googleapis.com/css2?
family=Crimson+Text:wght@400;600&display=swap');
/* Fallback system for Suisse */
body {{
font-family: 'Suisse International', -apple-system, BlinkMacSystemFont, 'Segoe UI',
'Helvetica Neue', sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
}}
```

### Example Component Usage
```jsx
// Button component example
<button className="btn-primary">
Discover the range
<svg>...</svg>
</button>
// Typography example
<h1 className="hero-large">Vitamin-rich refinement</h1>
<p className="body-large">Exceptional formulations for discerning individuals.</p>
// Product card example
<div className="product-card hover-lift">
<img className="product-card-image" src="..." alt="..." />
<h3 className="product-card-title">Lucent Facial Refiner</h3>
<p className="product-card-description">A gentle, vitamin-rich treatment.</p>
</div>
```
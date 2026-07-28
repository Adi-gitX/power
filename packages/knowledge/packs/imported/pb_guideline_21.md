internal-tag: e-cosmetics

# Modern Design Portfolio System
🚨 MANDATORY COLOR RESTRICTION - THE 90/10 RULE
**ABSOLUTE PROHIBITIONS - NEVER VIOLATE:**
- ❌ NEVER use colored backgrounds for hero sections, main sections, or large areas
- ❌ NEVER use coral/accent colors covering more than card-sized areas
- ❌ NEVER use brand colors for anything larger than a card or button
- ❌ NEVER fill large sections with any color except white (#FFFFFF) or subtle gray
(#F8F8F8)
**ENFORCEMENT RULE:**
IF any colored area is larger than 300px × 200px (card size)
THEN it violates the color restriction
THEN use white or subtle gray background instead
**ONLY ALLOWED COLOR USAGE:**
- ✅ Individual cards with accent colors - strategic highlights only
- ✅ Buttons and CTAs - small, focused interactive elements
- ✅ Logo and brand marks - minimal brand identity elements
- ✅ Small product highlights - accent elements only
## 🎨 Core Visual System
### Foundation Colors (Never Change)
```css
:root {{
/* Backgrounds - Clean and Minimal */
--bg-page: #FFFFFF; /* Main page background */
--bg-card: #FFFFFF; /* Standard card backgrounds */
--bg-subtle: #F8F8F8; /* Subtle background variations */
--bg-section: #FAFAFA; /* Section backgrounds */
/* Text - Professional Hierarchy */
--text-primary: #2D2D2D; /* Main headings and content */
--text-secondary: #666666; /* Supporting text */
--text-muted: #999999; /* Captions, timestamps */
/* Borders - Subtle Separators */
--border-light: #E8E8E8; /* Light separators */
--border-medium: #CCCCCC; /* Standard borders */
--border-strong: #999999; /* Emphasized borders */
/* ACCENT COLORS - Strategic Use Only */
--accent-coral: #FF6B6B; /* Primary accent (cards & highlights) */
--accent-coral-hover: #FF5252; /* Hover state */
--accent-coral-active: #FF3D3D; /* Active/pressed state */
--accent-brown: #A67C52; /* Secondary warm accent */

--accent-brown-hover: #8B5A2B; /* Brown hover state */
}}
```
## 🔧 Component Library
### 1. Asymmetrical Grid System
```css
.portfolio-grid {{
display: grid;
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
grid-auto-rows: 200px;
gap: 20px;
padding: 40px;
max-width: 1200px;
margin: 0 auto;
}}
.portfolio-card {{
background: var(--bg-card);
border-radius: 8px;
padding: 20px;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
transition: transform 0.3s ease, box-shadow 0.3s ease;
cursor: pointer;
position: relative;
overflow: hidden;
}}
.portfolio-card:hover {{
transform: scale(1.02);
box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}}
/* Accent Card Variations - Use Sparingly */
.portfolio-card.accent-coral {{
background: var(--accent-coral);
color: white;
}}
.portfolio-card.accent-brown {{
background: var(--accent-brown);
color: white;
}}
.portfolio-card.accent-black {{
background: #000000;
color: white;

}}
```

### 2. Button System
#### Primary Button (Coral Accent)
```css
.btn-primary {{
background: var(--accent-coral);
color: white;
border: none;
border-radius: 8px;
padding: 12px 24px;
font-size: 14px;
font-weight: 500;
cursor: pointer;
transition: all 0.3s ease;
min-height: 40px;
display: inline-flex;
align-items: center;
justify-content: center;
letter-spacing: 0.01em;
}}
.btn-primary:hover {{
background: var(--accent-coral-hover);
transform: scale(1.05);
}}
.btn-primary:active {{
background: var(--accent-coral-active);
transform: scale(0.98);
}}
```

#### Secondary Button (Outline)
```css
.btn-secondary {{
background: transparent;
color: var(--text-primary);
border: 1px solid var(--border-medium);
border-radius: 8px;
padding: 12px 24px;
font-size: 14px;
font-weight: 500;
cursor: pointer;
transition: all 0.3s ease;
min-height: 40px;

}}
.btn-secondary:hover {{
background: var(--bg-subtle);
border-color: var(--text-primary);
}}
```

#### Text Button
```css
.btn-text {{
background: none;
color: var(--accent-coral);
border: none;
padding: 8px 16px;
font-size: 14px;
font-weight: 500;
cursor: pointer;
transition: all 0.3s ease;
text-decoration: none;
}}
.btn-text:hover {{
color: var(--accent-coral-hover);
text-decoration: underline;
}}
```

### 3. Navigation Header
```css
.portfolio-header {{
background: var(--bg-page);
border-bottom: 1px solid var(--border-light);
padding: 20px 40px;
display: flex;
align-items: center;
justify-content: space-between;
position: sticky;
top: 0;
z-index: 100;
height: 80px;
box-sizing: border-box;
}}
.portfolio-logo {{
font-size: 24px;
font-weight: 400;
color: var(--text-primary);

text-decoration: none;
font-family: 'Playfair Display', serif;
letter-spacing: -0.01em;
}}
.portfolio-nav {{
display: flex;
align-items: center;
gap: 32px;
}}
.portfolio-nav-link {{
color: var(--text-secondary);
text-decoration: none;
font-size: 14px;
font-weight: 500;
padding: 8px 16px;
border-radius: 6px;
transition: all 0.3s ease;
letter-spacing: 0.01em;
}}
.portfolio-nav-link:hover {{
color: var(--text-primary);
background: var(--bg-subtle);
}}
```
## 📐 Layout System
### Spacing System
```css
/* Consistent spacing values */
.space-8 {{ margin: 8px; }} /* Tight spacing */
.space-16 {{ margin: 16px; }} /* Standard spacing */
.space-20 {{ margin: 20px; }} /* Card gap spacing */
.space-24 {{ margin: 24px; }} /* Large spacing */
.space-32 {{ margin: 32px; }} /* Section spacing */
.space-40 {{ margin: 40px; }} /* Major section spacing */
/* Padding versions */
.pad-8 {{ padding: 8px; }}
.pad-16 {{ padding: 16px; }}
.pad-20 {{ padding: 20px; }}
.pad-24 {{ padding: 24px; }}
.pad-32 {{ padding: 32px; }}
.pad-40 {{ padding: 40px; }}
```

### Container System
```css
.container {{
max-width: 1200px;
margin: 0 auto;
padding: 0 40px;
}}
.container-wide {{
max-width: 1400px;
margin: 0 auto;
padding: 0 40px;
}}
@media (max-width: 768px) {{
.container,
.container-wide {{
padding: 0 20px;
}}
}}
```
## 📱 Responsive Design
### Breakpoints
```css
/* Mobile first approach */
@media (min-width: 768px) {{
/* Tablet styles */
.portfolio-grid {{
grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
gap: 24px;
}}
}}
@media (min-width: 1024px) {{
/* Desktop styles */
.portfolio-grid {{
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
gap: 20px;
padding: 40px;
}}
}}
@media (min-width: 1440px) {{
/* Large desktop */
.portfolio-grid {{

grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}}
}}
```

### Mobile Adaptations
```css
@media (max-width: 767px) {{
.portfolio-header {{
padding: 16px 20px;
height: 70px;
}}
.portfolio-nav {{
display: none; /* Implement mobile menu */
}}
.portfolio-grid {{
grid-template-columns: 1fr;
gap: 16px;
padding: 20px;
}}
.portfolio-card {{
padding: 16px;
}}
}}
```
## 📝 Typography System
### Font Setup
```css
@import url('https://fonts.googleapis.com/css2?
family=Inter:wght@400;500;600&display=swap');
@import url('https://fonts.googleapis.com/css2?
family=Playfair+Display:wght@400;500;600&display=swap');
body {{
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
}}
```

### Typography Scale
```css
/* Display Headlines */

.display-large {{ font-size: 48px; font-weight: 300; line-height: 1.1; letter-spacing: -0.02em;
}}
.display-medium {{ font-size: 40px; font-weight: 300; line-height: 1.2; letter-spacing:
-0.015em; }}
/* Headings */
.heading-1 {{ font-size: 32px; font-weight: 400; line-height: 1.25; letter-spacing: -0.01em; }}
.heading-2 {{ font-size: 24px; font-weight: 500; line-height: 1.3; letter-spacing: -0.005em; }}
.heading-3 {{ font-size: 20px; font-weight: 500; line-height: 1.4; letter-spacing: 0em; }}
.heading-4 {{ font-size: 18px; font-weight: 500; line-height: 1.4; letter-spacing: 0em; }}
/* Body text */
.body-large {{ font-size: 18px; font-weight: 400; line-height: 1.6; letter-spacing: 0em; }}
.body-medium {{ font-size: 16px; font-weight: 400; line-height: 1.6; letter-spacing: 0em; }}
.body-small {{ font-size: 14px; font-weight: 400; line-height: 1.5; letter-spacing: 0em; }}
.caption {{ font-size: 12px; font-weight: 400; line-height: 1.4; letter-spacing: 0.02em; }}
/* Interactive elements */
.button-text {{ font-size: 14px; font-weight: 500; line-height: 1.2; letter-spacing: 0.01em; }}
.link-text {{ font-size: 14px; font-weight: 500; line-height: 1.3; letter-spacing: 0em; }}
```
## 🎯 Design Patterns
### Card Grid Variations
```css
/* Large featured card */
.portfolio-card.large {{
grid-column: span 2;
grid-row: span 2;
}}
/* Wide card */
.portfolio-card.wide {{
grid-column: span 2;
}}
/* Tall card */
.portfolio-card.tall {{
grid-row: span 2;
}}
```

### Image Treatment
```css
.portfolio-image {{
width: 100%;
height: 100%;

object-fit: cover;
border-radius: 6px;
transition: transform 0.3s ease;
}}
.portfolio-card:hover .portfolio-image {{
transform: scale(1.05);
}}
```
## 🚫 Common Mistakes to Avoid
### Don't:
- Use accent colors for large background areas
- Mix multiple bright colors in one design
- Ignore the asymmetrical grid system
- Skip hover and focus states
- Use colors outside the defined palette
- Make cards too small for content
- Forget mobile responsive design
- Use too many different card sizes
### Do:
- Keep accent colors to small, strategic areas
- Use the asymmetrical grid for visual interest
- Maintain consistent spacing throughout
- Include subtle animations and transitions
- Focus on typography hierarchy
- Test on mobile devices
- Use white space effectively
- Create clear content categories
## 📚 Libraries to Install
### Core React Libraries
```bash
npm install react react-dom
npm install styled-components
npm install framer-motion
```

### Grid and Layout
```bash
npm install react-grid-layout
npm install react-masonry-css
```

### Typography

```bash
npm install @fontsource/inter
npm install @fontsource/playfair-display
```

### Animation
```bash
npm install framer-motion
npm install react-spring
```

### Utilities
```bash
npm install clsx
npm install react-intersection-observer
```
## 💡 Implementation Tips
### Grid Container Usage
```jsx
import React from 'react';
import styled from 'styled-components';
const GridContainer = styled.div`
display: grid;
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
grid-auto-rows: 200px;
gap: 20px;
padding: 40px;
max-width: 1200px;
margin: 0 auto;
`;
const Card = styled.div`
background: ${{props => props.accent ? 'var(--accent-coral)' : 'var(--bg-card)'}};
border-radius: 8px;
padding: 20px;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
transition: transform 0.3s ease, box-shadow 0.3s ease;
&:hover {{
transform: scale(1.02);
box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}}
`;
```

### Button Implementation
```jsx
const Button = styled.button`
background: var(--accent-coral);
color: white;
border: none;
border-radius: 8px;
padding: 12px 24px;
font-size: 14px;
font-weight: 500;
cursor: pointer;
transition: all 0.3s ease;
&:hover {{
transform: scale(1.05);
background: var(--accent-coral-hover);
}}
&:active {{
transform: scale(0.98);
}}
`;
```
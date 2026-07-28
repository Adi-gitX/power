internal-tag: general-portfolio
**Core Visual System**
🚨 MANDATORY COLOR RESTRICTION - THE 90/10 RULE
ABSOLUTE PROHIBITIONS - NEVER VIOLATE:
	•	❌ NEVER use only a monotone color scale
	•	❌ NEVER use bright colors for anything larger than button-sized areas
	•	❌ NEVER use multiple accent colors simultaneously in large sections
ENFORCEMENT RULE:
IF any colored area is larger than 300px × 80px (button size)
THEN it violates the color restriction
THEN use black background instead
ONLY ALLOWED COLOR USAGE:
	•	✅ Buttons and CTAs only - medium sized, focused interactive elements
	•	✅ Logo and brand marks - strong brand identity elements
	•	✅ medium sized icons and indicators - tiny accent elements only
	•	✅ Thin borders or dividers - 1-2px maximum width


🎨 Core Visual System
Foundation Colors
```css
:root {
  /* Backgrounds - Exact Pixel Pushers Colors */
  --bg-page: #1a1c1b;                       /* Main black background */
  --bg-card: #302f2c;                       /* Dark gray card backgrounds */
  --bg-light: #dfddd6;                      /* Light backgrounds when needed */
  
  /* Text - Exact Pixel Pushers Colors */
  --text-primary: #d9fb06;                  /* Lime green primary text */
  --text-secondary: #888680;                /* Mid gray supporting text */
  --text-muted: #302f2c;                    /* Dark gray muted text */
  --text-inverse: #1a1c1b;                  /* Black text on light backgrounds */
  
  /* Borders - Exact Pixel Pushers Colors */
  --border-light: rgba(63, 72, 22, 0.5);   /* Subtle olive-tinted borders */
  --border-medium: #3f4816;                 /* Standard olive borders */
  --border-strong: #888680;                 /* Strong gray borders */
  
  /* MAIN BRAND COLORS - Pixel Pushers Brand Colors Only */
  --brand-primary: #d9fb06;                 /* Primary lime green */
  --brand-hover: rgba(217, 251, 6, 0.8);   /* Hover state */
  --brand-active: rgba(217, 251, 6, 0.6);  /* Active/pressed state */
}
```
### Secondary Palette (Limited Use Only)
```css
:root {
  /* Supporting Colors - Use sparingly for variety */
  --secondary-olive: #3f4816;               /* Dark olive green */
  --secondary-yellow: #f8d47a;              /* Warm yellow accent */
  --secondary-blue: #0073e6;                /* Blue for links */
  --neutral-white: white;                   /* Pure white */
  --neutral-light: #dfddd6;                 /* Light neutral */
}
```
## Typography System
### Font Setup
```css
/* Use only these available fonts */
body {
  font-family: 'Inter', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```
### Typography Scale - Pixel Pushers Sizing
```css
/* Impact Headlines */
.brand-display { 
  font-family: 'PP Right Grotesk', Arial, sans-serif; 
  font-weight: 900; 
  font-size: clamp(6rem, 5.2571rem + 3.0476vw, 8rem); 
  line-height: 0.76; 
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0px;
}
/* Headlines */
.heading-1 { font-family: 'PP Right Grotesk', Arial, sans-serif; font-weight: 900; font-size: clamp(6rem, 5.2571rem + 3.0476vw, 8rem); line-height: 0.76; text-transform: uppercase; }
.heading-2 { font-family: 'PP Right Grotesk', Arial, sans-serif; font-weight: 900; font-size: clamp(6rem, 5.4902rem + 2.0915vw, 8rem); line-height: 0.76; text-transform: uppercase; }
.heading-3 { font-family: 'PP Right Grotesk', Arial, sans-serif; font-weight: 900; font-size: clamp(18.75rem, 15.8824rem + 11.7647vw, 30rem); line-height: 0.76; text-transform: uppercase; color: var(--secondary-olive); }
.heading-4 { font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 1.5rem; line-height: 0.76; }
.heading-5 { font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 1.2rem; line-height: 0.76; }
.heading-6 { font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 1rem; line-height: 0.76; }
/* Body text */
.body-large { font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 1.5rem; line-height: 1.4; color: var(--text-primary); }
.body-medium { font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 1.25rem; line-height: 1.3; color: var(--text-primary); }
.body-small { font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 1rem; line-height: 1.2; color: var(--text-secondary); }
.caption { font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 0.8rem; line-height: 1.2; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; }
/* Interactive elements */
.button-text { font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 1rem; line-height: 1.1em; letter-spacing: -0.04em; }
.link-text { font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 1rem; line-height: 1.4; color: var(--brand-primary); }
```
##  Component Library
1. Primary Buttons - Pixel Pushers CTA Style
```css
.btn-primary {
  background: var(--brand-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: 10rem; /* Pill/Capsule - Extremely high corner radius */
  padding: 1em 1.5em;
  font-family: 'Inter', Arial, sans-serif;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 48px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.1em;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}
.btn-primary:hover {
  transform: scale(1.02);
  opacity: 0.9;
}
.btn-primary:active {
  transform: scale(0.98);
}
```
### 2. Secondary Buttons - Outlined Style
```css
.btn-secondary {
  background: transparent;
  color: var(--brand-primary);
  border: 1px solid var(--brand-primary);
  border-radius: 10rem; /* Pill/Capsule - Extremely high corner radius */
  padding: 1em 1.5em;
  font-family: 'Inter', Arial, sans-serif;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 48px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.1em;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}
.btn-secondary:hover {
  background: var(--brand-primary);
  color: var(--text-inverse);
  transform: scale(1.02);
}
.btn-secondary:active {
  transform: scale(0.98);
}
```
### 3. Navigation Links - Simple Style
```css
.nav-link {
  color: var(--text-primary);
  text-decoration: none;
  font-family: 'Inter', Arial, sans-serif;
  font-size: 1rem;
  font-weight: 500;
  padding: 1em 1.5em;
  transition: all 0.3s ease;
  position: relative;
}

.hero-section{
  padding: 120px  0px  80px;
.nav-link:hover {
  color: var(--brand-hover);
}
.nav-link:active {
  color: var(--brand-active);
}
```
### 4. Event Cards - Split Layout Style
```css
.event-card {
  background: var(--secondary-olive);
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: stretch;
  min-height: 43.75rem;
  overflow: hidden;
}
.event-card-content {
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  max-width: 50%;
  min-height: 43.75rem;
}
.event-card-image {
  width: 100%;
  max-width: 50%;
  min-height: 43.75rem;
  position: relative;
}
.event-card-title {
  font-family: 'PP Right Grotesk', Arial, sans-serif;
  font-weight: 900;
  font-size: 1.5rem;
  line-height: 0.76;
  color: var(--text-primary);
  text-transform: uppercase;
  margin-bottom: 20px;
}
```
### 5. Team/About Cards - Image Overlay Style
```css
.team-card {
  display: flex;
  flex-direction: column;
  transition: background-color 0.15s cubic-bezier(0.455, 0.03, 0.515, 0.955);
  border: 0.5px solid var(--border-medium);
}
.team-card:hover {
  background-color: var(--border-medium);
}
.team-card-image {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 21rem;
  position: relative;
}
.team-card-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  min-height: 21rem;
}
```
### 6. Hero Section - High Impact Pattern
Image Usage:
Hero Images: Full-width, high-impact creative workspace photography
   - Hero section: Background image required showing creative collaboration, modern workspaces, or tech meetup environments. Dark overlay needed for text readability.
Product Images: Not applicable for meetup context
Editorial: Community and networking imagery for event showcases
Aspect Ratios: 16:9 for hero, 4:3 for events, 1:1 for team photos
```css
.hero-section {
  background: var(--bg-page);
  min-height: 100vh;
  display: flex;
  align-items: center;
  position: relative;
  padding: 40px;
  overflow: hidden;
}
.hero-background {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  overflow: hidden;
}
.hero-image {
  object-fit: cover;
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0%;
}
.hero-overlay {
  opacity: 0.6;
  background-image: linear-gradient(135deg, #000, transparent);
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
}
.hero-content {
  position: relative;
  z-index: 1;
  max-width: 15ch;
}
.hero-title {
  font-family: 'PP Right Grotesk', Arial, sans-serif;
  font-weight: 900;
  font-size: clamp(6rem, 5.2571rem + 3.0476vw, 8rem);
  line-height: 0.76;
  color: var(--text-primary);
  text-transform: uppercase;
  margin-bottom: 24px;
}
```
## Layout System - Pixel Pushers Spacing
### Grid Layout
```css
.pixel-pushers-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 40px 20px;
  padding: 40px;
  max-width: 87.5rem;
  margin: 0 auto;
}
```
### Spacing System - Pixel Pushers Values
```css
/* Pixel Pushers uses these exact spacing values */
.space-8 { margin: 8px; }     /* Small spacing */
.space-20 { margin: 20px; }   /* Standard spacing */
.space-40 { margin: 40px; }   /* Large spacing - main gap */
.space-96 { margin: 96px; }   /* Section spacing */
.space-120 { margin: 120px; } /* Major section spacing */
/* Padding versions */
.pad-8 { padding: 8px; }
.pad-20 { padding: 20px; }
.pad-40 { padding: 40px; }
.pad-96 { padding: 96px; }
.pad-120 { padding: 120px; }
```
### Container System - Pixel Pushers Breakpoints
```css
.container {
  max-width: 87.5rem; /* 1400px */
  margin: 0 auto;
  padding: 0 40px;
}
@media (max-width: 767px) {
  .container {
    padding: 0 20px;
  }
}
```
## Responsive Design:
### Breakpoints
```css
/* Pixel Pushers' exact breakpoints */
@media (min-width: 768px) and (max-width: 1199px) {
  /* Tablet */
}
@media (min-width: 1200px) {
  /* Desktop */
}
@media (max-width: 767px) {
  /* Mobile */
}
```
### Mobile Adaptations
```css
/* Mobile navigation and layout */
@media (max-width: 767px) {
  .hero-section {
    padding: 40px 20px;
    min-height: 80vh;
  }
  
  .event-card-content,
  .event-card-image {
    max-width: 100%;
    min-height: 30rem;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    min-height: 52px;
  }
  
  .team-card-image,
  .team-card-content {
    min-height: auto;
  }
}
/* Desktop optimizations */
@media (min-width: 1200px) {
  .pixel-pushers-grid {
    gap: 40px 32px;
  }
  
  .team-card:hover {
    transform: translateY(-2px);
  }
}
```
**Animation Guidelines**
**Micro-Interactions**
```css
/* Button hover animations */
.btn-hover-scale {
  transition: transform 0.3s ease;
}
.btn-hover-scale:hover {
  transform: scale(1.02);
}
.btn-hover-scale:active {
  transform: scale(0.98);
}
/* Card hover animations */
.card-hover-effect {
  transition: background-color 0.15s cubic-bezier(0.455, 0.03, 0.515, 0.955);
}
.card-hover-effect:hover {
  background-color: var(--border-medium);
}
```
### Creative Ribbon Animations (Special Effect)
```css
/* Rotating ribbon elements - Pixel Pushers signature effect */
.creative-ribbon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 120%;
  height: 4.125rem;
  background-color: var(--brand-primary);
  color: var(--text-inverse);
  position: absolute;
  bottom: 30%;
  transform: rotate(7.95deg);
  font-weight: 600;
  text-transform: uppercase;
}
.creative-ribbon-back {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 120%;
  height: 4.125rem;
  background-color: var(--secondary-olive);
  color: var(--text-primary);
  position: absolute;
  bottom: 25%;
  transform: rotate(-5.22deg);
  font-weight: 600;
  text-transform: uppercase;
}
```
**Mistakes to Avoid**
**Don't:**
- Use bright colors on bright backgrounds (maintain high contrast)
- Mix too many secondary colors in one design
- Use small font sizes for headlines (go bold)
- Skip the dramatic scale differences in typography
**Do:**
- Maintain high contrast between backgrounds and text
- Use the pill/capsule button style for all primary actions
- Keep the industrial, bold aesthetic with PP Right Grotesk
- Include dark overlays on hero images for text readability
- Use lime green sparingly but boldly for maximum impact
"tag: warm-ai
## Core Visual System

Use below colors, fonts & components for your .css files

### Foundation Colors (Never Change)
```css
:root {
  /* Backgrounds - Exact Colors */
  --bg-page: #FFF9F2;                    /* Main page background - warm cream */
  --bg-card: #FFFFFF;                    /* All card backgrounds */
  --bg-section: rgba(255, 244, 232, 0.6); /* Subtle section backgrounds */
  --bg-overlay: rgba(255, 255, 255, 0.95); /* Header overlay with blur */
  
  /* Text - Exact Colors */
  --text-primary: #232323;               /* Main headings and content */
  --text-secondary: #353535;             /* Supporting text */
  --text-muted: #353535;                /* Captions, meta text */
  
  /* Borders - Exact Colors */
  --border-primary: #999999;             /* Standard borders */
  --border-input: #999999;               /* Form input borders */
  --border-input-focus: #4D4D4D;         /* Focused input borders */
  --border-light: rgba(153, 153, 153, 0.3); /* Subtle dividers */
}
```

### AI Voice Interface Accent Colors (Limited Use Only)
```css
:root {
  /* Voice Interface Cards - Use for voice/audio components only */
  --accent-purple-400: #987D9C;     /* Strong purple for highlights */
  --accent-purple-200: #F9E8FA;     /* Light purple card backgrounds */
  
  --accent-blue-400: #768597;       /* Strong blue for highlights */
  --accent-blue-200: #E4EDF8;       /* Light blue card backgrounds */
  
  --accent-orange-400: #BCA182;     /* Strong orange for highlights */
  --accent-orange-200: #FEEFDC;     /* Light orange card backgrounds */
  
  --accent-pink-200: #FCC9C7;       /* Light pink card backgrounds */
  --accent-green-200: #b8d1ba;      /* Light green card backgrounds */
  
 --accent-grey-200: #E9E1E1  /* Light grey card backgrounds */

  /* Glass Effect Colors */
  --glass-bg: rgba(255, 255, 255, 0.2);      /* Glass morphism background */
  --glass-border: rgba(0, 0, 0, 0.1);        /* Glass morphism border */
}
```

### Hero Gradient System (Use Sparingly)
```css
:root {
  /* Hero Section Gradients - For major focal areas only */
  --gradient-hero-warm: linear-gradient( 
    rgba(252, 202, 199, 1) 0%,     /* Main peach background */
    rgba(253, 215, 197, 0.8) 25%,  /* Subtle peach tint */
    rgba(254, 241, 229, 0.6) 50%,  /* Light cream warmth */
    rgba(255, 250, 243, 0.8) 75%,  /* Gentle cream warmth */
    rgba(252, 202, 199, 1) 100%,  /* back to same */
    
  --gradient-hero-subtle: linear-gradient(180deg,
    rgba(252, 202, 199, 0.95) 0%,  /* Soft cream top */
    rgba(253, 215, 197, 0.8) 40%,    /* Full cream middle */
    rgba(252, 202, 199, 1) 100%);  /* Solid cream bottom */

  --alternate-gradient-hero-warm: linear-gradient(135deg
    rgba(248, 216, 251, 1) 0%,    
    rgba(251, 239, 251, 0.8) 25%, 
    rgba(255, 249, 244, 0.6) 40%, 
    rgba(255, 235, 214, 0.8) 75%, 
    rgba(255, 250, 245, 0.8) 100% 
  /* Section Dividers */
  --gradient-divider: linear-gradient(90deg, 
    transparent 0%, 
    rgba(153, 153, 153, 0.1) 50%, 
    transparent 100%);
}
```

## Typography System

### Font Setup
```css
/* Only use below fonts for all text*/

.font-mono {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}
```

### Typography Scale - Responsive Sizing
```css
/* Headlines */
.heading-hero { 
  font-size: clamp(2rem, 5vw, 3rem); 
  line-height: 1.1; 
  font-weight: 600; 
  letter-spacing: -0.02em; 
  color: var(--text-primary);
}

.heading-1 { 
  font-size: clamp(1.2rem, 3vw, 1.875rem); 
  line-height: 1.3; 
  font-weight: 500; 
  letter-spacing: -0.01em; 
  color: var(--text-primary);
}

.heading-2 { 
  font-size: clamp(1.25rem, 2.5vw, 1.2rem); 
  line-height: 1.4; 
  font-weight: 500;
  color: var(--text-primary);
}

.heading-3 { 
  font-size: clamp(1.125rem, 2vw, 1.25rem); 
  line-height: 1.4; 
  font-weight: 500; 
  color: var(--text-primary);
}

/* Body text */
.body-large { 
  font-size: clamp(1rem, 2vw, 1.125rem); 
  line-height: 1.6; 
  font-weight: 400; 
  color: var(--text-primary);
}

.body-medium { 
  font-size: 1rem; 
  line-height: 1.5; 
  font-weight: 400; 
  color: var(--text-primary);
}

.body-small { 
  font-size: 0.875rem; 
  line-height: 1.4; 
  font-weight: 400; 
  color: var(--text-secondary);
}

.caption { 
  font-size: 0.75rem; 
  line-height: 1.3; 
  font-weight: 400; 
  color: var(--text-muted);
}

/* Interactive elements */
.button-text { 
  font-family: 'SF Mono', monospace; 
  font-size: 0.875rem; 
  font-weight: 500; 
  text-transform: uppercase; 
  letter-spacing: 0.025em;
}

.mono-text { 
  font-family: 'SF Mono', monospace; 
  font-size: 0.875rem; 
  font-weight: 400; 
  color: var(--text-muted);
}
```

## Component Library

### 1. Primary Buttons - Black CTA Style
```css
.btn-primary {
  background: var(--text-primary);
  color: white;
  border: none;
  border- : 2rem; /* Pill/Capsule - High corner radius */
  padding: 0.75rem 1.2rem;
  font-family: 'SF Mono', monospace;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 2.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  line-height: 1.2;
}

.btn-primary:hover {
  background: var(--text-secondary);
  transform: scale(1.02);
}

.btn-primary:active {
  transform: scale(0.98);
}
```

### 2. Secondary Buttons - Glass Effect Style
```css
.btn-secondary {
  background: var(--glass-bg);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  border-radius: 2rem; /* Pill/Capsule - High corner radius */
  padding: 0.75rem 1.2rem;
  font-family: 'SF Mono', monospace;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 2.25rem;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  line-height: 1.2;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(0, 0, 0, 0.2);
  transform: scale(1.02);
}

.btn-secondary:active {
  transform: scale(0.98);
}
```

### 3. Navigation Buttons - Circular Style
```css
.btn-nav {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  border-radius: 50%; /* Circular - Full rounded */
  width: 2.25rem;
  height: 2.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-nav:hover {
  background: var(--text-primary);
  color: white;
  border-color: var(--text-primary);
}

.btn-nav:active {
  transform: scale(0.95);
}
```

### 4. Tag/Category Buttons - Voice Interface
```css
.btn-tag {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 2rem; /* Pill/Capsule - High corner radius */
  padding: 0.5rem 1rem;
  font-family: 'SF Mono', monospace;
  font-size: 0.75rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  line-height: 1.2;
}

.btn-tag.active,
.btn-tag:hover {
  background: var(--text-primary);
  color: white;
  border-color: var(--text-primary);
}
```

### 5. Voice Interface Cards - Signature Component
```css
.voice-card {
  background: var(--bg-card);
  border-radius: 0.75rem; /* Rounded rectangle - Medium corner radius */
  padding: 1.2rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.voice-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.voice-card-title {
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.voice-card-description {
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

/* Accent Color Variations for Voice Cards */
.voice-card.accent-purple { background: var(--accent-purple-200); }
.voice-card.accent-blue { background: var(--accent-blue-200); }
.voice-card.accent-orange { background: var(--accent-orange-200); }
.voice-card.accent-pink { background: var(--accent-pink-200); }
.voice-card.accent-green { background: var(--accent-green-200); }
```

### 6. Audio Player Component - Voice Interface
```css
.audio-player {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 2rem;
  padding: 0.5rem;
  gap: 1rem;
  margin-top: auto;
}

.play-button {
  width: 2rem;
  height: 2rem;
  border-radius: 50%; /* Circular - Full rounded */
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.play-button:hover {
  border-color: var(--text-primary);
  background: var(--text-primary);
  color: white;
}

.audio-progress {
  flex: 1;
  height: 0.25rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0.125rem;
  position: relative;
}

.audio-time {
  font-family: 'SF Mono', monospace;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}
```

### 7. Header Navigation - Fixed Overlay
```css
.header-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  height: 80px;
  background: var(--bg-overlay);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.2rem;
  transition: all 0.3s ease;
}

.logo {
  height: 1.2rem;
  width: auto;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}
```

## Layout System

### Grid Layout
```css
.ai-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem 1.2rem;
  padding: 1.2rem;
  max-width: 1280px;
  margin: 0 auto;
}

/* Voice Interface Grid */
.voice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.2rem;
  padding: 1rem;
}
```

### Spacing System - AI Design Values
```css
/* AI-specific spacing values */
.space-xs { margin: 0.5rem; }    /* Small spacing */
.space-sm { margin: 1rem; }      /* Standard spacing */
.space-md { margin: 1.2rem; }    /* Medium spacing */
.space-lg { margin: 2rem; }      /* Large spacing */
.space-xl { margin: 3rem; }      /* Extra large spacing */
.space-2xl { margin: 5rem; }     /* Major section spacing */

/* Padding versions */
.pad-xs { padding: 0.5rem; }
.pad-sm { padding: 1rem; }
.pad-md { padding: 1.2rem; }
.pad-lg { padding: 2rem; }
.pad-xl { padding: 3rem; }
.pad-2xl { padding: 5rem; }
```

### Container System - AI Interface Breakpoints
```css
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1.2rem;
}

@media (min-width: 768px) {
  .container {
    padding: 0 2.25rem;
  }
}

@media (min-width: 1280px) {
  .container {
    padding: 0;
  }
}
```

## Hero Section Pattern
Image Usage Guidelines:
Hero Images: Not required - focus on typography and voice interface demos
Hero Background: Use warm gradient for major focal sections, solid cream for content areas
Voice Interface: Use waveform visualizations and audio player interfaces
Product Screenshots: Clean interface shots with subtle shadows
Company Logos: Grayscale treatment for "trusted by" sections

```css
.hero-section {
  background: var(--gradient-hero-warm);  /* Primary gradient version */
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 5rem 1.2rem 3rem;
  position: relative;
}

/* Alternative versions */
.hero-section.subtle {
  background: var(--gradient-hero-subtle);  /* Subtle gradient version */
}

.hero-section.solid {
  background: var(--bg-page);  /* Solid background version */
}

.hero-content {
  max-width: 900px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.hero-announcement {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 2rem;
  padding: 0.25rem 0.75rem;
  margin-bottom: 1.2rem;
  font-family: 'SF Mono', monospace;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.hero-title {
  margin-bottom: 1rem;
}

.hero-subtitle {
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}
```

## Responsive Design

### Breakpoints
```css
/* AI Interface breakpoints */
@media (min-width: 768px) and (max-width: 1279px) {
  /* Tablet - Voice Interface Optimized */
  .voice-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }
}

@media (min-width: 1280px) {
  /* Desktop - Full Voice Interface */
  .voice-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
  
  .voice-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  }
}

@media (max-width: 767px) {
  /* Mobile - Stacked Voice Interface */
  .hero-section {
    padding: 6rem 1rem 2rem;
    min-height: 80vh;
  }
  
  .voice-card {
    padding: 1rem;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    min-height: 3rem;
  }
  
  .header-nav {
    padding: 0 1rem;
  }
  
  .ai-grid {
    grid-template-columns: 1fr;
    gap: 1.2rem;
    padding: 1rem;
  }
}
```

## Interaction & Animation Guidelines

### Micro-Interactions
```css
/* AI Interface hover animations */
.hover-lift {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.hover-scale {
  transition: transform 0.2s ease;
}

.hover-scale:hover {
  transform: scale(1.02);
}

.hover-scale:active {
  transform: scale(0.98);
}

/* Audio Interface animations */
.audio-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

### Page Load Animations (with Motion/Framer Motion)
```jsx
import { motion } from 'motion/react';

// Fade in with slide up - Voice Interface Pattern
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

// Staggered voice cards animation
const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Scale in for voice interface cards
const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.4, ease: "easeOut" }
};
```

## Usage Guidelines

**Do:**
- Use hero gradients for major focal sections and landing pages
- Apply accent colors only for voice interface cards and audio components
- Keep pill/capsule buttons for primary actions
- Use glass effects for secondary interactions and announcements
- Include audio player components for voice interfaces
- Apply subtle hover animations throughout
- Use gradient-hero-warm for main hero sections, gradient-hero-subtle for content sections

**Avoid:**
- Using accent colors for non-audio related components
- Heavy shadows or gradients outside hero and voice cards
- Cluttered layouts that compete with voice interface elements
- Overusing gradients (limit to hero sections and major focal areas)

**Voice Interface Specific:**
- Always include audio controls with proper accessibility
- Use accent colors to differentiate voice types/categories
- Implement waveform visualizations where appropriate
- Include clear visual feedback for audio states (playing, paused, loading)

"
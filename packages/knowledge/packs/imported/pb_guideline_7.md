internal-tag: neon-orange-theme

#### Core UI Colors (Primary Website Interface)
```css
:root {{
  /* Primary Brand Color - Dominant visual element */
  --primary-orange: #f73b20;         /* Main brand color, backgrounds, CTAs */
  --primary-orange-rgb: rgba(247, 59, 32, 1);
  
  /* Core Interface Colors */
  --white: #ffffff;                  /* Text on colored backgrounds, card backgrounds */
  --black: #000000;                  /* High contrast text, borders */
  --dark-text: #360802;              /* Primary body text, form inputs */
  
  /* Page Structure */
  --page-background: #ffffff;         /* Main page background */
}}
```

#### Brand Accent Colors (Supporting Orange Variations)
```css
:root {{
  /* Brand Color Variations - Used for depth and hierarchy */
  --orange-light: #f96853;           /* Lighter orange variant for backgrounds */
  --orange-medium: #f84d35;          /* Medium orange for components */
  --orange-alt: #fa8270;             /* Alternative orange tone */
  --orange-coin: #f74522;            /* Coin animation color */
  
  /* Brand Supporting Colors */
  --orange-tint-light: #fff6f5;      /* Very light orange background */
  --orange-tint-medium: #fee9e6;     /* Light orange for borders/outlines */
  --orange-with-alpha-5: rgba(247, 59, 32, 0.05);   /* 5% opacity overlay */
  --orange-with-alpha-10: rgba(247, 59, 32, 0.1);   /* 10% opacity overlay */
  --orange-with-alpha-20: rgba(247, 59, 32, 0.2);   /* 20% opacity overlay */
}}
```

#### Functional Colors (Status & Feedback)
```css
:root {{
  /* Functional Status Colors */
  --success-green: #34C759;          /* Success states, completed actions */
  --error-red: #dc3636;              /* Error states, validation failures */
  --error-light: #fff6f5;            /* Error background tint */
  --warning-orange: #ff6300;         /* Warning states, important notices */
  --info-blue: #4985ef;              /* Informational elements, swap buttons */
  --info-blue-variants: #4984ef;     /* Alternative blue for interactions */
  
  /* Neutral Functional Colors */
  --border-light: #f6f7f8;           /* Light borders, separators */
  --shadow-orange: rgba(247, 59, 32, 0.1);  /* Box shadows with brand tint */
}}
```

#### Animation & Interactive Colors
```css
:root {{
  /* Animation Specific Colors */
  --coin-neutral: #ffffff;           /* Neutral coin drop animation */
  --coin-fade-orange: #fdd6ce;       /* Fading coin animation color */
  --coin-fade-neutral: #f5b1a3;      /* Neutral coin fade color */
  
  /* Focus & Interaction States */
  --focus-ring-orange: rgba(247, 59, 32, 0.5);     /* Focus ring color */
  --focus-ring-white: rgba(255, 255, 255, 0.5);    /* Light focus ring */
  --hover-overlay: rgba(255, 255, 255, 0.1);       /* Hover state overlay */
}}
```

**Color Usage Guidelines:**
- **Primary Interface**: Use `--primary-orange` (#f73b20) for main CTAs, navigation, and brand elements
- **Backgrounds**: `--white` for cards and content areas, `--orange-tint-light` for subtle brand hints
- **Text Hierarchy**: `--dark-text` (#360802) for body text, `--white` for text on colored backgrounds
- **Interactive Elements**: Primary orange for buttons and links, blue variants for secondary actions
- **Status Communication**: Standard functional color system for user feedback and validation

### Typography System

#### Font Family
- **Primary Font**: Sequel Sans (Custom font family)
- **Fallbacks**: arial, "sans-serif"
- **Font Display**: swap

#### Font Weights Available
```css
/* Font weight specifications from @font-face declarations */
--font-regular: 400;        /* Normal text */
--font-book: 450;           /* Slightly heavier body text */
--font-medium: 500;         /* Subheadings, emphasis */
--font-semibold: 600;       /* Headings, important text */
```

#### Typography Scale System
**Based on CSS clamp() functions for responsive typography:**

```css
/* Heading Hierarchy */
.title-1 {{
  font-size: clamp(56px, 19.067px + 100vw * 0.0947, 180px);
  font-weight: 400;
  letter-spacing: 0;
  line-height: 0.9;
  color: #ffffff; /* Used on colored backgrounds */
}}

.title-2 {{
  font-size: clamp(48px, 26.55px + 100vw * 0.055, 120px);
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1;
  color: #ffffff;
}}

.title-3 {{
  font-size: clamp(40px, 28.105px + 100vw * 0.0305, 80px);
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1;
  color: #ffffff;
}}

.title-4 {{
  font-size: clamp(32px, 22.484px + 100vw * 0.0244, 64px);
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1.1;
  color: #ffffff;
}}

.title-5 {{
  font-size: clamp(27px, 20.76px + 100vw * 0.016, 48px);
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1.2;
  color: #ffffff;
}}

/* Subheading Hierarchy */
.subhead-1 {{
  font-size: clamp(23px, 19.139px + 100vw * 0.0099, 36px);
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.2;
  color: #360802;
}}

.subhead-2 {{
  font-size: clamp(19px, 17.518px + 100vw * 0.0038, 24px);
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.2;
  color: #360802;
}}

.subhead-3 {{
  font-size: clamp(18px, 17.415px + 100vw * 0.0015, 20px);
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.2;
  color: #360802;
}}

/* Body Text */
.body {{
  font-size: 16px;
  font-weight: 450;
  letter-spacing: 0.03em;
  line-height: 1.5;
  color: #360802;
}}

.body-small {{
  font-size: 14px;
  font-weight: 450;
  letter-spacing: 0.03em;
  line-height: 1.4;
  color: #360802;
}}

.caption {{
  font-size: 12px;
  font-weight: 450;
  letter-spacing: 0.03em;
  line-height: 1.5;
  color: #360802;
}}
```

#### Responsive Typography Notes
- **Mobile Optimization**: Letter-spacing reduces to 0 on screens under 743px
- **Large Screens**: Typography scales up to 9vw for title-1 on screens over 2000px
- **Fluid Scaling**: All headings use clamp() for smooth responsive scaling

### Layout Structure

#### 1. Hero Section
- **Background**: Bold red-orange gradient (#f73b20)
- **Layout**: Full-width hero with centered content
- **Main Elements**:
  - company logo (white, top-left)
  - Language selector and authentication buttons (top-right)
  - Central headline: "One app for all needs"
  - Subheading: "Single account for all your payments"
  - App store download buttons (iOS & Google Play)
  - Bottom navigation: Personal, Business, Company sections

#### 2. Navigation Header
- **Background**: Overlaid on hero section
- **Logo**: White company wordmark
- **Right Side**: Language dropdown (EN), "Log in", "Sign up" buttons
- **Style**: Clean, minimal navigation with white text on transparent background

#### 3. Content Sections
- **Add Section**: "Easily add or send money from your account"
- **Send Section**: "Send money anywhere in the EU, effortlessly"
- **Exchange Section**: "Convert fiat cash easily"
- **Features Grid**: 50+ payment methods, fast transactions

#### 4. Social Proof
- **Testimonials**: Customer feedback from VKVamsi K., Leonie A., Karl R., Dennis P.
- **User Count**: "Join 1M+ happy users today"
- **Geographic Focus**: European market emphasis

#### 5. Contact Form
- **Fields**: Full Name, Email, Phone, Message
- **Style**: Consistent with brand design system
- **CTA**: "Send" button in brand orange

### Component Library

#### Buttons
```css
/* Primary Button */
[data-button][data-tone=orange][data-variant=primary] {{
  --color: #ffffff;
  --background-color: #f73b20;
  height: 48px;
  border-radius: 12px;
  padding: 0 24px;
  font-weight: 500;
}}

/* Secondary Button */
[data-button][data-tone=neutral][data-variant=secondary] {{
  --color: #f73b20;
  --background-color: #ffffff;
  border: 1px solid #f73b20;
  opacity: 0.1;
}}

/* Button States */
@media (hover:hover) and (pointer:fine) {{
  [data-button]:hover > [data-button-background]:before {{
    opacity: 0.85;
  }}
}}

[data-button]:active > [data-button-background]:before {{
  opacity: 0.9;
}}

[data-button]:focus-visible > [data-button-background] {{
  box-shadow: 0 0 0 1px #f73b20, 0 0 0 3px rgba(247, 59, 32, 0.5);
}}
```

#### Form Elements
```css
/* Input Fields */
._input {{
  color: #360802;
  font-size: 16px;
  font-weight: 450;
  letter-spacing: 0.03em;
  line-height: 1.5;
}}

._input .input-container > input {{
  background-color: rgba(247, 59, 32, 0.05);
  border: none;
  border-radius: 1em;
  padding: 1.5em 0.625em 0.5em 1em;
}}

._input .input-container > input:focus-visible {{
  box-shadow: 0 0 0 1px #f73b20, 0 0 0 3px rgba(247, 59, 32, 0.5);
}}

/* Error States */
._input[data-valid=false] .input-container > input {{
  background-color: rgba(220, 54, 54, 0.2);
  outline: 1px solid #f73b20;
}}
```

#### Cards and Containers
```css
/* Media Cards */
._media-card {{
  backdrop-filter: blur(10px);
  background-color: rgba(247, 59, 32, 0.05);
  border-radius: clamp(16px, 13.621px + 100vw * 0.0061, 24px);
  padding: clamp(4px, 2.206px + 100vw * 0.0046, 10px);
}}

/* Currency Cards */
._currency-card {{
  background-color: rgba(247, 59, 32, 0.05);
  border-radius: 16px;
}}
```

#### Navigation Elements
```css
/* Menu Buttons */
._menu-button {{
  --color: #ffffff;
  border-radius: 6em;
  height: 44px;
  padding: 0 16px;
}}

._menu-button:hover > .background {{
  opacity: 0.1;
  background-color: #ffffff;
}}
```

### Animation Patterns

#### Coin Drop Animation
```css
/* Coin Drop Component */
._coin-drop {{
  background-color: #f74522;
  border-radius: 100%;
  height: 24px;
  width: 24px;
}}

._coin-drop span {{
  animation-duration: 2s;
  animation-iteration-count: infinite;
  animation-name: coin-loop-orange;
  animation-timing-function: cubic-bezier(0.445, 0.05, 0.55, 0.95);
}}

@keyframes coin-loop-orange {{
  0% {{
    background-color: #f74522;
    opacity: 1;
    transform: translateY(0) scaleY(1);
  }}
  80% {{
    background-color: #fdd6ce;
    opacity: 0;
  }}
  100% {{
    opacity: 0;
    transform: translateY(200%) scaleY(0);
  }}
}}
```

#### Button Hover Effects
```css
/* Text Animation on Hover */
._button:hover .label .c {{
  transform: translateY(-110%);
  transition: transform 0.25s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}}

._button:hover .label .clone .c {{
  transform: translate(0) rotate(0deg);
  transition: transform 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
}}
```

#### Focus and Interaction States
```css
/* Focus Ring System */
:focus-visible {{
  box-shadow: 0 0 0 1px #f73b20, 0 0 0 3px rgba(247, 59, 32, 0.5);
}}

/* Hover Transitions */
@media (hover:hover) and (pointer:fine) {{
  .interactive-element:hover {{
    transition: transform 0.3s cubic-bezier(0.215, 0.61, 0.355, 1);
  }}
}}
```

### Responsive Design

#### Breakpoints
```css
/* Mobile */
@media only screen and (max-width: 743px) {{
  /* Typography adjustments */
  .title-3, .title-4, .title-5, .subhead-1 {{
    letter-spacing: 0;
  }}
}}

/* Tablet */
@media only screen and (max-width: 1023px) {{
  /* Layout adjustments */
  ._navbar.has-banner {{
    top: 165px;
  }}
}}

/* Desktop */
@media only screen and (max-width: 1290px) {{
  /* Grid system adjustments */
  .md-w-cols-6 {{ width: var(--cols-6); }}
}}

/* Large Desktop */
@media only screen and (min-width: 2000px) {{
  /* VW-based scaling */
  .title-1 {{ font-size: 9vw; }}
  .title-2 {{ font-size: 6vw; }}
  .body {{ font-size: 0.8vw; }}
}}
```

#### Mobile Adaptations
- Typography scales down appropriately using clamp()
- Letter spacing reduces on mobile for better readability
- Navigation collapses to overlay menu
- Button sizes adjust proportionally
- Grid system collapses to single column

### Spacing System

#### CSS Custom Properties
```css
:root {{
  /* Base Spacing Units */
  --2: 2px;   --4: 4px;   --8: 8px;   --12: 12px;
  --16: 16px; --20: 20px; --24: 24px; --32: 32px;
  --40: 40px; --48: 48px; --64: 64px; --80: 80px;
  --96: 96px; --120: 120px; --140: 140px; --280: 280px;
  
  /* Responsive Spacing (using clamp) */
  --8-4: clamp(4px, 2.791px + 100vw * 0.0031, 8px);
  --16-8: clamp(8px, 5.621px + 100vw * 0.0061, 16px);
  --24-16: clamp(16px, 13.621px + 100vw * 0.0061, 24px);
  --32-16: clamp(16px, 11.242px + 100vw * 0.0122, 32px);
  --48-24: clamp(24px, 16.863px + 100vw * 0.0183, 48px);
  --64-32: clamp(32px, 22.484px + 100vw * 0.0244, 64px);
  --80-48: clamp(48px, 38.484px + 100vw * 0.0244, 80px);
}}
```

#### Grid System
```css
:root {{
  --grid-columns: 16;
  --grid-gap: clamp(4px, -1.967px + 100vw * 0.0153, 24px);
  --grid-margin: clamp(16px, 2.896px + 100vw * 0.0336, 60px);
  --grid-padding: calc(var(--grid-margin) - var(--grid-gap) * 0.5);
  --grid-width: calc(var(--100vw) - var(--grid-margin) * 2);
}}
```

### Accessibility

#### Color Contrast
- Primary text (#360802) on white backgrounds meets WCAG AA standards
- White text on brand orange (#f73b20) provides sufficient contrast
- Interactive elements have clear focus states with 3px outline rings

#### Focus Management
```css
/* Consistent Focus Ring System */
:focus-visible {{
  box-shadow: 0 0 0 1px #f73b20, 0 0 0 3px rgba(247, 59, 32, 0.5);
}}

/* White focus rings on dark backgrounds */
[data-tone=neutral]:focus-visible {{
  box-shadow: 0 0 0 1px #ffffff, 0 0 0 3px rgba(255, 255, 255, 0.5);
}}
```
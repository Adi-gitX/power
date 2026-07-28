internal-tag: design-theme


## 🚫 Common Mistakes to Avoid

**Don't:**
- Use different corner radius styles - stick to rounded-full for tags, rounded-lg for cards
- Mix font families in the same text block
- Ignore the vibrant color system - each project should have its unique color
- Skip responsive font sizing with clamp() functions
- Forget hover and focus states for interactive elements
- Use gradients or complex patterns - keep backgrounds solid
- Overcrowd the layout - maintain generous spacing

**Do:**
- Include accessibility features (focus states, proper contrast)
- Use Swiper.js for slider functionality

## 🎨 Core Visual System

### Foundation Colors (Never Change)
```css
:root {{
  /* Primary Interface Colors */
  --color-black: #151515;                    /* Main backgrounds and text */
  --color-white: #fff;                       /* Contrast backgrounds */
  --color-dark-grey: #717171;                /* Secondary text */
  --color-mid-grey: #aaa;                    /* Muted elements */
  --color-grey: #b6cbcb;                     /* Subtle backgrounds */
  
  /* Vibrant Brand Colors for Project Cards */
  --color-dark-blue: #1f47e6;               /* Primary interactive blue */
  --color-mid-blue: #88a2ff;                /* Secondary blue accents */
  --color-light-blue: #b7fbff;              /* Light blue backgrounds */
  --color-mid-pink: #ff84e4;                /* Vibrant pink highlights */
  --color-light-pink: #ffd1e7;              /* Main brand accent */
  --color-mid-purple: #d987ff;              /* Creative purple */
  --color-mid-yellow: #ffe03d;              /* Energy yellow */
  --color-light-yellow: #f6fd87;            /* Light yellow backgrounds */
  --color-dark-orange: #d1903a;             /* Warm orange */
  --color-mid-orange: #ff965a;              /* Mid-range orange */
  --color-dark-green: #a1a500;              /* Dark green accents */
  --color-mid-green: #78d692;               /* Fresh green */
}}
```

## 🔧 Component Library

### 1. Service Category Buttons - Rounded Tags
```css
.service-button {{
  background: var(--color-mid-purple); /* Changes per service */
  color: var(--color-black);
  border: 1px solid var(--color-mid-purple);
  border-radius: 9999px; /* Rounded-full - High corner radius */
  padding: 0.25rem 0.5rem;
  font-family: 'Sohne Mono', monospace;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.0875em;
  text-transform: uppercase;
  transition: all 0.3s ease;
  cursor: pointer;
}}

.service-button:hover {{
  background: var(--color-mid-purple-90);
  border-color: var(--color-mid-purple-90);
}}

/* Service-specific colors */
.service-button.brand-design {{ background: var(--color-mid-purple); }}
.service-button.website {{ background: var(--color-mid-blue); }}
.service-button.campaigns {{ background: var(--color-light-yellow); }}
.service-button.design-systems {{ background: var(--color-mid-orange); }}
```

### 2. Navigation Links - Clean Minimal Style
```css
.nav-link {{
  color: var(--color-light-pink);
  font-family: 'Sohne', sans-serif;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  text-decoration: none;
  border-radius: 0px; /* No border radius - Clean approach */
  padding: 0;
  transition: all 0.15s ease;
  position: relative;
}}

.nav-link:hover {{
  text-decoration: underline;
  color: var(--color-white);
}}

.nav-link:focus {{
  outline: 2px solid var(--color-light-pink);
  outline-offset: 2px;
}}
```

### 3. CTA Buttons - Premium Black Style
```css
.cta-button {{
  background: var(--color-black);
  color: var(--color-white);
  border: 1px solid var(--color-black);
  border-radius: 9999px; /* Rounded-full - High corner radius */
  padding: 0.625rem 1.375rem;
  font-family: 'Sohne Mono', monospace;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.0875em;
  text-transform: uppercase;
  transition: all 0.3s ease;
  cursor: pointer;
  min-height: 44px; /* Touch-friendly */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}}

.cta-button:hover {{
  background: var(--color-black-90);
  border-color: var(--color-black-90);
}}

.cta-button:active {{
  transform: scale(0.98);
}}

/* Large CTA variant */
.cta-button.large {{
  padding: 1rem 2rem;
  font-size: 0.875rem;
}}
```

### 4. Project Cards - Vibrant Showcase Style
```css
.project-card {{
  background: var(--color-light-pink); /* Dynamic color per project */
  color: var(--color-black);
  border-radius: 0.5rem; /* Rounded-lg - Medium corner radius */
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 300px;
  transition: all 0.2s ease;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}}

.project-card:hover {{
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}}

.project-card-title {{
  font-family: 'Sohne', sans-serif;
  font-size: 1.25rem;
  font-weight: 400;
  line-height: 1.4;
  margin-bottom: 0.5rem;
  text-decoration: none;
}}

.project-card-title:hover {{
  text-decoration: underline;
}}

.project-card-description {{
  font-family: 'Sohne', sans-serif;
  font-size: 1.125rem;
  font-weight: 400;
  line-height: 1.45;
  opacity: 0.6;
  margin-bottom: 1rem;
}}

.project-card-tags {{
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: auto;
}}

/* Color variants for different projects */
.project-card.qimr {{ background: var(--color-light-pink); }}
.project-card.urban-x {{ background: var(--color-grey); }}
.project-card.brisbane {{ background: var(--color-light-yellow); }}
.project-card.bigsound {{ background: var(--color-mid-purple); }}
```

### 5. Hero Section - Full-Screen Slider
```css
.hero-section {{
  height: 100vh;
  height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-black); /* Dynamic per slide */
  color: var(--color-light-pink); /* Dynamic per slide */
  position: relative;
  overflow: hidden;
}}

.hero-grid {{
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  height: 100%;
  width: 100%;
}}

.hero-content {{
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem;
  position: relative;
  z-index: 10;
}}

.hero-project-title {{
  font-family: 'Sohne', sans-serif;
  font-size: 1.125rem;
  font-weight: 400;
  line-height: 1.45;
  margin-bottom: 0.5rem;
}}

.hero-project-description {{
  font-family: 'Sohne', sans-serif;
  font-size: 1.125rem;
  font-weight: 400;
  line-height: 1.45;
  opacity: 0.6;
  margin-bottom: 0.75rem;
}}

.hero-brand-text {{
  font-family: 'Sohne Schmal', sans-serif;
  font-weight: 800;
  font-size: clamp(4.5rem, 8vw, 10rem);
  line-height: 1;
  text-transform: uppercase;
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  z-index: 40;
}}

@media (min-width: 768px) {{
  .hero-brand-text {{
    font-size: clamp(7rem, 10vw, 14rem);
    line-height: 0.95;
  }}
}}
```

## 📐 Layout System

### Grid Layout
```css
.portfolio-grid {{
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1.25rem 1.5rem;
  padding: 1.5rem;
  max-width: 1920px;
  margin: 0 auto;
}}

/* Responsive grid spans */
.grid-item {{
  grid-column: span 12; /* Full width on mobile */
}}

@media (min-width: 768px) {{
  .grid-item {{
    grid-column: span 4; /* 3 columns on tablet+ */
  }}
}}

@media (min-width: 1024px) {{
  .portfolio-grid {{
    gap: 2rem 2rem;
    padding: 2rem;
  }}
}}
```

### Spacing System
```css
/* Consistent spacing values */
.space-4 {{ margin: 1rem; }}      /* Standard spacing */
.space-6 {{ margin: 1.5rem; }}    /* Medium spacing */
.space-8 {{ margin: 2rem; }}      /* Large spacing */
.space-12 {{ margin: 3rem; }}     /* Extra large spacing */
.space-16 {{ margin: 4rem; }}     /* Section spacing */
.space-24 {{ margin: 6rem; }}     /* Major section spacing */

/* Padding versions */
.pad-4 {{ padding: 1rem; }}
.pad-6 {{ padding: 1.5rem; }}
.pad-8 {{ padding: 2rem; }}
.pad-12 {{ padding: 3rem; }}
.pad-16 {{ padding: 4rem; }}
.pad-24 {{ padding: 6rem; }}
```

### Container System
```css
.container {{
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 1rem;
  width: 100%;
}}

@media (min-width: 1024px) {{
  .container {{
    padding: 0 2rem;
  }}
}}
```

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile-first approach */
@media (min-width: 768px) {{
  /* Tablet styles */
}}

@media (min-width: 1024px) {{
  /* Desktop styles */
}}

@media (min-width: 1280px) {{
  /* Large desktop styles */
}}
```

### Mobile Adaptations
```css
/* Mobile navigation */
@media (max-width: 767px) {{
  .nav-header {{
    padding: 1rem;
  }}
  
  .hero-section {{
    padding: 1rem;
    min-height: 80vh;
  }}
  
  .hero-grid {{
    grid-template-columns: 1fr;
  }}
  
  .portfolio-grid {{
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }}
  
  .project-card {{
    min-height: 250px;
  }}
}}

/* Desktop optimizations */
@media (min-width: 1024px) {{
  .project-card:hover {{
    transform: translateY(-4px);
  }}
  
  .hero-brand-text {{
    font-size: clamp(10rem, 12vw, 14.25rem);
  }}
}}
```

## 📝 Typography System

### Font Setup
```css
/* Core font families */
@font-face {{
  font-family: 'Sohne';
  src: url('/fonts/soehne-buch.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}}

@font-face {{
  font-family: 'Sohne';
  src: url('/fonts/soehne-kraftig.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}}

@font-face {{
  font-family: 'Sohne';
  src: url('/fonts/soehne-halbfett.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}}

@font-face {{
  font-family: 'Sohne Mono';
  src: url('/fonts/soehne-mono-buch.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}}

@font-face {{
  font-family: 'Sohne Schmal';
  src: url('/fonts/soehne-schmal-fett.woff2') format('woff2');
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}}

body {{
  font-family: 'Sohne', 'Helvetica', 'Arial', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}}
```

### Typography Scale
```css
/* Display and headlines */
.brand-display {{ 
  font-family: 'Sohne Schmal', sans-serif; 
  font-weight: 800; 
  font-size: clamp(4.5rem, 8vw, 10rem); 
  line-height: 1;
  text-transform: uppercase;
}}

.hero-heading {{ 
  font-family: 'Sohne Schmal', sans-serif; 
  font-weight: 800; 
  font-size: clamp(3rem, 6vw, 7rem); 
  line-height: 1.1;
}}

.section-heading {{ 
  font-family: 'Sohne', sans-serif; 
  font-weight: 600; 
  font-size: clamp(1.5rem, 4vw, 2.5rem); 
  line-height: 1.125;
}}

.card-heading {{ 
  font-family: 'Sohne', sans-serif; 
  font-weight: 500; 
  font-size: clamp(1.25rem, 2.5vw, 1.5rem); 
  line-height: 1.375;
}}

/* Body text */
.body-large {{ 
  font-family: 'Sohne', sans-serif; 
  font-weight: 400; 
  font-size: clamp(1rem, 2vw, 1.125rem); 
  line-height: 1.45;
}}

.body-medium {{ 
  font-family: 'Sohne', sans-serif; 
  font-weight: 400; 
  font-size: 1rem; 
  line-height: 1.5;
}}

.body-small {{ 
  font-family: 'Sohne', sans-serif; 
  font-weight: 400; 
  font-size: 0.875rem; 
  line-height: 1.55;
}}

.caption {{ 
  font-family: 'Sohne', sans-serif; 
  font-weight: 400; 
  font-size: 0.75rem; 
  line-height: 1.6;
}}

/* Interactive elements */
.button-text {{ 
  font-family: 'Sohne Mono', monospace; 
  font-weight: 400; 
  font-size: 0.75rem; 
  line-height: 1;
  letter-spacing: 0.0875em;
  text-transform: uppercase;
}}

.nav-text {{ 
  font-family: 'Sohne', sans-serif; 
  font-weight: 400; 
  font-size: 1rem; 
  line-height: 1.5;
}}
```

## 🎯 Animation Guidelines

### Hover Interactions
```css
/* Smooth transitions for all interactive elements */
.interactive-element {{
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}}

/* Button hover effects */
.button:hover {{
  background: var(--color-black-90);
  border-color: var(--color-black-90);
}}

/* Card hover effects */
.card:hover {{
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}}

/* Link hover effects */
.link:hover {{
  text-decoration: underline;
  color: var(--color-white);
}}
```

### Page Load Animations
```css
/* Fade-in animations */
.fade-in {{
  opacity: 0;
  animation: fadeIn 0.7s ease-out forwards;
}}

@keyframes fadeIn {{
  from {{ opacity: 0; }}
  to {{ opacity: 1; }}
}}

/* Staggered content loading */
.stagger-item {{
  opacity: 0;
  transform: translateY(20px);
  animation: slideInUp 0.5s ease-out forwards;
}}

.stagger-item:nth-child(1) {{ animation-delay: 0.1s; }}
.stagger-item:nth-child(2) {{ animation-delay: 0.2s; }}
.stagger-item:nth-child(3) {{ animation-delay: 0.3s; }}

@keyframes slideInUp {{
  from {{
    opacity: 0;
    transform: translateY(20px);
  }}
  to {{
    opacity: 1;
    transform: translateY(0);
  }}
}}
```

### Slider Animations (Swiper.js)
```javascript
// Swiper configuration
const swiperConfig = {{
  slidesPerView: 1,
  spaceBetween: 0,
  loop: true,
  autoplay: {{
    delay: 5000,
    disableOnInteraction: false,
  }},
  effect: 'fade',
  fadeEffect: {{
    crossFade: true,
  }},
  speed: 700,
  navigation: {{
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  }},
  pagination: {{
    el: '.swiper-pagination',
    clickable: true,
  }},
}};
```


## 📦 Libraries to Install

### Required Dependencies
```bash
# Core styling and framework
npm install autoprefixer@10.4.16
npm install postcss@8.4.32

# Slider functionality (Latest version for 2025)
npm install swiper@11.0.4

# Animation libraries
npm install framer-motion@10.16.5
npm install react-spring@9.7.3

# Utility libraries
npm install clsx@2.0.0

```

### Advanced Implementation Examples

#### 1. Optimized Swiper.js Full-Screen Slider (2025 Best Practices)
```jsx
import {{ Swiper, SwiperSlide }} from 'swiper/react';
import {{ Navigation, Pagination, Autoplay, EffectFade }} from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

const BigFishHeroSlider = () => {{
  return (
    <Swiper
      modules={{[Navigation, Pagination, Autoplay, EffectFade]}}
      slidesPerView={{1}}
      spaceBetween={{0}}
      loop={{true}}
      autoplay={{
        delay: 5000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      }}
      effect="fade"
      fadeEffect={{
        crossFade: true,
      }}
      speed={{700}}
      navigation={{
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      }}
      pagination={{
        el: '.swiper-pagination',
        clickable: true,
        dynamicBullets: true,
      }}
      style={{ height: '100vh', height: '100svh' }}
      className="hero-slider"
    >
      <SwiperSlide style={{ backgroundColor: '#470024', color: '#ff3225' }}>
        <div className="grid h-full grid-cols-2">
          <div className="col-span-2 flex md:col-span-1">
            <div className="flex h-full w-half-container text-lg md:text-xl">
              <div className="mb-auto p-4 lg:p-8">
                <h2 className="font-normal">QIMR Berghofer</h2>
                <h3 className="font-normal pb-2 opacity-60">Pioneering Medical Research</h3>
                <div className="flex items-center gap-2 pt-3">
                  <span className="service-button brand-design">Brand Design</span>
                  <span className="service-button website">Website</span>
                </div>
              </div>
              <p className="absolute bottom-0 left-4 font-display uppercase text-[7rem] leading-[0.95]">
                Bigfish
              </p>
            </div>
          </div>
          <div className="col-span-2 flex md:col-span-1">
            <img 
              src="/project-images/qimr-hero.jpg" 
              alt="QIMR Berghofer Project"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
            <div className="mr-auto flex h-full w-half-container">
              <p className="absolute bottom-0 right-4 font-display uppercase text-[7rem] leading-[0.95]">
                Design
              </p>
            </div>
          </div>
        </div>
      </SwiperSlide>
      
      <SwiperSlide style={{ backgroundColor: '#808080', color: '#000000' }}>
        {{/* Additional slides */}}
      </SwiperSlide>
    </Swiper>
  );
}};
```

#### 5. Enhanced Animation Components with Framer Motion
```jsx
import {{ motion, AnimatePresence }} from 'framer-motion';

// Staggered grid animation for portfolio cards
const containerVariants = {{
  hidden: {{ opacity: 0 }},
  visible: {{
    opacity: 1,
    transition: {{
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }},
  }},
}};

const itemVariants = {{
  hidden: {{ 
    opacity: 0, 
    y: 20,
    scale: 0.95,
  }},
  visible: {{
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {{
      type: "spring",
      stiffness: 100,
      damping: 12,
    }},
  }},
}};

const PortfolioGrid = ({{ projects }}) => {{
  return (
    <motion.div 
      className="portfolio-grid"
      variants={{containerVariants}}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence>
        {{projects.map((project, index) => (
          <motion.div
            key={{project.id}}
            variants={{itemVariants}}
            layout
            whileHover={{ 
              y: -4,
              transition: {{ duration: 0.2 }} 
            }}
            className="project-card"
            style={{ backgroundColor: project.bgColor }}
          >
            <h3>{{project.title}}</h3>
            <p>{{project.description}}</p>
          </motion.div>
        ))}}
      </AnimatePresence>
    </motion.div>
  );
}};
```

#### 6. Dynamic Color System with clsx and Theme Context
```jsx
import clsx from 'clsx';
import {{ createContext, useContext }} from 'react';

// Theme context for dynamic colors
const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

// Enhanced project card with dynamic theming
const ProjectCard = ({{ 
  title, 
  description, 
  categories, 
  bgColor = 'light-pink',
  textColor = 'black',
  className,
  ...props 
}}) => {{
  return (
    <div 
      className={{clsx(
        'project-card',
        // Dynamic background colors
        {{
          'bg-light-pink text-black': bgColor === 'light-pink',
          'bg-mid-purple text-white': bgColor === 'mid-purple',
          'bg-grey text-black': bgColor === 'grey',
          'bg-light-yellow text-black': bgColor === 'light-yellow',
          'bg-dark-green text-white': bgColor === 'dark-green',
          'bg-mid-blue text-white': bgColor === 'mid-blue',
        }},
        className
      )}}
      {{...props}}
    >
      <div className="order-2 p-6">
        <h2 className="text-xl font-normal hover:underline mb-2">
          {{title}}
        </h2>
        <p className="font-normal opacity-60 text-lg md:text-xl mb-4">
          {{description}}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {{categories.map((category, index) => (
            <span 
              key={{index}}
              className={{clsx(
                'service-button',
                category.toLowerCase().replace(' ', '-')
              )}}
            >
              {{category}}
            </span>
          ))}}
        </div>
      </div>
    </div>
  );
}};
```

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {{
  content: ['./src/**/*.{{js,jsx,ts,tsx}}'],
  theme: {{
    extend: {{
      colors: {{
        'black': '#151515',
        'white': '#fff',
        'dark-grey': '#717171',
        'mid-grey': '#aaa',
        'grey': '#b6cbcb',
        'dark-blue': '#1f47e6',
        'mid-blue': '#88a2ff',
        'light-blue': '#b7fbff',
        'dark-orange': '#d1903a',
        'mid-orange': '#ff965a',
        'mid-pink': '#ff84e4',
        'light-pink': '#ffd1e7',
        'mid-purple': '#d987ff',
        'mid-yellow': '#ffe03d',
        'light-yellow': '#f6fd87',
        'dark-green': '#a1a500',
        'mid-green': '#78d692',
      }},
      fontFamily: {{
        'sans': ['Sohne', 'Helvetica', 'Arial', 'sans-serif'],
        'mono': ['Sohne Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        'display': ['Sohne Schmal', 'Sohne', 'Helvetica', 'Arial', 'sans-serif'],
      }},
      maxWidth: {{
        '8xl': '1920px',
      }},
      screens: {{
        'xs': '475px',
      }},
    }},
  }},
  plugins: [],
}};
```
internal-tag: light-coral

🚨 MANDATORY COLOR RESTRICTION - THE 90/10 RULE
ABSOLUTE PROHIBITIONS - NEVER VIOLATE:
  • ❌ NEVER use colored backgrounds for hero sections, main sections, or large areas
  • ❌ NEVER use gradient backgrounds covering more than button-sized areas
  • ❌ NEVER use brand colors for anything larger than a button or small accent
  • ❌ NEVER fill large sections with any color except white (#FFFFFF) or light gray (#F7F7F7)
ENFORCEMENT RULE:
IF any colored area is larger than 200px × 60px (button size)
THEN it violates the color restriction
THEN use white or light gray background instead
ONLY ALLOWED COLOR USAGE:
  • ✅ Buttons and CTAs only - small, focused interactive elements
  • ✅ Logo and brand marks - minimal brand identity elements
  • ✅ Small icons and indicators - tiny accent elements only
  • ✅ Thin borders or dividers - 1-2px maximum width

  🎨 Core Visual System
Foundation Colors (Never Change)
:root {{
  /* Backgrounds - Exact Company Colors */
  --bg-page: #FFFFFF;           /* Main page background */
  --bg-card: #FFFFFF;           /* Product card backgrounds */
  --bg-subtle: #F7F7F7;         /* Input fields, subtle areas */
  --bg-section: #F7F7F7;        /* Section backgrounds */
  
  /* Text - Exact Company Colors */
  --text-primary: #222222;      /* Main headings and content */
  --text-secondary: #717171;    /* Supporting text */
  --text-light: #B0B0B0;        /* Captions, timestamps */
  
  /* Borders - Exact Company Colors */
  --border-light: #EBEBEB;      /* Subtle separators */
  --border-medium: #DDDDDD;     /* Standard borders */
  --border-strong: #B0B0B0;     /* Emphasized borders */

  /* MAIN ACCENT COLORS - Company Brand Colors for food apps only */
  --brand-primary: #FF661A;     /* Orange color */
  --brand-hover: #F05000;       /* Hover state */
  --brand-active: #E54C00;      /* Active/pressed state */

  /* MAIN ACCENT COLORS - Company Brand Colors Only */
  --brand-primary: #FF385C;     /* Main Company Rausch coral */
  --brand-hover: #E31C5F;       /* Hover state */
  --brand-active: #E01760;      /* Active/pressed state */
}}

🔧 Component Library
1. Product/Service Cards - Exact Company Style

css
.marketplace-card {{
  background: var(--bg-card);
  border: none;
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  position: relative;
}}

.marketplace-card:hover {{
  transform: translateY(-1px);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.12);
}}

.marketplace-card-image {{
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 8px;
}}

.marketplace-card-title {{
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 2px;
  color: var(--text-primary);
}}

.marketplace-card-price {{
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}}
2. Primary Buttons - Exact Company Style

css
.btn-primary {{
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.25;
  letter-spacing: 0;
}}

.btn-primary:hover {{
  background: var(--brand-hover);
  transform: scale(1.04);
}}

.btn-primary:active {{
  background: var(--brand-active);
  transform: scale(0.96);
}}
3. Navigation Header - Exact Company Style

css
.marketplace-header {{
  background: var(--bg-page);
  border-bottom: 1px solid var(--border-light);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  height: 80px;
  box-sizing: border-box;
}}

.marketplace-logo {{
  font-size: 20px;
  font-weight: 600;
  color: var(--brand-primary);
  text-decoration: none;
}}

.marketplace-nav {{
  display: flex;
  align-items: center;
  gap: 24px;
}}

.marketplace-nav-link {{
  color: var(--text-primary);
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  padding: 12px 16px;
  border-radius: 22px;
  transition: all 0.2s ease;
}}

.marketplace-nav-link:hover {{
  background: var(--bg-subtle);
}}

📐 Layout System - Exact Company Spacing
Grid Layout

css
.marketplace-grid {{
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 40px 24px; /* 40px vertical, 24px horizontal */
  padding: 24px;
  max-width: 1760px;
  margin: 0 auto;
}}
Spacing System - Exact Company Values

css
/* Company uses these exact spacing values */
.space-8 {{ margin: 8px; }}    /* Small spacing */
.space-16 {{ margin: 16px; }}  /* Standard spacing */
.space-24 {{ margin: 24px; }}  /* Large spacing */
.space-32 {{ margin: 32px; }}  /* Extra large spacing */
.space-48 {{ margin: 48px; }}  /* Major section spacing */

/* Padding versions */
.pad-8 {{ padding: 8px; }}
.pad-16 {{ padding: 16px; }}
.pad-24 {{ padding: 24px; }}
.pad-32 {{ padding: 32px; }}
.pad-48 {{ padding: 48px; }}
Container System - Exact Company Breakpoints

css
.container {{
  max-width: 1760px;
  margin: 0 auto;
  padding: 0 24px;
}}

@media (max-width: 744px) {{
  .container {{
    padding: 0 16px;
  }}
}}

📱 Responsive Design - Exact Company Breakpoints
Breakpoints

css
/* Company's exact breakpoints */
@media (min-width: 744px) {{
  /* Small desktop/tablet */
}}

@media (min-width: 950px) {{
  /* Medium desktop */
}}

@media (min-width: 1128px) {{
  /* Large desktop */
}}

@media (min-width: 1440px) {{
  /* Extra large desktop */
}}
Mobile Adaptations

css
/* Mobile navigation */
@media (max-width: 744px) {{
  .marketplace-header {{
    padding: 16px;
    height: 70px;
  }}
  
  .marketplace-nav {{
    display: none;
  }}
  
  .marketplace-grid {{
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 16px;
  }}
}}

/* Desktop optimizations */
@media (min-width: 1128px) {{
  .marketplace-grid {{
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 40px 24px;
  }}
  
  .marketplace-card:hover {{
    transform: translateY(-2px);
  }}
}}

🚫 Common Mistakes to Avoid
Don't:
  • Use this system for non-marketplace websites
  • Mix multiple font families
  • Use colors outside the defined palette
  • Skip hover and focus states
  • Ignore mobile responsive design
  • Forget trust indicators (ratings, reviews)
  • Use arbitrary spacing values
  • Make buttons smaller than 44px height
Do:
  • Keep the foundation colors consistent
  • Use the spacing system consistently
  • Include trust-building elements
  • Test on mobile devices
  • Maintain professional appearance
  • Focus on user trust and credibility



📝 Typography System
Font Setup
/* Use Company Cereal or Inter font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

body {{
  font-family: 'Company Cereal', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}}
Typography Scale - Exact Company Sizing
/* Display Headlines */
.display-large {{ font-size: 48px; font-weight: 600; line-height: 1.08; letter-spacing: -0.02em; }}
.display-medium {{ font-size: 40px; font-weight: 600; line-height: 1.1; letter-spacing: -0.02em; }}
.display-small {{ font-size: 32px; font-weight: 600; line-height: 1.125; letter-spacing: -0.01em; }}

/* Headings */
.heading-1 {{ font-size: 26px; font-weight: 600; line-height: 1.15; letter-spacing: -0.005em; }}
.heading-2 {{ font-size: 22px; font-weight: 600; line-height: 1.18; letter-spacing: -0.02em; }}
.heading-3 {{ font-size: 19px; font-weight: 600; line-height: 1.21; letter-spacing: -0.02em; }}
.heading-4 {{ font-size: 16px; font-weight: 600; line-height: 1.25; letter-spacing:-0.02em; }}
.heading-5 {{ font-size: 14px; font-weight: 600; line-height: 1.29; letter-spacing: -0.02em;}}

/* Body text */
.body-large {{ font-size: 16px; font-weight: 400; line-height: 1.5; letter-spacing:-0.01em; }}
.body-medium {{ font-size: 14px; font-weight: 400; line-height: 1.43; letter-spacing: -0.005em; }}
.body-small {{ font-size: 12px; font-weight: 400; line-height: 1.33; letter-spacing: 0; }}
.caption {{ font-size: 10px; font-weight: 400; line-height: 1.2; letter-spacing: 0.04em; }}

/* Interactive elements */
.button-text {{ font-size: 14px; font-weight: 600; line-height: 1.29; letter-spacing: -0.02em; }}
.link-text {{ font-size: 14px; font-weight: 500; line-height: 1.29; letter-spacing: -0.02em; }}
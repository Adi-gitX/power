internal-tag: lime

## Color Palette

### Primary Colors
- **Primary lime-Yellow**: `#ECEC75` (bright lime-yellow background)
- **Card Background**: `#e6e67c` (slightly darker tint for cards)

### Neutral Colors
- **White**: `#ffffff`
- **Light Gray**: `#f8fafc`
- **Medium Gray**: `#64748b`
- **Dark Gray**: `#1e293b`
- **Black**: `#0f172a` (used for text, buttons, and icons)

### Usage Guidelines
- Bright lime-yellow for primary background and brand elements
- Slightly darker lime-yellow tint for card backgrounds
- Black for text, buttons, and high-contrast elements
- White for clean content areas and contrast
- Avoid using dark colorful gradients or vibrant color combinations

## Typography

### Font Stack
**Headings (Serif):**
```css
font-family: 'Crimson Text', 'Times New Roman', serif;
```

**Body Text (Sans-serif):**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
```

### Font Sizes & Hierarchy
- **Hero Text**: 56px - 72px (3.5rem - 4.5rem) - Elegant serif for main headings
- **Section Headers**: 40px - 48px (2.5rem - 3rem) - Serif for major sections
- **Subsection Headers**: 24px - 28px (1.5rem - 1.75rem) - Sans-serif for sub-headings
- **Body Text**: 16px - 18px (1rem - 1.125rem) - Sans-serif for readability
- **Small Text**: 14px (0.875rem) - Sans-serif for captions and meta info

### Font Weights
- **Regular**: 400 (body text)
- **Medium**: 500 (subheadings)
- **Semibold**: 600 (section headers)
- **Bold**: 700 (hero text, emphasis)

### Typography Rules
- **Serif fonts** for main headings and hero text to create elegance
- **Sans-serif fonts** for body text and UI elements for readability
- **Large line heights** (1.6-1.8) for generous vertical spacing
- **Consistent hierarchy** with clear size differentiation

## Layout & Spacing

### Grid System
- **12-column grid** for desktop layouts
- **Responsive breakpoints**: 
  - Mobile: 320px - 767px
  - Tablet: 768px - 1023px
  - Desktop: 1024px+

### Spacing Scale
- **XS**: 4px (0.25rem)
- **SM**: 8px (0.5rem)
- **MD**: 16px (1rem)
- **LG**: 24px (1.5rem)
- **XL**: 32px (2rem)
- **2XL**: 48px (3rem)
- **3XL**: 64px (4rem)

### Spacing Guidelines
- Use generous spacing between sections (3XL - 4XL)
- Consistent vertical rhythm with 1.5rem base line height
- Whitespace is luxury - use 2-3x more spacing than feels comfortable
- Donot make typical layout

## UI Components

### Buttons

#### Primary Button
```css
.btn-primary {
  background: #0f172a; /* Black background */
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-primary:hover {
  background: #1e293b; /* Slightly lighter black on hover */
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: transparent;
  color: #0f172a;
  border: 2px solid #0f172a;
  border-radius: 6px;
  padding: 10px 22px;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #0f172a;
  color: white;
  transform: translateY(-1px);
}
```

### Navigation
- **Fixed header** with clean navigation
- **Subtle shadows** for depth
- **Smooth transitions** on hover states
- **Mobile-first** responsive design

### Cards & Sections
- **Main background**: Bright lime-yellow (#ECEC75)
- **Card backgrounds**: Slightly darker tint (#e6e67c) with subtle transparency
- **Rounded corners** (8px - 12px border radius)
- **Generous padding** (32px - 48px)
- **Subtle hover effects** with gentle transforms
- **Clean white content areas** for readability

## Animations & Interactions

### Micro-animations
- **Hover states**: 200ms ease transitions
- **Button interactions**: translateY(-2px) on hover
- **Card hover**: subtle shadow increase
- **Form focus**: smooth color transitions

### Page Transitions
- **Smooth scrolling**: behavior: smooth
- **Fade-in animations**: for content sections
- **Progressive disclosure**: for data visualizations

## Data Visualization

### Charts & Graphs
- **Primary color**: Green (#22c55e) for main data
- **Secondary colors**: Gray tones for supporting data
- **Clean axes**: minimal grid lines
- **Accessible**: proper contrast ratios

### Interactive Elements
- **Hover tooltips**: clean white backgrounds
- **Data points**: subtle hover effects
- **Legends**: clear, well-spaced

## Content Guidelines

### Imagery
- **High-quality**: professional photography
- **Consistent aspect ratios**: 16:9 for hero images
- **Environmental themes**: align with sustainability focus
- **Data visualization**: clean, minimal charts

### Iconography
- **Line icons**: consistent stroke width (2px)
- **Green accent**: for active/selected states
- **Minimal style**: avoid decorative elements
- **Lucide React**: use for consistency

## Accessibility

### Color Contrast
- **WCAG AA compliance**: minimum 4.5:1 ratio
- **Focus indicators**: visible and consistent
- **Color independence**: never rely on color alone

### Interactive Elements
- **Touch targets**: minimum 44px for mobile
- **Keyboard navigation**: proper focus management
- **Screen readers**: semantic HTML structure

## Implementation Notes

### CSS Custom Properties
```css
:root {
  --color-primary: #ECEC75; /* Bright lime-yellow */
  --color-primary-dark: #e6e67c; /* Darker tint for cards */
  --color-black: #0f172a;
  --color-gray-50: #f8fafc;
  --color-gray-600: #64748b;
  --color-gray-900: #1e293b;
  --color-white: #ffffff;
  
  --font-serif: 'Crimson Text', 'Times New Roman', serif;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --spacing-3xl: 4rem;
  
  --border-radius: 6px;
  --border-radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

### Performance
- **Optimize images**: WebP format when possible
- **Minimize animations**: on reduced motion preference
- **Efficient CSS**: avoid complex selectors

## Do's and Don'ts

### Do's
- Give preference to given components in the guideline
- Use bright lime-yellow (#ECEC75) as primary background color
- Use elegant serif fonts for main headings and hero text
- Use sans-serif fonts for body text and UI elements
- Implement black buttons with white text for primary actions
- Use generous whitespace and clean layouts
- Implement subtle hover effects with gentle transforms
- Create clean, minimal designs with focus on content
- Use consistent spacing and typography hierarchy
- Implement proper contrast ratios for accessibility
- Use rounded corners (6px-12px) for modern feel

### Don'ts
- Don't use dark colorful gradients or vibrant combinations
- Don't center-align all content disrupting natural reading flow
- Don't apply universal transitions that break transforms
- Don't use purple/pink color combinations unless requested
- Don't overcrowd layouts with too many elements
- Don't ignore the serif/sans-serif typography hierarchy
- Don't use small buttons or cramped spacing
- Don't forget accessibility guidelines and focus states

## Brand Personality
- **Clean & Minimal**: Uncluttered design with generous whitespace
- **Professional**: Data-driven, trustworthy, and corporate-friendly
- **Sustainable**: Environmental consciousness with bright, natural colors
- **User-centric**: Intuitive interfaces with clear information hierarchy
- **Modern**: Contemporary web standards with elegant typography mixing
- **Distinctive**: Bright lime-yellow brand color that stands out
- **Confident**: Bold color choices and clean, assertive design language
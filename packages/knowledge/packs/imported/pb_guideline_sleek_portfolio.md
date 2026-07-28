internal-tag: Guideline-sleek-portfolio


---
## Color Palette
### Primary Colors
- **Background**: `rgb(255, 255, 255)` / `#FFFFFF` (Pure White)
- **Text**: `rgb(0, 0, 0)` / `#000000` (Pure Black)
### Color Philosophy
- **Monochromatic approach**: Uses only black and white to avoid competing with
photography
- **High contrast**: Pure black text on pure white background for maximum readability
- **Image-first**: No additional colors that could distract from portfolio images
---
## Typography
### Primary Font
- **Font Family**: `Archivo`
- **Font Weight**: `normal` (400)
### Text Specifications
- **Font Size**: `28px`
- **Line Height**: `19px`
- **Letter Spacing**: `0.25px`
- **Color**: `rgb(0, 0, 0)` / `#000000`
### Typography Philosophy
- **Clean and modern**: Archivo provides excellent readability
- **Generous letter spacing**: 0.25px adds breathing room
- **Consistent sizing**: Single font size maintains visual hierarchy through content
structure

---
## ️ Image Styling
### Image Dimensions
- **Max Height**: `763.3px`
- **Width**: `auto` (maintains aspect ratio)
- **Aspect Ratios**: Mixed (1200x1500, 2400x3000, 1600x2000, 2700x3375, etc.)

### Image Presentation
- **Display**: Full-screen, centered
- **Opacity**: `1` (fully visible)
- **Background**: None (transparent)
- **Positioning**: Center-aligned with responsive scaling
### Image Container
- **Container Width**: `1904px` per slide
- **Total Container Width**: `39984px` (for all slides)
- **Opacity**: `1`
---
## ️ Navigation Elements
### Navigation Arrows
- **Left Arrow**: `.icon-navigate-left`
- **Right Arrow**: `.icon-navigate-right`
- **Positioning**: Overlay on images (left and right sides)
- **Style**: Minimalistic icon-based
### Navigation Behavior
- **Type**: Horizontal slideshow
- **Transition**: Smooth sliding animation
- **Active State**: Current slide has `active` class
- **Interaction**: Click/tap to navigate
### Close Button
- **Icon**: `.icon-close`
- **Purpose**: Close expanded figcaptions
- **Style**: Consistent with navigation icons
---
## Layout Structure
### Main Container
- **Type**: `slideshow` with `incontext` type
- **Layout**: `layout-wide`
- **Menu**: `menu-horizontal03`
- **Container**: `.container.textp-bottom.contain`
### Body Configuration
- **Background Repeat**: `no-repeat`
- **Background Position**: `center center`
- **Background Attachment**: `fixed`
- **Background Size**: `cover`

- **Visibility**: `visible`
### Cell Structure
- **Cell Width**: `1904px`
- **Cell Type**: Individual slides in horizontal layout
- **Active Cell**: Distinguished with `active` class
---
## Interactive Elements
### Hover States
- **Navigation arrows**: Appear on image hover
- **Image transitions**: Smooth opacity changes
- **Figcaption behavior**: Can be toggled with close button
### Responsive Behavior
- **Images**: Scale proportionally maintaining aspect ratio
- **Container**: Adjusts to viewport while maintaining layout integrity
- **Navigation**: Consistently positioned regardless of screen size
---
## Layout Patterns
### Slideshow Pattern
- **Type**: Horizontal image gallery
- **Navigation**: Left/right arrows
- **Layout**: Full-width, centered images
- **Progression**: Linear navigation through portfolio
### Image Display Pattern
- **Presentation**: One image per viewport
- **Scaling**: Proportional with max-height constraint
- **Positioning**: Centered both horizontally and vertically
---
## Visual Hierarchy
### Primary Focus
1. **Images**: Largest visual element, full attention
2. **Navigation**: Subtle but accessible
3. **Text**: Minimal, only when necessary (figcaptions)
### Secondary Elements
- **Figcaptions**: Hidden by default (`opacity: 0`)
- **Share buttons**: Available but non-intrusive

- **Social media icons**: Present but minimal
---
## Design Philosophy
### Minimalism
- **Clean interfaces**: No unnecessary elements
- **Whitespace**: Generous use of negative space
- **Focus**: Photography as the primary content
### Professional Presentation
- **Consistent styling**: Unified visual language
- **High contrast**: Maximum readability
- **Smooth interactions**: Polished user experience
### User Experience
- **Intuitive navigation**: Clear directional controls
- **Fast loading**: Optimized image delivery
- **Accessible design**: High contrast, clear interactions
---
## 🔧 Technical Implementation Notes
### CSS Classes
- `.slider.incontext`: Main slideshow container
- `.container.textp-bottom.contain`: Content container
- `.cell.active`: Active slide styling
- `.imageBox`: Image wrapper
- `.coverBox`: Image coverage container
- `.fig.noFigCap`: Figure caption styling
### JavaScript Framework
- **Framework**: AngularJS (based on ng-* attributes)
- **Controllers**: `baseController`
- **Directives**: Custom slideshow components
### Performance Considerations
- **Image optimization**: Progressive loading
- **CDN delivery**: Images served from CloudFront
- **Lazy loading**: Images loaded as needed
---
## 📋 Implementation Checklist
### Essential Elements

- [ ] Archivo font family implementation
- [ ] Pure black/white color scheme
- [ ] Horizontal slideshow functionality
- [ ] Responsive image scaling (max-height: 763.3px)
- [ ] Navigation arrow overlays
- [ ] Smooth transitions between slides
- [ ] Figcaption toggle functionality
- [ ] Mobile-responsive layout
### Advanced Features
- [ ] Touch/swipe navigation for mobile
- [ ] Keyboard navigation support
- [ ] Social sharing integration
- [ ] SEO optimization for images
- [ ] Analytics tracking for portfolio views
---
## Brand Guidelines
### Visual Identity
- **Aesthetic**: Clean, professional, minimalist
- **Tone**: Sophisticated, artistic, focused
- **Approach**: Image-first, content-secondary
### Usage Guidelines
- **Do**: Maintain high contrast, keep interfaces clean, prioritize images
- **Don't**: Add unnecessary colors, clutter the interface, compete with photography
import type { Metadata, Viewport } from 'next';
import { Figtree, Instrument_Serif } from 'next/font/google';
import { SITE } from '@/lib/site';
import './globals.css';

/**
 * Self-hosted at build time. This is not a preference: a `<link>` to Google
 * Fonts is a render-blocking request to a third party, and swapping in the real
 * face afterwards shifts the layout. `next/font` inlines the metrics and serves
 * the file from our own origin, so there is no third-party round trip and no
 * cumulative layout shift from the swap.
 */
const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
});

/**
 * The display face, used only for headings. A high-contrast serif against a
 * grotesque body is what gives the page its editorial register rather than the
 * uniform-sans look every developer-tool site defaults to. One weight, because
 * that is all a display face at this size needs.
 */
const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    'Claude Code',
    'AI agents',
    'autonomous engineering',
    'multi-agent',
    'code generation',
    'developer tools',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${SITE.name}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export const viewport: Viewport = {
  themeColor: '#FAF9F5',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Structured data. Emitted as a literal script rather than through a component
 * so it lands in the static HTML — a crawler reading `out/index.html` finds it
 * without running anything.
 */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE.name,
  description: SITE.description,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'macOS, Linux, Windows',
  url: SITE.url,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${display.variable}`}>
      <body className="bg-canvas font-sans text-bodytext antialiased">
        <script
          type="application/ld+json"
          // The payload is a local literal, never user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-canvas"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

/**
 * Metadata routes are dynamic handlers by default. Under `output: 'export'` there
 * is no server to run them, so Next requires this opt-in before it will render
 * them to files at build time.
 */
export const dynamic = 'force-static';

/** Emitted as a static `sitemap.xml` by the export. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}

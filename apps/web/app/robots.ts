import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

/** See the note in `sitemap.ts` — required for metadata routes under export. */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}

import { Ambient } from '@/components/marketing/Ambient';
import { Nav } from '@/components/marketing/Nav';
import { Hero } from '@/components/marketing/Hero';
import { Shift } from '@/components/marketing/Shift';
import { RunLog } from '@/components/marketing/RunLog';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { Capabilities } from '@/components/marketing/Capabilities';
import { Install } from '@/components/marketing/Install';
import { Faq } from '@/components/marketing/Faq';
import { CtaFooter } from '@/components/marketing/CtaFooter';

export default function Page() {
  return (
    <div className="min-h-screen bg-canvas font-sans text-bodytext antialiased">
      <Ambient />
      <Nav />
      <main id="main">
        <Hero />
        <Shift />
        <RunLog />
        <HowItWorks />
        <Capabilities />
        <Install />
        <Faq />
      </main>
      <CtaFooter />
    </div>
  );
}

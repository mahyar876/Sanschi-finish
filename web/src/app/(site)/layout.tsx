import { DemoModeBanner } from '@/components/DemoModeBanner';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoModeBanner />
      <Header />
      <main className="site-main">{children}</main>
      <Footer />
    </>
  );
}

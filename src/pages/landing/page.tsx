import Navbar from './components/Navbar';
import Hero from './components/Hero';
import LogoStrip from './components/LogoStrip';
import Features from './components/Features';
import Workflow from './components/Workflow';
import Showcase from './components/Showcase';
import Testimonials from './components/Testimonials';
import CtaSection from './components/CtaSection';
import Footer from './components/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-page">
      <Navbar />
      <main>
        <Hero />
        <LogoStrip />
        <Features />
        <Workflow />
        <Showcase />
        <Testimonials />
      </main>
      <CtaSection />
      <Footer />
    </div>
  );
}
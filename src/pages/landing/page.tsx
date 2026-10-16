import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Workflow from './components/Workflow';
import Showcase from './components/Showcase';
import CtaSection from './components/CtaSection';
import Footer from './components/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-page">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Workflow />
        <Showcase />
      </main>
      <CtaSection />
      <Footer />
    </div>
  );
}

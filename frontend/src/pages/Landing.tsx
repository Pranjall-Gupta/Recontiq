import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import TopFeatures from '../components/TopFeatures';
import BigIdea from '../components/BigIdea';
import AccordionSection from '../components/AccordionSection';
import Platform from '../components/Platform';
import Compare from '../components/Compare';
import Pricing from '../components/Pricing';
import Testimonial from '../components/Testimonial';
import DualHighlight from '../components/DualHighlight';
import Features from '../components/Features';
import Why from '../components/Why';
import Insights from '../components/Insights';
import CtaBanner from '../components/CtaBanner';
import Footer from '../components/Footer';

export default function Landing() {
    return (
        <>
            <Navbar />
            <main>
                <Hero />
                <TopFeatures />
                <BigIdea />
                <AccordionSection />
                <Platform />
                <Compare />
                <Pricing />
                <Testimonial />
                <DualHighlight />
                <Features />
                <Why />
                <Insights />
                <CtaBanner />
            </main>
            <Footer />
        </>
    );
}

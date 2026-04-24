import { Hero } from "@/components/landing/Hero";
import { Value } from "@/components/landing/Value";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Infrastructure } from "@/components/landing/Infrastructure";
import { Pricing } from "@/components/landing/Pricing";
import { CTA, Footer } from "@/components/landing/CTA";
import { Navbar } from "@/components/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Value />
        <Problem />
        <HowItWorks />
        <Infrastructure />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

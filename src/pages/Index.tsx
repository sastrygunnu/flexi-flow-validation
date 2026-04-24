import { Hero } from "@/components/landing/Hero";
import { Value } from "@/components/landing/Value";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Infrastructure } from "@/components/landing/Infrastructure";
import { DeveloperTools } from "@/components/landing/DeveloperTools";
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
        <DeveloperTools />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

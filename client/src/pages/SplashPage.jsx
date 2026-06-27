import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import logoImage from "../assets/medpath_logo.png";

export function SplashPage() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Redirect to Dashboard (/home) if user is already authenticated
  // useEffect(() => {
  //   if (!loading && user) {
  //     navigate("/home");
  //   }
  // }, [user, loading, navigate]);

  // Handle sticky header on scroll to match Stitch script exactly
  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector("header");
      if (header) {
        if (window.scrollY > 20) {
          header.classList.add("shadow-lg", "bg-surface-container-lowest/95");
        } else {
          header.classList.remove("shadow-lg", "bg-surface-container-lowest/95");
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Set up reveal animation observer for the cards to match Stitch script exactly
  useEffect(() => {
    if (loading || user) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100");
            entry.target.classList.remove("opacity-0", "translate-y-4");
          }
        });
      },
      { threshold: 0.1 }
    );

    const cards = document.querySelectorAll(".glass-card");
    cards.forEach((card) => {
      card.classList.add("transition-all", "duration-700", "opacity-0", "translate-y-4");
      observer.observe(card);
    });

    return () => {
      cards.forEach((card) => observer.unobserve(card));
    };
  }, [loading, user]);

  // Show a clean loader while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="relative w-16 h-16 flex items-center justify-center mb-4">
          <div className="absolute inset-0 bg-primary-fixed-dim/20 rounded-full animate-ping"></div>
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-on-surface-variant font-label-md animate-pulse">Loading MedPath...</p>
      </div>
    );
  }

  // If user is logged in, avoid rendering the landing page to prevent flash before redirect
  // if (user) {
  //   return null;
  // }

  return (
    <div className={`landing-page min-h-screen w-full m-0 p-0 font-body-md text-body-md selection:bg-primary-container selection:text-on-primary bg-background overflow-x-hidden relative ${theme === "light" ? "light" : "dark"}`}>
      {/* Top Navigation Bar */}
      <header className="fixed top-0 w-full bg-surface-container-lowest/80 backdrop-blur-md z-50 border-b border-outline-variant shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center px-margin py-sp-sm max-w-7xl mx-auto">
          <div className="flex items-center gap-sp-sm">
            <img alt="MedPath Logo" className="w-10 h-10 object-contain" src={logoImage} />
            <span className="font-headline-lg text-headline-lg font-bold text-primary">MedPath</span>
          </div>
          <nav className="hidden md:flex items-center gap-sp-md">
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" href="#how-it-works">How it Works</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" href="#features">Features</a>
            {/* <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" href="#specialists">Specialists</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" href="#pricing">Pricing</a> */}
          </nav>
          <div className="flex items-center gap-sp-sm">
            {/* Dark/Light mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all active:scale-95 flex items-center justify-center border border-outline-variant/30 cursor-pointer"
              aria-label="Toggle theme"
            >
              <span className="material-symbols-outlined text-[20px]">
                {theme === "light" ? "dark_mode" : "light_mode"}
              </span>
            </button>
            {user ? (
              <button 
                onClick={() => navigate("/home")}
                className="bg-primary text-on-primary px-sp-md py-sp-xs rounded-lg font-body-md text-body-md font-semibold transition-all hover:brightness-110 active:scale-95 shadow-sm cursor-pointer"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button 
                  onClick={() => navigate("/login")}
                  className="hidden sm:block font-body-sm text-body-sm text-on-surface-variant hover:text-primary px-sp-sm py-sp-xs transition-all active:scale-95 cursor-pointer"
                >
                  Login
                </button>
                <button 
                  onClick={() => navigate("/signup")}
                  className="bg-primary-container text-on-primary-container px-sp-md py-sp-xs rounded-lg font-body-md text-body-md font-semibold transition-all hover:brightness-110 active:scale-95 shadow-sm cursor-pointer"
                >
                  Start Consultation
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center px-margin overflow-hidden">
          {/* AI Atmospheric Background */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-1/4 -left-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30 bg-cover bg-center" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }}></div>
          </div>
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-sp-xl items-center relative z-10">
            <div className="space-y-sp-md">
              <div className="inline-flex items-center gap-sp-xs px-sp-sm py-1 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 text-primary text-label-caps font-label-caps font-semibold">
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                NEXT-GEN CLINICAL INTELLIGENCE
              </div>
              <h1 className="font-headline-xl text-headline-xl md:text-[56px] md:leading-[64px] text-on-surface">
                Precision Navigation for <br />
                <span className="text-primary">Modern Healthcare</span>
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-lg">
                Skip the guesswork. Use MedPath's AI to find the right hospital and specialists based on your unique symptoms, medical history, and clinical data points.
              </p>
              <div className="flex flex-wrap gap-sp-sm pt-sp-xs">
                <button 
                  onClick={() => navigate(user ? "/home" : "/signup")}
                  className="bg-primary text-on-primary px-sp-lg py-sp-sm rounded-lg font-headline-lg text-[18px] transition-all hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(45,212,191,0.3)] cursor-pointer"
                >
                  {user ? "Go to Dashboard" : "Start Free Consultation"}
                </button>
                <a 
                  href="#how-it-works"
                  className="border border-outline-variant text-on-surface px-sp-lg py-sp-sm rounded-lg font-headline-lg text-[18px] transition-all hover:bg-surface-variant/50 active:scale-95 inline-flex items-center justify-center"
                >
                  How it Works
                </a>
              </div>
              <div className="flex items-center gap-sp-md pt-sp-md">
                <div className="flex -space-x-3">
                  <img 
                    className="w-10 h-10 rounded-full border-2 border-surface-container-lowest object-cover" 
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150&h=150" 
                    alt="Professional female doctor" 
                  />
                  <img 
                    className="w-10 h-10 rounded-full border-2 border-surface-container-lowest object-cover" 
                    src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150&h=150" 
                    alt="Senior specialist physician" 
                  />
                  <img 
                    className="w-10 h-10 rounded-full border-2 border-surface-container-lowest object-cover" 
                    src="https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150&h=150" 
                    alt="Young medical researcher" 
                  />
                </div>
                <p className="text-body-sm text-outline font-body-sm">Trusted by <span className="text-on-surface font-semibold">15,000+</span> patients monthly</p>
              </div>
            </div>
            {/* Interactive Hero Graphic */}
            <div className="relative hidden lg:block">
              <div className="glass-card p-gutter rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-sp-sm">
                  <span className="material-symbols-outlined text-primary/50 text-[32px]">clinical_notes</span>
                </div>
                <div className="space-y-sp-md">
                  <div className="flex items-center gap-sp-sm border-b border-outline-variant pb-sp-sm">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>vital_signs</span>
                    </div>
                    <div>
                      <p className="font-label-caps text-label-caps text-primary">ANALYZING SYMPTOMS</p>
                      <p className="font-headline-lg text-body-md font-bold text-on-surface">Patient Case #8812</p>
                    </div>
                  </div>
                  <div className="space-y-sp-sm">
                    <div className="flex justify-between items-center text-body-sm">
                      <span className="text-on-surface-variant">Triage Accuracy</span>
                      <span className="text-primary font-mono">98.4%</span>
                    </div>
                    <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary h-full w-[98.4%] rounded-full shadow-[0_0_8px_rgba(45,212,191,0.5)]"></div>
                    </div>
                  </div>
                  <div className="p-sp-sm bg-surface-container-lowest border border-outline-variant rounded-lg space-y-sp-xs">
                    <div className="flex items-center gap-sp-xs">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <span className="text-label-caps text-outline uppercase">AI Recommendation</span>
                    </div>
                    <p className="text-body-sm text-on-surface italic">"Immediate specialist consult recommended for neurological evaluation based on intermittent localized tremors..."</p>
                  </div>
                  <div className="grid grid-cols-2 gap-sp-sm">
                    <div className="p-sp-sm bg-primary-container/10 border border-primary/20 rounded-lg">
                      <p className="text-label-caps text-primary-fixed">HOSPITAL A</p>
                      <p className="text-body-md font-semibold text-on-surface">9.8 Reliability</p>
                    </div>
                    <div className="p-sp-sm bg-surface-container border border-outline-variant rounded-lg">
                      <p className="text-label-caps text-outline">HOSPITAL B</p>
                      <p className="text-body-md font-semibold text-on-surface">8.4 Reliability</p>
                    </div>
                  </div>
                </div>
                {/* Hover decorative elements */}
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all text-on-surface"></div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-sp-xl px-margin bg-surface-container-low" id="how-it-works">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-sp-xl space-y-sp-sm">
              <h2 className="font-headline-xl text-headline-xl text-on-surface">Intelligent Care Delivery</h2>
              <p className="text-body-md text-on-surface-variant max-w-2xl mx-auto">Our multi-layered AI architecture processes clinical nuance to ensure you reach the right destination, faster.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-sp-md relative">
              {/* Connector lines for desktop */}
              <div className="hidden md:block absolute top-12 left-[20%] right-[20%] z-0">
                <div className="path-line opacity-20"></div>
              </div>
              {/* Step 1 */}
              <div className="relative z-10 group">
                <div className="glass-card p-sp-lg rounded-xl transition-all hover:border-primary/50 hover:-translate-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest flex items-center justify-center mb-sp-md border border-outline-variant group-hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-primary text-[32px]">psychology</span>
                  </div>
                  <span className="text-label-caps text-primary-fixed font-semibold mb-sp-xs block">STEP 01</span>
                  <h3 className="font-headline-lg text-headline-lg mb-sp-sm text-on-surface">AI Triage</h3>
                  <p className="text-body-md text-on-surface-variant">Describe your symptoms in natural language. Our LLM-based triage engine identifies severity and medical urgency in seconds.</p>
                </div>
              </div>
              {/* Step 2 */}
              <div className="relative z-10 group">
                <div className="glass-card p-sp-lg rounded-xl transition-all hover:border-primary/50 hover:-translate-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest flex items-center justify-center mb-sp-md border border-outline-variant group-hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-primary text-[32px]">query_stats</span>
                  </div>
                  <span className="text-label-caps text-primary-fixed font-semibold mb-sp-xs block">STEP 02</span>
                  <h3 className="font-headline-lg text-headline-lg mb-sp-sm text-on-surface">Precision Matching</h3>
                  <p className="text-body-md text-on-surface-variant">AI analyzes thousands of data points including specialist outcomes, hospital mortality rates, and wait-time statistics.</p>
                </div>
              </div>
              {/* Step 3 */}
              <div className="relative z-10 group">
                <div className="glass-card p-sp-lg rounded-xl transition-all hover:border-primary/50 hover:-translate-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest flex items-center justify-center mb-sp-md border border-outline-variant group-hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-primary text-[32px]">navigation</span>
                  </div>
                  <span className="text-label-caps text-primary-fixed font-semibold mb-sp-xs block">STEP 03</span>
                  <h3 className="font-headline-lg text-headline-lg mb-sp-sm text-on-surface">Guided Care</h3>
                  <p className="text-body-md text-on-surface-variant">Get ranked hospital recommendations with clear clinical reasoning. We handle the routing so you can focus on recovery.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section (Bento Grid) */}
        <section className="py-sp-xl px-margin" id="features">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-sp-xl gap-sp-md">
              <div className="space-y-sp-sm max-w-xl">
                <span className="font-label-caps text-label-caps text-primary border-b border-primary/30 pb-1">CLINICAL SUITE</span>
                <h2 className="font-headline-xl text-headline-xl text-on-surface">Data-Driven Decisions for Better Outcomes</h2>
              </div>
              <button 
                onClick={() => navigate("/signup")}
                className="text-primary font-body-md flex items-center gap-sp-xs hover:gap-sp-sm transition-all cursor-pointer"
              >
                Explore all features <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
              {/* Feature 1: Confidence Scores */}
              <div className="md:col-span-8 glass-card rounded-xl p-sp-lg relative overflow-hidden group min-h-[340px]">
                <div className="relative z-10 max-w-md">
                  <h3 className="font-headline-lg text-headline-lg mb-sp-sm text-on-surface">Confidence Scores</h3>
                  <p className="text-body-md text-on-surface-variant mb-sp-md">Every recommendation is backed by a proprietary Confidence Score, reflecting specialist expertise matches and historical successful outcomes.</p>
                  <div className="flex gap-sp-md">
                    <div className="text-center">
                      <p className="text-primary font-bold text-headline-xl">94%</p>
                      <p className="text-label-caps text-outline">MATCH ACCURACY</p>
                    </div>
                    <div className="text-center border-l border-outline-variant pl-sp-md">
                      <p className="text-on-surface font-bold text-headline-xl">2.4x</p>
                      <p className="text-label-caps text-outline">FASTER RECOVERY</p>
                    </div>
                  </div>
                </div>
                {/* Abstract Data Visualization */}
                <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-20 group-hover:opacity-40 transition-opacity">
                  <div className="h-full w-full flex items-end justify-center gap-sp-xs px-sp-md">
                    <div className="w-full bg-primary h-[30%] rounded-t-sm"></div>
                    <div className="w-full bg-primary h-[45%] rounded-t-sm"></div>
                    <div className="w-full bg-primary h-[60%] rounded-t-sm"></div>
                    <div className="w-full bg-primary h-[85%] rounded-t-sm"></div>
                    <div className="w-full bg-primary h-[70%] rounded-t-sm"></div>
                    <div className="w-full bg-primary h-[95%] rounded-t-sm"></div>
                  </div>
                </div>
              </div>
              {/* Feature 2: Out-of-Pocket */}
              <div className="md:col-span-4 glass-card rounded-xl p-sp-lg flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center mb-sp-md border border-outline-variant">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                  </div>
                  <h3 className="font-headline-lg text-body-md font-bold mb-sp-xs text-on-surface">Estimated Costs</h3>
                  <p className="text-body-sm text-on-surface-variant">Real-time out-of-pocket estimates based on your insurance plan and hospital pricing data.</p>
                </div>
                <div className="mt-sp-md pt-sp-md border-t border-outline-variant">
                  <div className="flex justify-between items-center bg-surface-container px-sp-sm py-sp-xs rounded-lg">
                    <span className="text-body-sm text-outline">Copay Estimate</span>
                    <span className="text-primary font-semibold">$35.00</span>
                  </div>
                </div>
              </div>
              {/* Feature 3: Specialist Availability */}
              <div className="md:col-span-4 glass-card rounded-xl p-sp-lg">
                <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center mb-sp-md border border-outline-variant">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
                </div>
                <h3 className="font-headline-lg text-body-md font-bold mb-sp-xs text-on-surface">Live Availability</h3>
                <p className="text-body-sm text-on-surface-variant">Direct integration with provider schedules allows you to book the earliest possible opening for critical consultations.</p>
              </div>
              {/* Feature 4: Secure Platform */}
              <div className="md:col-span-8 glass-card rounded-xl p-sp-lg flex items-center justify-between bg-primary-container/5 border-primary/20">
                <div className="max-w-lg">
                  <h3 className="font-headline-lg text-headline-lg mb-sp-sm text-on-surface">HIPAA Compliant & Secure</h3>
                  <p className="text-body-md text-on-surface-variant">Your medical data is encrypted with military-grade AES-256 and stored in HITRUST-certified environments. We never sell your personal health information.</p>
                </div>
                <div className="hidden sm:block">
                  <span className="material-symbols-outlined text-[64px] text-primary/30">verified_user</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-sp-xl px-margin border-t border-outline-variant bg-surface-container-lowest overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-sp-xl">
            <div className="flex items-center gap-sp-md">
              <div className="flex items-center gap-sp-xs">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
                <span className="font-label-caps text-label-caps uppercase text-on-surface">HIPAA COMPLIANT</span>
              </div>
              <div className="w-px h-6 bg-outline-variant"></div>
              <div className="flex items-center gap-sp-xs">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                <span className="font-label-caps text-label-caps uppercase text-on-surface">SOC2 TYPE II</span>
              </div>
              <div className="w-px h-6 bg-outline-variant"></div>
              <div className="flex items-center gap-sp-xs">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>database</span>
                <span className="font-label-caps text-label-caps uppercase text-on-surface">ENCRYPTED DATA</span>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-body-sm text-outline font-body-sm">Adhering to the highest standards of medical data security.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-sp-xl px-margin relative">
          <div className="max-w-4xl mx-auto glass-card rounded-3xl p-sp-xl text-center relative overflow-hidden">
            <div className="absolute inset-0 ai-glow -z-10"></div>
            <h2 className="font-headline-xl text-headline-xl mb-sp-md text-on-surface">Ready to Find Your Path to Care?</h2>
            <p className="text-body-md text-on-surface-variant mb-sp-lg max-w-xl mx-auto">Join thousands of patients who have optimized their healthcare journey using MedPath's clinical AI.</p>
            <div className="flex flex-col sm:flex-row gap-sp-sm justify-center">
              <button 
                onClick={() => navigate(user ? "/home" : "/signup")}
                className="bg-primary text-on-primary px-sp-xl py-sp-sm rounded-lg font-headline-lg text-[18px] transition-all hover:brightness-110 active:scale-95 cursor-pointer"
              >
                {user ? "Go to Dashboard" : "Start Free Consultation"}
              </button>
              <a 
                href="mailto:support@medpath.ai"
                className="bg-surface-container text-on-surface px-sp-xl py-sp-sm rounded-lg font-headline-lg text-[18px] transition-all hover:bg-surface-variant active:scale-95 border border-outline-variant inline-flex items-center justify-center"
              >
                Speak with Support
              </a>
            </div>
            <p className="mt-sp-md text-body-sm text-outline">No credit card required for initial triage.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-sp-xl bg-surface-container-lowest border-t border-outline-variant">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin max-w-7xl mx-auto gap-sp-md">
          <div className="space-y-sp-sm">
            <div className="flex items-center gap-sp-sm">
              <img alt="MedPath Logo Footer" className="w-8 h-8 object-contain" src={logoImage} />
              <span className="font-headline-lg text-[24px] font-bold text-primary">MedPath</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant opacity-80 max-w-xs">
              © {new Date().getFullYear()} MedPath AI. Precision navigation for modern healthcare.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-sp-md">
            <a className="text-on-surface-variant hover:text-primary transition-colors text-body-sm font-body-sm" href="#">Privacy Policy</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors text-body-sm font-body-sm" href="#">Terms of Service</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors text-body-sm font-body-sm" href="#">Contact Support</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors text-body-sm font-body-sm" href="#">API Documentation</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors text-body-sm font-body-sm" href="#">Medical Disclaimer</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default SplashPage;

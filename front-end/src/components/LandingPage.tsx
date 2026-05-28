import React, { useState } from 'react';
import { ArrowRight, Check, Sparkles, BookOpen, ShieldCheck, Mail, Globe, Settings, HelpCircle } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export default function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  const [demoMsg, setDemoMsg] = useState('');
  const [demoChats, setDemoChats] = useState([
    { sender: 'assistant', text: "How can I help you refine your draft today? I can suggest paces, write scripts or organize archives." }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleDemoSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoMsg.trim()) return;

    const userText = demoMsg;
    setDemoChats(prev => [...prev, { sender: 'user', text: userText }]);
    setDemoMsg('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let replyText = "I've analyzed your project notes. I recommend standardizing your metadata tags so that our semantic search can relate it with your Historical index folders.";
      if (userText.toLowerCase().includes('hello') || userText.toLowerCase().includes('hi')) {
        replyText = "Hello! I can analyze the pacing of your manuscript or help write helper scripts. What are we drafting?";
      } else if (userText.toLowerCase().includes('draft') || userText.toLowerCase().includes('manuscript')) {
        replyText = "Fascinating outline. Let's build a structured action plan for chapter transitions to ensure high professional standards.";
      }
      setDemoChats(prev => [...prev, { sender: 'assistant', text: replyText }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans select-none selection:bg-primary/20 overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border-hairline px-6 py-4 flex justify-between items-center max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onGetStarted}>
          <h1 className="font-serif text-2xl font-semibold text-primary tracking-tight">Nexus Flow</h1>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-ink-muted">
          <a href="#features" className="hover:text-ink transition-colors">Features</a>
          <a href="#process" className="hover:text-ink transition-colors">Process</a>
          <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onSignIn}
            className="text-sm font-medium text-ink hover:text-primary transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={onGetStarted}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 md:py-24 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-7 space-y-6">
          <h2 className="font-serif text-5xl md:text-6xl text-ink leading-tight tracking-tight">
            Where deep focus <br />
            meets <span className="italic font-medium text-primary">intelligent</span> flow.
          </h2>
          <p className="text-ink-muted text-base max-w-xl leading-relaxed">
            A productivity platform crafted for the literary mind. Organize tasks, refine ideas, and collaborate in an environment designed for intellectual clarity and calm concentration.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={onGetStarted}
              className="px-6 py-3 bg-[#a25135] hover:bg-primary-hover text-white font-medium rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              Get Started Free <ArrowRight size={16} />
            </button>
            <a
              href="#demo"
              className="px-6 py-3 border border-border-hairline hover:bg-surface-card transition-colors font-medium rounded-lg text-ink-muted hover:text-ink inline-flex items-center justify-center cursor-pointer"
            >
              View Demo
            </a>
          </div>
        </div>

        {/* Hero Figure (Draft Board Visual) */}
        <div className="md:col-span-5 flex justify-center">
          <div className="relative w-full max-w-sm aspect-square bg-[#efe9de] border-2 border-[#141413] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-center pb-4 border-b border-border-hairline">
              <span className="font-serif text-lg italic text-[#8f482f]">Manuscript V2</span>
              <span className="w-3 h-3 bg-accent-amber rounded-full"></span>
            </div>

            <div className="space-y-4 py-4 flex-1 flex flex-col justify-center">
              <div className="h-4 bg-canvas rounded-sm w-3/4"></div>
              <div className="h-4 bg-canvas rounded-sm w-11/12"></div>
              <div className="h-4 bg-canvas rounded-sm w-5/6"></div>
              <div className="h-4 bg-canvas rounded-sm w-1/2"></div>
            </div>

            <div className="pt-4 border-t border-border-hairline flex justify-between text-xs text-ink-muted">
              <span>Words: 4,210</span>
              <span>Drafting</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Precision */}
      <section id="features" className="bg-[#f0ece3] py-20 px-6 border-y border-border-hairline">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          {/* Visual card */}
          <div className="md:col-span-5 order-2 md:order-1 space-y-3 bg-canvas border border-border-hairline rounded-xl p-6 shadow-sm">
            <div className="h-6 bg-surface-card rounded-md w-1/3"></div>
            <div className="space-y-2 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded border border-border-hairline flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-primary rounded-xs"></div>
                </div>
                <div className="h-4 bg-surface-emphasized rounded-sm w-5/6 bg-[#efe9de]"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded border border-border-hairline"></div>
                <div className="h-4 bg-surface-emphasized rounded-sm w-4/6 bg-[#efe9de]"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded border border-border-hairline"></div>
                <div className="h-4 bg-surface-emphasized rounded-sm w-3/4 bg-[#efe9de]"></div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 order-1 md:order-2 space-y-4">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest block">Structure</span>
            <h3 className="font-serif text-3xl md:text-4xl text-ink tracking-tight leading-tight">
              Architect your day with <br />
              editorial precision.
            </h3>
            <p className="text-ink-muted leading-relaxed text-sm md:text-base">
              Traditional lists are noisy. Nexus Flow uses a baseline grid and typographic hierarchy to make your daily agenda feel as structured as a well-composed essay.
            </p>
            <ul className="space-y-2 pt-2 text-sm text-ink-sub">
              <li className="flex items-center gap-2">
                <Check size={16} className="text-primary font-bold" />
                <span>Contextual task grouping by project or flow.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={16} className="text-primary font-bold" />
                <span>Priority levels that use visual weight, not colors.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 2: AI */}
      <section id="demo" className="py-20 px-6 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-6 space-y-4">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest block">Intelligence</span>
          <h3 className="font-serif text-3xl md:text-4xl text-ink tracking-tight leading-tight">
            An AI assistant that reads <br />
            between the lines.
          </h3>
          <p className="text-ink-muted leading-relaxed text-sm md:text-base">
            Our AI doesn't just generate text; it helps you synthesize complex information. It acts as a collaborative researcher, finding connections across your workspace and suggesting the next logical step in your project's evolution.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-primary">
                <Sparkles size={16} />
                <h4 className="font-semibold text-sm">Semantic Search</h4>
              </div>
              <p className="text-xs text-ink-muted">Find concepts, not just keywords, across your entire archive.</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-primary">
                <BookOpen size={16} />
                <h4 className="font-semibold text-sm">Automated Outlining</h4>
              </div>
              <p className="text-xs text-ink-muted flex-wrap">Turn raw notes into structured project briefs in seconds.</p>
            </div>
          </div>
        </div>

        {/* Demo chat frame */}
        <div className="md:col-span-6 bg-[#181715] text-canvas rounded-xl p-5 shadow-lg border border-ink space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-ink">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#cc785c]"></div>
              <span className="text-xs font-mono tracking-wider opacity-80">AI Assistant | Sandbox</span>
            </div>
            <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-sm">ONLINE</span>
          </div>

          {/* Messages */}
          <div className="space-y-3 h-52 overflow-y-auto pr-1 text-xs font-mono leading-relaxed">
            {demoChats.map((chat, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${chat.sender === 'user' ? 'bg-primary/25 border border-primary/20 text-right ml-12' : 'bg-canvas text-ink mr-12'}`}>
                <span className="block text-[9px] uppercase tracking-wider opacity-60 mb-1">{chat.sender === 'user' ? 'ME' : 'AI'}</span>
                <p className="text-left font-sans">{chat.text}</p>
              </div>
            ))}
            {isTyping && (
              <div className="p-2 border border-ink text-left italic opacity-60">AI is drafting...</div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleDemoSend} className="pt-2 border-t border-ink flex items-center gap-2">
            <input
              type="text"
              value={demoMsg}
              onChange={(e) => setDemoMsg(e.target.value)}
              placeholder="Ask the assistant to analyze draft pacing..."
              className="flex-grow bg-[#242320] border border-ink text-xs px-3 py-2 text-canvas rounded-md outline-hidden focus:border-primary placeholder:opacity-40 font-mono"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-xs transition-colors flex items-center justify-center cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      </section>

      {/* Section 3: Testimonial and Philosophy */}
      <section className="bg-surface-card py-20 px-6 border-t border-border-hairline">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest block">Philosophy</span>
            <h3 className="font-serif text-4xl text-ink leading-tight">Designed for the Thinking Professional.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-canvas border border-border-hairline p-6 rounded-xl space-y-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                <Globe size={20} />
              </div>
              <h4 className="font-serif text-xl text-ink font-medium">The Workspace as a Canvas.</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Eliminate the clutter of traditional dashboards. Our adaptive interface expands and contracts based on your current cognitive load.
              </p>
            </div>

            <div className="bg-canvas border border-border-hairline p-6 rounded-xl space-y-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                <BookOpen size={20} />
              </div>
              <h4 className="font-serif text-xl text-ink font-medium">Archival Recall.</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Never lose a thread. Every version of every document is preserved in a temporal flow that is intuitive to navigate.
              </p>
            </div>

            <div className="bg-[#1d8372] text-canvas p-6 rounded-xl space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#faf9f5]/15 text-canvas">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="font-serif text-xl font-medium">Private by Design.</h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  Your thoughts are yours. End-to-end encryption means even we can't read your workspace entries. High defense.
                </p>
              </div>
              <span className="text-[10px] font-mono tracking-widest opacity-60">SECURED STORAGE</span>
            </div>
          </div>

          {/* Testimonial Quote */}
          <div className="max-w-2xl mx-auto pt-6 text-center space-y-4">
            <p className="font-serif italic text-2xl text-ink leading-relaxed">
              "Finally, a tool that respects the way I actually think, rather than forcing me into a rigid grid of tasks."
            </p>
            <div className="space-y-1">
              <span className="block text-sm font-semibold">— ELENA VANCE, EDITORIAL DIRECTOR</span>
              <span className="block text-xs text-ink-muted uppercase tracking-widest">Aura Publishing House</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#cc785c] text-white py-16 px-6 text-center border-t border-[#8f482f]">
        <div className="max-w-xl mx-auto space-y-6">
          <h3 className="font-serif text-4xl font-medium tracking-tight">Start Thinking Clearly</h3>
          <p className="text-white/80 text-sm leading-relaxed">
            Join over 50,000 writers, researchers, and creators who have found their focus in Nexus Flow. Establish your calm space today.
          </p>
          <div className="flex justify-center flex-wrap gap-4 pt-3">
            <button
              onClick={onGetStarted}
              className="px-6 py-3 bg-white text-[#8f482f] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              Create Your Workspace
            </button>
            <button
              onClick={onSignIn}
              className="px-6 py-3 border border-white/30 hover:border-white transition-all text-white font-medium rounded-lg inline-flex items-center justify-center cursor-pointer"
            >
              Compare Plans
            </button>
          </div>
          <span className="text-[10px] font-mono tracking-wider opacity-60 uppercase block pt-4">NO CREDIT CARD REQUIRED • 14-DAY FREE TRIAL</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-hairline py-12 px-6 bg-canvas mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h4 className="font-serif text-xl font-semibold text-primary">Nexus Flow</h4>
            <p className="text-xs text-ink-muted leading-relaxed max-w-xs">
              A platform for high-focus professionals who value clarity, calm, and intellectual authority.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-ink uppercase tracking-wider block">Product</span>
            <ul className="space-y-1 text-xs text-ink-muted">
              <li><a href="#" className="hover:text-primary">Dashboard</a></li>
              <li><a href="#" className="hover:text-primary">AI Assistant</a></li>
              <li><a href="#" className="hover:text-primary">Integrations</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-ink uppercase tracking-wider block">Company</span>
            <ul className="space-y-1 text-xs text-ink-muted">
              <li><a href="#" className="hover:text-primary">Our Story</a></li>
              <li><a href="#" className="hover:text-primary text-xs font-medium">Manifesto</a></li>
              <li><a href="#" className="hover:text-primary">Journal</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-ink uppercase tracking-wider block">Legal</span>
            <ul className="space-y-1 text-xs text-ink-muted">
              <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary">Security</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-border-hairline flex flex-col sm:flex-row justify-between text-[11px] text-ink-muted">
          <span>&copy; {new Date().getFullYear()} Nexus Flow Inc. All rights reserved.</span>
          <div className="flex gap-4 mt-2 sm:mt-0 font-serif italic">
            <span>The Workspace for Focused Minds</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

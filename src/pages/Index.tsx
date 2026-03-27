import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CheckCircle,
  ChevronDown,
  Clock,
  ExternalLink,
  Eye,
  GraduationCap,
  Heart,
  Lock,
  Menu,
  Monitor,
  Settings,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import humanfirstLogo from '@/assets/humanfirst-logo.png';
import ThemeToggle from '@/components/ThemeToggle';

const navLinks = [
  { label: 'Trust & Ethics', href: '#trust' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
];

const principles = [
  {
    icon: Eye,
    title: 'No Content Reading',
    description:
      'We never access, analyze, or interpret what students type or view. Your thoughts and work remain entirely your own.',
    color: 'blue',
  },
  {
    icon: Lock,
    title: 'No Keystroke Logging',
    description:
      'Every keystroke remains completely private. We do not track typing speed, patterns, or rhythm in any form.',
    color: 'teal',
  },
  {
    icon: Monitor,
    title: 'No Screen Recording',
    description:
      'Your screen belongs to you. We never capture, record, or transmit images of your display during any session.',
    color: 'blue',
  },
  {
    icon: CheckCircle,
    title: 'No Cheating Accusations',
    description:
      'We focus on enabling focused work environments, not making assumptions or judgments about student intent.',
    color: 'teal',
  },
];

const adminFeatures = [
  { icon: Settings, text: 'Create and manage exam policies with fine-grained controls' },
  { icon: Clock, text: 'Set precise time windows for exam availability' },
  { icon: Eye, text: 'View real-time student status without invading privacy' },
  { icon: Bell, text: 'Receive transparent alerts when students need assistance' },
];

const studentFeatures = [
  { icon: Eye, text: 'See exactly what restrictions are active and why' },
  { icon: Clock, text: 'Clear countdown showing when limitations will end' },
  { icon: Bell, text: 'Request help or flag technical issues instantly' },
  { icon: GraduationCap, text: 'No hidden monitoring, full transparency always' },
];

const colorMap = {
  blue: {
    iconBg: 'bg-primary/8',
    iconBorder: 'border-primary/20',
    iconColor: 'text-primary',
    hoverBorder: 'hover:border-primary/30',
    hoverShadow: 'hover:shadow-neon',
    titleHover: 'group-hover:text-primary',
    accentLine: 'bg-primary/25 group-hover:bg-primary/50 group-hover:w-20',
  },
  teal: {
    iconBg: 'bg-accent/8',
    iconBorder: 'border-accent/20',
    iconColor: 'text-accent',
    hoverBorder: 'hover:border-accent/30',
    hoverShadow: 'hover:shadow-glow-teal',
    titleHover: 'group-hover:text-accent',
    accentLine: 'bg-accent/25 group-hover:bg-accent/50 group-hover:w-20',
  },
} as const;

function scrollToSection(selector: string) {
  const el = document.querySelector(selector);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

const Index = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && user && role) {
      const isAdminRole = role === 'super_admin' || role === 'admin' || role === 'viewer';
      navigate(isAdminRole ? '/admin' : '/student');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/85 backdrop-blur-xl border-b border-border shadow-[0_1px_16px_rgba(13,27,42,0.06)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 group focus-ring rounded-xl"
            aria-label="HumanFirst Home"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-border/60 flex items-center justify-center shadow-sm group-hover:shadow-neon group-hover:border-primary/30 transition-all duration-300">
              <img src={humanfirstLogo} alt="HumanFirst logo" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-heading gradient-text text-lg font-bold">HumanFirst</span>
          </button>

          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Primary">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollToSection(link.href)}
                className="nav-link px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 focus-ring"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => navigate('/auth')}
              className="hidden sm:inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-200 focus-ring shadow-neon text-sm font-semibold"
              aria-label="Sign in to HumanFirst"
            >
              Sign In
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 focus-ring"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <nav
            className="absolute top-16 left-0 right-0 bg-card border-b border-border shadow-elevated p-5 flex flex-col gap-1 animate-slide-up"
            role="navigation"
            aria-label="Mobile navigation"
          >
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  setMobileOpen(false);
                  scrollToSection(link.href);
                }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 text-left focus-ring"
              >
                {link.label === 'Trust & Ethics' && <Heart className="w-4 h-4 text-primary" />}
                {link.label}
              </button>
            ))}
            <div className="pt-3 mt-2 border-t border-border">
              <button
                onClick={() => navigate('/auth')}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 focus-ring font-semibold"
              >
                Sign In
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </nav>
        </div>
      )}

      <main id="main-content" role="main">
        <section
          id="hero"
          className="relative hero-gradient min-h-screen flex flex-col items-center justify-center pt-24 pb-20 px-5 sm:px-8 overflow-hidden"
        >
          <div
            className="section-blob"
            style={{
              width: '600px',
              height: '600px',
              top: '-120px',
              right: '-150px',
              background: 'radial-gradient(circle, rgba(30,78,216,0.12) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />
          <div
            className="section-blob"
            style={{
              width: '500px',
              height: '500px',
              bottom: '-80px',
              left: '-100px',
              background: 'radial-gradient(circle, rgba(15,118,110,0.1) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/8 border border-primary/20 rounded-full mb-8 animate-fade-in shadow-sm">
              <Shield className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-primary text-[0.8125rem] font-semibold tracking-[0.02em]">
                Privacy-first education
              </span>
            </div>

            <h1
              className="font-heading text-foreground mb-6 animate-slide-up delay-100"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.025em' }}
            >
              Ethical Control,
              <br className="hidden sm:block" />
              <span className="gradient-text">Not Surveillance</span>
            </h1>

            <p
              className="text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up delay-200"
              style={{ fontSize: 'clamp(1rem, 2vw, 1.1875rem)', lineHeight: 1.7 }}
            >
              HumanFirst helps educators create focused exam environments without invading student privacy. No keystroke
              logging. No screen recording. No false accusations, just respect and trust.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-slide-up delay-300">
              <button
                onClick={() => navigate('/auth')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-14 px-8 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-200 shadow-neon focus-ring font-bold"
                style={{ minWidth: '180px' }}
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollToSection('#trust')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-14 px-8 rounded-2xl border-2 border-border text-foreground hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97] transition-all duration-200 focus-ring font-semibold"
                style={{ minWidth: '160px' }}
              >
                Learn More
              </button>
            </div>

            <p className="mt-10 text-muted-foreground animate-fade-in delay-500 text-[0.8125rem]">
              Trusted by educators who believe technology should empower, not surveil.
            </p>
          </div>

          <button
            onClick={() => scrollToSection('#trust')}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-200 focus-ring rounded-lg p-2 animate-float"
            aria-label="Scroll to next section"
          >
            <span className="text-[0.6875rem] tracking-[0.08em] uppercase font-semibold">Explore</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </section>

        <section id="trust" className="relative principles-gradient py-24 sm:py-32 px-5 sm:px-8 overflow-hidden">
          <div
            className="section-blob"
            style={{
              width: '400px',
              height: '400px',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'radial-gradient(circle, rgba(30,78,216,0.05) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-6xl mx-auto">
            <div className="text-center mb-16 sm:mb-20">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-accent/8 border border-accent/20 rounded-full mb-5">
                <span className="text-accent text-xs font-bold tracking-[0.08em] uppercase">Our Commitments</span>
              </div>
              <h2
                className="font-heading text-foreground mb-5 animate-slide-up"
                style={{ fontSize: 'clamp(1.875rem, 4vw, 2.75rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em' }}
              >
                Built on Principles,
                <br />
                <span className="gradient-text">Not Compromises</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-[1.0625rem] leading-[1.7]">
                Every decision we make starts with a simple question: <em>does this respect the student?</em> Our four
                core principles are non-negotiable.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
              {principles.map((p, i) => {
                const c = colorMap[p.color as keyof typeof colorMap];
                return (
                  <div
                    key={p.title}
                    className={`glass-card p-7 sm:p-8 group transition-all duration-300 ${c.hoverBorder} ${c.hoverShadow} hover:-translate-y-1 animate-scale-in`}
                    style={{ animationDelay: `${i * 100}ms` }}
                    role="article"
                    aria-label={p.title}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl ${c.iconBg} border ${c.iconBorder} flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-105`}
                    >
                      <p.icon className={`w-6 h-6 ${c.iconColor}`} />
                    </div>

                    <h3
                      className={`font-heading text-foreground mb-3 transition-colors duration-200 ${c.titleHover}`}
                      style={{ fontSize: '1.1875rem', fontWeight: 700, lineHeight: 1.3 }}
                    >
                      {p.title}
                    </h3>
                    <p className="text-muted-foreground text-[0.9375rem] leading-[1.7]">{p.description}</p>

                    <div className={`mt-6 h-0.5 w-12 rounded-full transition-all duration-300 ${c.accentLine}`} />
                  </div>
                );
              })}
            </div>

            <div className="mt-14 text-center">
              <p className="text-muted-foreground text-[0.9375rem] leading-[1.7]">
                These are architectural decisions, not marketing promises.{' '}
                <button
                  className="text-primary hover:underline underline-offset-3 focus-ring rounded transition-colors duration-200 font-semibold"
                  onClick={() => navigate('/trust')}
                >
                  Read our ethics framework →
                </button>
              </p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="relative bg-background py-24 sm:py-32 px-5 sm:px-8 overflow-hidden">
          <div
            className="section-blob"
            style={{
              width: '350px',
              height: '350px',
              top: '20%',
              right: '-80px',
              background: 'radial-gradient(circle, rgba(30,78,216,0.07) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />
          <div
            className="section-blob"
            style={{
              width: '300px',
              height: '300px',
              bottom: '10%',
              left: '-60px',
              background: 'radial-gradient(circle, rgba(15,118,110,0.07) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-6xl mx-auto">
            <div className="text-center mb-16 sm:mb-20">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/8 border border-primary/20 rounded-full mb-5">
                <span className="text-primary text-xs font-bold tracking-[0.08em] uppercase">The Experience</span>
              </div>
              <h2
                className="font-heading text-foreground mb-5"
                style={{ fontSize: 'clamp(1.875rem, 4vw, 2.75rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em' }}
              >
                Simple for Everyone, <span className="gradient-text">Transparent by Design</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-[1.0625rem] leading-[1.7]">
                Two cohesive experiences, one for those who set the rules and one for those who follow them, both built
                on honesty.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-secondary/80 to-background p-8 sm:p-10 group hover:border-primary/30 hover:shadow-neon transition-all duration-300 animate-slide-in-left">
                <div
                  className="absolute top-0 right-0 w-48 h-48 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(30,78,216,0.12) 0%, transparent 70%)',
                    transform: 'translate(30%, -30%)',
                  }}
                />

                <div className="relative w-16 h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-7 group-hover:bg-primary/15 transition-colors duration-300">
                  <Users className="w-7 h-7 text-primary" />
                </div>

                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary mb-4 text-xs font-bold tracking-[0.06em] uppercase">
                  For Administrators
                </span>

                <h3 className="font-heading text-foreground mb-3 text-2xl font-extrabold leading-tight">Set the Stage, Not the Script</h3>
                <p className="text-muted-foreground mb-8 text-[0.9375rem] leading-[1.7]">
                  Create focused exam environments with precision controls. Define what is accessible, when, and for how
                  long, without peering over anyone's shoulder.
                </p>

                <ul className="space-y-3.5" role="list">
                  {adminFeatures.map((f) => (
                    <li key={f.text} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <f.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-muted-foreground text-[0.9rem] leading-[1.6]">{f.text}</span>
                    </li>
                  ))}
                </ul>

                <button className="mt-8 inline-flex items-center gap-2 text-primary hover:gap-3 transition-all duration-200 focus-ring rounded-lg py-1 text-[0.9375rem] font-bold">
                  Explore admin features
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-accent/15 bg-gradient-to-br from-[#F0FDFA] to-background dark:from-[#042F2E]/30 dark:to-background p-8 sm:p-10 group hover:border-accent/30 hover:shadow-glow-teal transition-all duration-300 animate-slide-in-right">
                <div
                  className="absolute top-0 right-0 w-48 h-48 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(15,118,110,0.12) 0%, transparent 70%)',
                    transform: 'translate(30%, -30%)',
                  }}
                />

                <div className="relative w-16 h-16 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center mb-7 group-hover:bg-accent/15 transition-colors duration-300">
                  <GraduationCap className="w-7 h-7 text-accent" />
                </div>

                <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent mb-4 text-xs font-bold tracking-[0.06em] uppercase">
                  For Students
                </span>

                <h3 className="font-heading text-foreground mb-3 text-2xl font-extrabold leading-tight">Focus Without Fear</h3>
                <p className="text-muted-foreground mb-8 text-[0.9375rem] leading-[1.7]">
                  A completely transparent experience. Know what is active, why it is active, and exactly when it ends.
                  No hidden surprises, no anxiety about being watched.
                </p>

                <ul className="space-y-3.5" role="list">
                  {studentFeatures.map((f) => (
                    <li key={f.text} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/8 border border-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <f.icon className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <span className="text-muted-foreground text-[0.9rem] leading-[1.6]">{f.text}</span>
                    </li>
                  ))}
                </ul>

                <button className="mt-8 inline-flex items-center gap-2 text-accent hover:gap-3 transition-all duration-200 focus-ring rounded-lg py-1 text-[0.9375rem] font-bold">
                  See the student view
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="relative py-24 sm:py-32 px-5 sm:px-8 overflow-hidden" aria-label="Get started with HumanFirst">
          <div className="absolute inset-0 cta-gradient" aria-hidden="true" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)',
            }}
            aria-hidden="true"
          />

          <div className="absolute top-8 right-[15%] w-32 h-32 rounded-full bg-white/5 animate-float" aria-hidden="true" />
          <div className="absolute bottom-8 left-[10%] w-20 h-20 rounded-full bg-white/5 animate-float delay-300" aria-hidden="true" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 border border-white/25 mb-8 animate-scale-in">
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            <h2
              className="font-heading text-white mb-5 animate-slide-up"
              style={{ fontSize: 'clamp(2rem, 4.5vw, 3.25rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em' }}
            >
              Ready to Put Students First?
            </h2>

            <p className="text-white/75 max-w-lg mx-auto mb-10 animate-slide-up delay-100 text-[1.0625rem] leading-[1.7]">
              Join educators who believe ethical technology is the only way forward. Start free with privacy built in from
              day one.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-200">
              <button
                onClick={() => navigate('/auth')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-14 px-9 rounded-2xl bg-white text-[#1E4ED8] hover:bg-white/90 active:scale-[0.97] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-3 shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-base font-bold"
                style={{ minWidth: '200px' }}
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/trust')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-14 px-8 rounded-2xl border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 active:scale-[0.97] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-3 text-base font-semibold"
                style={{ minWidth: '160px' }}
              >
                Talk to Us
              </button>
            </div>

            <p className="mt-8 text-white/55 animate-fade-in delay-400 text-[0.8125rem]">
              Free for up to 30 students · No tracking · No invasive monitoring
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-background border-t border-border" role="contentinfo">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 items-start">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-border/60 flex items-center justify-center shadow-sm">
                  <img src={humanfirstLogo} alt="HumanFirst logo" className="w-7 h-7 object-contain" />
                </div>
                <span className="font-heading gradient-text text-[1.0625rem] font-bold">HumanFirst</span>
              </div>
              <p className="text-muted-foreground max-w-xs text-sm leading-[1.7]">
                Privacy-first educational control, built with ethics and human dignity at the center of every decision.
              </p>
            </div>

            <div>
              <span className="block text-foreground mb-4 text-[0.8125rem] font-bold tracking-[0.07em] uppercase">Navigation</span>
              <nav aria-label="Footer navigation">
                <ul className="space-y-2.5" role="list">
                  <li>
                    <button
                      onClick={() => navigate('/trust')}
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-200 focus-ring rounded group text-[0.9rem]"
                    >
                      <Heart className="w-3.5 h-3.5 text-accent group-hover:text-primary transition-colors duration-200" />
                      Trust & Ethics
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection('#how-it-works')}
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-200 focus-ring rounded text-[0.9rem]"
                    >
                      How It Works
                    </button>
                  </li>
                  <li>
                    <span className="text-muted-foreground text-[0.9rem]">Privacy Policy</span>
                  </li>
                  <li>
                    <span className="text-muted-foreground text-[0.9rem]">Accessibility</span>
                  </li>
                </ul>
              </nav>
            </div>

            <div>
              <span className="block text-foreground mb-4 text-[0.8125rem] font-bold tracking-[0.07em] uppercase">Our Commitment</span>
              <p className="text-muted-foreground mb-4 text-sm leading-[1.7]">
                We believe technology in education must empower learners, not monitor them. Privacy is not a feature, it
                is a right.
              </p>
              <button
                onClick={() => navigate('/trust')}
                className="inline-flex items-center gap-1.5 text-primary hover:underline underline-offset-3 transition-colors duration-200 focus-ring rounded text-sm font-semibold"
              >
                Read our ethics framework
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-muted-foreground text-center sm:text-left text-[0.8125rem]">
              © {new Date().getFullYear()} HumanFirst Control. All rights reserved.
            </p>
            <p className="text-muted-foreground flex items-center gap-1.5 text-[0.8125rem]">
              Built with <Heart className="w-3 h-3 text-accent fill-accent" aria-label="love" /> for ethical education
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

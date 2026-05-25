'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/* ─── helpers ─── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] },
});

/* ─── data ─── */
const NAV_LINKS = ['Product', 'Solutions', 'Security', 'Pricing', 'Resources'];

const TRUST_BAR = [
  { icon: 'shield_with_house', label: 'Built for South African legal workflows' },
  { icon: 'policy',            label: 'Designed for POPIA-conscious operations' },
  { icon: 'lock_open',         label: 'Matter-level access control' },
  { icon: 'history',           label: 'Audit-ready activity history' },
];

const FEATURES = [
  { icon: 'folder_managed',        title: 'Matter Management',  desc: 'Centralised hub for case files, pleadings, and internal notes.' },
  { icon: 'contacts',              title: 'Client Records',     desc: 'KYC, onboarding status, and secure contact histories.' },
  { icon: 'encrypted',             title: 'Document Vault',     desc: 'Bank-grade encryption for sensitive legal documents.' },
  { icon: 'notifications_active',  title: 'Deadlines',          desc: 'Automated court calendars and prescription alerts.' },
  { icon: 'gavel',                 title: 'POPIA Consent',      desc: 'Built-in processing consent management and tracking.' },
  { icon: 'rule',                  title: 'Audit Logs',         desc: 'Detailed trail of who accessed what and when.' },
  { icon: 'door_front',            title: 'Client Portal',      desc: 'Branded space for clients to upload documents safely.' },
  { icon: 'payments',              title: 'Billing Readiness',  desc: 'Capture billable time directly within matter workflows.' },
];

const WORKFLOW_STEPS = ['Intake', 'Conflicts', 'POPIA', 'Opening', 'Action', 'Filing', 'Billing', 'Audit'];

const SOLUTIONS = [
  { title: 'Solo Attorneys',     desc: 'Stay organised and professional without the overhead of a large IT team.' },
  { title: 'Boutique Firms',     desc: 'Collaborate seamlessly on high-value matters with unified client files.' },
  { title: 'Litigation Teams',   desc: 'Manage complex discovery, timelines, and court filings with ease.' },
  { title: 'Conveyancing',       desc: 'Track property transfers and FICA requirements in a structured flow.' },
  { title: 'Legal Aid & NGOs',   desc: 'Handle high volumes of public-interest cases with transparent reporting.' },
  { title: 'In-House Teams',     desc: 'Control external counsel costs and internal legal-compliance risks.' },
];

const SECURITY_ITEMS = [
  { icon: 'verified',               title: 'Firm-Level Isolation',     desc: 'Data is strictly partitioned. No cross-firm data leaks, ever.' },
  { icon: 'lock_person',            title: 'Matter-Level Permissions',  desc: 'Control precisely who within your firm can see sensitive case files.' },
  { icon: 'assignment_turned_in',   title: 'POPIA Compliance',          desc: 'Designed according to South African data protection regulations.' },
];

const PRICING = [
  {
    tier: 'Starter', highlighted: false,
    features: ['10 Active Matters', 'Basic POPIA Tools', 'Secure Vault'],
    desc: 'Perfect for solo practitioners starting their digital journey.',
  },
  {
    tier: 'Professional', highlighted: true,
    features: ['Unlimited Matters', 'Matter Permissions', 'Custom Audit Trails'],
    desc: 'Designed for growing firms needing deeper control.',
    badge: 'Popular',
  },
  {
    tier: 'Firm', highlighted: false,
    features: ['Multi-Branch Support', 'Dedicated Portal', 'Priority Support'],
    desc: 'Enterprise-grade features for established practices.',
  },
];

const FOOTER_COLS = [
  { heading: 'Product',   links: ['Features', 'Security', 'Pricing'] },
  { heading: 'Solutions', links: ['Solo Practice', 'Boutique Firms', 'Litigation'] },
  { heading: 'Company',   links: ['About Us', 'Contact', 'Partners'] },
  { heading: 'Legal',     links: ['Privacy Policy', 'Terms of Use', 'Security Standards'] },
];

/* ─── particles (static positions to avoid SSR mismatch) ─── */
const PARTICLES = [
  { top: '80%', left: '10%', w: 4,  h: 4,  dur: '8s',  delay: '0s'  },
  { top: '70%', left: '30%', w: 6,  h: 6,  dur: '12s', delay: '2s'  },
  { top: '90%', left: '50%', w: 4,  h: 4,  dur: '10s', delay: '4s'  },
  { top: '85%', left: '70%', w: 8,  h: 8,  dur: '15s', delay: '1s'  },
  { top: '75%', left: '90%', w: 4,  h: 4,  dur: '9s',  delay: '5s'  },
  { top: '60%', left: '15%', w: 4,  h: 4,  dur: '11s', delay: '3s'  },
  { top: '95%', left: '80%', w: 6,  h: 6,  dur: '14s', delay: '6s'  },
];

/* ────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const navShrink = useTransform(scrollY, [0, 80], [80, 64]);

  return (
    <div className="bg-surface font-sans text-on-surface scroll-smooth">



      {/* ══════════════════════════════════════════
          NAV
      ══════════════════════════════════════════ */}
      <motion.nav
        className={`fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-border-warm/50 shadow-sm transition-all duration-300`}
        style={{ height: navShrink }}
      >
        <div className="flex justify-between items-center h-full px-12 max-w-[1440px] mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary tracking-tight">Legal</span>
            <span className="text-xl font-bold tracking-tight" style={{ color: '#78582f' }}>Matters</span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(n => (
              <a key={n} href="#" className="text-label-md font-semibold text-on-surface-variant hover:text-secondary transition-colors text-[13px] tracking-widest uppercase">
                {n}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:block text-[13px] font-semibold uppercase tracking-widest text-primary px-6 py-2 hover:bg-surface-container transition-colors rounded">
              Login
            </Link>
            <Link href="/register" className="bg-primary text-white text-[13px] font-semibold uppercase tracking-widest px-6 py-3 rounded-lg hover:opacity-90 transition-opacity airy-shadow">
              Book a Demo
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <header
        ref={heroRef}
        className="relative pt-32 pb-20 md:pt-48 md:pb-40 text-white overflow-hidden"
        style={{ perspective: '1200px', background: '#14213d' }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 z-0 bg-[#000a24]/70 pointer-events-none" />

        {/* Animated mesh + shapes + particles */}
        <div className="absolute inset-0 z-0">
          <div className="mesh-gradient absolute inset-0 opacity-40" />
          <div className="floating-shape shape-1" />
          <div className="floating-shape shape-2" />
          <div className="floating-shape shape-3" />
          {/* Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            {PARTICLES.map((p, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  top: p.top, left: p.left,
                  width: p.w, height: p.h,
                  animation: `particleUp ${p.dur} infinite ease-out ${p.delay}`,
                }}
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-black/20" />
        </div>

        {/* Content grid */}
        <div className="relative z-10 max-w-[1440px] mx-auto px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: headline + CTAs */}
          <motion.div
            className="lg:col-span-6 space-y-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-[48px] leading-[56px] font-semibold tracking-[-0.02em] text-white">
              The operating system for South African legal practice.
            </h1>
            <p className="text-[18px] leading-[28px] text-[#b9c6ea]/90 max-w-xl">
              Manage matters, clients, documents, deadlines, POPIA consent, audit trails, and legal workflows from one secure platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register" className="bronze-gradient text-white text-[13px] font-semibold uppercase tracking-widest px-8 py-4 rounded-lg hover:brightness-110 transition-all airy-shadow-lg">
                Book a Demo
              </Link>
              <Link href="/dashboard" className="border border-[#d9e2ff]/40 text-white text-[13px] font-semibold uppercase tracking-widest px-8 py-4 rounded-lg hover:bg-white/10 transition-all backdrop-blur-sm">
                Explore the Platform
              </Link>
            </div>
          </motion.div>

          {/* Right: dashboard mockup */}
          <motion.div
            className="lg:col-span-6 relative"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="bg-surface-container-low rounded-xl airy-shadow-lg border border-white/10 p-4 md:p-6 text-on-surface">
              {/* Dashboard header */}
              <div className="flex justify-between items-center mb-6 border-b border-border-warm pb-4">
                <div className="flex gap-2 items-center">
                  <span className="material-symbols-outlined text-secondary" style={{ fontSize: 20 }}>dashboard</span>
                  <span className="text-[13px] font-semibold uppercase tracking-widest opacity-60">Firm Dashboard</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <div className="w-3 h-3 rounded-full bg-error" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Active Matters */}
                <div className="bg-white p-4 rounded-lg airy-shadow border border-border-warm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Active Matters</span>
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>folder_open</span>
                  </div>
                  <div className="text-3xl font-bold text-primary">124</div>
                  <div className="text-[10px] text-success font-semibold mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>trending_up</span>
                    +8% from last month
                  </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="bg-white p-4 rounded-lg airy-shadow border border-border-warm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Upcoming</span>
                    <span className="material-symbols-outlined text-error" style={{ fontSize: 16 }}>event</span>
                  </div>
                  <div className="text-3xl font-bold text-primary">03</div>
                  <div className="text-[10px] text-error font-semibold mt-1">Due within 48 hours</div>
                </div>

                {/* Document Vault */}
                <div className="col-span-2 bg-white p-4 rounded-lg airy-shadow border border-border-warm">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[13px] font-bold">Document Vault</span>
                    <span className="text-[10px] px-2 py-1 bg-[#d9e2ff] text-primary rounded font-semibold">Encrypted</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: 'Matter_Ref_2024_01.pdf',    time: '2 mins ago' },
                      { name: 'POPIA_Consent_Smith.docx',  time: '1 hour ago' },
                    ].map(f => (
                      <div key={f.name} className="flex justify-between items-center p-2 hover:bg-surface-container rounded transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>description</span>
                          <span className="text-xs font-medium">{f.name}</span>
                        </div>
                        <span className="text-[10px] text-text-muted">{f.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* POPIA + Audit */}
                <div className="p-3 rounded-lg border border-border-warm bg-surface-container-highest/30">
                  <div className="text-[10px] uppercase font-bold text-text-muted mb-1">POPIA Status</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-xs font-semibold">98% Compliant</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border-warm bg-surface-container-highest/30">
                  <div className="text-[10px] uppercase font-bold text-text-muted mb-1">Audit Activity</div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 12 }}>verified_user</span>
                    <span className="text-xs font-semibold">Live Logging</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative blobs */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bronze-gradient opacity-10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#b9c6ea] opacity-5 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          TRUST BAR
      ══════════════════════════════════════════ */}
      <div className="bg-primary-container py-8 border-y border-white/5">
        <div className="max-w-[1440px] mx-auto px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {TRUST_BAR.map((t, i) => (
              <motion.div key={i} {...fadeUp(i * 0.1)} className="flex flex-col items-center text-center gap-2">
                <span className="material-symbols-outlined text-on-secondary-container">{t.icon}</span>
                <span className="text-[11px] font-medium text-[#b9c6ea] uppercase tracking-widest leading-snug">{t.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          FEATURE GRID
      ══════════════════════════════════════════ */}
      <section className="py-24 px-12 max-w-[1440px] mx-auto">
        <motion.div {...fadeUp()} className="text-center mb-16">
          <h2 className="text-[32px] leading-[40px] font-semibold tracking-[-0.01em] text-primary mb-4">
            One connected workspace for the work that matters.
          </h2>
          <p className="text-[16px] leading-[24px] text-on-surface-variant max-w-2xl mx-auto">
            Modernize your firm with a single source of truth for every case, document, and client interaction.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i} {...fadeUp(i * 0.08)}
              className="bg-white p-8 rounded-xl border border-border-warm airy-shadow hover:-translate-y-1 transition-all cursor-default"
            >
              <span className="material-symbols-outlined text-secondary mb-6 block" style={{ fontSize: 32 }}>{f.icon}</span>
              <h3 className="text-[20px] leading-[28px] font-medium text-primary mb-2">{f.title}</h3>
              <p className="text-[14px] leading-[20px] text-on-surface-variant">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          WORKFLOW TIMELINE
      ══════════════════════════════════════════ */}
      <section className="bg-surface-container-low py-24">
        <div className="max-w-[1440px] mx-auto px-12">
          <motion.h2 {...fadeUp()} className="text-[32px] leading-[40px] font-semibold tracking-[-0.01em] text-primary text-center mb-20">
            Seamless Lifecycle Management
          </motion.h2>
          <div className="relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-6 left-0 w-full h-0.5 bg-border-warm" />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8 relative z-10">
              {WORKFLOW_STEPS.map((step, i) => (
                <motion.div key={i} {...fadeUp(i * 0.07)} className="flex flex-col items-center text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold mb-4 airy-shadow text-sm
                    ${i === 0
                      ? 'bg-primary text-white'
                      : 'bg-white border-2 border-primary text-primary'}`}>
                    {i + 1}
                  </div>
                  <span className="text-[13px] font-semibold uppercase tracking-widest text-primary">{step}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SOLUTIONS
      ══════════════════════════════════════════ */}
      <section className="py-24 px-12 max-w-[1440px] mx-auto">
        <motion.h2 {...fadeUp()} className="text-[32px] leading-[40px] font-semibold tracking-[-0.01em] text-primary text-center mb-16">
          Designed for your practice area.
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SOLUTIONS.map((s, i) => (
            <motion.div key={i} {...fadeUp(i * 0.08)} className="group cursor-pointer">
              <div className="bg-white border border-border-warm rounded-xl p-8 h-full transition-all group-hover:border-secondary group-hover:airy-shadow-lg">
                <h4 className="text-[20px] leading-[28px] font-medium text-primary mb-2">{s.title}</h4>
                <p className="text-[14px] leading-[20px] text-on-surface-variant">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECURITY
      ══════════════════════════════════════════ */}
      <section className="bg-primary text-white py-24">
        <div className="max-w-[1440px] mx-auto px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div {...fadeUp()}>
            <h2 className="text-[32px] leading-[40px] font-semibold tracking-[-0.01em] mb-8">
              Confidentiality is not a feature. It is the foundation.
            </h2>
            <div className="space-y-8">
              {SECURITY_ITEMS.map((item, i) => (
                <div key={i} className="flex gap-4">
                  <span className="material-symbols-outlined text-[#e9bf8d] shrink-0" style={{ fontSize: 24 }}>{item.icon}</span>
                  <div>
                    <h4 className="text-[20px] leading-[28px] font-medium mb-1">{item.title}</h4>
                    <p className="text-[14px] leading-[20px] text-[#d9e2ff]/60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-12 text-[10px] text-[#d9e2ff]/40 italic leading-relaxed">
              Legal Disclaimer: Legal Matters provides software for practice management. Use of the software does not constitute legal advice and does not create an attorney-client relationship between the user and the software provider.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.2)}>
            <div className="aspect-video bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center">
              <div className="text-center space-y-4">
                <span className="material-symbols-outlined fill-icon text-[#e9bf8d]" style={{ fontSize: 64 }}>security</span>
                <div className="text-[13px] font-semibold uppercase tracking-widest opacity-80">Audit Log Active</div>
                <div className="flex justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-success animate-pulse rounded-full" />
                  <div className="w-1.5 h-1.5 bg-success animate-pulse rounded-full" style={{ animationDelay: '75ms' }} />
                  <div className="w-1.5 h-1.5 bg-success animate-pulse rounded-full" style={{ animationDelay: '150ms' }} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════ */}
      <section className="py-24 px-12 max-w-[1440px] mx-auto">
        <motion.h2 {...fadeUp()} className="text-[32px] leading-[40px] font-semibold tracking-[-0.01em] text-primary text-center mb-16">
          Simple pricing for serious practice.
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PRICING.map((plan, i) => (
            <motion.div
              key={i} {...fadeUp(i * 0.12)}
              className={`rounded-xl flex flex-col h-full p-8
                ${plan.highlighted
                  ? 'bg-primary text-white airy-shadow-lg scale-105'
                  : 'bg-white border border-border-warm text-on-surface'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[13px] font-semibold uppercase tracking-widest ${plan.highlighted ? 'text-[#e9bf8d]' : 'text-secondary'}`}>
                  {plan.tier}
                </span>
                {plan.badge && (
                  <span className="bg-secondary text-white text-[10px] px-2 py-1 rounded font-bold uppercase">{plan.badge}</span>
                )}
              </div>
              <div className={`text-4xl font-bold mb-4 ${plan.highlighted ? 'text-white' : 'text-primary'}`}>Early Access</div>
              <p className={`text-[14px] mb-8 ${plan.highlighted ? 'text-[#d9e2ff]/60' : 'text-on-surface-variant'}`}>{plan.desc}</p>
              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className={`material-symbols-outlined ${plan.highlighted ? 'text-[#e9bf8d]' : 'text-success'}`} style={{ fontSize: 16 }}>check_circle</span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.highlighted ? (
                <Link href="/register" className="w-full block text-center bronze-gradient text-white text-[13px] font-semibold uppercase tracking-widest py-3 rounded-lg hover:brightness-110 transition-all">
                  Join Early Access
                </Link>
              ) : (
                <Link href="/register" className="w-full block text-center border-2 border-primary text-primary text-[13px] font-semibold uppercase tracking-widest py-3 rounded-lg hover:bg-primary hover:text-white transition-all">
                  Join Early Access
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════ */}
      <section className="py-24 bg-primary-container relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-12 text-center relative z-10">
          <motion.div {...fadeUp()}>
            <h2 className="text-[48px] leading-[56px] font-semibold tracking-[-0.02em] text-white mb-6">
              See Legal Matters in action.
            </h2>
            <p className="text-[18px] leading-[28px] text-[#d9e2ff]/60 max-w-xl mx-auto mb-10">
              Experience the future of South African legal practice today. Book your personalised demo.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/register" className="bronze-gradient text-white text-[13px] font-semibold uppercase tracking-widest px-12 py-5 rounded-lg hover:brightness-110 transition-all airy-shadow-lg">
                Book a Demo
              </Link>
              <button className="bg-white/10 text-white text-[13px] font-semibold uppercase tracking-widest px-12 py-5 rounded-lg hover:bg-white/20 transition-all">
                Join Waiting List
              </button>
            </div>
          </motion.div>
        </div>
        {/* Accent blur */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-secondary/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="bg-surface-container-low border-t border-border-warm pt-20 pb-12">
        <div className="max-w-[1440px] mx-auto px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-16">
            {/* Brand col */}
            <div className="col-span-2">
              <div className="mb-6 flex items-center gap-2">
                <span className="text-xl font-bold text-primary">Legal</span>
                <span className="text-xl font-bold" style={{ color: '#78582f' }}>Matters</span>
              </div>
              <p className="text-[14px] leading-[20px] text-on-surface-variant max-w-xs">
                Built for the South African legal market. Leading the transition to a modern, digital-first legal practice.
              </p>
            </div>

            {/* Link cols */}
            {FOOTER_COLS.map(col => (
              <div key={col.heading}>
                <h5 className="text-[13px] font-semibold uppercase tracking-widest text-primary mb-6">{col.heading}</h5>
                <ul className="space-y-4">
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-[11px] font-medium text-on-surface-variant hover:text-secondary transition-colors uppercase tracking-wider">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-border-warm pt-8 gap-4">
            <p className="text-[11px] font-medium text-on-surface-variant text-center md:text-left">
              © 2026 Legal Matters. Built for the South African legal market. POPIA Compliant.
            </p>
            <div className="flex gap-6">
              {['public', 'alternate_email', 'info'].map(icon => (
                <a key={icon} href="#" className="text-on-surface-variant hover:text-secondary transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

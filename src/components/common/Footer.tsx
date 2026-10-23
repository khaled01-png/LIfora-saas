import type { NavView } from '../../types';
import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Droplet, 
  ShieldCheck, 
  Award, 
  Heart, 
  PlusCircle, 
  Phone, 
  Mail, 
  MapPin, 
  ArrowRight, 
  Send, 
  Search, 
  Activity 
} from 'lucide-react';
import { motion } from 'motion/react';
import { AmbientVideo } from './AmbientVideo';
import footerPoster from '../../assets/images/footer_donation_bg_1790773072942.jpg';

// Real contact details are set by the site owner (Vercel env). Nothing is invented here.
const CONTACT_PHONE = ((import.meta.env.VITE_CONTACT_PHONE as string | undefined) || '').trim();
const CONTACT_EMAIL = ((import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || '').trim();
const CONTACT_ADDRESS = ((import.meta.env.VITE_CONTACT_ADDRESS as string | undefined) || '').trim();

export const Footer: React.FC = () => {
  const { setActiveView, canOpenView, language, t, currentUser } = useApp();


  const handleNav = (view: any) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Staggered scroll-reveal animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1] as const
      }
    }
  };

  return (
    <footer 
      id="lifora-footer" 
      className="relative text-white overflow-hidden bg-[#110C29] border-t border-purple-500/20 select-none"
    >
      {/* ========================================================================= */}
      {/* 1. CINEMATIC VIDEO BACKGROUND & NAVY-PURPLE OVERLAYS WITH RIGHT-SIDE GLOWS */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        
        {/* MOBILE & LOW-POWER POSTER FALLBACK: High-resolution healthcare clinic scene */}
        <img
          src={footerPoster}
          alt="LIFORA Healthcare & Blood Donation Environment"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 opacity-35 brightness-80 contrast-110"
        />

        {/* FULL-WIDTH BACKGROUND VIDEO: Autoplays, loops continuously, remains muted, responsive on all devices */}
        <AmbientVideo src="/videos/footer-bg.mp4" poster={footerPoster} className="hidden md:block absolute inset-0 w-full h-full object-cover object-center scale-105 opacity-45 brightness-90 contrast-105" />

        {/* DEEP DARK NAVY-PURPLE SEMI-TRANSPARENT OVERLAYS (#110C29 PALETTE) */}
        <div className="absolute inset-0 bg-[#110C29]/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090618] via-[#110C29]/80 to-[#110C29]/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C0822]/90 via-[#110C29]/70 to-[#140D36]/55" />

        {/* ======================================================================= */}
        {/* SUBTLE BLUE & PURPLE RADIAL GRADIENTS / GLOWS ON THE RIGHT SIDE         */}
        {/* ======================================================================= */}
        {/* Primary Deep Royal Purple Radial Glow on Right */}
        <div className="absolute top-1/4 -right-24 w-[650px] h-[650px] bg-[#7C3AED]/25 rounded-full blur-[140px] pointer-events-none" />
        
        {/* Secondary Sapphire Blue Radial Glow on Right */}
        <div className="absolute top-1/2 -right-16 w-[550px] h-[550px] bg-[#2563EB]/20 rounded-full blur-[150px] pointer-events-none" />
        
        {/* Accent Indigo-Violet Radial Aura on Right */}
        <div className="absolute -bottom-10 right-1/4 w-[480px] h-[480px] bg-[#6366F1]/18 rounded-full blur-[130px] pointer-events-none" />
        
        {/* Subtle Top Ambient Indigo/Violet Line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#8B5CF6]/50 to-transparent" />
      </div>

      {/* ========================================================================= */}
      {/* 2. FOOTER CONTENT CONTAINER                                               */}
      {/* ========================================================================= */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12">
        
        {/* Subtle Ambient Live Telemetry Status */}

        {/* TOP CALL-TO-ACTION BANNER WITH SMOOTH SCROLL REVEAL */}
        {/* MAIN 4-COLUMN FOOTER NAVIGATION & DETAILS */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-14 border-b border-purple-500/15"
        >
          {/* Col 1: Brand & Emotional Mission (lg: 4 cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col items-start pr-0 lg:pr-6">
            <div 
              className="flex items-center gap-2.5 mb-3.5 group cursor-pointer" 
              onClick={() => handleNav('home')}
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-200">
                <Droplet className="w-5 h-5 fill-white" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-white">
                {t('app.name')}
              </span>
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-purple-300 mb-3">
              {t('app.tagline')}
            </p>

            <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed mb-6 font-normal">
              {t('footer.mission')}
            </p>

          </motion.div>

          {/* Col 2: Navigation Links (lg: 2 cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              {t('footer.colNavigation')}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {[
                { name: t('nav.home'), view: 'home' },
                { name: t('nav.findBlood'), view: 'find-blood' },
                { name: t('nav.requests'), view: 'requests' },
                { name: t('nav.centers'), view: 'centers' },
                { name: t('nav.about'), view: 'about' }
              ].filter(item => !currentUser ? (item.view === 'home' || item.view === 'about') : canOpenView(item.view as NavView)).map((item) => (
                <li key={item.view}>
                  <motion.button
                    whileHover={{ x: 4 }}
                    onClick={() => handleNav(item.view)}
                    className="text-purple-200/80 hover:text-white transition-colors cursor-pointer text-left inline-flex items-center gap-1.5"
                  >
                    <span className="text-[10px] text-purple-400/60">›</span>
                    <span>{item.name}</span>
                  </motion.button>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Col 3: Useful Transfusion Resources (lg: 3 cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              {t('footer.colResources')}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {[
                { name: t('footer.compatMatrix'), view: 'home', show: true },
                { name: t('footer.eligibilityChecklist'), view: 'about', show: true },
                { name: t('footer.cooldownTracker'), view: 'donor-dashboard', show: currentUser?.role === 'donor' },
                { name: t('footer.clinicalProtocols'), view: 'about', show: true }
              ].filter(item => item.show).map((item) => (
                <li key={item.name}>
                  <motion.button
                    whileHover={{ x: 4 }}
                    onClick={() => handleNav(item.view)}
                    className="text-purple-200/80 hover:text-white transition-colors cursor-pointer text-left inline-flex items-center gap-1.5"
                  >
                    <span className="text-[10px] text-blue-400/60">›</span>
                    <span>{item.name}</span>
                  </motion.button>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Col 4: Contact & Emergency Dispatch (lg: 3 cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
              {t('footer.colEmergency')}
            </h4>

            {(CONTACT_PHONE || CONTACT_EMAIL || CONTACT_ADDRESS) && (
              <div className="p-4 rounded-2xl bg-[#19113B]/70 border border-purple-500/20 space-y-2 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">Contact</span>
                {CONTACT_PHONE && (
                  <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="text-base font-extrabold text-white hover:text-purple-300 transition-colors flex items-center gap-2">
                    <Phone className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{CONTACT_PHONE}</span>
                  </a>
                )}
                {CONTACT_EMAIL && (
                  <div className="text-[11px] text-purple-200/70 flex items-center gap-1.5 pt-1 border-t border-purple-500/15">
                    <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white transition-colors">{CONTACT_EMAIL}</a>
                  </div>
                )}
                {CONTACT_ADDRESS && (
                  <div className="text-[11px] text-purple-300/70 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>{CONTACT_ADDRESS}</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* BOTTOM COPYRIGHT & LEGAL SECTION */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-purple-300/70">
          <p className="order-2 sm:order-1 text-center sm:text-left">
            © {new Date().getFullYear()} {t('footer.rights')}
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 order-1 sm:order-2">
            <button 
              onClick={() => handleNav('about')} 
              className="hover:text-white transition-colors cursor-pointer"
            >
              {t('footer.contactDesk')}
            </button>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              {language === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
            </a>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              {language === 'bn' ? 'শর্তাবলী' : 'Terms of Use'}
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};

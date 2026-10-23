import React, { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Heart, ArrowRight, Users, PlusCircle, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { AmbientVideo } from '../common/AmbientVideo';
import heroPoster from '../../assets/images/hero_blood_donation_1789823461296.jpg';

export const HeroSection: React.FC = () => {
  const { setActiveView, setQuickRequestModalOpen, openAuthModal, donors, requests, language, currentUser, t } = useApp();
  const isGuest = !currentUser;
  const isDonor = currentUser?.role === 'donor';
  const wantsBlood = !isGuest && (currentUser?.role === 'requester' || currentUser?.role === 'admin');
  const canBecomeDonor = false; // switching roles lives in the profile menu and on the dashboards, not in the hero
  const heroRef = useRef<HTMLElement>(null);


  const availableCount = donors.filter(d => d.availability === 'Available').length;
  const criticalCount = requests.filter(r => r.urgency === 'Critical').length;

  const scrollToSearch = () => {
    const el = document.getElementById('live-blood-search-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Line 1 and Line 2 word definitions based on language
  const line1Words = language === 'bn'
    ? ["রক্তের", "প্রতিটি", "ফোঁটা", "কাউকে", "দিতে", "পারে"]
    : ["Every", "drop", "can", "give", "someone"];
  const line2Words = language === 'bn'
    ? [
        { text: "নতুন", highlight: false },
        { text: "জীবন।", highlight: true }
      ]
    : [
        { text: "another", highlight: false },
        { text: "life.", highlight: true }
      ];

  // Calculate precise character-by-character timing so each letter appears sequentially
  const line1BaseDelay = 0.25;
  const charStep = 0.034; // 34ms per character for a crisp, smooth typewriter feel

  let cumulativeLine1Chars = 0;
  const line1CharDelays: number[][] = line1Words.map((word, wIdx) => {
    const delays: number[] = [];
    for (let i = 0; i < word.length; i++) {
      delays.push(line1BaseDelay + cumulativeLine1Chars * charStep);
      cumulativeLine1Chars++;
    }
    // Include virtual space between words
    if (wIdx < line1Words.length - 1) {
      cumulativeLine1Chars++;
    }
    return delays;
  });

  // Line 1 completes; add a short pause before Line 2 starts
  const line1FinishTime = line1BaseDelay + cumulativeLine1Chars * charStep;
  const line2BaseDelay = line1FinishTime + 0.22; // 220ms pause after Line 1

  let cumulativeLine2Chars = 0;
  const line2CharDelays: number[][] = line2Words.map((item, wIdx) => {
    const delays: number[] = [];
    for (let i = 0; i < item.text.length; i++) {
      delays.push(line2BaseDelay + cumulativeLine2Chars * charStep);
      cumulativeLine2Chars++;
    }
    // Include virtual space between words
    if (wIdx < line2Words.length - 1) {
      cumulativeLine2Chars++;
    }
    return delays;
  });

  const line2FinishTime = line2BaseDelay + cumulativeLine2Chars * charStep;

  // Subsequent element sequential reveals
  const subtitleDelay = line2FinishTime + 0.18;
  const ctaDelay = subtitleDelay + 0.2;
  const gatewayDelay = ctaDelay + 0.18;
  const trustDelay = gatewayDelay + 0.18;
  const scrollIndicatorDelay = trustDelay + 0.18;

  return (
    <section 
      ref={heroRef}
      id="hero-section"
      className="relative flex flex-col justify-between pt-20 sm:pt-28 pb-10 sm:pb-14 overflow-hidden bg-[#0B0F17] text-white"
    >
      {/* 1. CINEMATIC BACKGROUND VIDEO / POSTER FALLBACK */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
        {/* Mobile-first static poster fallback to eliminate bandwidth waste on small screens */}
        <img
          src={heroPoster}
          alt=""
          aria-hidden="true"
          className="md:hidden w-full h-full object-cover object-center scale-105 opacity-30 brightness-75 contrast-110 filter saturate-110"
        />

        {/* Desktop video */}
        <AmbientVideo src="/videos/hero-bg.mp4" poster={heroPoster} className="hidden md:block w-full h-full object-cover object-center scale-105 transform will-change-transform opacity-30 brightness-85 contrast-110 filter saturate-110 transition-opacity duration-1000" />

        {/* Clean Slate / Dark Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/85 to-[#0B0F17]/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F17]/95 via-[#0B0F17]/85 to-[#111827]/75" />

        {/* Subtle Ambient Red Depth on Left, Calm Slate on Right */}
        <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-[#DC2626]/12 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 -right-10 w-[450px] h-[450px] bg-slate-500/10 rounded-full blur-[150px] pointer-events-none" />
      </div>

      {/* 2. MAIN HERO CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto py-4 sm:py-8">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
          
          {/* Top Pill: Emergency Network Status */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 dark:bg-white/5 border border-white/15 backdrop-blur-md text-emerald-400 text-[11px] font-semibold tracking-wide mb-4 shadow-sm"
          >
            <span className="inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            <span className="text-slate-200">{t('hero.badge')}</span>
          </motion.div>

          {/* LETTER-BY-LETTER SEQUENTIAL HEADLINE */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-[1.2] sm:leading-[1.18] mb-4 sm:mb-5 text-center select-none">
            
            {/* LINE 1 */}
            <span className="block mb-0.5 sm:mb-1">
              {line1Words.map((word, wIdx) => (
                <React.Fragment key={wIdx}>
                  <span className="inline-block whitespace-nowrap">
                    {language === 'bn' ? (
                      <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.35,
                          delay: 0.2 + wIdx * 0.12,
                          ease: [0.22, 1, 0.36, 1]
                        }}
                        className="inline-block will-change-transform"
                      >
                        {word}
                      </motion.span>
                    ) : (
                      word.split('').map((char, cIdx) => (
                        <motion.span
                          key={cIdx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.25,
                            delay: line1CharDelays[wIdx][cIdx],
                            ease: [0.22, 1, 0.36, 1]
                          }}
                          className="inline-block will-change-transform"
                        >
                          {char}
                        </motion.span>
                      ))
                    )}
                  </span>
                  {wIdx < line1Words.length - 1 && (
                    <span className="inline-block">&nbsp;</span>
                  )}
                </React.Fragment>
              ))}
            </span>

            {/* LINE 2 */}
            <span className="block">
              {line2Words.map((item, wIdx) => {
                const isHighlight = item.highlight;
                return (
                  <React.Fragment key={wIdx}>
                    <span className={`inline-block whitespace-nowrap ${isHighlight ? "text-[#EF4444] relative inline-block underline decoration-[#DC2626]/60 decoration-wavy decoration-2 underline-offset-6" : "text-white"}`}>
                      {language === 'bn' ? (
                        <motion.span
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.35,
                            delay: 0.95 + wIdx * 0.14,
                            ease: [0.22, 1, 0.36, 1]
                          }}
                          className="inline-block will-change-transform"
                        >
                          {item.text}
                        </motion.span>
                      ) : (
                        item.text.split('').map((char, cIdx) => (
                          <motion.span
                            key={cIdx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.25,
                              delay: line2CharDelays[wIdx][cIdx],
                              ease: [0.22, 1, 0.36, 1]
                            }}
                            className="inline-block will-change-transform"
                          >
                            {char}
                          </motion.span>
                        ))
                      )}
                    </span>
                    {wIdx < line2Words.length - 1 && (
                      <span className="inline-block">&nbsp;</span>
                    )}
                  </React.Fragment>
                );
              })}
            </span>
          </h1>

          {/* Subtitle with sequential delay reveal */}
          <motion.p 
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: subtitleDelay,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="text-xs sm:text-base text-slate-300 max-w-xl font-normal leading-relaxed mb-6 sm:mb-8"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* CTA Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: ctaDelay,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-8 w-full sm:w-auto"
          >
                        {/* Primary Action: Find Blood */}
{wantsBlood && (
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              id="hero-find-blood-btn"
              onClick={() => {
                setActiveView('find-blood');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs sm:text-sm shadow-md transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>{t('hero.ctaFind')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
            </motion.button>
            )}

            {isDonor && (
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                id="hero-donor-feed-btn"
                onClick={() => { setActiveView('requests'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#DC2626]/25 flex items-center gap-2 cursor-pointer"
              >
                <span>{language === 'bn' ? 'আমার জন্য রক্তের অনুরোধ' : 'Blood requests for me'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            )}

                        {/* Secondary Action: Become a Donor */}
{canBecomeDonor && (
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              id="hero-become-donor-btn"
              onClick={() => {
                setActiveView('donate');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="h-11 sm:h-12 px-5 sm:px-6 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs sm:text-sm transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>{t('hero.ctaBecome')}</span>
            </motion.button>
            )}

                      </motion.div>

          

          {/* Social Proof / Metrics Strip */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.5,
              delay: trustDelay,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-400 border-t border-white/10 pt-6 w-full max-w-2xl"
          >
            {currentUser && (<>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-200 font-medium">
                <strong className="text-white font-bold">{availableCount}</strong> {t('hero.trustVerifiedDonors')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
              <span className="text-slate-200 font-medium">
                <strong className="text-white font-bold">{criticalCount}</strong> {t('hero.trustCriticalTransfusions')}
              </span>
            </div>
            </>)}
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-slate-200 font-medium">{t('hero.trustFreeWho')}</span>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Bottom Gradient Edge Transition */}
      <div className="absolute -bottom-1 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-[#F8FAFC] dark:to-[#0B0F17] pointer-events-none z-10" />
    </section>
  );
};

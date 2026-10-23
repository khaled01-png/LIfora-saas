import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuthModal } from './AuthModal';

/**
 * A short welcome for signed-out visitors: shortly after the site opens, a log in / sign up sheet slides down from the
 * top. It appears once per browser session, can be closed ("Just look around"), and disappears by itself after login.
 */
export const IntroSheet: React.FC = () => {
  const { introOpen, dismissIntro, currentUser, language } = useApp();
  const reduce = useReducedMotion();
  const bn = language === 'bn';
  const visible = introOpen && !currentUser;

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismissIntro(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, dismissIntro]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={bn ? 'লগইন বা সাইন আপ' : 'Log in or sign up'}>
          <motion.div
            className="absolute inset-0 bg-black/55"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={dismissIntro}
          />
          <motion.div
            className="absolute top-0 inset-x-0 mx-auto w-full max-w-md max-h-[94vh] overflow-y-auto rounded-b-3xl bg-[#F8FAF9] dark:bg-[#0B0F12] shadow-2xl px-4 pt-4 pb-5"
            initial={reduce ? { opacity: 0 } : { y: '-105%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '-105%' }}
            transition={reduce ? { duration: 0.15 } : { type: 'spring', damping: 26, stiffness: 240 }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-base font-extrabold text-[#0F172A] dark:text-white">
                  {bn ? 'লাইফোরায় স্বাগতম' : 'Welcome to LIFORA'}
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 max-w-xs">
                  {bn
                    ? 'রক্তদাতা, অনুরোধ ও রক্তকেন্দ্র দেখতে লগইন বা সাইন আপ করুন।'
                    : 'Log in or sign up to see donors, requests and blood centers.'}
                </p>
              </div>
              <button
                type="button"
                onClick={dismissIntro}
                aria-label={bn ? 'বন্ধ করুন' : 'Close'}
                className="shrink-0 w-9 h-9 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-white dark:bg-[#12181C] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <AuthModal inline panelId="auth-intro-panel" />

            <button
              type="button"
              onClick={dismissIntro}
              className="mt-3 w-full text-center text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#0D7A5F] cursor-pointer py-2"
            >
              {bn ? 'আগে একটু ঘুরে দেখি' : 'Just look around first'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

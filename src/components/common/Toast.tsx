import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Toast: React.FC = () => {
  const { toastMessage, showToast, language } = useApp();

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.aside
          id="lifora-toast"
          role="status"
          aria-live="polite"
          aria-label={language === 'bn' ? 'বিজ্ঞপ্তি' : 'Notification alert'}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-[60] max-w-md w-[calc(100vw-1.5rem)] sm:w-auto bg-[#0F172A] text-white px-4 py-3.5 rounded-2xl shadow-2xl border border-white/10 flex items-start gap-3 backdrop-blur-md"
        >
          <div className="w-7 h-7 rounded-xl bg-[#0D7A5F]/20 text-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs sm:text-sm font-medium leading-snug pr-2 pt-0.5">
            {toastMessage}
          </div>
          <button 
            onClick={() => showToast('')}
            aria-label={language === 'bn' ? 'বিজ্ঞপ্তি বন্ধ করুন' : 'Dismiss notification'}
            className="text-white/60 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

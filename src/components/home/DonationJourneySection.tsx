import React, { useState } from 'react';
import { UserCheck, Sparkles, MessageCircle, Heart, LifeBuoy, ArrowRight, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion } from 'motion/react';

export const DonationJourneySection: React.FC = () => {
  const { setActiveView, language } = useApp();
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      labelEn: 'Register',
      labelBn: 'নিবন্ধন করুন',
      phaseEn: 'DONOR',
      phaseBn: 'দাতা নিবন্ধন',
      subEn: 'Join the community registry with your blood group & availability.',
      subBn: 'আপনার রক্তের গ্রুপ ও প্রাপ্যতা দিয়ে কমিউনিটিতে যুক্ত হোন।',
      icon: <UserCheck className="w-5 h-5" />
    },
    {
      labelEn: 'Get Matched',
      labelBn: 'ম্যাচিং পান',
      phaseEn: 'MATCHING',
      phaseBn: 'রোগী শনাক্তকরণ',
      subEn: 'Our system identifies compatible patients within hospital driving radius.',
      subBn: 'সিস্টেম হাসপাতালের কাছাকাছি মানানসই রোগীদের সাথে মিলিয়ে দেয়।',
      icon: <Sparkles className="w-5 h-5" />
    },
    {
      labelEn: 'Connect',
      labelBn: 'যোগাযোগ',
      phaseEn: 'COORDINATION',
      phaseBn: 'সমন্বয় ও তথ্য',
      subEn: 'Receive a secure notification with hospital location and needed units.',
      subBn: 'হাসপাতালের অবস্থান ও প্রয়োজনীয় ইউনিটের নিরাপদ বার্তা পান।',
      icon: <MessageCircle className="w-5 h-5" />
    },
    {
      labelEn: 'Donate',
      labelBn: 'রক্তদান করুন',
      phaseEn: 'DONATION',
      phaseBn: 'রক্ত সঞ্চালন',
      subEn: 'Spend 15 minutes at an accredited lab under trained medical supervision.',
      subBn: 'প্রশিক্ষিত চিকিৎসকের তত্ত্বাবধানে ল্যাবে মাত্র ১৫ মিনিট সময় দিন।',
      icon: <Heart className="w-5 h-5" />
    },
    {
      labelEn: 'Impact',
      labelBn: 'জীবন রক্ষা',
      phaseEn: 'LIFE IMPACT',
      phaseBn: 'মানবিক প্রভাব',
      subEn: 'Your single donation supports trauma, cancer therapies, or pediatric surgery.',
      subBn: 'আপনার একটি রক্তদান জরুরি সার্জারি বা সংকটাপন্ন রোগীর প্রাণ বাঁচায়।',
      icon: <LifeBuoy className="w-5 h-5" />
    }
  ];

  const currentStep = steps[activeStep];

  return (
    <section id="donation-journey-section" className="py-20 sm:py-28 border-b border-[#E2E8F0] dark:border-[#222D35] transition-colors duration-300 relative overflow-hidden">
      {/* Subtle light mode ambient glow */}
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-[#0D7A5F]/[0.035] dark:bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#0D7A5F] dark:text-[#10B981] bg-[#0D7A5F]/10 dark:bg-[#10B981]/15 px-3 py-1 rounded-full border border-[#0D7A5F]/20">
            {language === 'bn' ? 'জীবন বাঁচানোর ধাপসমূহ' : 'The Lifesaving Lifecycle'}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight mt-3">
            {language === 'bn' ? (
              <>একটি সিদ্ধান্ত থেকে <br />স্থায়ী মানবিক প্রভাব।</>
            ) : (
              <>From one decision <br />to a lasting human impact.</>
            )}
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] mt-3">
            {language === 'bn'
              ? 'প্রতিটি ধাপে নিরাপত্তা, মর্যাদা এবং স্বচ্ছতার সাথে রক্তদানের সহজ প্রক্রিয়া।'
              : 'A transparent and respectful process designed for safety, dignity, and ease at every stage.'}
          </p>
        </motion.div>

        {/* 5 Step Interactive Roadmap Cards Grid with Staggered Scroll Reveal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-12">
          {steps.map((st, i) => (
            <motion.div
              key={st.labelEn}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              onClick={() => setActiveStep(i)}
              className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                activeStep === i
                  ? 'bg-white dark:bg-[#12181C] border-[#0D7A5F] dark:border-[#10B981] shadow-lg ring-2 ring-[#0D7A5F]/15'
                  : 'bg-white/80 dark:bg-[#12181C]/80 border-[#E2E8F0] dark:border-[#222D35] hover:border-[#0D7A5F]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    activeStep === i 
                      ? 'bg-[#0D7A5F] text-white shadow-sm' 
                      : 'bg-black/5 dark:bg-white/5 text-[#64748B]'
                  }`}>
                    {st.icon}
                  </div>
                  <span className="font-mono text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                    0{i + 1}
                  </span>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0D7A5F] dark:text-[#10B981] block mb-1">
                  {language === 'bn' ? st.phaseBn : st.phaseEn}
                </span>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  {language === 'bn' ? st.labelBn : st.labelEn}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  {language === 'bn' ? st.subBn : st.subEn}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[#E2E8F0]/60 dark:border-[#222D35]/60 flex items-center justify-between text-[11px] font-semibold text-[#0D7A5F] dark:text-[#10B981]">
                <span>{language === 'bn' ? `ধাপ ${i + 1}` : `Stage ${i + 1}`}</span>
                <span className="inline-block transform group-hover:translate-x-1">→</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Dynamic Detail Card with Animated Content Switch */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="p-6 sm:p-8 rounded-3xl bg-[#0D7A5F]/5 dark:bg-[#10B981]/10 border border-[#0D7A5F]/20 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0D7A5F] text-white flex items-center justify-center shrink-0 shadow-md">
              {currentStep.icon}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0D7A5F] dark:text-[#10B981]">
                {language === 'bn' ? `নির্বাচিত ধাপ: ${currentStep.phaseBn}` : `Selected Stage: ${currentStep.phaseEn}`}
              </span>
              <h4 className="text-lg font-extrabold text-[#0F172A] dark:text-white mt-0.5">
                {language === 'bn' ? `${currentStep.labelBn} প্রক্রিয়ার বিবরণ` : `${currentStep.labelEn} Protocol Overview`}
              </h4>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
                {language === 'bn' 
                  ? currentStep.subBn
                  : currentStep.subEn}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveView('donate');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="h-11 px-6 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] text-white text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span>{language === 'bn' ? 'রক্তদান প্রক্রিয়া শুরু করুন' : 'Start Donation Journey'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

      </div>
    </section>
  );
};

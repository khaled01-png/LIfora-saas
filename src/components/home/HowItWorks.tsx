import React from 'react';
import { Search, FileText, PhoneCall, HeartHandshake, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion } from 'motion/react';

export const HowItWorks: React.FC = () => {
  const { setActiveView, t, language } = useApp();

  const steps = [
    {
      num: '01',
      title: language === 'bn' ? '১. অনুসন্ধান ও ম্যাচিং' : 'Search & Match',
      desc: language === 'bn' 
        ? 'রক্তের গ্রুপ, এলাকা ও প্রাপ্যতার ভিত্তিতে নিকটবর্তী উপযুক্ত সক্রিয় রক্তদাতা খুঁজুন।' 
        : 'Filter compatible donors near your hospital by blood group, locality, and availability score.',
      icon: <Search className="w-5 h-5" />
    },
    {
      num: '02',
      title: language === 'bn' ? '২. অনুরোধ প্রচার' : 'Post Request',
      desc: language === 'bn' 
        ? 'জরুরি বা নির্ধারিত অস্ত্রোপচারের জন্য রোগীর বিস্তারিত তথ্য দিয়ে রক্তের জরুরি চাহিদা পোস্ট করুন।' 
        : 'Broadcast emergency or scheduled hospital requirements with patient details and needed units.',
      icon: <FileText className="w-5 h-5" />
    },
    {
      num: '03',
      title: language === 'bn' ? '৩. তাৎক্ষণিক সাড়া' : 'Direct Response',
      desc: language === 'bn' 
        ? 'নিকটবর্তী রক্তদাতাদের কাছে পুশ ও এসএমএস সতর্কতা পৌঁছে যায় এবং তারা দ্রুত সাড়া নিশ্চিত করেন।' 
        : 'On-call donors receive SMS & push notifications, review compatibility, and confirm response.',
      icon: <PhoneCall className="w-5 h-5" />
    },
    {
      num: '04',
      title: language === 'bn' ? '৪. নিরাপদ রক্ত সঞ্চালন' : 'Safe Transfusion',
      desc: language === 'bn' 
        ? 'অনুমোদিত হাসপাতালে চিকিৎসকের তত্ত্বাবধানে নিরাপদ রক্তদান সম্পন্ন করে একটি জীবন রক্ষা করুন।' 
        : 'Complete the verified donation at an accredited hospital center, saving a human life.',
      icon: <HeartHandshake className="w-5 h-5" />
    }
  ];

  return (
    <section id="how-it-works-section" className="py-14 sm:py-20 border-b border-[#E2E8F0] dark:border-[#222D35] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mb-8 sm:mb-12"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#0D7A5F] dark:text-[#10B981] bg-[#0D7A5F]/10 dark:bg-[#10B981]/15 px-3 py-1 rounded-full border border-[#0D7A5F]/20">
            {t('how.badge')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-tight mt-3">
            {language === 'bn' ? 'সহজ পদক্ষেপ। অমূল্য মানবিক প্রভাব।' : (
              <>
                Simple steps. <br />
                Measurable human impact.
              </>
            )}
          </h2>
          <p className="text-base text-[#64748B] dark:text-[#94A3B8] mt-3">
            {t('how.subtitle')}
          </p>
        </motion.div>

        {/* Steps Grid / Timeline */}
        <div className="relative">
          
          {/* Subtle Connecting Line on Desktop */}
          <div className="hidden lg:block absolute top-12 left-10 right-10 h-0.5 bg-gradient-to-r from-[#0D7A5F]/20 via-[#0D7A5F]/40 to-[#0D7A5F]/15 z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative z-10">
            {steps.map((step, idx) => (
              <motion.div 
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xs flex flex-col justify-between transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#0D7A5F]/10 dark:bg-[#10B981]/15 text-[#0D7A5F] dark:text-[#10B981] flex items-center justify-center font-bold shadow-2xs transition-transform group-hover:scale-110">
                      {step.icon}
                    </div>
                    <span className="font-mono text-xs font-bold text-[#64748B] dark:text-[#94A3B8] bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                      {step.num}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[#E2E8F0]/60 dark:border-[#222D35]/60 flex items-center justify-between text-xs font-semibold text-[#0D7A5F] dark:text-[#10B981]">
                  <span>{language === 'bn' ? `ধাপ ${step.num} (মোট ৪টি)` : `Step ${step.num} of 04`}</span>
                  <span className="group-hover:translate-x-1.5 transition-transform duration-200">→</span>
                </div>
              </motion.div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
};

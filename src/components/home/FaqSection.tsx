import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';

interface FaqItem {
  qEn: string;
  qBn: string;
  aEn: string;
  aBn: string;
}

export const FaqSection: React.FC = () => {
  const { language } = useApp();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      qEn: 'Who can donate blood?',
      qBn: 'কে রক্ত দান করতে পারেন?',
      aEn: 'Most healthy individuals between 18 and 65 years of age weighing at least 50 kg (110 lbs) are eligible. You must be in good general health, have a normal pulse and blood pressure, and meet minimum hemoglobin requirements (12.5 g/dL for women, 13.0 g/dL for men).',
      aBn: '১৮ থেকে ৬৫ বছর বয়সী যেকোনো সুস্থ ব্যক্তি যার ওজন কমপক্ষে ৫০ কেজি এবং রক্তে স্বাভাবিক হিমোগ্লোবিন রয়েছে (নারীদের ১২.৫ এবং পুরুষদের ১৩.০ গ্রাম/ডেসিলিটার) তিনি রক্ত দান করতে পারেন।'
    },
    {
      qEn: 'How often can I donate blood?',
      qBn: 'কত দিন পর পর রক্ত দেওয়া যায়?',
      aEn: 'Healthy donors can give whole blood every 84 to 90 days (about 3 months) to allow red blood cells and iron stores to replenish naturally. Platelet donations can be completed more frequently (every 14 days, up to 24 times per year).',
      aBn: 'একজন সুস্থ পুরুষ প্রতি ৩ মাস (৯০ দিন) পর পর এবং নারী প্রতি ৪ মাস (১২০ দিন) পর পর নিরাপদে সম্পূর্ণ রক্ত দান করতে পারেন। এর ফলে দেহে নতুন রক্তকণিকা প্রাকৃতিকভাবে তৈরি হয়।'
    },
    {
      qEn: 'Is blood donation safe?',
      qBn: 'রক্তদান কি নিরাপদ?',
      aEn: 'Yes, donating blood is completely safe. Sterile, single-use, disposable needles and collection bags are used for every single donor and immediately discarded. There is zero risk of contracting any infectious disease from donating.',
      aBn: 'হ্যাঁ, রক্তদান সম্পূর্ণ নিরাপদ এবং স্বাস্থ্যকর। প্রতিটি রক্তদানে সম্পূর্ণ নতুন, জীবাণুমুক্ত ও একবার ব্যবহারযোগ্য সিরিঞ্জ ও রক্তের ব্যাগ ব্যবহার করা হয়। এর ফলে কোনো ধরনের সংক্রমণ ছড়ানোর ঝুঁকি থাকে না।'
    },
    {
      qEn: 'How long does the donation process take?',
      qBn: 'রক্তদানের পুরো প্রক্রিয়ায় কতক্ষণ সময় লাগে?',
      aEn: 'The blood drawing itself takes only 8 to 10 minutes. The entire appointment—including registration, confidential health history questionnaire, mini-physical (temperature, pulse, hemoglobin), and post-donation refreshment rest—takes approximately 35 to 45 minutes.',
      aBn: 'প্রকৃত রক্ত গ্রহণের কাজটি মাত্র ৮ থেকে ১০ মিনিট সময় নেয়। স্বাস্থ্য পরীক্ষা, রক্তচাপ ও হিমোগ্লোবিন পরিমাপ এবং পরবর্তী বিশ্রামসহ পুরো প্রক্রিয়ায় মোট ৩০ থেকে ৪৫ মিনিট লাগে।'
    },
    {
      qEn: 'What should I do before donating?',
      qBn: 'রক্তদানের পূর্বে কী করণীয়?',
      aEn: 'Drink an extra 16 oz of water or fluids before your appointment. Eat a nutritious meal containing iron (avoid high-fat greasy foods right before donation), bring a valid photo ID, and wear comfortable clothing with sleeves that roll up easily.',
      aBn: 'রক্তদানের পূর্বে প্রচুর পানি বা তরল পান করুন। একটি পুষ্টিকর খাবার গ্রহণ করুন, পর্যাপ্ত ঘুমান এবং ঢিলেঢালা আরামদায়ক পোশাক পরিধান করুন যাতে সহজে হাতা গোটানো যায়।'
    },
    {
      qEn: 'What happens after I donate?',
      qBn: 'রক্তদানের পরপরই কী করতে হয়?',
      aEn: 'You will rest for 10–15 minutes while enjoying a light beverage and snack to stabilize blood sugar. Avoid strenuous heavy lifting or intense workouts for the remainder of the day, and drink plenty of hydrating liquids.',
      aBn: 'রক্তদানের পর ১০–১৫ মিনিট বিশ্রাম নিয়ে হালকা পানীয় ও নাস্তা গ্রহণ করুন। ওই দিন ভারী ওজন তোলা বা অতিরিক্ত শারীরিক পরিশ্রম এড়িয়ে চলুন এবং পর্যাপ্ত তরল পান করুন।'
    },
    {
      qEn: 'Can I request blood for an emergency?',
      qBn: 'জরুরি প্রয়োজনে কি রক্তের আবেদন করা যায়?',
      aEn: 'Yes. Anyone can create an emergency blood request through LIFORA by providing the patient name, required blood group, hospital ward, and attending doctor or hospital contact phone. Emergency requests are prioritized and broadcast instantly to nearby donors.',
      aBn: 'হ্যাঁ। লাইফোরার মাধ্যমে যেকোনো ব্যক্তি রোগীর নাম, রক্তের গ্রুপ, হাসপাতাল ও যোগাযোগের নম্বর দিয়ে জরুরি আবেদন পোস্ট করতে পারেন। সাথে সাথেই কাছাকাছি নিবন্ধিত রক্তদাতাদের কাছে নোটিফিকেশন পৌঁছে যাবে।'
    },
    {
      qEn: 'How does LIFORA verify donors?',
      qBn: 'লাইফোরা কীভাবে রক্তদাতাদের যাচাই করে?',
      aEn: 'New donors appear as unverified. An administrator can mark a donor as Verified after checking their details. LIFORA does not replace medical screening: every donor must still be screened and cleared by the hospital or blood bank before donating.',
      aBn: 'নতুন রক্তদাতা প্রথমে অযাচাইকৃত থাকেন। তথ্য দেখে একজন প্রশাসক তাঁকে "যাচাইকৃত" চিহ্নিত করতে পারেন। লাইফোরা চিকিৎসা পরীক্ষার বিকল্প নয়: রক্তদানের আগে হাসপাতাল বা ব্লাড ব্যাংকে প্রত্যেক দাতার স্বাস্থ্য পরীক্ষা হতে হবে।'
    }
  ];

  const toggleFaq = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq-section" className="py-20 sm:py-28 border-b border-[#E2E8F0] dark:border-[#222D35] transition-colors duration-300 relative overflow-hidden">
      {/* Subtle light mode ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#0D7A5F]/[0.025] dark:bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#0D7A5F] dark:text-[#10B981] bg-[#0D7A5F]/10 dark:bg-[#10B981]/15 px-3 py-1 rounded-full border border-[#0D7A5F]/20">
            {language === 'bn' ? 'সাধারণ প্রশ্ন ও উত্তর' : 'Questions & Answers'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight mt-3">
            {language === 'bn' ? 'সচরাচর জিজ্ঞাসিত প্রশ্নাবলী' : 'Frequently Asked Questions'}
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] mt-2">
            {language === 'bn'
              ? 'রক্তদানের যোগ্যতা, সময় ব্যবধান এবং জরুরি প্রোটোকল সম্পর্কিত প্রয়োজনীয় ক্লিনিকাল নির্দেশিকা।'
              : 'Essential clinical guidelines on donor eligibility, donation frequency, and emergency protocols.'}
          </p>
        </motion.div>

        {/* Accordion List with Staggered Scroll Reveal */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-white dark:bg-[#12181C] border-[#0D7A5F] dark:border-[#10B981] shadow-sm'
                    : 'bg-white/80 dark:bg-[#12181C]/80 border-[#E2E8F0] dark:border-[#222D35] hover:border-[#0D7A5F]/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-extrabold text-sm sm:text-base text-[#0F172A] dark:text-[#F8FAFC]">
                    {language === 'bn' ? faq.qBn : faq.qEn}
                  </span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 bg-[#0D7A5F]/10 text-[#0D7A5F]' : 'bg-black/5 dark:bg-white/5 text-[#64748B]'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed border-t border-[#E2E8F0]/50 dark:border-[#222D35]/50 pt-4">
                        {language === 'bn' ? faq.aBn : faq.aEn}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

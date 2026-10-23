import React, { useState } from 'react';
import { BloodGroup } from '../../types';
import { Info, Check, ArrowDownLeft, ArrowUpRight, ShieldCheck, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';

interface CompatibilityData {
  canGiveTo: BloodGroup[];
  canReceiveFrom: BloodGroup[];
  keyFactEn: string;
  keyFactBn: string;
  populationShareEn: string;
  populationShareBn: string;
  isUniversalDonor?: boolean;
  isUniversalRecipient?: boolean;
}

const COMPATIBILITY_MAP: Record<BloodGroup, CompatibilityData> = {
  'O-': {
    canGiveTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    canReceiveFrom: ['O-'],
    keyFactEn: 'Universal Red Cell Donor. Essential in emergency rooms and neonatal trauma care when the patient blood type is unknown.',
    keyFactBn: 'সর্বজনীন লোহিত রক্তকণিকা দাতা। জরুরি বিভাগ এবং নবজাতকের ট্রমা কেয়ারে যখন রোগীর রক্তের গ্রুপ অজানা থাকে তখন এটি অপরিহার্য।',
    populationShareEn: '~7% of global population',
    populationShareBn: 'বিশ্ব জনসংখ্যার প্রায় ৭%',
    isUniversalDonor: true
  },
  'O+': {
    canGiveTo: ['O+', 'A+', 'B+', 'AB+'],
    canReceiveFrom: ['O+', 'O-'],
    keyFactEn: 'Most requested blood type in hospitals. Transfused to any Rh-positive patient in critical need.',
    keyFactBn: 'হাসপাতালে সর্বাধিক চাহিদাসম্পন্ন রক্তের গ্রুপ। যেকোনো আরএইচ-পজিটিভ সংকটাপন্ন রোগীকে এটি দেওয়া যায়।',
    populationShareEn: '~37% of global population',
    populationShareBn: 'বিশ্ব জনসংখ্যার প্রায় ৩৭%'
  },
  'A+': {
    canGiveTo: ['A+', 'AB+'],
    canReceiveFrom: ['A+', 'A-', 'O+', 'O-'],
    keyFactEn: 'Second most common blood type. In high demand for platelet and red cell donations.',
    keyFactBn: 'দ্বিতীয় সর্বাধিক সাধারণ রক্তের গ্রুপ। প্লাটিলেট ও লোহিত রক্তকণিকা দানের জন্য এর ব্যাপক চাহিদা রয়েছে।',
    populationShareEn: '~34% of global population',
    populationShareBn: 'বিশ্ব জনসংখ্যার প্রায় ৩৪%'
  },
  'A-': {
    canGiveTo: ['A+', 'A-', 'AB+', 'AB-'],
    canReceiveFrom: ['A-', 'O-'],
    keyFactEn: 'Universal platelet type. Ideal for red blood cell donations for pediatric surgery.',
    keyFactBn: 'সর্বজনীন প্লাটিলেট টাইপ। শিশু সার্জারির জন্য লোহিত রক্তকণিকা প্রদানে অত্যন্ত উপযোগী।',
    populationShareEn: '~6% of global population',
    populationShareBn: 'বিশ্ব জনসংখ্যার প্রায় ৬%'
  },
  'B+': {
    canGiveTo: ['B+', 'AB+'],
    canReceiveFrom: ['B+', 'B-', 'O+', 'O-'],
    keyFactEn: 'Commonly needed for chronic transfusions and hematological disorders such as sickle cell anemia.',
    keyFactBn: 'থ্যালাসেমিয়া এবং অন্যান্য দীর্ঘস্থায়ী রক্তরোগীদের নিয়মিত রক্ত সঞ্চালনে বহুল ব্যবহৃত।',
    populationShareEn: '~10% of global population',
    populationShareBn: 'বিশ্ব জনসংখ্যার প্রায় ১০%'
  },
  'B-': {
    canGiveTo: ['B+', 'B-', 'AB+', 'AB-'],
    canReceiveFrom: ['B-', 'O-'],
    keyFactEn: 'Rare blood type. Highly sought after by blood centers to maintain safe baseline reserves.',
    keyFactBn: 'একটি বিরল রক্তের গ্রুপ। নিরাপদ জরুরি রিজার্ভ বজায় রাখতে রক্তকেন্দ্রগুলোতে এর সবসময় প্রয়োজন।',
    populationShareEn: '~2% of global population',
    populationShareBn: 'বিশ্ব জনসংখ্যার প্রায় ২%'
  },
  'AB+': {
    canGiveTo: ['AB+'],
    canReceiveFrom: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    keyFactEn: 'Universal Red Cell Recipient. Also the Universal Plasma Donor for trauma and burn victims.',
    keyFactBn: 'সর্বজনীন লোহিত রক্তকণিকা গ্রহীতা। পাশাপাশি ট্রমা ও অগ্নিদগ্ধ রোগীদের জন্য সর্বজনীন প্লাজমা দাতা।',
    populationShareEn: '~4% of global population',
    populationShareBn: 'বিশ্ব জনসংখ্যার প্রায় ৪%',
    isUniversalRecipient: true
  },
  'AB-': {
    canGiveTo: ['AB+', 'AB-'],
    canReceiveFrom: ['AB-', 'A-', 'B-', 'O-'],
    keyFactEn: 'Rarest blood type. Vital source for universal plasma donations and clinical research.',
    keyFactBn: 'সবচেয়ে বিরল রক্তের গ্রুপ। সর্বজনীন প্লাজমা দান এবং ক্লিনিকাল গবেষণার জন্য অত্যন্ত মূল্যবান উৎস।',
    populationShareEn: '~1% of global population',
    populationShareBn: 'বিশ্ব জনসংখ্যার প্রায় ১%'
  }
};

export const BloodCompatibilitySection: React.FC = () => {
  const { language } = useApp();
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup>('O-');

  const groups: BloodGroup[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  const data = COMPATIBILITY_MAP[selectedGroup];

  return (
    <section id="compatibility-section" className="py-20 sm:py-28 border-b border-[#E2E8F0] dark:border-[#222D35] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0D7A5F] dark:text-[#10B981] bg-[#0D7A5F]/10 dark:bg-[#10B981]/15 px-3 py-1 rounded-full border border-[#0D7A5F]/20">
            {language === 'bn' ? 'রক্ত সঞ্চালন বিজ্ঞান' : 'Transfusion Science'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight mt-3">
            {language === 'bn' ? 'রক্তের সামঞ্জস্য ও মিল ম্যাট্রিক্স' : 'Interactive Compatibility Matrix'}
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] mt-2 leading-relaxed">
            {language === 'bn' 
              ? 'ক্লিনিকাল নিয়ম দেখতে যেকোনো রক্তের গ্রুপ নির্বাচন করুন—কে নিরাপদে আপনার রক্ত নিতে পারবে এবং আপনি কার থেকে নিতে পারবেন।'
              : 'Select a blood type to inspect clinical matching rules, who can safely receive your donation, and who you can receive from.'}
          </p>
        </div>

        {/* Group Selector Pills */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 mb-8">
          {groups.map((group) => {
            const isSelected = selectedGroup === group;
            return (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={group}
                onClick={() => setSelectedGroup(group)}
                className={`py-3 rounded-2xl font-black text-base transition-all duration-200 border cursor-pointer ${
                  isSelected
                    ? 'bg-[#0D7A5F] text-white border-[#0D7A5F] shadow-md'
                    : 'bg-white dark:bg-[#12181C] border-[#E2E8F0] dark:border-[#222D35] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#0D7A5F]'
                }`}
              >
                {group}
              </motion.button>
            );
          })}
        </div>

        {/* Visual Flow Matrix Card */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={selectedGroup}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xs"
          >
            
            {/* Headline Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-[#E2E8F0] dark:border-[#222D35] gap-4">
              <div className="flex items-center gap-3">
                <span className="w-14 h-14 rounded-2xl bg-[#DC2626] text-white font-black text-2xl flex items-center justify-center shadow-xs">
                  {selectedGroup}
                </span>
                <div>
                  <h3 className="font-extrabold text-xl text-[#0F172A] dark:text-[#F8FAFC]">
                    {language === 'bn' ? `রক্তের গ্রুপ ${selectedGroup}` : `Blood Group ${selectedGroup}`}
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {language === 'bn' ? data.populationShareBn : data.populationShareEn}
                  </p>
                </div>
              </div>

              {data.isUniversalDonor && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0D7A5F]/10 dark:bg-[#10B981]/20 border border-[#0D7A5F]/30 text-[#0D7A5F] dark:text-[#10B981] font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{language === 'bn' ? 'সর্বজনীন রক্তদাতা' : 'Universal Red Blood Cell Donor'}</span>
                </div>
              )}

              {data.isUniversalRecipient && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-700 dark:text-amber-300 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{language === 'bn' ? 'সর্বজনীন রক্ত গ্রহীতা' : 'Universal Red Cell Recipient'}</span>
                </div>
              )}
            </div>

            {/* 2-Column Give & Receive Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              
              {/* CAN GIVE TO */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#F8FAF9] dark:bg-[#0B0F12] border border-[#E2E8F0] dark:border-[#222D35]">
                <div className="flex items-center gap-2 mb-4 text-[#0D7A5F] dark:text-[#10B981]">
                  <ArrowUpRight className="w-5 h-5" />
                  <h4 className="font-extrabold text-sm uppercase tracking-wider">
                    {language === 'bn' 
                      ? `রক্ত দান করতে পারবে (${data.canGiveTo.length}টি গ্রুপ)`
                      : `Can Donate Red Cells To (${data.canGiveTo.length})`}
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2">
                  {groups.map((group) => {
                    const canGive = data.canGiveTo.includes(group);
                    return (
                      <span
                        key={group}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ${
                          canGive
                            ? 'bg-[#0D7A5F] text-white shadow-2xs'
                            : 'bg-black/5 dark:bg-white/5 text-[#94A3B8] opacity-35'
                        }`}
                      >
                        {canGive && <Check className="w-3.5 h-3.5" />}
                        <span>{group}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* CAN RECEIVE FROM */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#F8FAF9] dark:bg-[#0B0F12] border border-[#E2E8F0] dark:border-[#222D35]">
                <div className="flex items-center gap-2 mb-4 text-[#DC2626]">
                  <ArrowDownLeft className="w-5 h-5" />
                  <h4 className="font-extrabold text-sm uppercase tracking-wider">
                    {language === 'bn'
                      ? `রক্ত গ্রহণ করতে পারবে (${data.canReceiveFrom.length}টি গ্রুপ)`
                      : `Can Receive Red Cells From (${data.canReceiveFrom.length})`}
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2">
                  {groups.map((group) => {
                    const canReceive = data.canReceiveFrom.includes(group);
                    return (
                      <span
                        key={group}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ${
                          canReceive
                            ? 'bg-[#DC2626] text-white shadow-2xs'
                            : 'bg-black/5 dark:bg-white/5 text-[#94A3B8] opacity-35'
                        }`}
                      >
                        {canReceive && <Check className="w-3.5 h-3.5" />}
                        <span>{group}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Key Medical Fact Bar */}
            <div className="p-4 rounded-2xl bg-[#F0FDF4] dark:bg-[#06231C] border border-[#D1FAE5] dark:border-[#0B3D31] flex items-start gap-3 text-xs text-[#0D7A5F] dark:text-[#10B981] leading-relaxed">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                <strong>{language === 'bn' ? 'ক্লিনিকাল রক্ত সঞ্চালন নির্দেশিকা: ' : 'Clinical Transfusion Guidance: '}</strong>
                {language === 'bn' ? data.keyFactBn : data.keyFactEn}
              </p>
            </div>

          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
};

import React from 'react';
import { useApp } from '../../context/AppContext';
import { BloodGroup } from '../../types';
import { Activity, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { translateStatus } from '../../services/i18n';

export const BloodAvailabilitySection: React.FC = () => {
  const { inventory, setActiveView, setSearchParams, t, language } = useApp();

  // Real backend and nobody has updated the inventory yet: show nothing instead of 8 red "Critical" cards.
  if (inventory.every(i => (i as { lastUpdated?: string }).lastUpdated === 'Not yet updated')) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Critical':
        return 'bg-[#FEF2F2] dark:bg-[#361417] text-[#DC2626] dark:text-[#F87171] border-[#FEE2E2] dark:border-[#561E23]';
      case 'High Demand':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900';
      case 'Low':
        return 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-900';
      default:
        return 'bg-[#F0FDF4] dark:bg-[#06231C] text-[#0D7A5F] dark:text-[#10B981] border-[#D1FAE5] dark:border-[#0B3D31]';
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'Critical':
        return 'bg-[#DC2626]';
      case 'High Demand':
      case 'Low':
        return 'bg-amber-500';
      default:
        return 'bg-[#0D7A5F] dark:bg-[#10B981]';
    }
  };

  const handleGroupClick = (group: BloodGroup) => {
    setSearchParams(prev => ({ ...prev, bloodGroup: group }));
    setActiveView('find-blood');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }
    }
  };

  return (
    <section id="blood-availability-section" className="py-14 sm:py-20 border-b border-[#E2E8F0] dark:border-[#222D35] transition-colors duration-300 relative overflow-hidden">
      {/* Subtle ambient light gradient in white version */}
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-[#0D7A5F]/[0.03] dark:bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0D7A5F] dark:text-[#10B981] bg-[#0D7A5F]/10 dark:bg-[#10B981]/15 px-3 py-1 rounded-full border border-[#0D7A5F]/20">
                {t('inventory.badge')}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight mt-2">
              {t('inventory.title')}
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] mt-2 max-w-xl">
              {t('inventory.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              {t('inventory.lastUpdated')}
            </span>
          </div>
        </motion.div>

        {/* 8 Blood Groups Inventory Cards Grid with Staggered Reveal */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4"
        >
          {inventory.map((item) => {
            const percentage = Math.min(100, Math.round((item.availableUnits / 60) * 100));
            const badgeClass = getStatusBadge(item.status);
            const progressColor = getProgressBarColor(item.status);

            return (
              <motion.div
                key={item.bloodGroup}
                variants={itemVariants}
                whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
                onClick={() => handleGroupClick(item.bloodGroup)}
                className="group p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] hover:border-[#0D7A5F] dark:hover:border-[#10B981] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight group-hover:text-[#0D7A5F] dark:group-hover:text-[#10B981] transition-colors">
                      {item.bloodGroup}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <div className="mb-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] block leading-none">
                      {item.availableUnits}
                    </span>
                    <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium mt-1 block">
                      {t('inventory.unitsAvailable')}
                    </span>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-[#E2E8F0] dark:bg-[#222D35] overflow-hidden mb-3">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${percentage}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className={`h-full rounded-full ${progressColor}`}
                    />
                  </div>
                </div>

                <div>
                  <span className={`inline-block w-full text-center text-[10px] font-bold uppercase tracking-wider py-1 px-1.5 rounded-lg border ${badgeClass}`}>
                    {translateStatus(item.status, language)}
                  </span>
                  
                  <div className="mt-2.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#0D7A5F] dark:text-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{t('btn.findBlood')}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Clinical Inventory Bottom Advice */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 p-4 rounded-2xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2 text-[#64748B] dark:text-[#94A3B8]">
            <ShieldCheck className="w-4 h-4 text-[#0D7A5F] dark:text-[#10B981] shrink-0" />
            <span>{language === 'bn' ? 'জরুরি সঞ্চালন লক্ষ্যমাত্রা: দুর্ঘটনা ও ট্রায়াজ প্রস্তুতির জন্য প্রতি গ্রুপে ন্যূনতম ৪০ ইউনিট রক্তের বাফার নিশ্চিত করা হয়।' : 'Target buffer: min 40 units per Rh-group maintained for emergency trauma standby.'}</span>
          </div>
          <button
            onClick={() => {
              setActiveView('requests');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xs font-bold text-[#0D7A5F] dark:text-[#10B981] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>{t('inventory.viewCompat')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

      </div>
    </section>
  );
};

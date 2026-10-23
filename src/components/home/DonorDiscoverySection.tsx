import React from 'react';
import { useApp } from '../../context/AppContext';
import { MapPin, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

// Home page: verified donors only (an administrator verifies a donor after at least 5 confirmed donations).
// Everyone who registered is listed on the Find Blood page.
export const DonorDiscoverySection: React.FC = () => {
  const { verifiedDonors, setActiveView, language } = useApp();
  const bn = language === 'bn';

  if (verifiedDonors.length === 0) return null;

  const availabilityLabel = (a: string) => {
    if (bn) return a === 'Available' ? 'উপলব্ধ' : a === 'Recently Donated' ? 'সম্প্রতি রক্তদান করেছেন' : 'অনুপলব্ধ';
    return a;
  };

  return (
    <section id="donor-discovery-section" className="py-14 sm:py-20 border-b border-[#E2E8F0] dark:border-[#222D35] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-10">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0D7A5F] dark:text-[#10B981] bg-[#0D7A5F]/10 dark:bg-[#10B981]/15 px-3 py-1 rounded-full border border-[#0D7A5F]/20">
              {bn ? 'কমিউনিটি সহযোগিতা' : 'Community Solidarity'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight mt-3">
              {bn ? 'যাচাইকৃত রক্তদাতাগণ' : 'Verified Donors'}
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] mt-2 max-w-xl">
              {bn
                ? 'যাঁরা কমপক্ষে ৫ বার রক্ত দিয়েছেন এবং লাইফোরার অ্যাডমিন যাঁদের যাচাই করেছেন। সব নিবন্ধিত রক্তদাতার তালিকা “রক্ত খুঁজুন” পেজে আছে।'
                : 'Donors who have given blood at least 5 times and were verified by LIFORA administrators. The full list of registered donors is on the Find Blood page.'}
            </p>
          </motion.div>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setActiveView('find-blood'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="h-11 px-5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2 self-start md:self-auto"
          >
            <span>{bn ? 'সকল রক্তদাতা দেখুন' : 'Explore All Donors'}</span>
            <span className="lifora-btn-arrow inline-block">→</span>
          </motion.button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {verifiedDonors.slice(0, 6).map((donor, idx) => (
            <motion.div
              key={donor.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#DC2626] text-white font-black text-lg flex items-center justify-center shadow-xs">
                  {donor.bloodGroup}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-base text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5 break-words">
                    <span className="truncate">{donor.name}</span>
                    <span title={bn ? 'যাচাইকৃত রক্তদাতা' : 'Verified Donor'}>
                      <ShieldCheck className="w-4 h-4 shrink-0 text-[#0D7A5F] dark:text-[#10B981]" />
                    </span>
                  </h3>
                  <span className="inline-block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    ● {availabilityLabel(donor.availability)}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#222D35] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
                <span className="flex items-center gap-1.5 text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-[#0D7A5F]" />
                  {donor.city}
                </span>
                <span>
                  {bn ? 'রক্তদান: ' : 'Donations: '}
                  <strong className="text-[#0F172A] dark:text-white">{donor.totalDonations} {bn ? 'বার' : ''}</strong>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

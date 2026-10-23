import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, Droplet, Building2, CheckCircle2, TrendingUp, HeartHandshake } from 'lucide-react';
import { motion } from 'motion/react';

const AnimatedCounter: React.FC<{ target: number; suffix?: string; inView: boolean; decimals?: number }> = ({ 
  target, 
  suffix = '', 
  inView, 
  decimals = 0 
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1600; // 1.6s
    const frameRate = 1000 / 60;
    const totalFrames = Math.round(duration / frameRate);
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = target * eased;
      setCount(current);

      if (frame >= totalFrames) {
        setCount(target);
        clearInterval(timer);
      }
    }, frameRate);

    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span>
      {decimals > 0 ? count.toFixed(decimals) : Math.round(count).toLocaleString()}{suffix}
    </span>
  );
};

export const TrustStats: React.FC = () => {
  const { donors, requests, t, language } = useApp();
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const totalDonors = donors.length;
  const availableDonors = donors.filter(d => d.availability === 'Available').length;
  const activeRequests = requests.filter(r => r.status === 'Pending' || r.status === 'In Progress').length;
  const successfulDonations = requests.filter(r => r.status === 'Fulfilled').length;
  const totalRequestsCount = requests.length;
  // No requests yet means there is no rate to show (never a made-up 100%).
  const hasRequests = totalRequestsCount > 0;
  const successRate = hasRequests
    ? Number(((successfulDonations / totalRequestsCount) * 100).toFixed(1))
    : 0;

  const statItems = [
    {
      target: totalDonors,
      suffix: '',
      label: language === 'bn' ? 'নিবন্ধিত রক্তদাতা' : 'Registered Donors',
      icon: <Users className="w-5 h-5 text-[#0D7A5F] dark:text-[#10B981]" />,
      desc: language === 'bn' ? 'লাইফোরায় নিবন্ধিত স্বেচ্ছাসেবী দাতা' : 'Voluntary donors signed up on LIFORA',
      highlight: false
    },
    {
      target: availableDonors,
      suffix: '',
      label: language === 'bn' ? 'অন-কল প্রস্তুত' : 'Available On-Call',
      icon: <Droplet className="w-5 h-5 text-[#0D7A5F] dark:text-[#10B981]" />,
      desc: language === 'bn' ? 'জরুরি সাড়ায় তাৎক্ষণিক সক্রিয়' : 'Ready for emergency dispatch',
      highlight: true
    },
    {
      target: activeRequests,
      suffix: '',
      label: language === 'bn' ? 'সক্রিয় হাসপাতাল অনুরোধ' : 'Active Hospital Requests',
      icon: <HeartHandshake className="w-5 h-5 text-[#DC2626]" />,
      desc: language === 'bn' ? 'রোগীদের সাথে দাতা মেলানো হচ্ছে' : 'Patients currently being matched',
      highlight: false
    },
    {
      target: successfulDonations,
      suffix: '',
      label: language === 'bn' ? 'পূর্ণ হওয়া অনুরোধ' : 'Fulfilled Requests',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      desc: language === 'bn' ? 'অনুরোধকারী যেগুলো সম্পন্ন বলে নিশ্চিত করেছেন' : 'Requests confirmed as fulfilled by the requester',
      highlight: false
    },
    {
      target: successRate,
      suffix: '%',
      decimals: 1,
      empty: !hasRequests,
      label: language === 'bn' ? 'পূর্ণতার হার' : 'Fulfillment Rate',
      icon: <TrendingUp className="w-5 h-5 text-[#0D7A5F] dark:text-[#10B981]" />,
      desc: language === 'bn' ? 'মোট অনুরোধের মধ্যে পূর্ণ হওয়ার অনুপাত' : 'Share of all requests that were fulfilled',
      highlight: false
    }
  ];

  return (
    <section 
      ref={sectionRef}
      id="trust-statistics-section"
      className="py-12 sm:py-16 border-b border-[#E2E8F0] dark:border-[#222D35] transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-8 sm:mb-10"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#0D7A5F] dark:text-[#10B981] bg-[#0D7A5F]/10 dark:bg-[#10B981]/15 px-3 py-1 rounded-full border border-[#0D7A5F]/20">
            {language === 'bn' ? 'নেটওয়ার্ক পরিসংখ্যান' : 'Network Statistics'}
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight mt-3">
            {language === 'bn' ? 'আমাদের কমিউনিটি এক নজরে' : 'Our Community at a Glance'}
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-2 leading-relaxed">
            {language === 'bn' 
              ? 'এই সংখ্যাগুলো লাইফোরায় নথিভুক্ত তথ্য থেকে হিসাব করা হয়।'
              : 'These numbers are calculated from the records stored on LIFORA.'}
          </p>
        </motion.div>

        {/* 5-Column Dynamic Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          {statItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`p-6 rounded-3xl border transition-all duration-300 shadow-2xs ${
                item.highlight
                  ? 'border-[#0D7A5F]/40 dark:border-[#10B981]/40 bg-[#F0FDF4] dark:bg-[#06231C]/60 shadow-sm'
                  : 'border-[#E2E8F0] dark:border-[#222D35] bg-white dark:bg-[#12181C]'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                  {item.label}
                </span>
                <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                  {item.icon}
                </div>
              </div>

              <div className="text-3xl sm:text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                {(item as { empty?: boolean }).empty ? (
                  <span aria-label={language === 'bn' ? 'এখনো তথ্য নেই' : 'no data yet'}>—</span>
                ) : (
                  <AnimatedCounter 
                    target={item.target} 
                    suffix={item.suffix} 
                    inView={inView} 
                    decimals={item.decimals} 
                  />
                )}
              </div>

              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-2.5 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

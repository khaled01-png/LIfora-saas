import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Building2, MapPin, Phone, Clock, ShieldCheck, Navigation, Search, CheckCircle, ExternalLink, Droplet } from 'lucide-react';
import { BloodCenter } from '../../types';
import { CenterMap } from '../common/CenterMap';
import { AdSlot } from '../common/AdSlot';

export const BloodCentersPage: React.FC = () => {
  const { centers, inventory, showToast, setActiveView, setSearchParams, language, t } = useApp();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [mapOpenId, setMapOpenId] = useState<string | null>(null);

  const filteredCenters = centers.filter(c => {
    if (selectedType !== 'All' && c.type !== selectedType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q) || c.city.toLowerCase().includes(q);
    }
    return true;
  });

  const getFacilityTypeLabel = (type?: string) => {
    if (!type) return '';
    if (language === 'bn') {
      if (type === 'Hospital Blood Bank') return 'হাসপাতাল ব্লাড ব্যাংক';
      if (type === 'Specialized Transfusion Lab') return 'বিশেষায়িত ট্রান্সফিউশন ল্যাব';
      if (type === 'Humanitarian Blood Bank') return 'মানবিক ব্লাড ব্যাংক';
    }
    return type;
  };

  return (
    <div id="blood-centers-page" className="pt-28 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      
      {/* Header */}
      <div className="pb-8 border-b border-[#E2E8F0] dark:border-[#222D35] mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D7A5F]/10 dark:bg-[#10B981]/15 text-[#0D7A5F] dark:text-[#10B981] text-xs font-bold uppercase tracking-wider mb-3">
          <Building2 className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'রক্ত সঞ্চালন কেন্দ্র' : 'Transfusion Facilities'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          {language === 'bn' ? 'রক্তকেন্দ্র ও ট্রান্সফিউশন ল্যাব' : 'Blood Banks & Clinical Centers'}
        </h1>
        <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] mt-1 max-w-2xl leading-relaxed">
          {language === 'bn'
            ? 'বাংলাদেশ জুড়ে প্রত্যয়িত ব্লাড ব্যাংক, হাসপাতাল রক্ত সঞ্চালন ল্যাব এবং স্বেচ্ছাসেবী রক্ত সংগ্রহ কেন্দ্রের পূর্ণাঙ্গ তালিকা।'
            : 'Comprehensive directory of certified regional blood storage banks, hospital transfusion laboratories, and voluntary collection hubs across Bangladesh.'}
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-8">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder={language === 'bn' ? 'কেন্দ্রের নাম, হাসপাতাল, রোড বা এলাকা দিয়ে খুঁজুন...' : 'Search by facility name, hospital, road, or area...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-white dark:bg-[#12181C] text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#0D7A5F]"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-white dark:bg-[#12181C] text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#0D7A5F]"
          >
            <option value="All">{language === 'bn' ? 'সকল ধরণের কেন্দ্র' : 'All Facility Types'}</option>
            <option value="Hospital Blood Bank">{language === 'bn' ? 'হাসপাতাল ব্লাড ব্যাংক' : 'Hospital Blood Bank'}</option>
            <option value="Specialized Transfusion Lab">{language === 'bn' ? 'বিশেষায়িত ট্রান্সফিউশন ল্যাব' : 'Specialized Transfusion Lab'}</option>
            <option value="Humanitarian Blood Bank">{language === 'bn' ? 'মানবিক ব্লাড ব্যাংক' : 'Humanitarian Blood Bank'}</option>
          </select>
        </div>
      </div>

      {/* Centers Grid */}
      {filteredCenters.length === 0 && (
        <div className="p-10 rounded-3xl border border-dashed border-[#E2E8F0] dark:border-[#222D35] text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
          {language === 'bn'
            ? 'এখনো কোনো রক্তকেন্দ্র যুক্ত করা হয়নি। অনুগ্রহ করে নিকটস্থ হাসপাতালে সরাসরি যোগাযোগ করুন।'
            : 'No blood centers have been added yet. Please contact your nearest hospital directly.'}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCenters.map(center => (
          <div
            key={center.id}
            className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xs flex flex-col justify-between lifora-card-hover"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0D7A5F]/10 dark:bg-[#10B981]/15 text-[#0D7A5F] dark:text-[#10B981] flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                      {center.name}
                      {center.verified && (
                        <ShieldCheck className="w-4 h-4 text-[#0D7A5F] dark:text-[#10B981]" />
                      )}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                      {getFacilityTypeLabel(center.type)}
                    </span>
                  </div>
                </div>

                {center.distanceKm > 0 && (
                  <span className="text-xs font-mono font-bold text-[#0D7A5F] dark:text-[#10B981] shrink-0">
                    {center.distanceKm} {language === 'bn' ? 'কিমি' : 'km'}
                  </span>
                )}
              </div>

              <div className="space-y-2 py-3 border-y border-[#E2E8F0] dark:border-[#222D35] my-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                <p className="flex items-center gap-2 text-[#0F172A] dark:text-white font-medium">
                  <MapPin className="w-4 h-4 text-[#0D7A5F] shrink-0" />
                  {center.address}, {center.city}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0D7A5F] shrink-0" />
                  <span>
                    {language === 'bn' ? 'কার্যসময়: ' : 'Hours: '}
                    <strong className="text-[#0F172A] dark:text-white">{center.openHours}</strong>
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#64748B] shrink-0" />
                  <span>
                    {language === 'bn' ? 'হাসপাতালের ফোন: ' : 'Hospital phone: '}
                    <strong className="text-[#0F172A] dark:text-white">{center.phone}</strong>
                  </span>
                </p>
              </div>

              {/* Blood Inventory Snapshot */}
              <div className="mt-3">
                <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-[#94A3B8] tracking-wider block mb-2">
                  {language === 'bn' ? 'অ্যাডমিন-আপডেট করা মজুদ' : 'Stock recorded by admins'}
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {inventory.slice(0, 4).map(inv => (
                    <div key={inv.bloodGroup} className="p-2 rounded-xl bg-[#F8FAF9] dark:bg-[#0B0F12] border border-[#E2E8F0] dark:border-[#222D35] text-center">
                      <span className="font-extrabold text-[#DC2626] text-xs block">{inv.bloodGroup}</span>
                      <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-bold">
                        {inv.availableUnits} {language === 'bn' ? 'ইউনিট' : 'units'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-5 mt-4 border-t border-[#E2E8F0] dark:border-[#222D35]">
              <a
                href={`tel:${center.phone}`}
                className="flex-1 py-2.5 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'কল করুন' : 'Call Center'}</span>
              </a>
              <button
                onClick={() => {
                  setSearchParams(prev => ({ ...prev, location: center.city }));
                  setActiveView('find-blood');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] hover:border-[#0D7A5F] text-[#0F172A] dark:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-[#0D7A5F]" />
                <span>{language === 'bn' ? 'কাছাকাছি রক্তদাতা' : 'Nearby Donors'}</span>
              </button>
              <button
                onClick={() => setMapOpenId(prev => (prev === center.id ? null : center.id))}
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] hover:border-[#0D7A5F] text-[#0F172A] dark:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#0D7A5F]" />
                <span>{language === 'bn' ? 'মানচিত্র' : 'Map'}</span>
              </button>
            </div>
            {mapOpenId === center.id && (
              <div className="mt-4">
                <CenterMap center={center} />
              </div>
            )}
          </div>
        ))}
      </div>

      <AdSlot />

    </div>
  );
};

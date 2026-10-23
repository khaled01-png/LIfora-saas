import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, X, Droplet, MapPin, AlertCircle, Building2, User, ArrowRight } from 'lucide-react';

export const SearchModal: React.FC = () => {
  const { isSearchModalOpen, setIsSearchModalOpen, donors, requests, centers, setActiveView, openContactDonor, language } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) {
      return {
        donors: donors.slice(0, 3),
        requests: requests.filter(r => r.urgency === 'Critical').slice(0, 3),
        centers: centers.slice(0, 3)
      };
    }
    const q = searchTerm.toLowerCase();
    return {
      donors: donors.filter(d => 
        d.name.toLowerCase().includes(q) || 
        d.bloodGroup.toLowerCase().includes(q) || 
        d.location.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q)
      ).slice(0, 4),
      requests: requests.filter(r => 
        r.patientName.toLowerCase().includes(q) || 
        r.bloodGroup.toLowerCase().includes(q) || 
        r.hospitalName.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      ).slice(0, 4),
      centers: centers.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.address.toLowerCase().includes(q) || 
        c.city.toLowerCase().includes(q)
      ).slice(0, 4)
    };
  }, [searchTerm, donors, requests, centers]);

  if (!isSearchModalOpen) return null;

  return (
    <div 
      id="search-modal-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 pb-4 bg-black/65 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsSearchModalOpen(false);
      }}
    >
      <div 
        id="search-modal-container"
        className="relative w-full max-w-2xl bg-white dark:bg-[#12181C] rounded-3xl border border-[#E2E8F0] dark:border-[#222D35] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#222D35] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#0D7A5F] dark:text-[#10B981] shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder={language === 'bn' ? 'রক্তের গ্রুপ (যেমন O-, B+), শহর, হাসপাতাল বা ডোনারের নাম লিখুন...' : 'Type blood group (e.g. O-, B+), city, hospital, or donor name...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none text-base text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsSearchModalOpen(false)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#64748B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Section 1: Compatible Donors */}
          {filtered.donors.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#0D7A5F]" />
                  Verified Donors ({filtered.donors.length})
                </span>
                <button 
                  onClick={() => { setActiveView('find-blood'); setIsSearchModalOpen(false); }}
                  className="text-xs font-semibold text-[#0D7A5F] dark:text-[#10B981] hover:underline"
                >
                  View all donors →
                </button>
              </div>

              <div className="space-y-2">
                {filtered.donors.map(donor => (
                  <div
                    key={donor.id}
                    onClick={() => {
                      openContactDonor(donor);
                      setIsSearchModalOpen(false);
                    }}
                    className="p-3 rounded-2xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] hover:border-[#0D7A5F] flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-[#DC2626] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        {donor.bloodGroup}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-[#0F172A] dark:text-white group-hover:text-[#0D7A5F] transition-colors">
                          {donor.name}
                        </p>
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                          {donor.location}, {donor.city}{donor.distanceKm > 0 ? ` • ${donor.distanceKm} km away` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#0D7A5F] dark:text-[#10B981] group-hover:translate-x-1 transition-transform">
                      Contact →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Active Blood Requests */}
          {filtered.requests.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                  Emergency Requests ({filtered.requests.length})
                </span>
                <button 
                  onClick={() => { setActiveView('requests'); setIsSearchModalOpen(false); }}
                  className="text-xs font-semibold text-[#0D7A5F] dark:text-[#10B981] hover:underline"
                >
                  View all requests →
                </button>
              </div>

              <div className="space-y-2">
                {filtered.requests.map(req => (
                  <div
                    key={req.id}
                    onClick={() => {
                      setActiveView('requests');
                      setIsSearchModalOpen(false);
                    }}
                    className="p-3 rounded-2xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] hover:border-[#DC2626] flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-[#DC2626] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        {req.bloodGroup}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                          {req.hospitalName}
                        </p>
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                          {req.patientName} • {req.unitsNeeded} unit(s) • <span className="text-[#DC2626] font-semibold">{req.urgency}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#0D7A5F] dark:text-[#10B981] group-hover:translate-x-1 transition-transform">
                      Respond →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Blood Centers */}
          {filtered.centers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#0D7A5F]" />
                  Transfusion Centers ({filtered.centers.length})
                </span>
                <button 
                  onClick={() => { setActiveView('centers'); setIsSearchModalOpen(false); }}
                  className="text-xs font-semibold text-[#0D7A5F] dark:text-[#10B981] hover:underline"
                >
                  View all centers →
                </button>
              </div>

              <div className="space-y-2">
                {filtered.centers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveView('centers');
                      setIsSearchModalOpen(false);
                    }}
                    className="p-3 rounded-2xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] hover:border-[#0D7A5F] flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#0F172A] dark:text-white">{c.name}</p>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {c.address}, {c.city}{c.distanceKm > 0 ? ` • ${c.distanceKm} km` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#0D7A5F] dark:text-[#10B981]">
                      {c.openHours || 'Call to confirm'} →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

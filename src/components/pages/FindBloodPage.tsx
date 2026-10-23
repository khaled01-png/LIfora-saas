import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BloodGroup, Donor } from '../../types';
import { api } from '../../services/api';
import { 
  Search, 
  MapPin, 
  ShieldCheck, 
  Phone, 
  Droplet, 
  User, 
  PlusCircle, 
  ArrowRight, 
  Heart,
  SlidersHorizontal,
  X,
  Sparkles
} from 'lucide-react';

export const FindBloodPage: React.FC = () => {
  const { 
    searchParams, 
    setSearchParams, 
    openContactDonor, 
    setQuickRequestModalOpen, 
    openAuthModal, 
    currentUser,
    language,
    showToast,
    t 
  } = useApp();

  const PAGE_SIZE = 12;
  const [query, setQuery] = useState(searchParams.location || '');
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup | ''>((searchParams.bloodGroup as BloodGroup) || '');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'Available' | 'Unavailable'>('all');
  const [maxDistance, setMaxDistance] = useState<number>(100);
  const [sortBy, setSortBy] = useState<'distance' | 'match' | 'donations'>('distance');
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  const groups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // One page of donors from the server: with thousands of donors, they can never all sit on one page.
  const [pageDonors, setPageDonors] = useState<Donor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Any filter change starts again from page 1.
  useEffect(() => { setPage(1); }, [selectedGroup, availabilityFilter, maxDistance, sortBy, debouncedQuery]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.donors.getAll({
      blood_group: selectedGroup || undefined,
      availability: availabilityFilter === 'all' ? undefined : availabilityFilter,
      q: debouncedQuery || undefined,
      max_distance: maxDistance,
      sort: sortBy,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    } as any)
      .then(res => { if (!cancelled) { setPageDonors(res.donors); setTotal(res.total ?? res.count); } })
      .catch((err: any) => { if (!cancelled) { setPageDonors([]); setTotal(0); showToast(err?.message || (language === 'bn' ? 'রক্তদাতাদের তালিকা লোড করা যায়নি।' : 'Could not load the donors.')); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup, availabilityFilter, maxDistance, sortBy, debouncedQuery, page]);

  const filteredDonors = pageDonors;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const goToPage = (n: number) => {
    setPage(n);
    document.getElementById('find-blood-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  // 1 2 3 … 9 10 : first, last and the pages around the current one
  const pageButtons = (): (number | '…')[] => {
    const out: (number | '…')[] = [];
    for (let n = 1; n <= totalPages; n++) {
      if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) out.push(n);
      else if (out[out.length - 1] !== '…') out.push('…');
    }
    return out;
  };

  const activeFiltersCount = (selectedGroup ? 1 : 0) + (availabilityFilter !== 'all' ? 1 : 0) + (maxDistance !== 100 ? 1 : 0);

  return (
    <div id="find-blood-page" className="pt-24 sm:pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E2E8F0] dark:border-[#1E293B] mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#DC2626] dark:text-[#EF4444] bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full border border-red-200 dark:border-red-900/50 inline-block mb-3">
            {t('nav.findBlood')}
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
            {t('find.title')}
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1.5 max-w-2xl leading-relaxed">
            {t('find.subtitle')}
          </p>
        </div>

        <button
          onClick={() => setQuickRequestModalOpen(true)}
          className="h-11 px-5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-xs shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('btn.postRequest')}</span>
        </button>
      </div>

      {/* Receiver / Caregiver Registration Prompt */}
      {(!currentUser || currentUser.role !== 'requester') && (
        <div className="mb-8 p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#DC2626] dark:text-[#EF4444] border border-red-200 dark:border-red-900/50 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {t('find.receiverCalloutTitle')}
              </h4>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 max-w-2xl leading-relaxed">
                {t('find.receiverCalloutDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => openAuthModal('register', 'requester')}
              className="h-10 px-4 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>{t('btn.registerReceiver')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => openAuthModal('register', 'donor')}
              className="h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] hover:border-[#DC2626] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 text-[#DC2626]" />
              <span className="hidden sm:inline">{t('btn.becomeDonor')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xs mb-8 space-y-4">
        
        {/* Blood Groups Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              {t('find.filterGroup')}
            </span>
            {selectedGroup && (
              <button 
                onClick={() => setSelectedGroup('')}
                className="text-xs font-bold text-[#DC2626] dark:text-[#EF4444] hover:underline cursor-pointer"
              >
                {t('btn.clearSelection')} ({t('find.filterAll')})
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {groups.map(group => {
              const isSelected = selectedGroup === group;
              return (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(isSelected ? '' : group)}
                  className={`h-10 rounded-xl text-sm font-bold border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-sm'
                      : 'bg-slate-50 dark:bg-[#0B0F17] border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#DC2626]'
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search, Availability, Distance & Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
          
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={t('find.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-slate-50 dark:bg-[#0B0F17] text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#DC2626]"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-slate-50 dark:bg-[#0B0F17] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#DC2626] cursor-pointer"
            >
              <option value="all">{language === 'bn' ? 'উপলব্ধতা: সকল রক্তদাতা' : 'Availability: All Donors'}</option>
              <option value="Available">{language === 'bn' ? 'সরাসরি প্রস্তুত (On-Call)' : 'Available On-Call'}</option>
              <option value="Unavailable">{language === 'bn' ? 'কোলডাউন / ব্যস্ত' : 'Cooldown / Busy'}</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-slate-50 dark:bg-[#0B0F17] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#DC2626] cursor-pointer"
            >
              <option value="10">{language === 'bn' ? 'দূরত্ব: ১০ কিমি' : 'Radius: 10 km'}</option>
              <option value="25">{language === 'bn' ? 'দূরত্ব: ২৫ কিমি' : 'Radius: 25 km'}</option>
              <option value="50">{language === 'bn' ? 'দূরত্ব: ৫০ কিমি' : 'Radius: 50 km'}</option>
              <option value="100">{language === 'bn' ? 'দূরত্ব: ১০০ কিমি' : 'Radius: 100 km'}</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-slate-50 dark:bg-[#0B0F17] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#DC2626] cursor-pointer"
            >
              <option value="distance">{t('find.sortDistance')}</option>
              <option value="match">{t('find.sortMatch')}</option>
              <option value="donations">{t('find.sortDonations')}</option>
            </select>
          </div>

        </div>

        {/* Results Counter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-2.5 border-t border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8]">
          <span>
            {t('find.foundCount', { count: total })}
            {selectedGroup && ` ${t('find.forGroup', { group: selectedGroup })}`}
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t('find.verifiedBadge')}
          </span>
        </div>

      </div>

      {/* Donors Grid */}
      <div id="find-blood-results" />
      {loading && filteredDonors.length === 0 ? (
        <p className="py-14 text-center text-sm text-[#64748B]" aria-busy="true">{language === 'bn' ? 'রক্তদাতাদের তালিকা লোড হচ্ছে…' : 'Loading donors…'}</p>
      ) : filteredDonors.length === 0 ? (
        <div className="py-14 px-4 text-center rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827]">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-3 text-[#DC2626]">
            <Droplet className="w-6 h-6 text-[#DC2626]" />
          </div>
          <h3 className="font-bold text-base text-[#0F172A] dark:text-[#F8FAFC] mb-1">
            {t('find.noDonorsTitle')}
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto mb-5 leading-relaxed">
            {t('find.noDonorsDesc')}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setSelectedGroup(''); setQuery(''); setMaxDistance(100); setAvailabilityFilter('all'); }}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              {t('btn.resetFilters')}
            </button>
            <button
              onClick={() => setQuickRequestModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-2xs cursor-pointer"
            >
              {t('btn.postRequest')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDonors.map((donor) => {
            const isAvailable = donor.availability === 'Available';
            const isCooldown = donor.availability === 'Recently Donated';

            return (
              <div
                key={donor.id}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  
                  {/* Top Row: [Blood Group Badge] + Donor Name + Match % */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      
                      {/* Blood Group Badge */}
                      <div className="w-11 h-11 rounded-xl bg-[#DC2626] text-white font-extrabold text-lg flex items-center justify-center shrink-0 shadow-sm">
                        {donor.bloodGroup}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5 truncate">
                          <span className="truncate">{donor.name}</span>
                          {donor.verified && (
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </h3>
                        
                        {/* Compact Availability Status Pill */}
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            isAvailable
                              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40'
                              : isCooldown
                                ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40'
                                : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? 'bg-emerald-500' : isCooldown ? 'bg-amber-500' : 'bg-slate-400'
                            }`} />
                            <span>
                              {donor.availability === 'Available' ? t('status.available') : donor.availability === 'Recently Donated' ? t('status.recentlyDonated') : t('status.unavailable')}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Match % */}
                    {donor.matchPercentage > 0 && (
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-[#DC2626] dark:text-[#EF4444] block">
                          {donor.matchPercentage}%
                        </span>
                        <span className="text-[10px] text-[#94A3B8] font-medium">
                          {t('find.cardMatch')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Location & Stats Row */}
                  <div className="py-2.5 my-2.5 border-y border-[#E2E8F0] dark:border-[#1E293B] space-y-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    <p className="flex items-center gap-1.5 text-[#0F172A] dark:text-[#F8FAFC] font-medium truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                      <span className="truncate">{donor.location}, {donor.city}</span>
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {donor.distanceKm > 0 ? (
                        <span>{t('find.cardDistance')}: <strong className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold">{donor.distanceKm} km</strong></span>
                      ) : <span />}
                      <span><strong className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold">{donor.totalDonations}</strong> {t('find.cardDonations')}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {donor.bio && (
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-2 leading-relaxed mb-4">
                      {donor.bio}
                    </p>
                  )}
                </div>

                {/* Primary Action Button */}
                <div className="pt-2">
                  <button
                    onClick={() => openContactDonor(donor)}
                    className="w-full h-10 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{t('btn.contactDonor')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Page numbers: 1 2 3 ... */}
      {totalPages > 1 && (
        <nav aria-label={language === 'bn' ? 'পেজ নম্বর' : 'Pages'} className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="h-10 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            {language === 'bn' ? 'আগের' : 'Previous'}
          </button>
          {pageButtons().map((n, i) => n === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-[#94A3B8]">…</span>
          ) : (
            <button
              key={n}
              onClick={() => goToPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`h-10 min-w-10 px-3 rounded-xl border text-xs font-bold cursor-pointer ${n === page ? 'bg-[#DC2626] border-[#DC2626] text-white' : 'border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#DC2626]'}`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
            className="h-10 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            {language === 'bn' ? 'পরের' : 'Next'}
          </button>
        </nav>
      )}

    </div>
  );
};

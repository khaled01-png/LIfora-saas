import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BloodGroup, UrgencyLevel, BloodRequest } from '../../types';
import { 
  AlertCircle, 
  Clock, 
  Hospital, 
  MapPin, 
  HeartHandshake, 
  Plus, 
  Phone, 
  Check, 
  X, 
  User, 
  Send,
  Link2,
  SlidersHorizontal,
  Flame
} from 'lucide-react';

export const BloodRequestsPage: React.FC = () => {
  const { 
    requests, 
    respondToRequest, 
    userResponses, 
    loadMyResponses,
    showToast,
    setQuickRequestModalOpen, 
    openAuthModal, 
    currentUser,
    language,
    t 
  } = useApp();

  const [selectedGroup, setSelectedGroup] = useState<BloodGroup | ''>('');
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel | ''>('');
  const [hospitalQuery, setHospitalQuery] = useState('');

  // Response Modal State
  const [respondingTo, setRespondingTo] = useState<BloodRequest | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  const groups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // A donor who already answered a request should still see "Responded" after reloading the page.
  const requestIds = requests.map(r => r.id).join(',');
  useEffect(() => {
    if (currentUser?.role === 'donor' && requestIds) void loadMyResponses(requestIds.split(','));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestIds, currentUser?.id]);

  const copyLink = async (id: string) => {
    const link = `${window.location.origin}/?request=${encodeURIComponent(id)}`;
    try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
    showToast(language === 'bn' ? 'লিংক কপি হয়েছে। যাঁরা সাহায্য করতে পারেন তাঁদের পাঠান।' : 'Link copied. Send it to people who can help.');
  };
  const deadlineText = (d: string) => {
    if (language !== 'bn') return d;
    const m = d.match(/^Within (\d+) (hours?|days?)$/i);
    return m ? `${m[1]} ${/hour/i.test(m[2]) ? 'ঘণ্টার' : 'দিনের'} মধ্যে` : d;
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (selectedGroup && r.bloodGroup !== selectedGroup) return false;
      if (selectedUrgency && r.urgency !== selectedUrgency) return false;
      if (hospitalQuery.trim()) {
        const q = hospitalQuery.toLowerCase();
        const match = 
          r.hospitalName.toLowerCase().includes(q) ||
          r.patientName.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [requests, selectedGroup, selectedUrgency, hospitalQuery]);

  const handleOpenResponse = (req: BloodRequest) => {
    setRespondingTo(req);
    setResponseNote(
      language === 'bn' 
        ? `আমি ${req.hospitalName}-এ জরুরি রক্তদানে স্বেচ্ছায় অংশ নিতে প্রস্তুত।`
        : `I am an on-call voluntary donor available to donate at ${req.hospitalName}.`
    );
  };

  const handleConfirmResponse = async () => {
    if (!respondingTo) return;
    setIsSubmittingResponse(true);
    await respondToRequest(respondingTo.id, responseNote);
    setIsSubmittingResponse(false);
    setRespondingTo(null);
  };

  return (
    <div 
      id="blood-requests-page" 
      className="min-h-screen pt-24 sm:pt-28 pb-24 transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E2E8F0] dark:border-[#1E293B] mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-[#DC2626] dark:text-[#EF4444] text-xs font-bold uppercase tracking-wider mb-3 border border-red-200 dark:border-red-900/50 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
              <span>{t('requests.triageBadge')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
              {t('requests.title')}
            </h1>
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1.5 max-w-2xl leading-relaxed">
              {t('requests.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            {currentUser?.role !== 'donor' && (
<button
              onClick={() => setQuickRequestModalOpen(true)}
              className="h-11 px-5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('btn.postRequest')}</span>
            </button>
)}
          </div>
        </div>

        {/* Filter Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xs mb-8 space-y-4">
          
          {/* Blood Groups quick filter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                {t('find.filterGroup')}:
              </span>
              {selectedGroup && (
                <button
                  onClick={() => setSelectedGroup('')}
                  className="text-xs font-bold text-[#DC2626] dark:text-[#EF4444] hover:underline cursor-pointer"
                >
                  {t('btn.clearSelection')} ({t('requests.filterAll')})
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-9 gap-2">
              <button
                onClick={() => setSelectedGroup('')}
                className={`h-10 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  !selectedGroup 
                    ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-2xs' 
                    : 'bg-slate-50 dark:bg-[#0B0F17] border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#DC2626]'
                }`}
              >
                {t('requests.filterAll')}
              </button>
              {groups.map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGroup(selectedGroup === g ? '' : g)}
                  className={`h-10 rounded-xl text-sm font-bold border transition-colors cursor-pointer ${
                    selectedGroup === g
                      ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-2xs'
                      : 'bg-slate-50 dark:bg-[#0B0F17] border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#DC2626]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Urgency Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="sm:col-span-8">
              <input
                type="text"
                placeholder={t('requests.searchPlaceholder')}
                value={hospitalQuery}
                onChange={(e) => setHospitalQuery(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-slate-50 dark:bg-[#0B0F17] text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#DC2626]"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-slate-50 dark:bg-[#0B0F17] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#DC2626] cursor-pointer"
              >
                <option value="">{t('requests.allUrgencies')}</option>
                <option value="Critical">{t('urgency.critical')}</option>
                <option value="Urgent">{t('urgency.urgent')}</option>
                <option value="Normal">{t('urgency.normal')}</option>
              </select>
            </div>
          </div>

          {/* Counter info */}
          <div className="flex items-center justify-between text-xs pt-2.5 border-t border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8]">
            <span>
              {language === 'bn' ? `মোট ${filteredRequests.length}টি জরুরি রক্তের অনুরোধ` : `Showing ${filteredRequests.length} active transfusion requests`}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>{language === 'bn' ? 'সরাসরি ট্রায়াজ সিনক্রোনাইজেশন' : 'Real-time triage synchronization'}</span>
            </span>
          </div>

        </div>

        {/* Requests Grid */}
        {filteredRequests.length === 0 ? (
          <div className="py-14 px-4 text-center rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827]">
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-3 text-[#DC2626]">
              <AlertCircle className="w-6 h-6 text-[#DC2626]" />
            </div>
            <h3 className="font-bold text-base text-[#0F172A] dark:text-[#F8FAFC] mb-1">
              {t('requests.noRequestsTitle')}
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto mb-5 leading-relaxed">
              {t('requests.noRequestsDesc')}
            </p>
            <button
              onClick={() => { setSelectedGroup(''); setSelectedUrgency(''); setHospitalQuery(''); }}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              {t('btn.resetFilters')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRequests.map((req) => {
              const isCritical = req.urgency === 'Critical';
              const isUrgent = req.urgency === 'Urgent';
              const hasResponded = Boolean(userResponses[req.id]);

              return (
                <div
                  key={req.id}
                  className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between bg-white dark:bg-[#111827] ${
                    isCritical 
                      ? 'border-red-300 dark:border-red-900/60 shadow-sm' 
                      : 'border-[#E2E8F0] dark:border-[#1E293B] shadow-2xs'
                  }`}
                >
                  <div>
                    {/* 1. Priority & Time Remaining */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isCritical
                          ? 'text-[#DC2626] bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50'
                          : isUrgent
                            ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40'
                            : 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isCritical ? 'bg-[#DC2626] animate-pulse' : isUrgent ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <span>
                          {req.urgency === 'Critical' ? t('urgency.critical') : req.urgency === 'Urgent' ? t('urgency.urgent') : t('urgency.normal')}
                        </span>
                      </span>

                      <span className="flex items-center gap-1 text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                        <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>{deadlineText(req.deadline)}</span>
                      </span>
                    </div>

                    {/* 2. Blood Group Badge & Units Needed */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-[#DC2626] text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-sm">
                        {req.bloodGroup}
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                          {req.unitsNeeded} {req.unitsNeeded === 1 ? t('requests.unitSingular') : t('requests.unitsPlural')}
                        </div>
                        <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          {t('requests.unitsNeeded')}
                        </span>
                      </div>
                    </div>

                    {/* 3. Hospital Name & Location */}
                    <div className="py-2.5 my-2 border-y border-[#E2E8F0] dark:border-[#1E293B] space-y-1 text-xs">
                      <div className="flex items-start gap-1.5 font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        <Hospital className="w-3.5 h-3.5 text-[#DC2626] shrink-0 mt-0.5" />
                        <span className="truncate">{req.hospitalName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#64748B] dark:text-[#94A3B8] text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                        <span className="truncate">{req.city}</span>
                      </div>
                    </div>

                    {/* 4. Natural Medical Reason */}
                    <div className="mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block mb-0.5">
                        {t('requests.reason')}
                      </span>
                      <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                        {req.reason}
                      </p>
                    </div>

                    {/* 5. Patient & Contact Information */}
                    <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-between mb-4">
                      <span>{t('requests.patient')}: <strong className="text-[#0F172A] dark:text-[#F8FAFC] font-medium">{req.patientName.split(' ')[0]}</strong></span>
                      <span><strong className="text-[#0F172A] dark:text-[#F8FAFC] font-medium">{req.responsesCount}</strong> {t('requests.responses')}</span>
                    </div>

                  </div>

                  {/* 6. Primary Action Button: "I Can Help" */}
                  <div className="pt-2 space-y-2">
                    {hasResponded ? (
                      <div className="w-full h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" />
                        <span>{t('requests.alreadyResponded')}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenResponse(req)}
                        className="w-full h-10 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <HeartHandshake className="w-4 h-4" />
                        <span>{t('btn.iCanHelp')}</span>
                      </button>
                    )}
                    <button
                      onClick={() => copyLink(req.id)}
                      className="w-full h-9 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-[11px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'লিংক কপি করে শেয়ার করুন' : 'Copy link to share'}</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Response Modal */}
      {respondingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl p-5 sm:p-6 text-[#0F172A] dark:text-[#F8FAFC]">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B] mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {t('requests.modalTitle')}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  {t('requests.modalSubtitle')}
                </p>
              </div>
              <button 
                onClick={() => setRespondingTo(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-[#64748B] dark:text-[#94A3B8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Request Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1E293B] mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#DC2626] text-white font-extrabold text-base flex items-center justify-center shrink-0">
                {respondingTo.bloodGroup}
              </div>
              <div className="min-w-0 text-xs">
                <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">{respondingTo.hospitalName}</p>
                <p className="text-[#64748B] dark:text-[#94A3B8] text-[11px] truncate">
                  {respondingTo.unitsNeeded} {t('requests.unitsNeeded')} • {deadlineText(respondingTo.deadline)}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                {language === 'bn' ? 'রোগীর অভিভাবক / দায়িত্বরত নার্সকে বার্তা:' : 'Message to Patient Guardian / Attending Nurse:'}
              </label>
              <textarea
                rows={3}
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                placeholder={t('requests.messagePlaceholder')}
                className="w-full p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-slate-50 dark:bg-[#0B0F17] text-xs text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#DC2626] resize-none"
              />
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                {language === 'bn' 
                  ? `আপনার ফোন নম্বর (${currentUser?.phone || '—'}) জরুরি সমন্বয়ের জন্য রোগীর অভিভাবকের সাথে সুরক্ষিতভাবে শেয়ার করা হবে।`
                  : `Your phone number (${currentUser?.phone || '—'}) will be shared securely with the patient guardian for urgent coordination.`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              <button
                onClick={() => setRespondingTo(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
              >
                {t('btn.cancelRequest')}
              </button>
              <button
                onClick={handleConfirmResponse}
                disabled={isSubmittingResponse}
                className="px-5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingResponse ? t('requests.submitting') : t('requests.submitResponse')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

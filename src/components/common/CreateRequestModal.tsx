import { validateName, validatePhone, validateHospital, normalizePhone, DEADLINE_OPTIONS } from '../../utils/validation';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Droplet, Clock, Hospital, Phone, User, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { BloodGroup, UrgencyLevel } from '../../types';

export const CreateRequestModal: React.FC = () => {
  const { quickRequestModalOpen, setQuickRequestModalOpen, createBloodRequest, showToast, language, t } = useApp();
  const L = (en: string, b: string) => (language === 'bn' ? b : en);
  const deadlineLabel = (d: string) => {
    if (language !== 'bn') return d;
    const m = d.match(/^Within (\d+) (hours?|days?)$/i);
    return m ? `${m[1]} ${/hour/i.test(m[2]) ? 'ঘণ্টার' : 'দিনের'} মধ্যে` : d;
  };

  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O-');
  const [unitsNeeded, setUnitsNeeded] = useState(2);
  const [hospitalName, setHospitalName] = useState('');
  const [city, setCity] = useState('Sylhet, Bangladesh');
  const [urgency, setUrgency] = useState<UrgencyLevel>('Critical');
  const [deadline, setDeadline] = useState('Within 24 hours');
  const [reason, setReason] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  if (!quickRequestModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const units = Number(unitsNeeded);
    const problem =
      validateName(patientName) ||
      validateHospital(hospitalName) ||
      (!Number.isInteger(units) || units < 1 || units > 10 ? L('Units needed must be a whole number from 1 to 10.', 'কত ব্যাগ রক্ত লাগবে তা ১ থেকে ১০ এর মধ্যে একটি পূর্ণ সংখ্যা হতে হবে।') : null) ||
      validateName(contactPerson) ||
      validatePhone(contactPhone, true);
    if (problem) {
      showToast(problem);
      return;
    }

    const ok = await createBloodRequest({
      patientName: patientName.trim(),
      bloodGroup,
      unitsNeeded: units,
      hospitalName: hospitalName.trim(),
      city,
      urgency,
      deadline,
      reason: reason.trim() || 'Blood transfusion needed',
      contactPerson: contactPerson.trim(),
      contactPhone: normalizePhone(contactPhone)
    });

    if (ok) setQuickRequestModalOpen(false);
  };

  const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div 
      id="create-request-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setQuickRequestModalOpen(false);
      }}
    >
      <div 
        id="create-request-modal"
        className="relative w-full max-w-xl bg-white dark:bg-[#12181C] rounded-3xl border border-[#E2E8F0] dark:border-[#222D35] shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]"
      >
        <button
          onClick={() => setQuickRequestModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-[#DC2626] flex items-center justify-center text-white shadow-xs">
            <Droplet className="w-4 h-4 fill-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              {t('createModal.title')}
            </span>
            <span className="text-[10px] uppercase font-bold text-[#DC2626] ml-2 tracking-wider">
              {t('createModal.badge')}
            </span>
          </div>
        </div>

        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-6">
          {t('createModal.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Urgency selector */}
          <div>
            <label className="block text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-2">
              {t('createModal.urgencyLabel')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Critical', 'Urgent', 'Normal'] as UrgencyLevel[]).map(u => (
                <button
                  type="button"
                  key={u}
                  onClick={() => setUrgency(u)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    urgency === u
                      ? u === 'Critical'
                        ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                        : u === 'Urgent'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-[#0D7A5F] text-white border-[#0D7A5F] shadow-xs'
                      : 'border-[#E2E8F0] dark:border-[#222D35] text-[#64748B] dark:text-[#94A3B8] hover:border-slate-300'
                  }`}
                >
                  {u === 'Critical' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-critical-pulse" />}
                  <span>{t(`urgency.badge.${u.toLowerCase()}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Blood group selection chips */}
          <div>
            <label className="block text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-2">
              {t('createModal.groupLabel')}
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {bloodGroups.map(bg => (
                <button
                  type="button"
                  key={bg}
                  onClick={() => setBloodGroup(bg)}
                  className={`py-2 text-xs font-extrabold rounded-xl border transition-all ${
                    bloodGroup === bg
                      ? 'bg-[#0D7A5F] text-white border-[#0D7A5F] shadow-xs'
                      : 'border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-[#0F172A] dark:text-white hover:border-[#0D7A5F]'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Patient name & Units */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                {t('createModal.patientLabel')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-[#94A3B8]" />
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder={L('e.g. Kazi Mahbub (ICU Bed 04)', 'যেমন: কাজী মাহবুব (আইসিইউ বেড ০৪)')}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                {t('createModal.unitsLabel')}
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setUnitsNeeded(Math.max(1, unitsNeeded - 1))}
                  className="w-9 h-9 rounded-l-xl border border-r-0 border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] font-bold text-sm text-[#0F172A] dark:text-white hover:bg-slate-100"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={unitsNeeded}
                  onChange={(e) => setUnitsNeeded(Number(e.target.value))}
                  className="w-full h-9 text-center border border-[#E2E8F0] dark:border-[#222D35] bg-white dark:bg-[#12181C] text-sm font-bold text-[#0F172A] dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setUnitsNeeded(Math.min(10, unitsNeeded + 1))}
                  className="w-9 h-9 rounded-r-xl border border-l-0 border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] font-bold text-sm text-[#0F172A] dark:text-white hover:bg-slate-100"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Hospital & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                {t('createModal.hospitalLabel')}
              </label>
              <div className="relative">
                <Hospital className="w-4 h-4 absolute left-3.5 top-3 text-[#94A3B8]" />
                <input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder={L('Hospital name', 'হাসপাতালের নাম')}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                {t('createModal.deadlineLabel')}
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3.5 top-3 text-[#94A3B8]" />
                <select
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  aria-label={L('How soon is the blood needed?', 'কত তাড়াতাড়ি রক্ত দরকার?')}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white"
                >
                  {DEADLINE_OPTIONS.map(o => <option key={o} value={o}>{deadlineLabel(o)}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Person & Emergency Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                {t('createModal.contactNameLabel')}
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder={L('Doctor / Guardian Name', 'ডাক্তার / অভিভাবকের নাম')}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                {t('createModal.contactPhoneLabel')} *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-[#94A3B8]" />
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+880 1711-000000"
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
              {t('createModal.reasonLabel')}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('createModal.reasonPlaceholder')}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white"
            />
          </div>

          <div className="p-3 rounded-2xl bg-[#F0FDF4] dark:bg-[#06231C] border border-[#D1FAE5] dark:border-[#0B3D31] flex items-start gap-2.5 text-xs text-[#0D7A5F] dark:text-[#10B981]">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{t('createModal.verifiedNotice')}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setQuickRequestModalOpen(false)}
              className="w-1/3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] text-xs font-bold text-[#64748B] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {t('btn.cancel')}
            </button>
            <button
              type="submit"
              className="w-2/3 py-2.5 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('createModal.submitBtn')}</span>
              <Check className="w-4 h-4" />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

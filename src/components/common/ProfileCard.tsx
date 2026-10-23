import React, { useState } from 'react';
import { BadgeCheck, MapPin, Phone, Droplet, Cake, Route, Pencil, Save, X, Mail } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BLOOD_GROUPS, validateOnboarding, normalizePhone } from '../../utils/validation';

/**
 * The profile collected at sign-up (blood group, age, city/location, travel distance, phone).
 * Shown, and editable, on both the donor dashboard and the requester dashboard.
 */
export const ProfileCard: React.FC = () => {
  const { currentUser, updateProfile, showToast, language } = useApp();
  const L = (en: string, b: string) => (language === 'bn' ? b : en);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bloodGroup, setBloodGroup] = useState(currentUser?.bloodGroup || 'O+');
  const [age, setAge] = useState(String(currentUser?.age ?? ''));
  const [city, setCity] = useState(currentUser?.city || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [radiusKm, setRadiusKm] = useState(String(currentUser?.radiusKm ?? ''));
  const [phone, setPhone] = useState(currentUser?.phone || '');

  if (!currentUser) return null;
  const isDonor = currentUser.role === 'donor';
  const kmLabel = isDonor ? L('Can travel up to', 'সর্বোচ্চ যেতে পারবেন') : L('Search distance', 'খোঁজার দূরত্ব');

  const input = 'w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0D7A5F]';
  const label = 'block text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateOnboarding({
      role: currentUser.role, bloodGroup, age: Number(age), city, location, radiusKm: Number(radiusKm), phone,
    });
    if (problem) {
      showToast(problem);
      return;
    }
    setSaving(true);
    const ok = await updateProfile({ bloodGroup, age: Number(age), city: city.trim(), location: location.trim(), radiusKm: Number(radiusKm), phone: normalizePhone(phone) });
    setSaving(false);
    if (ok) setEditing(false);
  };

  const rows = [
    { icon: Droplet, k: L('Blood group', 'রক্তের গ্রুপ'), v: currentUser.bloodGroup || '—' },
    { icon: Cake, k: L('Age', 'বয়স'), v: currentUser.age ? L(`${currentUser.age} years`, `${currentUser.age} বছর`) : '—' },
    { icon: MapPin, k: L('City / location', 'শহর / এলাকা'), v: [currentUser.city, currentUser.location].filter(Boolean).join(', ') || '—' },
    { icon: Route, k: kmLabel, v: currentUser.radiusKm ? `${currentUser.radiusKm} ${L('km', 'কিমি')}` : '—' },
    { icon: Phone, k: L('Phone', 'ফোন'), v: currentUser.phone || '—' },
  ];

  return (
    <section aria-label={L('My profile', 'আমার প্রোফাইল')} className="mb-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-white">{L('My profile', 'আমার প্রোফাইল')}</h2>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
            <Mail className="w-3 h-3" aria-hidden="true" /> {currentUser.email}
            {currentUser.emailVerified && (
              <span className="inline-flex items-center gap-1 text-[#0D7A5F] dark:text-[#10B981] font-semibold">
                <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> {L('Email verified', 'ইমেইল যাচাই হয়েছে')}
              </span>
            )}
          </p>
        </div>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] hover:border-[#0D7A5F] text-xs font-semibold text-[#0F172A] dark:text-white cursor-pointer">
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> {L('Edit', 'সম্পাদনা')}
          </button>
        ) : (
          <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] text-xs font-semibold text-[#64748B] cursor-pointer">
            <X className="w-3.5 h-3.5" aria-hidden="true" /> {L('Cancel', 'বাতিল')}
          </button>
        )}
      </div>

      {!editing ? (
        <dl className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-5 gap-3">
          {rows.map(r => (
            <div key={r.k} className="p-3 rounded-2xl bg-[#F8FAF9] dark:bg-[#0B0F12] border border-[#E2E8F0]/70 dark:border-[#222D35]">
              <dt className="flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]"><r.icon className="w-3.5 h-3.5 text-[#0D7A5F] dark:text-[#10B981]" aria-hidden="true" />{r.k}</dt>
              <dd className="mt-1 text-sm font-bold text-[#0F172A] dark:text-white break-words">{r.v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <form onSubmit={save} className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className={label} htmlFor="pc-bg">{L('Blood group', 'রক্তের গ্রুপ')}</label>
            <select id="pc-bg" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value as typeof bloodGroup)} className={input}>
              {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="pc-age">{L('Age', 'বয়স')}</label>
            <input id="pc-age" type="number" min={isDonor ? 18 : 16} max={isDonor ? 65 : 100} value={age} onChange={(e) => setAge(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="pc-km">{kmLabel} ({L('km', 'কিমি')})</label>
            <input id="pc-km" type="number" min={1} max={200} step="1" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="pc-city">{L('City', 'শহর')}</label>
            <input id="pc-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="pc-loc">{L('Area / location', 'এলাকা / ঠিকানা')}</label>
            <input id="pc-loc" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="pc-phone">{L('Phone', 'ফোন')}</label>
            <input id="pc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
          </div>
          <div className="min-[420px]:col-span-2 lg:col-span-3">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] disabled:opacity-60 text-white text-xs font-bold cursor-pointer">
              <Save className="w-4 h-4" aria-hidden="true" /> {L('Save profile', 'প্রোফাইল সংরক্ষণ')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

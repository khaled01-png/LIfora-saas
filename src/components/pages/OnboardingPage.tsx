import React, { useState } from 'react';
import { HeartHandshake, ClipboardList, ArrowLeft, ArrowRight, MailCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BLOOD_GROUPS, validateOnboarding, normalizePhone } from '../../utils/validation';

type Role = 'donor' | 'requester';

/** Step 3 of sign-up: choose Donor or Requester, then give blood group, age, city/location, distance (km) and phone. */
export const OnboardingPage: React.FC = () => {
  const { currentUser, completeOnboarding, showToast, logout, setActiveView, language } = useApp();
  const L = (en: string, b: string) => (language === 'bn' ? b : en);
  const [role, setRole] = useState<Role | null>(null);
  const [bloodGroup, setBloodGroup] = useState(currentUser?.bloodGroup || '');
  const [age, setAge] = useState(String(currentUser?.age ?? ''));
  const [city, setCity] = useState(currentUser?.profileCompleted ? currentUser?.city || '' : '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [radiusKm, setRadiusKm] = useState(String(currentUser?.radiusKm ?? '10'));
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [saving, setSaving] = useState(false);

  if (!currentUser) return null;
  const alreadySetUp = currentUser.role !== 'pending';

  const input = 'w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0D7A5F]';
  const label = 'block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    const problem = validateOnboarding({ role, bloodGroup, age: Number(age), city, location, radiusKm: Number(radiusKm), phone });
    if (problem) {
      showToast(problem);
      return;
    }
    setSaving(true);
    await completeOnboarding({ role, bloodGroup, age: Number(age), city: city.trim(), location: location.trim(), radiusKm: Number(radiusKm), phone: normalizePhone(phone) });
    setSaving(false);
  };

  const cards: { id: Role; title: string; text: string; icon: typeof HeartHandshake }[] = [
    { id: 'donor', title: L('Become a Donor', 'ডোনার হোন'), text: L('Get alerts when someone near you needs your blood group, and respond if you are able to help.', 'আপনার কাছাকাছি কারও আপনার রক্তের গ্রুপ দরকার হলে জানতে পারবেন, আর সাহায্য করতে পারলে সাড়া দিতে পারবেন।'), icon: HeartHandshake },
    { id: 'requester', title: L('Receiver', 'রক্ত গ্রহীতা'), text: L('Post a blood request for a patient and see which donors respond.', 'রোগীর জন্য রক্তের অনুরোধ দিন এবং কোন ডোনার সাড়া দিলেন দেখুন।'), icon: ClipboardList },
  ];

  return (
    <div id="onboarding-page" className="pt-24 sm:pt-28 pb-24 max-w-3xl mx-auto px-4 sm:px-6">
      <div className="mb-8 text-center">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0D7A5F] dark:text-[#10B981] bg-[#0D7A5F]/10 px-3 py-1 rounded-full">
          <MailCheck className="w-3.5 h-3.5" aria-hidden="true" /> {alreadySetUp ? L('Change how you use LIFORA', 'লাইফোরা কীভাবে ব্যবহার করবেন বদলান') : L('Email verified. Step 3 of 3', 'ইমেইল যাচাই হয়েছে। ধাপ ৩/৩')}
        </p>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
          {role ? L('Tell us a little about you', 'আপনার সম্পর্কে একটু জানান') : L(`Welcome, ${currentUser.name.split(' ')[0]}. How will you use LIFORA?`, `স্বাগতম, ${currentUser.name.split(' ')[0]}। আপনি লাইফোরা কীভাবে ব্যবহার করবেন?`)}
        </h1>
        <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
          {role ? L('Your name, email and password are already saved. We only need these details.', 'আপনার নাম, ইমেইল ও পাসওয়ার্ড আগেই সংরক্ষিত হয়েছে। আমাদের শুধু এই তথ্যগুলো লাগবে।') : L('Choose one. You can change it later from this page.', 'একটি বেছে নিন। পরে এই পেজ থেকে বদলাতে পারবেন।')}
        </p>
      </div>

      {!role ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setRole(c.id)}
              className="text-left p-6 rounded-3xl bg-white dark:bg-[#12181C] border-2 border-[#E2E8F0] dark:border-[#222D35] hover:border-[#0D7A5F] focus:outline-none focus:border-[#0D7A5F] transition-colors cursor-pointer"
            >
              <span className="w-12 h-12 rounded-2xl bg-[#0D7A5F]/10 text-[#0D7A5F] dark:text-[#10B981] flex items-center justify-center mb-4">
                <c.icon className="w-6 h-6" aria-hidden="true" />
              </span>
              <span className="block text-lg font-bold text-[#0F172A] dark:text-white">{c.title}</span>
              <span className="block mt-1.5 text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">{c.text}</span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#0D7A5F] dark:text-[#10B981]">{L('Continue', 'এগিয়ে যান')} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={submit} className="p-5 sm:p-8 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 flex items-center justify-between">
            <span className="text-sm font-bold text-[#0F172A] dark:text-white">{role === 'donor' ? L('Donor profile', 'ডোনার প্রোফাইল') : L('Receiver profile', 'রক্ত গ্রহীতার প্রোফাইল')}</span>
            <button type="button" onClick={() => setRole(null)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0D7A5F] cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> {L('Change choice', 'পছন্দ বদলান')}
            </button>
          </div>
          <div>
            <label className={label} htmlFor="ob-bg">{L('Blood group *', 'রক্তের গ্রুপ *')}</label>
            <select id="ob-bg" required value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className={input}>
              <option value="" disabled>{L('Select', 'বেছে নিন')}</option>
              {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="ob-age">{L('Age *', 'বয়স *')} {role === 'donor' ? L('(18 to 65)', '(১৮ থেকে ৬৫)') : ''}</label>
            <input id="ob-age" type="number" required min={role === 'donor' ? 18 : 16} max={role === 'donor' ? 65 : 100} value={age} onChange={(e) => setAge(e.target.value)} className={input} placeholder={L('e.g. 28', 'যেমন: ২৮')} />
          </div>
          <div>
            <label className={label} htmlFor="ob-city">{L('City *', 'শহর *')}</label>
            <input id="ob-city" type="text" required value={city} onChange={(e) => setCity(e.target.value)} className={input} placeholder={L('e.g. Sylhet', 'যেমন: সিলেট')} />
          </div>
          <div>
            <label className={label} htmlFor="ob-loc">{L('Area / location *', 'এলাকা / ঠিকানা *')}</label>
            <input id="ob-loc" type="text" required value={location} onChange={(e) => setLocation(e.target.value)} className={input} placeholder={L('e.g. Zindabazar', 'যেমন: জিন্দাবাজার')} />
          </div>
          <div>
            <label className={label} htmlFor="ob-km">{role === 'donor' ? L('How far can you travel? (km) *', 'কত দূর পর্যন্ত যেতে পারবেন? (কিমি) *') : L('Search distance (km) *', 'খোঁজার দূরত্ব (কিমি) *')}</label>
            <input id="ob-km" type="number" required min={1} max={200} step="1" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="ob-phone">{L('Phone number *', 'ফোন নম্বর *')}</label>
            <input id="ob-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="+880 1XXX-XXXXXX" />
          </div>
          <p className="sm:col-span-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            {L('Your phone number is shown only to signed-in members who need to reach you. Matching currently uses your city; the distance is saved on your profile.', 'আপনার ফোন নম্বর শুধু লগইন করা সদস্যদের দেখানো হয় যাঁদের আপনার সাথে যোগাযোগ করা দরকার। এখন মিলানোর কাজে আপনার শহর ব্যবহার হয়; দূরত্ব আপনার প্রোফাইলে সংরক্ষিত থাকে।')}
          </p>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] disabled:opacity-60 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer">
              <span>{role === 'donor' ? L('Finish and open donor dashboard', 'শেষ করে ডোনার ড্যাশবোর্ড খুলুন') : L('Finish and open receiver dashboard', 'শেষ করে রক্ত গ্রহীতার ড্যাশবোর্ড খুলুন')}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center">
        {alreadySetUp ? (
          <button type="button" onClick={() => setActiveView(currentUser.role === 'donor' ? 'donor-dashboard' : 'requester-dashboard')} className="text-xs text-[#64748B] hover:underline cursor-pointer">{L('Cancel and go back', 'বাতিল করে ফিরে যান')}</button>
        ) : (
          <button type="button" onClick={() => logout()} className="text-xs text-[#64748B] hover:underline cursor-pointer">{L('Log out', 'লগআউট')}</button>
        )}
      </div>
    </div>
  );
};

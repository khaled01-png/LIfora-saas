import React from 'react';
import { Lock, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/** Shown to signed-out visitors instead of any donor / request / centre data. */
export const GuestPreviewCard: React.FC = () => {
  const { language } = useApp();
  const bn = language === 'bn';

  const perks = bn
    ? ['কাছের রক্তদাতা খুঁজুন', 'রক্তের অনুরোধ পাঠান ও গ্রহণ করুন', 'রক্তকেন্দ্র ও মজুদ দেখুন', 'আপনার প্রোফাইল পরিচালনা করুন']
    : ['Find donors near you', 'Send & respond to blood requests', 'See blood centers and stock', 'Manage your profile'];

  return (
    <section id="guest-preview" className="relative py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#0F172A] dark:bg-[#12181C] border border-white/10 text-white p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center shadow-xl">
          <div className="flex gap-5">
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-[#10B981]" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {bn ? 'সদস্যদের জন্য যা যা আছে' : 'What members get'}
              </h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                {bn
                  ? 'অতিথি হিসেবে আপনি শুধু সীমিত তথ্য দেখতে পারবেন। রক্তদাতা, অনুরোধ ও রক্তকেন্দ্রের তথ্য দেখতে উপরের (ডানের) কার্ডে লগইন বা সাইন আপ করুন।'
                  : 'As a guest you can only see limited information. Donor, request and blood-center details are for members. Use the log in / sign up card at the top to unlock them.'}
              </p>
            </div>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {perks.map(p => (
              <li key={p} className="flex items-start gap-2.5 text-slate-200">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#10B981] shrink-0" aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

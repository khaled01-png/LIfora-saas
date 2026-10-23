import React, { useEffect, useState } from 'react';
import { Droplet, Hospital, MapPin, Clock, Link2, Check, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, SharedRequest } from '../../services/api';
import { canDonateTo } from '../../utils/compat';

// Opened from a shared request link (https://site/?request=...). Shows only the basics. Accepting needs a donor account.
export const SharedRequestPage: React.FC = () => {
  const { sharedRequestId, currentUser, language, openAuthModal, respondToRequest, switchRole, showToast, userResponses, setActiveView } = useApp();
  const bn = language === 'bn';
  const L = (en: string, b: string) => (bn ? b : en);

  const [req, setReq] = useState<SharedRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!sharedRequestId) { setFailed(L('This request link is not valid.', 'এই অনুরোধের লিংকটি সঠিক নয়।')); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    api.requests.getShared(sharedRequestId)
      .then(res => { if (!cancelled) { setReq(res.request); setFailed(null); } })
      .catch((err: any) => { if (!cancelled) setFailed(err?.message || L('This request link is not valid.', 'এই অনুরোধের লিংকটি সঠিক নয়।')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedRequestId]);

  const link = sharedRequestId ? `${window.location.origin}/?request=${encodeURIComponent(sharedRequestId)}` : '';
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const el = document.createElement('textarea');
      el.value = link; document.body.appendChild(el); el.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(el);
    }
    setCopied(true);
    showToast(L('Link copied. Send it to people who can help.', 'লিংক কপি হয়েছে। যাঁরা সাহায্য করতে পারেন তাঁদের পাঠান।'));
    setTimeout(() => setCopied(false), 2500);
  };

  const deadlineText = (d: string) => {
    if (!bn) return d;
    const m = d.match(/^Within (\d+) (hours?|days?)$/i);
    if (!m) return d;
    return `${m[1]} ${/hour/i.test(m[2]) ? 'ঘণ্টার' : 'দিনের'} মধ্যে`;
  };
  const urgencyText = (u: string) => (bn ? (u === 'Critical' ? 'অতি জরুরি' : u === 'Urgent' ? 'জরুরি' : 'সাধারণ') : u);
  const statusText = (s: string) => {
    if (!bn) return s;
    const map: Record<string, string> = {
      'Waiting for a donor': 'ডোনারের অপেক্ষায়', 'Donor accepted': 'ডোনার রাজি হয়েছেন', 'Donor booked': 'ডোনার নিশ্চিত',
      'Awaiting confirmation': 'নিশ্চিতকরণের অপেক্ষায়', 'Donated': 'রক্ত দেওয়া হয়েছে', 'Cancelled': 'বাতিল', 'Expired': 'মেয়াদ শেষ',
    };
    return map[s] || s;
  };

  const accept = async () => {
    if (!req) return;
    setBusy(true);
    const res = await respondToRequest(req.id);
    setBusy(false);
    if (res.success || res.alreadyResponded) setAccepted(true);
  };

  const wrap = (children: React.ReactNode) => (
    <div id="shared-request-page" className="pt-24 sm:pt-28 pb-20 max-w-2xl mx-auto px-4 sm:px-6">{children}</div>
  );

  if (loading) return wrap(<p className="text-sm text-[#64748B]" aria-busy="true">{L('Loading the request…', 'অনুরোধটি লোড হচ্ছে…')}</p>);
  if (failed || !req) {
    return wrap(
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#222D35] bg-white dark:bg-[#12181C] p-6">
        <p className="font-bold text-[#0F172A] dark:text-white">{failed || L('This request link is not valid.', 'এই অনুরোধের লিংকটি সঠিক নয়।')}</p>
        <button onClick={() => setActiveView('home')} className="mt-4 text-sm font-semibold text-[#0D7A5F] hover:underline cursor-pointer">{L('Go to the home page', 'হোম পেজে যান')}</button>
      </div>
    );
  }

  const myGroup = currentUser?.bloodGroup || null;
  const known = !!currentUser && !!myGroup && currentUser.role !== 'pending';
  const compatible = known && canDonateTo(myGroup as string, req.bloodGroup);
  const alreadyResponded = accepted || !!userResponses[req.id];
  const isCritical = req.urgency === 'Critical';

  return wrap(
    <div className="rounded-3xl border border-[#E2E8F0] dark:border-[#222D35] bg-white dark:bg-[#12181C] shadow-xs overflow-hidden">
      <div className={`px-5 sm:px-6 py-4 flex items-center gap-3 ${isCritical ? 'bg-red-50 dark:bg-red-950/30' : 'bg-[#F8FAFC] dark:bg-[#0B0F12]'}`}>
        <div className="w-14 h-14 rounded-2xl bg-[#DC2626] text-white font-black text-xl flex items-center justify-center shrink-0">{req.bloodGroup}</div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-lg text-[#0F172A] dark:text-white">
            {L(`${req.unitsNeeded} unit(s) of ${req.bloodGroup} blood needed`, `${req.bloodGroup} রক্ত দরকার: ${req.unitsNeeded} ব্যাগ`)}
          </h1>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{L('Status', 'অবস্থা')}: <strong>{statusText(req.displayStatus)}</strong></p>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-3 text-sm text-[#0F172A] dark:text-[#F8FAFC]">
        <p className="flex items-start gap-2"><Hospital className="w-4 h-4 mt-0.5 text-[#0D7A5F] shrink-0" /><span className="break-words">{req.hospitalName}</span></p>
        <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#0D7A5F] shrink-0" />{req.city}</p>
        <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#0D7A5F] shrink-0" />{L('Needed', 'প্রয়োজন')}: {deadlineText(req.deadline)} · {urgencyText(req.urgency)}</p>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          {L('For privacy, the patient’s name and phone number are not shown here. You will see the contact details after you accept.', 'গোপনীয়তার জন্য রোগীর নাম ও ফোন নম্বর এখানে দেখানো হয় না। সাড়া দেওয়ার পর যোগাযোগের তথ্য দেখতে পাবেন।')}
        </p>

        {/* What the visitor can do */}
        {!req.isOpen ? (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {L('This request is no longer open.', 'এই অনুরোধটি আর খোলা নেই।')}
          </div>
        ) : !currentUser ? (
          <div className="space-y-2">
            <button onClick={() => openAuthModal('login', 'donor')} className="w-full py-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2">
              <Droplet className="w-4 h-4" />{L('Log in or sign up to accept', 'সাড়া দিতে লগইন বা সাইন-আপ করুন')}
            </button>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{L('After you log in, you come straight back to this request.', 'লগইন করার পর সরাসরি এই অনুরোধে ফিরে আসবেন।')}</p>
          </div>
        ) : !known ? null : !compatible ? (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-3 text-xs text-red-900 dark:text-red-200 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>{L('Mismatch', 'মিলছে না')}:</strong>{' '}
              {L(`Your blood group (${myGroup}) cannot donate to ${req.bloodGroup}. You cannot accept this request, but you can share the link with someone who can.`,
                 `আপনার রক্তের গ্রুপ (${myGroup}) ${req.bloodGroup} গ্রুপকে দেওয়া যায় না। আপনি এই অনুরোধে সাড়া দিতে পারবেন না, তবে যিনি পারবেন তাঁকে লিংকটি পাঠাতে পারেন।`)}
            </span>
          </div>
        ) : alreadyResponded ? (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            {L('You accepted this request. The requester has been told.', 'আপনি এই অনুরোধে সাড়া দিয়েছেন। অনুরোধকারীকে জানানো হয়েছে।')}
            <button onClick={() => setActiveView('donor-dashboard')} className="ml-auto font-semibold underline cursor-pointer">{L('My dashboard', 'আমার ড্যাশবোর্ড')}</button>
          </div>
        ) : currentUser.role === 'donor' ? (
          <button disabled={busy} onClick={accept} className="w-full py-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2">
            <Droplet className="w-4 h-4" />{L('Accept this request', 'এই অনুরোধে সাড়া দিন')}
          </button>
        ) : currentUser.role === 'requester' && currentUser.profileCompleted ? (
          <button disabled={busy} onClick={async () => { setBusy(true); await switchRole('donor'); setBusy(false); }} className="w-full py-3 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] disabled:opacity-60 text-white font-bold text-sm cursor-pointer">
            {L('Switch to donor to accept', 'সাড়া দিতে ডোনার হিসেবে চালিয়ে যান')}
          </button>
        ) : null}

        <button onClick={copyLink} className="w-full py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] text-sm font-semibold text-[#0F172A] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-center gap-2">
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
          {copied ? L('Link copied', 'লিংক কপি হয়েছে') : L('Copy request link', 'অনুরোধের লিংক কপি করুন')}
        </button>
      </div>
    </div>
  );
};

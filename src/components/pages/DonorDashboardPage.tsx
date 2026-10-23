import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Droplet, Heart, Clock, Award, ToggleLeft, ToggleRight, User, LogIn, Check, Link2 } from 'lucide-react';
import { BLOOD_COMPATIBILITY_DATA } from '../../data/bloodCompatibility';
import { ProfileCard } from '../common/ProfileCard';
import { UpdatesPanel } from '../common/UpdatesPanel';

const COOLDOWN_DAYS = 120;

export const DonorDashboardPage: React.FC = () => {
  const { currentUser, requests, toggleDonorAvailability, setActiveView, showToast, respondToRequest, markDonated, loadMyResponses, openAuthModal, userResponses, switchRole, language } = useApp();
  const bn = language === 'bn';
  const L = (en: string, b: string) => (bn ? b : en);

  const [isAvailable, setIsAvailable] = useState(currentUser?.availability === 'Available');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { setIsAvailable(currentUser?.availability === 'Available'); }, [currentUser?.availability]);

  // Which of these requests did I already answer? (Also after reloading the page.)
  const openIds = requests.filter(r => r.status === 'Pending' || r.status === 'In Progress').map(r => r.id).join(',');
  useEffect(() => {
    if (currentUser?.role === 'donor' && openIds) void loadMyResponses(openIds.split(','));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIds, currentUser?.id]);

  if (!currentUser) {
    return (
      <div className="pt-32 pb-24 max-w-xl mx-auto px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#0D7A5F]/10 text-[#0D7A5F] dark:text-[#10B981] flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
          {L('Please log in as a donor', 'ডোনার হিসেবে লগইন করুন')}
        </h2>
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mb-6 leading-relaxed">
          {L('Log in with your donor account to see your donations, your recovery time and requests that match your blood group.',
             'আপনার রক্তদান, বিশ্রামের সময় আর আপনার রক্তের গ্রুপের সাথে মেলে এমন অনুরোধ দেখতে ডোনার অ্যাকাউন্টে লগইন করুন।')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => openAuthModal('login')} className="px-6 py-3 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
            <LogIn className="w-4 h-4" />
            <span>{L('Sign In to Donor Account', 'ডোনার অ্যাকাউন্টে লগইন')}</span>
          </button>
          <button onClick={() => openAuthModal('register', 'donor')} className="px-6 py-3 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] hover:border-[#0D7A5F] text-[#0F172A] dark:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">
            <Heart className="w-4 h-4 text-[#DC2626]" />
            <span>{L('Register as Donor', 'ডোনার হিসেবে রেজিস্টার')}</span>
          </button>
        </div>
      </div>
    );
  }

  const handleToggle = () => {
    const newState = !isAvailable;
    setIsAvailable(newState);
    toggleDonorAvailability(newState ? 'Available' : 'Unavailable');
  };

  const myGroup = currentUser.bloodGroup as keyof typeof BLOOD_COMPATIBILITY_DATA | undefined;
  const compatibleGroups: string[] = myGroup && BLOOD_COMPATIBILITY_DATA[myGroup] ? BLOOD_COMPATIBILITY_DATA[myGroup].canGiveTo : [currentUser.bloodGroup || ''];

  const matchingRequests = isAvailable && currentUser.availability === 'Available'
    ? requests.filter(r => (r.status === 'Pending' || r.status === 'In Progress') && compatibleGroups.includes(r.bloodGroup))
    : [];

  const totalDonations = currentUser.totalDonations || 0;

  // Next eligible date, worked out from the last confirmed donation.
  let nextEligible = L('Eligible today', 'আজ থেকেই দিতে পারবেন');
  let nextEligibleNote = L('Ready to donate', 'রক্ত দিতে প্রস্তুত');
  if (currentUser.lastDonation && currentUser.lastDonation !== 'Never') {
    const last = new Date(currentUser.lastDonation);
    if (!isNaN(last.getTime())) {
      const next = new Date(last.getTime() + COOLDOWN_DAYS * 86400000);
      if (next.getTime() > Date.now()) {
        nextEligible = next.toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { dateStyle: 'medium' });
        nextEligibleNote = L(`Resting for ${COOLDOWN_DAYS} days after the last donation`, `শেষ রক্তদানের পর ${COOLDOWN_DAYS} দিনের বিশ্রাম`);
      }
    }
  }

  const copyLink = async (id: string) => {
    const link = `${window.location.origin}/?request=${encodeURIComponent(id)}`;
    try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
    showToast(L('Link copied. Send it to people who can help.', 'লিংক কপি হয়েছে। যাঁরা সাহায্য করতে পারেন তাঁদের পাঠান।'));
  };

  const iDonated = async (id: string) => {
    if (!window.confirm(L('Did you really give blood for this request?', 'এই অনুরোধের জন্য আপনি কি সত্যিই রক্ত দিয়েছেন?'))) return;
    setBusyId(id);
    await markDonated(id);
    setBusyId(null);
  };

  const urgencyText = (u: string) => (bn ? (u === 'Critical' ? 'অতি জরুরি' : u === 'Urgent' ? 'জরুরি' : 'সাধারণ') : u);
  const card = 'p-5 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xs flex items-center justify-between';
  const label = 'text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block';

  return (
    <div id="donor-dashboard-page" className="pt-24 sm:pt-28 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-colors duration-300">

      {/* Welcome Banner */}
      <div className="p-5 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#132220] to-[#0A261D] text-white shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#0D7A5F]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#10B981] font-bold bg-[#0D7A5F]/20 px-2.5 py-0.5 rounded-full border border-[#0D7A5F]/40">
              {L('DONOR DASHBOARD', 'ডোনার ড্যাশবোর্ড')}
            </span>
            <span className="text-xs text-slate-400 break-all">ID: LIF-{currentUser.id.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight break-words">
            {L(`Welcome back, ${currentUser.name}`, `আবার স্বাগতম, ${currentUser.name}`)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg leading-relaxed">
            {L(`Your contributions safeguard patients across ${currentUser.city || 'your region'}. Thank you for standing on the frontline of human life.`,
               `আপনার রক্তদান ${currentUser.city || 'আপনার এলাকা'}র রোগীদের জীবন বাঁচায়। মানুষের পাশে দাঁড়ানোর জন্য ধন্যবাদ।`)}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0 self-start md:self-auto">
          <div className="text-right">
            <p className="text-[11px] font-bold text-white/80">{L('Emergency Duty', 'জরুরি দায়িত্ব')}</p>
            <p className={`text-xs font-extrabold ${isAvailable ? 'text-[#10B981]' : 'text-slate-400'}`}>
              {isAvailable ? L('● AVAILABLE NOW', '● এখন প্রস্তুত') : L('○ UNAVAILABLE', '○ প্রস্তুত নয়')}
            </p>
          </div>
          <button onClick={handleToggle} className="text-white hover:text-[#10B981] transition-colors p-1 cursor-pointer" title={L('Toggle your live on-call availability', 'আপনার প্রস্তুতির অবস্থা বদলান')} aria-label={L('Toggle availability', 'প্রস্তুতির অবস্থা বদলান')}>
            {isAvailable ? <ToggleRight className="w-8 h-8 text-[#10B981]" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
          </button>
        </div>
      </div>

      <div className="mb-6 p-4 sm:p-5 rounded-3xl border border-[#DC2626]/25 bg-[#FEF2F2] dark:bg-[#2A1417]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC]">
          <span className="font-bold">{L('Need blood for someone?', 'কারো জন্য রক্ত দরকার?')}</span>{' '}
          {L('Switch to your Receiver dashboard to post a request, or to see whether a donor accepted it.', 'অনুরোধ দিতে বা কোনো ডোনার রাজি হয়েছেন কিনা দেখতে রক্ত গ্রহীতার ড্যাশবোর্ডে যান।')}
        </p>
        <button type="button" onClick={() => switchRole('requester')} className="shrink-0 px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs sm:text-sm font-bold cursor-pointer">
          {L('Switch to Receiver dashboard', 'রক্ত গ্রহীতার ড্যাশবোর্ডে যান')}
        </button>
      </div>

      <ProfileCard />

      <UpdatesPanel kinds={['request_match', 'response_status']} empty={L("New requests that match your blood group and city, and updates such as 'You were booked', appear here and in the bell.", 'আপনার রক্তের গ্রুপ ও শহরের সাথে মেলে এমন নতুন অনুরোধ আর “আপনাকে বুক করা হয়েছে”-র মতো খবর এখানে এবং ঘণ্টার চিহ্নে আসবে।')} />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={card}>
          <div>
            <span className={label}>{L('Total Donations', 'মোট রক্তদান')}</span>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#0D7A5F] dark:text-[#10B981] mt-1">{totalDonations}</div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{L('Confirmed donations', 'নিশ্চিত রক্তদান')}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#0D7A5F]/10 dark:bg-[#10B981]/20 flex items-center justify-center shrink-0">
            <Droplet className="w-6 h-6 fill-[#0D7A5F] dark:fill-[#10B981] text-[#0D7A5F] dark:text-[#10B981]" />
          </div>
        </div>

        <div className={card}>
          <div className="min-w-0">
            <span className={label}>{L('Registered Group', 'নিবন্ধিত গ্রুপ')}</span>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#DC2626] mt-1">{currentUser.bloodGroup || '—'}</div>
            <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] break-words">{L('Can give to', 'যাঁদের দিতে পারেন')}: {compatibleGroups.join(', ')}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center font-extrabold text-xl shrink-0">{currentUser.bloodGroup || '—'}</div>
        </div>

        <div className={card}>
          <div className="min-w-0">
            <span className={label}>{L('Next Eligible', 'পরবর্তী রক্তদান')}</span>
            <div className="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] mt-1">{nextEligible}</div>
            <span className="text-[10px] text-[#10B981] font-semibold">{nextEligibleNote}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#0D7A5F]/10 dark:bg-[#10B981]/20 text-[#0D7A5F] dark:text-[#10B981] flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className={card}>
          <div>
            <span className={label}>{L('Towards Verified', 'যাচাইকৃত হওয়ার পথে')}</span>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#0D7A5F] dark:text-[#10B981] mt-1">{Math.min(totalDonations, 5)}/5</div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{L('Donations needed for verification', 'যাচাইয়ের জন্য দরকার রক্তদান')}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#0D7A5F]/10 dark:bg-[#10B981]/20 text-[#0D7A5F] dark:text-[#10B981] flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Matching requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0] dark:border-[#222D35]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse" />
              <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">{L('Requests that match your blood group', 'আপনার রক্তের গ্রুপের সাথে মেলে এমন অনুরোধ')}</h2>
            </div>
            <button onClick={() => setActiveView('requests')} className="text-xs font-bold text-[#0D7A5F] dark:text-[#10B981] hover:underline cursor-pointer shrink-0">
              {L(`View All (${requests.length}) →`, `সব দেখুন (${requests.length}) →`)}
            </button>
          </div>

          {matchingRequests.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35]">
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {isAvailable
                  ? L('No open requests match your blood group right now.', 'এই মুহূর্তে আপনার রক্তের গ্রুপের সাথে মেলে এমন কোনো খোলা অনুরোধ নেই।')
                  : L('You are set to Unavailable, so no requests are shown. Switch your availability on to see them.', 'আপনি “প্রস্তুত নয়” অবস্থায় আছেন, তাই অনুরোধ দেখানো হচ্ছে না। দেখতে প্রস্তুতির অবস্থা চালু করুন।')}
              </p>
            </div>
          ) : (
            matchingRequests.map(req => {
              const mine = userResponses[req.id];
              const state = mine?.status;
              return (
                <div key={req.id} className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xs flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#DC2626] text-white flex items-center justify-center font-extrabold text-base shrink-0 shadow-xs">{req.bloodGroup}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC] break-words">{req.patientName}</h4>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#FEF2F2] dark:bg-[#361417] text-[#DC2626] border border-[#DC2626]/20">{urgencyText(req.urgency)}</span>
                      </div>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 break-words">{req.hospitalName} · {req.city}</p>
                      {req.reason && <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 italic break-words">"{req.reason}"</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!mine && (
                      <button disabled={busyId === req.id} onClick={async () => { setBusyId(req.id); await respondToRequest(req.id); setBusyId(null); }}
                        className="px-4 py-2 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] disabled:opacity-60 text-white text-xs font-bold transition-all cursor-pointer shadow-xs">
                        {L('Respond & Donate', 'সাড়া দিন ও রক্ত দিন')}
                      </button>
                    )}
                    {mine && (state === 'accepted' || state === 'booked') && (
                      <>
                        <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 border border-emerald-200">
                          <Check className="w-3.5 h-3.5" />
                          {state === 'booked' ? L('Booked', 'আপনাকে বুক করা হয়েছে') : L('Responded', 'সাড়া দিয়েছেন')}
                        </span>
                        <button disabled={busyId === req.id} onClick={() => iDonated(req.id)} className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 text-white text-xs font-bold cursor-pointer shadow-xs">
                          {L('I donated', 'আমি রক্ত দিয়েছি')}
                        </button>
                      </>
                    )}
                    {mine && state === 'claimed' && (
                      <span className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-200">
                        {L('You said you donated. Waiting for the requester to confirm (it counts automatically after 24 hours).', 'আপনি জানিয়েছেন রক্ত দিয়েছেন। অনুরোধকারীর নিশ্চিতকরণের অপেক্ষা চলছে (২৪ ঘণ্টা পর নিজে থেকেই গণনা হবে)।')}
                      </span>
                    )}
                    {mine && state !== 'accepted' && state !== 'booked' && state !== 'claimed' && (
                      <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 border border-emerald-200">
                        <Check className="w-3.5 h-3.5" />{L('Responded', 'সাড়া দিয়েছেন')}
                      </span>
                    )}
                    <button onClick={() => copyLink(req.id)} className="px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] text-xs font-semibold text-[#0F172A] dark:text-white cursor-pointer flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" />{L('Copy link', 'লিংক কপি')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="pb-3 border-b border-[#E2E8F0] dark:border-[#222D35]">
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#0D7A5F] dark:text-[#10B981]" />
              <span>{L('How donations are counted', 'রক্তদান কীভাবে গোনা হয়')}</span>
            </h2>
          </div>
          <div className="p-5 rounded-3xl bg-[#F8FAF9] dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] text-xs text-[#64748B] dark:text-[#94A3B8] space-y-2 leading-relaxed">
            <p>{L('After you give blood, press “I donated” on the request.', 'রক্ত দেওয়ার পর অনুরোধের ওপর “আমি রক্ত দিয়েছি” চাপুন।')}</p>
            <p>{L('The person who asked for blood confirms it. If they do not answer within 24 hours, it counts automatically.', 'যিনি রক্ত চেয়েছিলেন তিনি নিশ্চিত করবেন। ২৪ ঘণ্টায় সাড়া না দিলে এটি নিজে থেকেই গণনা হবে।')}</p>
            <p>{L('After 5 confirmed donations, a LIFORA administrator can verify you.', '৫ বার নিশ্চিত রক্তদানের পর লাইফোরার অ্যাডমিন আপনাকে যাচাই করতে পারবেন।')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

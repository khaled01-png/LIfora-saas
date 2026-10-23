import React, { useState } from 'react';
import { ClipboardList, Plus, Hospital, Clock, Users, Phone, CheckCircle2, ChevronDown, HeartHandshake, Link2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { BloodRequest, BloodRequestResponse } from '../../types';
import { ProfileCard } from '../common/ProfileCard';
import { UpdatesPanel } from '../common/UpdatesPanel';

const STATUS_BN: Record<string, string> = {
  'Waiting for a donor': 'ডোনারের অপেক্ষায়', 'Donor accepted': 'ডোনার রাজি হয়েছেন', 'Donor booked': 'ডোনার নিশ্চিত',
  'Awaiting confirmation': 'আপনার নিশ্চিতকরণের অপেক্ষায়', 'Donated': 'রক্ত দেওয়া হয়েছে', 'Cancelled': 'বাতিল', 'Expired': 'মেয়াদ শেষ',
  'Pending': 'অপেক্ষায়', 'In Progress': 'চলছে', 'Fulfilled': 'সম্পূর্ণ',
};

/** The requester's feed for one request: donors who responded, with Book and Confirm actions. */
const ResponsesFeed: React.FC<{ request: BloodRequest }> = ({ request }) => {
  const { bookDonor, confirmDonation, showToast, language } = useApp();
  const bn = language === 'bn';
  const L = (en: string, b: string) => (bn ? b : en);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BloodRequestResponse[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.requests.getResponses(request.id);
      setItems(Array.isArray(res?.responses) ? res.responses : []);
    } catch (err: any) {
      showToast(err?.message || L('Could not load the responses.', 'সাড়াদানকারীদের তালিকা লোড করা যায়নি।'));
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) await load();
  };

  const book = async (r: BloodRequestResponse) => { await bookDonor(request.id, r.id); await load(); };
  const confirm = async (r: BloodRequestResponse) => { await confirmDonation(request.id, r.donorId, r.id, 1); await load(); };
  const finished = request.status === 'Fulfilled' || request.status === 'Cancelled' || request.status === 'Expired';
  const respLabel = (s: string) => {
    const en: Record<string, string> = { accepted: 'ready to donate', booked: 'booked', claimed: 'says donated', completed: 'donated', declined: 'declined', cancelled: 'cancelled' };
    const b: Record<string, string> = { accepted: 'রক্ত দিতে প্রস্তুত', booked: 'বুক করা হয়েছে', claimed: 'রক্ত দিয়েছেন বলে জানিয়েছেন', completed: 'রক্ত দিয়েছেন', declined: 'অস্বীকার করেছেন', cancelled: 'বাতিল' };
    return (bn ? b : en)[s] || s;
  };

  return (
    <div className="mt-4 border-t border-[#E2E8F0] dark:border-[#222D35] pt-3">
      <button type="button" onClick={toggle} aria-expanded={open} className="w-full flex items-center justify-between text-xs font-bold text-[#0D7A5F] dark:text-[#10B981] cursor-pointer">
        <span>{open ? L('Hide responding donors', 'সাড়াদানকারী ডোনার লুকান') : L(`See responding donors (${request.responsesCount})`, `সাড়াদানকারী ডোনার দেখুন (${request.responsesCount})`)}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {loading && <p className="text-xs text-[#64748B]">{L('Loading...', 'লোড হচ্ছে...')}</p>}
          {!loading && items.length === 0 && <p className="text-xs text-[#64748B]">{L('No donor has responded yet. Matching donors in your city were notified.', 'এখনো কোনো ডোনার সাড়া দেননি। আপনার শহরের মিলে যাওয়া ডোনারদের জানানো হয়েছে।')}</p>}
          {items.map(r => (
            <div key={r.id} className="p-3 rounded-2xl bg-[#F8FAF9] dark:bg-[#0B0F12] border border-[#E2E8F0]/70 dark:border-[#222D35]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#0F172A] dark:text-white break-words">{r.donor?.name || L('Donor', 'ডোনার')} <span className="ml-1 text-xs font-extrabold text-[#DC2626]">{r.donor?.bloodGroup}</span></p>
                  {r.message && <p className="mt-0.5 text-[11px] text-[#64748B] dark:text-[#94A3B8] break-words">"{r.message}"</p>}
                  {r.donor?.phone && (
                    <a href={`tel:${r.donor.phone}`} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0D7A5F]"><Phone className="w-3 h-3" aria-hidden="true" />{r.donor.phone}</a>
                  )}
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-right">{respLabel(r.status)}</span>
              </div>
              {r.status === 'claimed' && !finished && (
                <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-300">
                  {L('This donor says they gave blood. Please confirm. If you do not answer within 24 hours, it is marked as donated automatically.', 'এই ডোনার জানিয়েছেন তিনি রক্ত দিয়েছেন। অনুগ্রহ করে নিশ্চিত করুন। ২৪ ঘণ্টার মধ্যে সাড়া না দিলে এটি নিজে থেকেই “রক্ত দেওয়া হয়েছে” ধরা হবে।')}
                </p>
              )}
              {!finished && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.status === 'accepted' && (
                    <button type="button" onClick={() => book(r)} className="px-3 py-1.5 rounded-lg bg-[#0D7A5F] hover:bg-[#095C48] text-white text-[11px] font-bold cursor-pointer">{L('Book this donor', 'এই ডোনারকে বুক করুন')}</button>
                  )}
                  {(r.status === 'booked' || r.status === 'claimed') && (
                    <button type="button" onClick={() => confirm(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-bold cursor-pointer"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />{L('Confirm donation received', 'রক্ত পেয়েছি, নিশ্চিত করুন')}</button>
                  )}
                </div>
              )}
            </div>
          ))}
          <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">{L("A donor's blood group is not medical clearance. The hospital laboratory must confirm compatibility.", 'ডোনারের রক্তের গ্রুপ চিকিৎসা ছাড়পত্র নয়। মিল আছে কিনা হাসপাতালের ল্যাবরেটরিকে নিশ্চিত করতে হবে।')}</p>
        </div>
      )}
    </div>
  );
};

/** Requester dashboard: the sign-up profile plus the requests this person has posted. */
export const RequesterDashboardPage: React.FC = () => {
  const { currentUser, requests, setQuickRequestModalOpen, setActiveView, switchRole, showToast, language } = useApp();
  const bn = language === 'bn';
  const L = (en: string, b: string) => (bn ? b : en);
  if (!currentUser) return null;

  const mine = requests.filter(r => r.userId && r.userId === currentUser.id);
  const statusStyle = (s: string) =>
    s === 'Donated' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
    : s === 'Donor booked' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
    : s === 'Awaiting confirmation' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
    : s === 'Donor accepted' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  const statusText = (s: string) => (bn ? (STATUS_BN[s] || s) : s);
  const deadlineText = (d: string) => {
    if (!bn) return d;
    const m = d.match(/^Within (\d+) (hours?|days?)$/i);
    return m ? `${m[1]} ${/hour/i.test(m[2]) ? 'ঘণ্টার' : 'দিনের'} মধ্যে` : d;
  };

  const copyLink = async (id: string) => {
    const link = `${window.location.origin}/?request=${encodeURIComponent(id)}`;
    try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
    showToast(L('Link copied. Send it to people who can help.', 'লিংক কপি হয়েছে। যাঁরা সাহায্য করতে পারেন তাঁদের পাঠান।'));
  };

  return (
    <div id="requester-dashboard-page" className="pt-24 sm:pt-28 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="p-5 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#132220] to-[#0A261D] text-white shadow-xl mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="min-w-0">
          <span className="text-xs font-mono uppercase tracking-wider text-[#10B981] font-bold bg-[#0D7A5F]/20 px-2.5 py-0.5 rounded-full border border-[#0D7A5F]/30">{L('Receiver dashboard', 'রক্ত গ্রহীতার ড্যাশবোর্ড')}</span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight break-words">{L(`Welcome, ${currentUser.name}`, `স্বাগতম, ${currentUser.name}`)}</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg">{L('Post a blood request and follow the donors who respond.', 'রক্তের অনুরোধ দিন এবং সাড়া দেওয়া ডোনারদের অনুসরণ করুন।')}</p>
        </div>
        <div className="shrink-0 flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => switchRole('donor')} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/25 hover:bg-white/10 text-white text-sm font-semibold cursor-pointer">
            <HeartHandshake className="w-4 h-4" aria-hidden="true" /> {L('Switch to Donor dashboard', 'দাতার ড্যাশবোর্ডে যান')}
          </button>
          <button type="button" onClick={() => setQuickRequestModalOpen(true)} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold shadow-md cursor-pointer">
            <Plus className="w-4 h-4" aria-hidden="true" /> {L('Post a blood request', 'রক্তের অনুরোধ দিন')}
          </button>
        </div>
      </div>

      <ProfileCard />

      <UpdatesPanel kinds={['donor_responded', 'response_status']} empty={L('When a donor accepts one of your requests, you will see the message here and in the bell at the top.', 'কোনো ডোনার আপনার অনুরোধে রাজি হলে বার্তাটি এখানে এবং উপরের ঘণ্টার চিহ্নে দেখতে পাবেন।')} />

      <section aria-label={L('My blood requests', 'আমার রক্তের অনুরোধ')}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white flex items-center gap-2"><ClipboardList className="w-5 h-5 text-[#0D7A5F]" aria-hidden="true" /> {L('My requests', 'আমার অনুরোধ')}</h2>
          <button type="button" onClick={() => setActiveView('requests')} className="text-xs font-semibold text-[#0D7A5F] hover:underline cursor-pointer shrink-0">{L('See all community requests', 'সব কমিউনিটি অনুরোধ দেখুন')}</button>
        </div>

        {mine.length === 0 ? (
          <div className="p-10 rounded-3xl border border-dashed border-[#E2E8F0] dark:border-[#222D35] text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
            {L('You have not posted a request yet. Use "Post a blood request" when you need blood for a patient.', 'আপনি এখনো কোনো অনুরোধ দেননি। রোগীর জন্য রক্ত দরকার হলে “রক্তের অনুরোধ দিন” চাপুন।')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mine.map(r => (
              <article key={r.id} className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white break-words">{r.patientName}</h3>
                    <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8] flex items-start gap-1.5 break-words"><Hospital className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />{r.hospitalName}, {r.city}</p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-[#DC2626]/10 text-[#DC2626] text-sm font-extrabold">{r.bloodGroup}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`px-2.5 py-1 rounded-full font-semibold ${statusStyle(r.displayStatus || r.status)}`}>{statusText(r.displayStatus || r.status)}</span>
                  <span className="inline-flex items-center gap-1 text-[#64748B]"><Clock className="w-3 h-3" aria-hidden="true" />{deadlineText(r.deadline)}</span>
                  <span className="inline-flex items-center gap-1 text-[#64748B]"><Users className="w-3 h-3" aria-hidden="true" />{L(`${r.responsesCount} response${r.responsesCount === 1 ? '' : 's'}`, `${r.responsesCount}টি সাড়া`)}</span>
                  <span className="text-[#64748B]">{L(`${r.unitsNeeded} unit(s)`, `${r.unitsNeeded} ব্যাগ`)}</span>
                </div>
                <button type="button" onClick={() => copyLink(r.id)} className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0F172A] dark:text-white px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#222D35] cursor-pointer">
                  <Link2 className="w-3.5 h-3.5" aria-hidden="true" />{L('Copy link to share', 'শেয়ার করতে লিংক কপি করুন')}
                </button>
                <ResponsesFeed request={r} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

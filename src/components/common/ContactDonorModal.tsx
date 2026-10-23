import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { X, Phone, Mail, MapPin, ShieldCheck, Clock, Send, Check, Copy } from 'lucide-react';

export const ContactDonorModal: React.FC = () => {
  const { selectedDonorForContact, closeContactDonor, showToast, currentUser, openAuthModal, language } = useApp();
  const bn = language === 'bn';
  const L = (en: string, b: string) => (bn ? b : en);
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<'Normal' | 'Urgent' | 'Critical'>('Urgent');
  const [sent, setSent] = useState(false);

  // Real phone/email come from the server, only for signed-in users (the public list is masked).
  const [realContact, setRealContact] = useState<{ phone: string; email: string } | null>(null);
  const [contactState, setContactState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [contactError, setContactError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setRealContact(null);
    setContactError('');
    const id = selectedDonorForContact?.id;
    if (!id || !currentUser) { setContactState('idle'); return; }
    let cancelled = false;
    setContactState('loading');
    api.donors.contactInfo(id)
      .then(res => { if (!cancelled) { setRealContact({ phone: res.phone, email: res.email }); setContactState('idle'); } })
      .catch(err => {
        if (cancelled) return;
        setContactState('error');
        setContactError(err?.message || L('Could not load contact details.', 'যোগাযোগের তথ্য লোড করা যায়নি।'));
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDonorForContact?.id, currentUser?.id, retry]);

  if (!selectedDonorForContact) return null;

  const donor = selectedDonorForContact;
  const needsLogin = !currentUser;
  const maskedPhone = `••• ••• ${(donor.phone || '').replace(/\D/g, '').slice(-3)}`;
  const shownPhone = realContact?.phone ?? maskedPhone;
  const shownEmail = realContact?.email ?? '••••@••••';
  const contactHidden = !realContact;
  const urgencyLabel = (lvl: string) => (bn ? (lvl === 'Critical' ? 'অতি জরুরি' : lvl === 'Urgent' ? 'জরুরি' : 'সাধারণ') : lvl);
  const lastDonation = bn && donor.lastDonationDate === 'Never' ? 'কখনো না' : donor.lastDonationDate;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsLogin) {
      showToast(L('Please log in to contact a donor.', 'ডোনারের সাথে যোগাযোগ করতে লগইন করুন।'));
      openAuthModal('login');
      return;
    }
    try {
      await api.donors.contact(donor.id, { message, urgency });
      setSent(true);
      showToast(L('In-app message delivered to the donor.', 'ডোনারকে অ্যাপের ভেতরে বার্তা পাঠানো হয়েছে।'));
      setTimeout(() => {
        setSent(false);
        setMessage('');
        closeContactDonor();
      }, 1400);
    } catch (err: any) {
      showToast(err?.message || L('Your message could not be sent. Please try again.', 'আপনার বার্তা পাঠানো যায়নি। আবার চেষ্টা করুন।'));
    }
  };

  const copyPhone = () => {
    if (contactHidden) {
      showToast(needsLogin ? L('Please log in to see the phone number.', 'ফোন নম্বর দেখতে লগইন করুন।') : L('Contact details are still loading.', 'যোগাযোগের তথ্য এখনো লোড হচ্ছে।'));
      return;
    }
    navigator.clipboard.writeText(shownPhone);
    showToast(L(`Phone number ${shownPhone} copied to clipboard.`, `ফোন নম্বর ${shownPhone} কপি হয়েছে।`));
  };

  return (
    <div 
      id="contact-donor-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeContactDonor();
      }}
    >
      <div 
        id="contact-donor-modal"
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-[#12181C] rounded-3xl border border-[#E2E8F0] dark:border-[#222D35] shadow-2xl p-5 sm:p-8"
      >
        <button
          onClick={closeContactDonor}
          aria-label={L('Close', 'বন্ধ করুন')}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Donor Profile Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-[#DC2626] text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-xs">
            {donor.bloodGroup}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg text-[#0F172A] dark:text-[#F8FAFC]">{donor.name}</h3>
              {donor.verified && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#0D7A5F] dark:text-[#10B981] bg-[#F0FDF4] dark:bg-[#06231C] px-2 py-0.5 rounded-full border border-[#D1FAE5] dark:border-[#0B3D31]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {L('Verified', 'যাচাইকৃত')}
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-[#0D7A5F]" />
              {donor.location}, {donor.city}{donor.distanceKm > 0 ? ` • ${donor.distanceKm} ${L('km away', 'কিমি দূরে')}` : ''}{donor.matchPercentage > 0 ? ` • ${donor.matchPercentage}% ${L('compatibility', 'মিল')}` : ''}
            </p>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              {L('Total donations', 'মোট রক্তদান')}: {donor.totalDonations} • {L('Last', 'সর্বশেষ')}: {lastDonation}
            </p>
          </div>
        </div>

        {donor.bio && (
          <div className="p-3.5 rounded-2xl bg-[#F8FAF9] dark:bg-[#172026] text-xs text-[#334155] dark:text-[#CBD5E1] mb-5 leading-relaxed italic border border-[#E2E8F0] dark:border-[#222D35]">
            "{donor.bio}"
          </div>
        )}

        {/* Direct Contact Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <Phone className="w-4 h-4 text-[#0D7A5F] shrink-0" />
              <div className="truncate">
                <p className="text-[10px] uppercase font-bold text-[#64748B]">{L('Emergency Phone', 'জরুরি ফোন')}</p>
                {contactHidden ? (
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white">{shownPhone}</span>
                ) : (
                  <a href={`tel:${shownPhone}`} className="text-xs font-bold text-[#0F172A] dark:text-white hover:text-[#0D7A5F]">
                    {shownPhone}
                  </a>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={copyPhone}
              className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
              title={L('Copy phone', 'ফোন কপি করুন')}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] flex items-center gap-2.5 truncate">
            <Mail className="w-4 h-4 text-[#0D7A5F] shrink-0" />
            <div className="truncate">
              <p className="text-[10px] uppercase font-bold text-[#64748B]">{L('Donor Email', 'ডোনারের ইমেইল')}</p>
              {contactHidden ? (
                <span className="text-xs font-bold text-[#0F172A] dark:text-white truncate block">{shownEmail}</span>
              ) : (
                <a href={`mailto:${shownEmail}`} className="text-xs font-bold text-[#0F172A] dark:text-white hover:text-[#0D7A5F] truncate block">
                  {shownEmail}
                </a>
              )}
            </div>
          </div>
        </div>

        {contactState === 'loading' && (
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-4" aria-live="polite">{L('Loading contact details…', 'যোগাযোগের তথ্য লোড হচ্ছে…')}</p>
        )}
        {contactState === 'error' && (
          <p className="text-xs text-red-700 dark:text-red-300 mb-4" role="alert">
            {contactError}{' '}
            <button type="button" onClick={() => setRetry(n => n + 1)} className="font-bold underline cursor-pointer">{L('Try again', 'আবার চেষ্টা করুন')}</button>
          </p>
        )}
        {needsLogin && (
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-4">{L('Log in to see the phone number and e-mail.', 'ফোন নম্বর ও ইমেইল দেখতে লগইন করুন।')}</p>
        )}

        {/* Message dispatch form */}
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-2">
              {L('Urgency Level', 'জরুরি অবস্থা')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Critical', 'Urgent', 'Normal'] as const).map(lvl => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setUrgency(lvl)}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    urgency === lvl
                      ? lvl === 'Critical'
                        ? 'bg-[#DC2626] text-white border-[#DC2626]'
                        : lvl === 'Urgent'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-[#0D7A5F] text-white border-[#0D7A5F]'
                      : 'border-[#E2E8F0] dark:border-[#222D35] text-[#64748B]'
                  }`}
                >
                  {urgencyLabel(lvl)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
              {L('Dispatch Message to Donor', 'ডোনারকে বার্তা পাঠান')}
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={L(`Urgent blood request for ${donor.bloodGroup} transfusion. Patient is admitted at hospital and requires immediate donation support...`, `${donor.bloodGroup} রক্তের জরুরি প্রয়োজন। রোগী হাসপাতালে ভর্তি আছেন এবং দ্রুত রক্তদান দরকার...`)}
              className="w-full p-3 rounded-2xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-xs focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white leading-relaxed resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={closeContactDonor}
              className="w-1/3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] text-xs font-bold text-[#64748B] hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {L('Cancel', 'বাতিল')}
            </button>
            <button
              type="submit"
              disabled={sent}
              className="w-2/3 py-2.5 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {sent ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{L('Alert Sent', 'পাঠানো হয়েছে')}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{L('Transmit Priority Alert', 'বার্তা পাঠান')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

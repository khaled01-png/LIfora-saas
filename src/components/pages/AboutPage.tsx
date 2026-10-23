import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { ShieldCheck, Heart, Award, Mail, Phone, MapPin, Send, Check, Droplet, ArrowRight } from 'lucide-react';

// Real contact details are set by the site owner (Vercel env). Nothing is invented here.
const CONTACT_EMAIL = ((import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || '').trim();
const CONTACT_PHONE = ((import.meta.env.VITE_CONTACT_PHONE as string | undefined) || '').trim();
const CONTACT_ADDRESS = ((import.meta.env.VITE_CONTACT_ADDRESS as string | undefined) || '').trim();

export const AboutPage: React.FC = () => {
  const { showToast, openAuthModal, language } = useApp();
  const L = (en: string, b: string) => (language === 'bn' ? b : en);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    try {
      // "Sent" is only shown after the server confirmed it saved the message.
      const res = await api.contact.send({ name, email, message });
      setSent(true);
      showToast(L(res.message, 'আপনার বার্তা পাঠানো হয়েছে। লাইফোরার সাথে যোগাযোগের জন্য ধন্যবাদ।'));
      setTimeout(() => {
        setName('');
        setEmail('');
        setMessage('');
        setSent(false);
      }, 2000);
    } catch (err: any) {
      showToast(err?.message || L('Your message could not be sent. Please try again later.', 'আপনার বার্তা পাঠানো যায়নি। একটু পরে আবার চেষ্টা করুন।'));
    }
  };

  return (
    <div id="about-page" className="pt-24 sm:pt-28 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      
      {/* Header */}
      <div className="max-w-3xl mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D7A5F]/10 dark:bg-[#10B981]/15 text-[#0D7A5F] dark:text-[#10B981] text-xs font-bold uppercase tracking-wider mb-3">
          <Droplet className="w-3.5 h-3.5 fill-[#0D7A5F] dark:fill-[#10B981]" />
          <span>{L('Humanitarian Technology', 'মানবসেবার প্রযুক্তি')}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-tight">
          {L('Give Blood.', 'রক্ত দিন।')} <br />
          {L('Save Lives.', 'জীবন বাঁচান।')}
        </h1>
        <p className="text-base sm:text-lg text-[#64748B] dark:text-[#94A3B8] mt-4 leading-relaxed">
          {L('Lifora was engineered to eliminate the life-threatening delay between emergency patient transfusion needs and voluntary blood donor discovery across regional healthcare ecosystems.', 'জরুরি রোগীর রক্তের প্রয়োজন আর স্বেচ্ছাসেবী রক্তদাতা খুঁজে পাওয়ার মধ্যকার প্রাণঘাতী দেরি কমাতেই লাইফোরা তৈরি করা হয়েছে।')}
        </p>
      </div>

      {/* 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        <div className="p-7 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#0D7A5F]/10 text-[#0D7A5F] dark:text-[#10B981] flex items-center justify-center mb-6">
            <Heart className="w-6 h-6 fill-[#DC2626] text-[#DC2626]" />
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
            {L('Voluntary Solidarity', 'স্বেচ্ছা সংহতি')}
          </h3>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            {L('Blood donation is an act of pure solidarity. Lifora operates with strict adherence to WHO medical ethics—never commercializing donors or patient data.', 'রক্তদান নিখাদ সংহতির কাজ। লাইফোরা বিশ্ব স্বাস্থ্য সংস্থার চিকিৎসা নীতি কঠোরভাবে মেনে চলে এবং ডোনার বা রোগীর তথ্য কখনো বাণিজ্যিকভাবে ব্যবহার করে না।')}
          </p>
        </div>

        <div className="p-7 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#0D7A5F]/10 text-[#0D7A5F] dark:text-[#10B981] flex items-center justify-center mb-6">
            <ShieldCheck className="w-6 h-6 text-[#0D7A5F] dark:text-[#10B981]" />
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
            {L('Verified Donors', 'যাচাইকৃত ডোনার')}
          </h3>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            {L('A donor is verified by LIFORA administrators after at least 5 confirmed blood donations. Verified donors are shown on the home page.', 'কমপক্ষে ৫ বার নিশ্চিত রক্তদানের পর লাইফোরার অ্যাডমিন একজন ডোনারকে যাচাই করেন। যাচাইকৃত ডোনারদের হোম পেজে দেখানো হয়।')}
          </p>
        </div>

        <div className="p-7 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#0D7A5F]/10 text-[#0D7A5F] dark:text-[#10B981] flex items-center justify-center mb-6">
            <Award className="w-6 h-6 text-[#0D7A5F] dark:text-[#10B981]" />
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
            {L('Rapid Triage Protocol', 'দ্রুত অগ্রাধিকার ব্যবস্থা')}
          </h3>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            {L('We prioritize critical surgical and ICU emergencies through high-urgency notifications directly to compatible volunteers within minutes.', 'গুরুতর অস্ত্রোপচার ও আইসিইউ জরুরি অবস্থাকে আমরা অগ্রাধিকার দিই। মিলে যাওয়া স্বেচ্ছাসেবীদের কাছে সরাসরি জরুরি বিজ্ঞপ্তি পাঠানো হয়।')}
          </p>
        </div>
      </div>

      {/* Dual Registration Callout */}
      <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#132220] to-[#0A261D] text-white shadow-xl mb-20 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <span className="text-xs font-mono uppercase tracking-wider text-[#10B981] font-bold">
            {L('JOIN THE ECOSYSTEM', 'আমাদের সাথে যোগ দিন')}
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold mt-1">
            {L('Become Part of Lifora Today', 'আজই লাইফোরার অংশ হোন')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            {L('Whether you want to donate whole blood, platelets, or coordinate emergency transfusions for patients in need, your registration strengthens our collective safety net.', 'আপনি রক্ত বা প্লাটিলেট দিতে চান, অথবা প্রয়োজনে থাকা রোগীর জন্য জরুরি রক্তের ব্যবস্থা করতে চান, আপনার নিবন্ধন আমাদের সম্মিলিত নিরাপত্তা বলয়কে শক্তিশালী করে।')}
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            onClick={() => openAuthModal('register', 'donor')}
            className="px-5 py-3 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Heart className="w-4 h-4 text-[#DC2626]" />
            <span>{L('Join as Donor', 'ডোনার হিসেবে যোগ দিন')}</span>
          </button>
          <button
            onClick={() => openAuthModal('register', 'requester')}
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{L('Register as Receiver', 'রক্ত গ্রহীতা হিসেবে রেজিস্টার')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contact Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            {L('Institutional & Volunteer Inquiries', 'প্রতিষ্ঠান ও স্বেচ্ছাসেবকদের জিজ্ঞাসা')}
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            {L('Interested in connecting your hospital transfusion department or blood collection organization to the Lifora network? Reach out to our regional coordination team.', 'আপনার হাসপাতালের ট্রান্সফিউশন বিভাগ বা রক্তসংগ্রহকারী সংগঠনকে লাইফোরা নেটওয়ার্কের সাথে যুক্ত করতে চান? আমাদের আঞ্চলিক সমন্বয় দলের সাথে যোগাযোগ করুন।')}
          </p>

          {(CONTACT_EMAIL || CONTACT_PHONE || CONTACT_ADDRESS) && (
          <div className="space-y-4 pt-4 border-t border-[#E2E8F0] dark:border-[#222D35] text-xs text-[#0F172A] dark:text-white">
            {CONTACT_EMAIL && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0D7A5F]/10 dark:bg-[#10B981]/20 text-[#0D7A5F] dark:text-[#10B981] flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">{L('Email', 'ইমেইল')}</span>
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold break-all hover:underline">{CONTACT_EMAIL}</a>
              </div>
            </div>
            )}

            {CONTACT_PHONE && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0D7A5F]/10 dark:bg-[#10B981]/20 text-[#0D7A5F] dark:text-[#10B981] flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">{L('Phone', 'ফোন')}</span>
                <a href={`tel:${CONTACT_PHONE}`} className="font-semibold hover:underline">{CONTACT_PHONE}</a>
              </div>
            </div>
            )}

            {CONTACT_ADDRESS && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0D7A5F]/10 dark:bg-[#10B981]/20 text-[#0D7A5F] dark:text-[#10B981] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">{L('Address', 'ঠিকানা')}</span>
                <span className="font-semibold break-words">{CONTACT_ADDRESS}</span>
              </div>
            </div>
            )}
          </div>
          )}
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
              {L('Send Coordination Message', 'যোগাযোগের বার্তা পাঠান')}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                {L('Full Name *', 'পুরো নাম *')}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={L('Your full name', 'আপনার পুরো নাম')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#0D7A5F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                {L('Email Address *', 'ইমেইল ঠিকানা *')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#0D7A5F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                {L('Inquiry / Collaboration Scope *', 'জিজ্ঞাসা / সহযোগিতার বিষয় *')}
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={L('Describe your organization, blood bank requirements, or feedback...', 'আপনার সংগঠন, রক্তের প্রয়োজন বা মতামত লিখুন...')}
                className="w-full p-3 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#0D7A5F]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] text-white font-bold text-xs shadow-xs transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{L('Transmitting Inquiry', 'বার্তা পাঠান')}</span>
            </button>

            {sent && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{L('Message received. Thank you for contacting LIFORA.', 'বার্তা পাওয়া গেছে। লাইফোরার সাথে যোগাযোগের জন্য ধন্যবাদ।')}</span>
              </div>
            )}
          </form>
        </div>
      </div>

    </div>
  );
};

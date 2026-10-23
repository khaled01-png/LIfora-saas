import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Droplet, Heart, Users, Mail, Lock, Building, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BloodGroup } from '../../types';
import { api } from '../../services/api';
import { validateName, validateEmail, validatePassword } from '../../utils/validation';

export const AuthModal: React.FC<{ inline?: boolean; panelId?: string }> = ({ inline = false, panelId = 'auth-inline-panel' }) => {
  const { 
    isAuthModalOpen, 
    authNotice,
    closeAuthModal, 
    authModalTab, 
    authInitialRole,
    login, 
    registerAccount,
    verifyEmail,
    resendCode,
    openAuthModal,
    showToast,
    language,
    t 
  } = useApp();
  const L = (en: string, bn: string) => (language === 'bn' ? bn : en);
  
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>(authModalTab);
  const [agreed, setAgreed] = useState(false);
  // Registration role choice (donor or receiver/requester)
  const [regRole, setRegRole] = useState<'donor' | 'requester'>('donor');

  React.useEffect(() => {
    setTab(authModalTab);
  }, [authModalTab]);

  React.useEffect(() => {
    if (authInitialRole) {
      setRegRole(authInitialRole);
    }
  }, [authInitialRole, isAuthModalOpen]);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [city, setCity] = useState('Sylhet');
  const [resetSent, setResetSent] = useState(false);
  // step 2 of sign-up: the emailed 6-digit code
  const [verifyFor, setVerifyFor] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Opened from the password-reset email link: /?reset_token=...
  React.useEffect(() => {
    try {
      const token = new URLSearchParams(window.location.search).get('reset_token');
      if (token) {
        setResetToken(token);
        openAuthModal('forgot');
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Closing the panel (or choosing another tab) abandons the code step, so reopening shows the normal form.
  React.useEffect(() => {
    if (!isAuthModalOpen) {
      setVerifyFor(null);
      setCode('');
      setDevCode(null);
    }
  }, [isAuthModalOpen]);

  if (!inline && !isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const result = await login(email, 'donor', password);
    if (result === 'verify') {
      // Registered earlier but never entered the code: send a fresh one and show the code step.
      const res = await resendCode(email.trim());
      setDevCode(res.devCode || null);
      setCode('');
      setVerifyFor(email.trim());
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateName(name) || validateEmail(email) || validatePassword(password);
    if (problem) {
      showToast(problem);
      return;
    }
    if (!agreed) {
      showToast(L('Please accept the Privacy Policy and Terms of Use to create an account.', 'অ্যাকাউন্ট খুলতে গোপনীয়তা নীতি ও ব্যবহারের শর্তে সম্মতি দিন।'));
      return;
    }
    setBusy(true);
    const res = await registerAccount(name, email, password);
    setBusy(false);
    if (res.ok) {
      setDevCode(res.devCode || null);
      setCode('');
      setVerifyFor(res.email || email.trim());
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyFor) return;
    if (!/^[0-9]{6}$/.test(code)) {
      showToast(L('Please enter the 6-digit code from your email.', 'ইমেইলে পাওয়া ৬ সংখ্যার কোডটি লিখুন।'));
      return;
    }
    setBusy(true);
    const ok = await verifyEmail(verifyFor, code);
    setBusy(false);
    if (ok) {
      setVerifyFor(null);
      setCode('');
      setPassword('');
    }
  };

  const handleResend = async () => {
    if (!verifyFor) return;
    const res = await resendCode(verifyFor);
    if (res.devCode) setDevCode(res.devCode);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      const res = await api.auth.forgotPassword(email);
      if (res.emailConfigured) {
        setResetSent(true);
        showToast(L('If an account exists for this email, a reset link has been sent.', 'এই ইমেইলে অ্যাকাউন্ট থাকলে একটি পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।'));
      } else {
        showToast(L('Password reset by email is not set up yet. Please contact the LIFORA administrator.', 'ইমেইলে পাসওয়ার্ড রিসেট এখনো চালু হয়নি। লাইফোরার অ্যাডমিনের সাথে যোগাযোগ করুন।'));
      }
    } catch (err: any) {
      showToast(err?.message || L('Could not request a password reset. Please try again.', 'পাসওয়ার্ড রিসেটের অনুরোধ করা যায়নি। আবার চেষ্টা করুন।'));
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) return;
    if (newPassword.length < 8) {
      showToast(L('Please choose a password with at least 8 characters.', 'কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন।'));
      return;
    }
    try {
      const res = await api.auth.resetPassword(resetToken, newPassword);
      showToast(L(res.message, 'আপনার পাসওয়ার্ড বদলানো হয়েছে। এখন লগইন করতে পারবেন।'));
      setResetToken(null);
      setNewPassword('');
      window.history.replaceState({}, '', window.location.pathname);
      setTab('login');
    } catch (err: any) {
      showToast(err?.message || L('This reset link is invalid or has expired.', 'এই রিসেট লিংকটি ভুল অথবা মেয়াদ শেষ।'));
    }
  };

  const body = (
    <>
        {/* Close button */}
        {!inline && (<button
          id="close-auth-modal"
          onClick={closeAuthModal}
          aria-label={L('Close', 'বন্ধ করুন')}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>)}

        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-[#0D7A5F] flex items-center justify-center text-white shadow-sm">
            <Droplet className="w-4 h-4 fill-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">LIFORA</span>
            <span className="text-[10px] uppercase font-bold text-[#0D7A5F] dark:text-[#10B981] ml-2 tracking-wider">{L('Health Coordination', 'স্বাস্থ্য সমন্বয়')}</span>
          </div>
        </div>

        {authNotice && (
          <div role="status" className="mb-2 mt-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            {authNotice}
          </div>
        )}

        {/* Tab Headers */}
        <div className="flex border-b border-[#E2E8F0] dark:border-[#222D35] mb-6 mt-4">
          <button
            onClick={() => { setTab('login'); setResetSent(false); }}
            className={`pb-3 text-sm font-semibold transition-colors relative mr-6 cursor-pointer ${
              tab === 'login'
                ? 'text-[#0D7A5F] dark:text-[#10B981] border-b-2 border-[#0D7A5F] dark:border-[#10B981]'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            {t('auth.tabLogin')}
          </button>
          <button
            onClick={() => { setTab('register'); setResetSent(false); }}
            className={`pb-3 text-sm font-semibold transition-colors relative mr-6 cursor-pointer ${
              tab === 'register'
                ? 'text-[#0D7A5F] dark:text-[#10B981] border-b-2 border-[#0D7A5F] dark:border-[#10B981]'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            {t('auth.tabRegister')}
          </button>
          <button
            onClick={() => { setVerifyFor(null); setTab('forgot'); }}
            className={`pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${
              tab === 'forgot'
                ? 'text-[#0D7A5F] dark:text-[#10B981] border-b-2 border-[#0D7A5F] dark:border-[#10B981]'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            {t('auth.tabForgot')}
          </button>
        </div>

        {/* LOGIN FORM */}
        {!verifyFor && tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                {t('auth.inputEmail')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-[#94A3B8]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.org"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] dark:focus:border-[#10B981] text-[#0F172A] dark:text-white"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                  {t('auth.inputPassword')}
                </label>
                <button
                  type="button"
                  onClick={() => { setVerifyFor(null); setTab('forgot'); }}
                  className="text-xs text-[#0D7A5F] dark:text-[#10B981] hover:underline"
                >
                  {t('auth.forgotLink')}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[#94A3B8]" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] dark:focus:border-[#10B981] text-[#0F172A] dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              <span>{t('auth.btnLogin')}</span>
              <ArrowRight className="w-4 h-4 lifora-btn-arrow" />
            </button>
          </form>
        )}

        {/* STEP 2: EMAIL VERIFICATION CODE */}
        {verifyFor && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">{L('Verify your email', 'আপনার ইমেইল যাচাই করুন')}</h3>
              <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                {L('We sent a 6-digit code to', 'আমরা একটি ৬ সংখ্যার কোড পাঠিয়েছি:')} <span className="font-semibold">{verifyFor}</span>. {L('It expires in 15 minutes.', 'কোডটির মেয়াদ ১৫ মিনিট।')}
              </p>
            </div>
            {devCode && (
              <div role="status" className="rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/40 px-3 py-2 text-xs text-sky-900 dark:text-sky-200">
                {L('Test mode: no email server is connected, so your code is', 'টেস্ট মোড: কোনো ইমেইল সার্ভার যুক্ত নেই, তাই আপনার কোড:')} <span className="font-mono font-bold tracking-widest">{devCode}</span>.
                {L('On the live site this code arrives only by email.', 'আসল সাইটে এই কোড শুধু ইমেইলে আসে।')}
              </div>
            )}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              aria-label={L('6-digit verification code', '৬ সংখ্যার যাচাই কোড')}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-center text-xl font-mono tracking-[0.5em] focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] disabled:opacity-60 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{L('Verify and continue', 'যাচাই করে এগিয়ে যান')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={handleResend} className="font-semibold text-[#0D7A5F] hover:underline cursor-pointer">
                {L('Send a new code', 'নতুন কোড পাঠান')}
              </button>
              <button type="button" onClick={() => { setVerifyFor(null); setCode(''); setDevCode(null); }} className="text-[#64748B] hover:underline cursor-pointer">
                {L('Use a different email', 'অন্য ইমেইল ব্যবহার করুন')}
              </button>
            </div>
          </form>
        )}

        {/* STEP 1: REGISTER (name, email, password only) */}
        {!verifyFor && tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              {L('Step 1 of 3. Create your account. We will email you a code to confirm your address, then you choose whether to become a donor or a requester.', 'ধাপ ১/৩: আপনার অ্যাকাউন্ট খুলুন। আপনার ঠিকানা নিশ্চিত করতে আমরা একটি কোড ইমেইল করব, তারপর আপনি বেছে নেবেন ডোনার হবেন নাকি রক্ত গ্রহীতা।')}
            </p>
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">{t('auth.inputName')}</label>
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={L('Your full name', 'আপনার পুরো নাম')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">{t('auth.inputEmail')}</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.org"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">{t('auth.inputPassword')}</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={L('At least 8 characters', 'কমপক্ষে ৮ অক্ষর')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white"
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] cursor-pointer">
              <input
                type="checkbox"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-[#0D7A5F]"
              />
              <span>
                {L('I have read and accept the', 'আমি পড়েছি এবং মেনে নিচ্ছি:')}{' '}
                <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="underline text-[#0D7A5F]">{L('Privacy Policy', 'গোপনীয়তা নীতি')}</a>
                {' '}{L('and', 'ও')}{' '}
                <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="underline text-[#0D7A5F]">{L('Terms of Use', 'ব্যবহারের শর্ত')}</a>.
              </span>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] disabled:opacity-60 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{L('Create account and send code', 'অ্যাকাউন্ট খুলুন ও কোড পাঠান')}</span>
              <ArrowRight className="w-4 h-4 lifora-btn-arrow" />
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {!verifyFor && tab === 'forgot' && resetToken && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                {t('auth.inputPassword')}
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={L('•••••••• (min. 8)', '•••••••• (কমপক্ষে ৮)')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('auth.inputPassword')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {!verifyFor && tab === 'forgot' && !resetToken && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              {t('auth.subtitleForgot')}
            </p>

            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                {t('auth.inputEmail')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.org"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('auth.btnForgot')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {resetSent && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{t('toast.resetLinkSent')}</span>
              </div>
            )}
          </form>
        )}
    </>
  );

  // Desktop guests: always-visible login / sign-up card (like the landing-page design).
  if (inline) {
    return (
      <div
        id={panelId}
        role="region"
        aria-label={L('Log in or sign up', 'লগইন বা সাইন-আপ')}
        className="relative w-full rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xl p-6 sm:p-8"
      >
        {body}
      </div>
    );
  }

  return (
    <div 
      id="auth-modal-backdrop"
      className="lg:hidden fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div 
        id="auth-modal-container"
        role="dialog"
        aria-modal="true"
        aria-label={L('Log in or sign up', 'লগইন বা সাইন-আপ')}
        className="relative w-full sm:max-w-md h-full bg-white dark:bg-[#12181C] sm:border-l border-[#E2E8F0] dark:border-[#222D35] shadow-2xl p-6 sm:p-8 overflow-y-auto animate-in slide-in-from-right"
      >
        {body}
      </div>
    </div>
  );
};

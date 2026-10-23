import React, { useCallback, useEffect, useState } from 'react';
import { Shield, LogOut, Search, Plus, Minus, Check, Droplet } from 'lucide-react';
import { api, AdminUser, AdminRequest, AdminDonation, AdminActivity, ContactMessageRow } from '../services/api';
import { Donor, InventoryItem, User } from '../types';

// The administrator area. It is a separate page (/admin), not part of the public website:
// the public site has no admin menu or link. Every request is checked again on the server (admin role required).

const PAGE = 25;
type Lang = 'en' | 'bn';
type Tab = 'overview' | 'requests' | 'donors' | 'accounts' | 'donations' | 'messages' | 'activity' | 'inventory';

const th = 'py-3 px-3 font-bold uppercase text-left whitespace-nowrap';
const td = 'py-3 px-3 align-top';
const card = 'rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35] shadow-xs';
const input = 'w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-sm focus:outline-none focus:border-[#0D7A5F] text-[#0F172A] dark:text-white';

function usePaged<T>(load: (limit: number, offset: number) => Promise<{ items: T[]; total: number }>, deps: unknown[]) {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await load(PAGE, page * PAGE);
      setItems(r.items); setTotal(r.total);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, ...deps]);
  useEffect(() => { void reload(); }, [reload]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(0); }, deps);
  return { page, setPage, items, total, loading, error, reload };
}

export default function AdminApp() {
  const [lang, setLang] = useState<Lang>(() => { try { return localStorage.getItem('lifora-lang') === 'bn' ? 'bn' : 'en'; } catch { return 'en'; } });
  const L = (en: string, bn: string) => (lang === 'bn' ? bn : en);
  const changeLang = (l: Lang) => { setLang(l); try { localStorage.setItem('lifora-lang', l); } catch { /* ignore */ } };

  const [me, setMe] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [toast, setToast] = useState('');
  const notify = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(''), 4500); }, []);

  useEffect(() => {
    document.title = 'LIFORA Admin';
    try { if (localStorage.getItem('lifora-theme') === 'dark') document.documentElement.classList.add('dark'); } catch { /* ignore */ }
    (async () => {
      if (!localStorage.getItem('lifora_token')) { setChecking(false); return; }
      try {
        const res = await api.auth.getMe();
        setMe(res.user && res.user.role === 'admin' ? res.user : null);
      } catch { setMe(null); }
      setChecking(false);
    })();
  }, []);

  const logout = async () => { await api.auth.logout(); setMe(null); };

  const langSwitch = (
    <div className="flex rounded-xl border border-[#E2E8F0] dark:border-[#222D35] overflow-hidden text-xs font-bold">
      {(['en', 'bn'] as Lang[]).map(l => (
        <button key={l} onClick={() => changeLang(l)} className={`px-3 py-1.5 cursor-pointer ${lang === l ? 'bg-[#0D7A5F] text-white' : 'text-[#64748B]'}`}>{l === 'en' ? 'EN' : 'বাং'}</button>
      ))}
    </div>
  );

  const toastEl = toast ? (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] px-4 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs shadow-lg">{toast}</div>
  ) : null;

  if (checking) return <div className="min-h-screen flex items-center justify-center text-sm text-[#64748B]" aria-busy="true">…</div>;

  if (!me) {
    return <>
      <AdminLogin L={L} langSwitch={langSwitch} onDone={(u) => setMe(u)} notify={notify} />
      {toastEl}
    </>;
  }

  return <>
    <AdminDashboard L={L} lang={lang} me={me} langSwitch={langSwitch} logout={logout} notify={notify} />
    {toastEl}
  </>;
}

// ---------------------------------------------------------------- login
const AdminLogin: React.FC<{ L: (en: string, bn: string) => string; langSwitch: React.ReactNode; onDone: (u: User) => void; notify: (m: string) => void }> = ({ L, langSwitch, onDone, notify }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.auth.login({ email: email.trim(), password });
      if (res.user.role !== 'admin') {
        await api.auth.logout();
        notify(L('This is not an administrator account.', 'এটি অ্যাডমিন অ্যাকাউন্ট নয়।'));
      } else {
        onDone(res.user);
      }
    } catch (err: any) {
      notify(err?.message || L('Login failed.', 'লগইন করা যায়নি।'));
    }
    setBusy(false);
  };
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-3">{langSwitch}</div>
        <form onSubmit={submit} className={`${card} p-6 sm:p-8 space-y-4`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#DC2626] flex items-center justify-center"><Droplet className="w-5 h-5 text-white fill-white" /></div>
            <div>
              <div className="font-extrabold text-lg text-[#0F172A] dark:text-white leading-none">LIFORA</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#0D7A5F]">{L('Administrator', 'অ্যাডমিন')}</div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">{L('Email', 'ইমেইল')}</label>
            <input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">{L('Password', 'পাসওয়ার্ড')}</label>
            <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={input} />
          </div>
          <button disabled={busy} className="w-full py-3 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] disabled:opacity-60 text-white font-semibold text-sm cursor-pointer">{L('Log in', 'লগইন')}</button>
          <a href="/" className="block text-center text-xs text-[#64748B] hover:underline">{L('Back to the website', 'ওয়েবসাইটে ফিরে যান')}</a>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- dashboard shell
interface Ctx { L: (en: string, bn: string) => string; lang: Lang; notify: (m: string) => void }

const AdminDashboard: React.FC<Ctx & { me: User; langSwitch: React.ReactNode; logout: () => void }> = ({ L, lang, me, langSwitch, logout, notify }) => {
  const [tab, setTab] = useState<Tab>('overview');
  const tabs: [Tab, string][] = [
    ['overview', L('Overview', 'সারসংক্ষেপ')],
    ['requests', L('Requests', 'অনুরোধ')],
    ['donors', L('Donors', 'ডোনার')],
    ['accounts', L('Accounts', 'অ্যাকাউন্ট')],
    ['donations', L('Donations', 'রক্তদান')],
    ['messages', L('Messages', 'বার্তা')],
    ['activity', L('Activity log', 'অ্যাক্টিভিটি লগ')],
    ['inventory', L('Blood stock', 'রক্তের মজুত')],
  ];
  const ctx: Ctx = { L, lang, notify };
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC]">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-5 h-5 text-[#0D7A5F] shrink-0" />
            <span className="font-extrabold truncate">LIFORA {L('Admin', 'অ্যাডমিন')}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden md:inline text-xs text-[#64748B] truncate max-w-[14rem]">{me.email}</span>
            {langSwitch}
            <button onClick={logout} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] cursor-pointer">
              <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">{L('Log out', 'লগআউট')}</span>
            </button>
          </div>
        </div>
        <nav aria-label="Admin sections" className="max-w-7xl mx-auto px-3 sm:px-6 flex gap-1 overflow-x-auto">
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`py-2.5 px-3 text-xs font-bold whitespace-nowrap border-b-2 cursor-pointer ${tab === key ? 'border-[#0D7A5F] text-[#0D7A5F] dark:text-[#10B981]' : 'border-transparent text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'}`}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
        {tab === 'overview' && <OverviewTab {...ctx} />}
        {tab === 'requests' && <RequestsTab {...ctx} />}
        {tab === 'donors' && <DonorsTab {...ctx} />}
        {tab === 'accounts' && <AccountsTab {...ctx} />}
        {tab === 'donations' && <DonationsTab {...ctx} />}
        {tab === 'messages' && <MessagesTab {...ctx} />}
        {tab === 'activity' && <ActivityTab {...ctx} />}
        {tab === 'inventory' && <InventoryTab {...ctx} />}
      </main>
    </div>
  );
};

// ---------------------------------------------------------------- shared bits
const fmtDate = (iso?: string | null, lang: Lang = 'en') => {
  if (!iso) return '—';
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);  // the server stores UTC
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' });
};

const Pager: React.FC<{ page: number; total: number; setPage: (p: number) => void; L: Ctx['L'] }> = ({ page, total, setPage, L }) => {
  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <div className="flex items-center justify-between gap-2 mt-3 text-xs text-[#64748B]">
      <span>{L(`${total} in total`, `মোট ${total}`)} · {L('Page', 'পেজ')} {page + 1}/{pages}</span>
      <div className="flex gap-2">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#222D35] disabled:opacity-40 cursor-pointer">{L('Previous', 'আগের')}</button>
        <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#222D35] disabled:opacity-40 cursor-pointer">{L('Next', 'পরের')}</button>
      </div>
    </div>
  );
};

const Table: React.FC<{ loading: boolean; error: string; empty: boolean; L: Ctx['L']; children: React.ReactNode }> = ({ loading, error, empty, L, children }) => (
  <div className={`${card} overflow-hidden`}>
    {error && <p role="alert" className="p-4 text-xs text-red-700 dark:text-red-300">{error}</p>}
    {loading && <p className="p-4 text-xs text-[#64748B]" aria-busy="true">{L('Loading…', 'লোড হচ্ছে…')}</p>}
    {!loading && !error && empty && <p className="p-4 text-xs text-[#64748B]">{L('Nothing here yet.', 'এখানে এখনো কিছু নেই।')}</p>}
    <div className="overflow-x-auto"><table className="w-full text-xs border-collapse">{children}</table></div>
  </div>
);

const SearchBox: React.FC<{ value: string; onSubmit: (v: string) => void; L: Ctx['L']; placeholder: string }> = ({ value, onSubmit, L, placeholder }) => {
  const [v, setV] = useState(value);
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(v.trim()); }} className="flex gap-2 mb-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-3 text-[#94A3B8]" />
        <input value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} className={`${input} pl-9`} />
      </div>
      <button className="px-4 rounded-xl bg-[#0D7A5F] text-white text-xs font-bold cursor-pointer">{L('Search', 'খুঁজুন')}</button>
    </form>
  );
};

const statusBn: Record<string, string> = { Pending: 'অপেক্ষায়', 'In Progress': 'চলছে', Fulfilled: 'সম্পূর্ণ', Cancelled: 'বাতিল', Expired: 'মেয়াদ শেষ', Completed: 'সম্পূর্ণ' };
const respBn: Record<string, string> = { accepted: 'রাজি', booked: 'বুকড', claimed: '“রক্ত দিয়েছি” বলেছেন', completed: 'রক্ত দিয়েছেন', declined: 'অস্বীকার', cancelled: 'বাতিল' };
const roleBn: Record<string, string> = { donor: 'ডোনার', requester: 'রক্ত গ্রহীতা', admin: 'অ্যাডমিন', pending: 'প্রোফাইল বাকি' };

// ---------------------------------------------------------------- overview
const OverviewTab: React.FC<Ctx> = ({ L }) => {
  const [s, setS] = useState<Awaited<ReturnType<typeof api.stats.getStats>>['stats'] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.stats.getStats().then(r => setS(r.stats)).catch(e => setErr(e?.message || 'Error')); }, []);
  if (err) return <p role="alert" className="text-xs text-red-700">{err}</p>;
  if (!s) return <p className="text-xs text-[#64748B]" aria-busy="true">{L('Loading…', 'লোড হচ্ছে…')}</p>;
  const items: [string, number | string][] = [
    [L('Registered accounts', 'নিবন্ধিত অ্যাকাউন্ট'), s.registeredAccounts ?? 0],
    [L('Waiting for e-mail code', 'ইমেইল কোডের অপেক্ষায়'), s.awaitingCodeAccounts ?? 0],
    [L('Profile not finished', 'প্রোফাইল শেষ হয়নি'), s.unfinishedAccounts ?? 0],
    [L('Donor profiles', 'ডোনার প্রোফাইল'), s.totalDonors],
    [L('Verified donors', 'যাচাইকৃত ডোনার'), s.verifiedDonors ?? 0],
    [L('Open requests', 'খোলা অনুরোধ'), s.activeRequests],
    [L('Fulfilled requests', 'পূর্ণ হওয়া অনুরোধ'), s.fulfilledRequests],
    [L('Blood units in stock', 'মজুত রক্ত (ব্যাগ)'), s.totalAvailableUnits],
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {items.map(([label, value]) => (
        <div key={label} className={`${card} p-4 sm:p-5`}>
          <span className="text-[11px] font-bold text-[#64748B] uppercase">{label}</span>
          <div className="text-2xl sm:text-3xl font-extrabold mt-1">{value}</div>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- requests
const RequestsTab: React.FC<Ctx> = ({ L, lang }) => {
  const [status, setStatus] = useState('all');
  const p = usePaged<AdminRequest>(async (limit, offset) => { const r = await api.admin.requests({ status, limit, offset }); return { items: r.requests, total: r.total }; }, [status]);
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs">
        <label htmlFor="req-status" className="font-bold text-[#64748B]">{L('Status', 'অবস্থা')}</label>
        <select id="req-status" value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-white dark:bg-[#12181C]">
          {['all', 'Pending', 'In Progress', 'Fulfilled', 'Cancelled', 'Expired'].map(s => <option key={s} value={s}>{s === 'all' ? L('All', 'সব') : lang === 'bn' ? statusBn[s] : s}</option>)}
        </select>
      </div>
      <Table loading={p.loading} error={p.error} empty={!p.items.length} L={L}>
        <thead><tr className="border-b border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-[#64748B]">
          {[L('Posted', 'কখন'), L('Group', 'গ্রুপ'), L('Hospital', 'হাসপাতাল'), L('Requested by', 'অনুরোধকারী'), L('Patient', 'রোগী'), L('Units / urgency', 'ব্যাগ / জরুরি'), L('Status', 'অবস্থা'), L('Donors who answered', 'যাঁরা সাড়া দিয়েছেন')].map(h => <th key={h} className={th}>{h}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#222D35]">
          {p.items.map(r => (
            <tr key={r.id}>
              <td className={`${td} whitespace-nowrap`}>{fmtDate(r.createdAt, lang)}</td>
              <td className={`${td} font-extrabold text-[#DC2626] text-sm`}>{r.bloodGroup}</td>
              <td className={td}><strong>{r.hospitalName}</strong><br /><span className="text-[#64748B]">{r.city}</span></td>
              <td className={td}>{r.requester ? <>{r.requester.name}<br /><span className="text-[#64748B] break-all">{r.requester.email}</span><br /><span className="text-[#64748B]">{r.requester.phone || ''}</span></> : '—'}</td>
              <td className={td}>{r.patientName}<br /><span className="text-[#64748B]">{r.contactPerson} {r.contactPhone}</span></td>
              <td className={td}>{r.unitsNeeded} · {r.urgency}</td>
              <td className={`${td} font-semibold`}>{lang === 'bn' ? (statusBn[r.status] || r.status) : r.status}</td>
              <td className={td}>{r.responses.length === 0 ? '—' : r.responses.map(x => (
                <div key={x.id}>{x.donorName} ({x.donorBloodGroup}) · <em>{lang === 'bn' ? (respBn[x.status] || x.status) : x.status}</em></div>
              ))}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pager page={p.page} total={p.total} setPage={p.setPage} L={L} />
    </div>
  );
};

// ---------------------------------------------------------------- donors (+ verify)
const DonorsTab: React.FC<Ctx> = ({ L, lang, notify }) => {
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<'all' | 'verified'>('all');
  const p = usePaged<Donor>(async (limit, offset) => { const r = await api.donors.getAll({ q: q || undefined, verified: only === 'verified' ? true : undefined, limit, offset }); return { items: r.donors, total: r.total ?? r.count }; }, [q, only]);
  const verify = async (d: Donor, value: boolean) => {
    try { await api.donors.verify(d.id, value); notify(value ? L('Donor verified.', 'ডোনার যাচাই হয়েছে।') : L('Verification removed.', 'যাচাই তুলে নেওয়া হয়েছে।')); await p.reload(); }
    catch (e: any) { notify(e?.message || 'Error'); }
  };
  return (
    <div>
      <SearchBox value={q} onSubmit={setQ} L={L} placeholder={L('Name, city, blood group…', 'নাম, শহর, রক্তের গ্রুপ…')} />
      <div className="mb-3 flex gap-2 text-xs">
        {(['all', 'verified'] as const).map(k => (
          <button key={k} onClick={() => setOnly(k)} className={`px-3 py-1.5 rounded-lg border cursor-pointer ${only === k ? 'bg-[#0D7A5F] text-white border-[#0D7A5F]' : 'border-[#E2E8F0] dark:border-[#222D35]'}`}>
            {k === 'all' ? L('All donors', 'সব ডোনার') : L('Verified only', 'শুধু যাচাইকৃত')}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[#64748B] mb-3">{L('A donor can be verified only after at least 5 confirmed donations.', 'কমপক্ষে ৫ বার নিশ্চিত রক্তদান না করলে কাউকে যাচাই করা যায় না।')}</p>
      <Table loading={p.loading} error={p.error} empty={!p.items.length} L={L}>
        <thead><tr className="border-b border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-[#64748B]">
          {[L('Name', 'নাম'), L('Group', 'গ্রুপ'), L('City', 'শহর'), L('Phone', 'ফোন'), L('Email', 'ইমেইল'), L('Donations', 'রক্তদান'), L('Availability', 'অবস্থা'), L('Verified', 'যাচাই')].map(h => <th key={h} className={th}>{h}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#222D35]">
          {p.items.map(d => {
            const eligible = d.totalDonations >= 5;
            return (
              <tr key={d.id}>
                <td className={`${td} font-semibold`}>{d.name}</td>
                <td className={`${td} font-extrabold text-[#DC2626]`}>{d.bloodGroup}</td>
                <td className={td}>{d.city}</td>
                <td className={`${td} whitespace-nowrap`}>{d.phone}</td>
                <td className={`${td} break-all`}>{d.email}</td>
                <td className={td}>{d.totalDonations}</td>
                <td className={td}>{d.availability}</td>
                <td className={td}>
                  {d.verified ? (
                    <button onClick={() => verify(d, false)} className="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 font-bold cursor-pointer">✓ {L('Verified', 'যাচাইকৃত')} · {L('Remove', 'তুলুন')}</button>
                  ) : (
                    <button disabled={!eligible} onClick={() => verify(d, true)} title={eligible ? '' : L('Needs at least 5 donations', 'কমপক্ষে ৫ বার রক্তদান লাগবে')}
                      className="px-3 py-1.5 rounded-lg bg-[#0D7A5F] text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">{L('Verify', 'যাচাই করুন')}</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <Pager page={p.page} total={p.total} setPage={p.setPage} L={L} />
    </div>
  );
};

// ---------------------------------------------------------------- accounts (+ reset e-mail)
const AccountsTab: React.FC<Ctx> = ({ L, lang, notify }) => {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const p = usePaged<AdminUser>(async (limit, offset) => { const r = await api.admin.users({ q: q || undefined, role, limit, offset }); return { items: r.users, total: r.total }; }, [q, role]);
  const sendReset = async (u: AdminUser) => {
    if (!window.confirm(L(`Send a password reset e-mail to ${u.email}?`, `${u.email} ঠিকানায় পাসওয়ার্ড রিসেট ইমেইল পাঠাবেন?`))) return;
    try { const r = await api.admin.sendReset(u.id); notify(r.message); } catch (e: any) { notify(e?.message || 'Error'); }
  };
  return (
    <div>
      <p className="text-[11px] text-[#64748B] mb-3">{L('Passwords are stored in a scrambled form and can never be read, not even by administrators. Use “Send reset e-mail” to help someone who forgot theirs.', 'পাসওয়ার্ড এলোমেলো রূপে সংরক্ষিত থাকে, অ্যাডমিনও কখনো দেখতে পারেন না। কেউ ভুলে গেলে “রিসেট ইমেইল পাঠান” চাপুন।')}</p>
      <SearchBox value={q} onSubmit={setQ} L={L} placeholder={L('Name, e-mail, phone…', 'নাম, ইমেইল, ফোন…')} />
      <div className="mb-3 flex items-center gap-2 text-xs">
        <label htmlFor="acc-role" className="font-bold text-[#64748B]">{L('Role', 'ভূমিকা')}</label>
        <select id="acc-role" value={role} onChange={e => setRole(e.target.value)} className="px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-white dark:bg-[#12181C]">
          {['all', 'donor', 'requester', 'pending', 'admin'].map(r => <option key={r} value={r}>{r === 'all' ? L('All', 'সব') : lang === 'bn' ? roleBn[r] : r}</option>)}
        </select>
      </div>
      <Table loading={p.loading} error={p.error} empty={!p.items.length} L={L}>
        <thead><tr className="border-b border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-[#64748B]">
          {[L('Joined', 'কবে খুলেছেন'), L('Name', 'নাম'), L('Email', 'ইমেইল'), L('Phone', 'ফোন'), L('Role', 'ভূমিকা'), L('Group', 'গ্রুপ'), L('E-mail verified', 'ইমেইল যাচাই'), L('Donations', 'রক্তদান'), ''].map((h, i) => <th key={i} className={th}>{h}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#222D35]">
          {p.items.map(u => (
            <tr key={u.id}>
              <td className={`${td} whitespace-nowrap`}>{fmtDate(u.createdAt, lang)}</td>
              <td className={`${td} font-semibold`}>{u.name}</td>
              <td className={`${td} break-all`}>{u.email}</td>
              <td className={`${td} whitespace-nowrap`}>{u.phone || '—'}</td>
              <td className={td}>{lang === 'bn' ? (roleBn[u.role] || u.role) : u.role}</td>
              <td className={td}>{u.bloodGroup || '—'}</td>
              <td className={td}>{u.emailVerified ? '✓' : '✗'}</td>
              <td className={td}>{u.totalDonations}</td>
              <td className={td}><button onClick={() => sendReset(u)} className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#222D35] font-semibold whitespace-nowrap cursor-pointer">{L('Send reset e-mail', 'রিসেট ইমেইল পাঠান')}</button></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pager page={p.page} total={p.total} setPage={p.setPage} L={L} />
    </div>
  );
};

// ---------------------------------------------------------------- donations (+ cancel)
const DonationsTab: React.FC<Ctx> = ({ L, lang, notify }) => {
  const p = usePaged<AdminDonation>(async (limit, offset) => { const r = await api.admin.donations({ limit, offset }); return { items: r.donations, total: r.total }; }, []);
  const cancel = async (d: AdminDonation) => {
    if (!window.confirm(L(`Cancel this donation by ${d.donorName}? The donor's count and cool-down will be corrected.`, `${d.donorName}-এর এই রক্তদান বাতিল করবেন? ডোনারের গণনা ও বিশ্রামের সময় ঠিক হয়ে যাবে।`))) return;
    try { await api.admin.cancelDonation(d.id); notify(L('Donation cancelled.', 'রক্তদান বাতিল হয়েছে।')); await p.reload(); } catch (e: any) { notify(e?.message || 'Error'); }
  };
  return (
    <div>
      <Table loading={p.loading} error={p.error} empty={!p.items.length} L={L}>
        <thead><tr className="border-b border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-[#64748B]">
          {[L('When', 'কখন'), L('Donor', 'ডোনার'), L('Group', 'গ্রুপ'), L('Hospital', 'হাসপাতাল'), L('Units', 'ব্যাগ'), L('Status', 'অবস্থা'), ''].map((h, i) => <th key={i} className={th}>{h}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#222D35]">
          {p.items.map(d => (
            <tr key={d.id}>
              <td className={`${td} whitespace-nowrap`}>{fmtDate(d.createdAt || d.date, lang)}</td>
              <td className={`${td} font-semibold`}>{d.donorName}</td>
              <td className={`${td} font-extrabold text-[#DC2626]`}>{d.bloodGroup}</td>
              <td className={td}>{d.centerName}</td>
              <td className={td}>{d.units}</td>
              <td className={td}>{lang === 'bn' ? (statusBn[d.status] || d.status) : d.status}</td>
              <td className={td}>{d.status === 'Completed' && <button onClick={() => cancel(d)} className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 font-semibold whitespace-nowrap cursor-pointer">{L('Cancel donation', 'বাতিল করুন')}</button>}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pager page={p.page} total={p.total} setPage={p.setPage} L={L} />
    </div>
  );
};

// ---------------------------------------------------------------- contact messages
const MessagesTab: React.FC<Ctx> = ({ L, lang, notify }) => {
  const [rows, setRows] = useState<ContactMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await api.contact.messages()).messages); } catch (e: any) { setError(e?.message || 'Error'); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const handled = async (m: ContactMessageRow) => { try { await api.contact.markHandled(m.id); await load(); } catch (e: any) { notify(e?.message || 'Error'); } };
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {loading && <p className="text-xs text-[#64748B]" aria-busy="true">{L('Loading…', 'লোড হচ্ছে…')}</p>}
      {!loading && !error && rows.length === 0 && <p className="text-xs text-[#64748B]">{L('No messages yet.', 'এখনো কোনো বার্তা নেই।')}</p>}
      {rows.map(m => (
        <div key={m.id} className={`${card} p-4 ${m.handled ? 'opacity-60' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span><strong>{m.name}</strong> · <a className="underline break-all" href={`mailto:${m.email}`}>{m.email}</a></span>
            <span className="text-[#64748B]">{fmtDate(m.createdAt, lang)}</span>
          </div>
          <p className="mt-2 text-sm whitespace-pre-wrap break-words">{m.message}</p>
          {!m.handled && <button onClick={() => handled(m)} className="mt-3 px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#222D35] text-xs font-semibold cursor-pointer flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />{L('Mark as handled', 'সমাধান হয়েছে')}</button>}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- activity log
const EVENTS: Record<string, [string, string]> = {
  signup_started: ['Sign-up started', 'সাইন-আপ শুরু'],
  email_verified: ['Account created (e-mail verified)', 'অ্যাকাউন্ট তৈরি (ইমেইল যাচাই)'],
  profile_completed: ['Profile completed', 'প্রোফাইল সম্পূর্ণ'],
  role_switched: ['Role switched', 'ভূমিকা বদল'],
  request_created: ['Blood request posted', 'রক্তের অনুরোধ দেওয়া হয়েছে'],
  donor_responded: ['Donor accepted a request', 'ডোনার অনুরোধে সাড়া দিয়েছেন'],
  donor_claimed_donation: ['Donor pressed “I donated”', 'ডোনার “রক্ত দিয়েছি” চেপেছেন'],
  donation_confirmed: ['Donation confirmed by requester', 'অনুরোধকারী রক্তদান নিশ্চিত করেছেন'],
  donation_auto_confirmed: ['Donation confirmed automatically (24 h)', 'রক্তদান নিজে থেকে নিশ্চিত (২৪ ঘণ্টা)'],
  donation_cancelled: ['Donation cancelled by admin', 'অ্যাডমিন রক্তদান বাতিল করেছেন'],
  donor_verified: ['Donor verified', 'ডোনার যাচাই হয়েছে'],
  donor_unverified: ['Verification removed', 'যাচাই তুলে নেওয়া হয়েছে'],
  password_reset_requested: ['Password reset requested', 'পাসওয়ার্ড রিসেটের অনুরোধ'],
  password_reset_done: ['Password changed', 'পাসওয়ার্ড বদলানো হয়েছে'],
  password_reset_sent_by_admin: ['Reset e-mail sent by admin', 'অ্যাডমিন রিসেট ইমেইল পাঠিয়েছেন'],
  account_deleted: ['Account deleted', 'অ্যাকাউন্ট মুছে ফেলা হয়েছে'],
};

const ActivityTab: React.FC<Ctx> = ({ L, lang }) => {
  const [event, setEvent] = useState('all');
  const p = usePaged<AdminActivity>(async (limit, offset) => { const r = await api.admin.activity({ event, limit, offset }); return { items: r.activity, total: r.total }; }, [event]);
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs">
        <label htmlFor="act-event" className="font-bold text-[#64748B]">{L('Event', 'ঘটনা')}</label>
        <select id="act-event" value={event} onChange={e => setEvent(e.target.value)} className="px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] bg-white dark:bg-[#12181C] max-w-[70vw]">
          <option value="all">{L('All', 'সব')}</option>
          {Object.entries(EVENTS).map(([k, v]) => <option key={k} value={k}>{lang === 'bn' ? v[1] : v[0]}</option>)}
        </select>
      </div>
      <Table loading={p.loading} error={p.error} empty={!p.items.length} L={L}>
        <thead><tr className="border-b border-[#E2E8F0] dark:border-[#222D35] bg-[#F8FAF9] dark:bg-[#0B0F12] text-[#64748B]">
          {[L('When', 'কখন'), L('Who', 'কে'), L('What happened', 'কী হয়েছে'), L('Details', 'বিবরণ')].map(h => <th key={h} className={th}>{h}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#222D35]">
          {p.items.map(a => (
            <tr key={a.id}>
              <td className={`${td} whitespace-nowrap`}>{fmtDate(a.createdAt, lang)}</td>
              <td className={td}>{a.actorName ? <>{a.actorName}<br /><span className="text-[#64748B] break-all">{a.actorEmail}</span></> : <span className="text-[#64748B]">{L('System / visitor', 'সিস্টেম / দর্শনার্থী')}</span>}</td>
              <td className={`${td} font-semibold`}>{EVENTS[a.event] ? (lang === 'bn' ? EVENTS[a.event][1] : EVENTS[a.event][0]) : a.event}</td>
              <td className={`${td} text-[#64748B] break-words`}>{a.detail || ''}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pager page={p.page} total={p.total} setPage={p.setPage} L={L} />
    </div>
  );
};

// ---------------------------------------------------------------- blood stock
const InventoryTab: React.FC<Ctx> = ({ L, notify }) => {
  const [inv, setInv] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api.inventory.getAll().then(r => setInv(r.inventory)).catch(e => setError(e?.message || 'Error')).finally(() => setLoading(false)); }, []);
  const adjust = async (group: string, delta: number) => {
    try { const r = await api.inventory.adjust(group, delta); setInv(prev => prev.map(i => i.bloodGroup === group ? r.item : i)); }
    catch (e: any) { notify(e?.message || 'Error'); }
  };
  return (
    <div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {loading && <p className="text-xs text-[#64748B]" aria-busy="true">{L('Loading…', 'লোড হচ্ছে…')}</p>}
      <p className="text-[11px] text-[#64748B] mb-3">{L('Use + / − to correct the number of units in stock.', 'মজুতের সংখ্যা ঠিক করতে + / − ব্যবহার করুন।')}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {inv.map(item => (
          <div key={item.bloodGroup} className={`${card} p-4`}>
            <div className="flex items-center justify-between">
              <span className="w-11 h-11 rounded-2xl bg-[#DC2626] text-white flex items-center justify-center font-extrabold text-lg">{item.bloodGroup}</span>
              <span className="text-2xl font-black">{item.availableUnits}</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-2">{L('Reserved', 'সংরক্ষিত')}: {item.reservedUnits}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => adjust(item.bloodGroup, -1)} aria-label={`${item.bloodGroup} −1`} className="flex-1 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] text-xs font-bold flex items-center justify-center cursor-pointer"><Minus className="w-3.5 h-3.5" /></button>
              <button onClick={() => adjust(item.bloodGroup, 1)} aria-label={`${item.bloodGroup} +1`} className="flex-1 py-1.5 rounded-xl bg-[#0D7A5F] text-white text-xs font-bold flex items-center justify-center cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

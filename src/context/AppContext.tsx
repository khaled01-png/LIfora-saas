import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  BloodGroup, 
  Donor, 
  BloodRequest, 
  BloodCenter, 
  InventoryItem, 
  User, 
  NavView, 
  Theme, 
  AvailabilityStatus, 
  InventoryStatus,
  BloodRequestResponse,
  AppNotification,
  Language 
} from '../types';
import { api, ApiError, VerifiedDonor } from '../services/api';
import { getTranslation } from '../services/i18n';
import { mustReloadAfterLogin } from '../utils/ads';

interface SearchState {
  bloodGroup: string;
  location: string;
  urgency: string;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  theme: Theme;
  toggleTheme: () => void;
  authNotice: string | null;
  introOpen: boolean;
  dismissIntro: () => void;
  canOpenView: (view: NavView) => boolean;
  switchRole: (role: 'donor' | 'requester') => Promise<boolean>;
  activeView: NavView;
  setActiveView: (view: NavView) => void;
  /** Goes back one page (also what the phone's back button does). Falls back to the home page. */
  goBack: () => void;
  canGoBack: boolean;
  /** Request id from a shared link (?request=...), while that link is still open. */
  sharedRequestId: string | null;
  donors: Donor[];
  verifiedDonors: VerifiedDonor[];
  requests: BloodRequest[];
  centers: BloodCenter[];
  inventory: InventoryItem[];
  searchParams: SearchState;
  setSearchParams: React.Dispatch<React.SetStateAction<SearchState>>;
  currentUser: User | null;
  login: (email: string, role?: 'donor' | 'requester' | 'admin', password?: string) => Promise<'ok' | 'verify' | 'error'>;
  logout: () => Promise<void>;
  registerAccount: (name: string, email: string, password: string) => Promise<{ ok: boolean; email?: string; devCode?: string; emailSent?: boolean }>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  resendCode: (email: string) => Promise<{ ok: boolean; devCode?: string }>;
  completeOnboarding: (profile: { role: 'donor' | 'requester'; bloodGroup: string; age: number; city: string; location: string; radiusKm: number; phone: string }) => Promise<boolean>;
  updateProfile: (profile: Partial<{ bloodGroup: string; age: number; city: string; location: string; radiusKm: number; phone: string }>) => Promise<boolean>;
  createBloodRequest: (data: Omit<BloodRequest, 'id' | 'createdAt' | 'responsesCount' | 'status'>) => Promise<boolean>;
  respondToRequest: (requestId: string, message?: string) => Promise<{ success: boolean; alreadyResponded?: boolean; message?: string }>;
  bookDonor: (requestId: string, responseId: string) => Promise<void>;
  confirmDonation: (requestId: string, donorId?: string, responseId?: string, units?: number) => Promise<void>;
  markDonated: (requestId: string) => Promise<boolean>;
  loadMyResponses: (requestIds: string[]) => Promise<void>;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  userResponses: Record<string, BloodRequestResponse>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  updateInventoryItem: (bloodGroup: BloodGroup, units: number, reserved: number, status: InventoryStatus) => Promise<void>;
  updateInventoryUnits: (bloodGroup: BloodGroup, delta: number) => Promise<void>;
  toggleDonorAvailability: (status?: AvailabilityStatus) => Promise<void>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register' | 'forgot';
  authInitialRole: 'donor' | 'requester';
  openAuthModal: (tab?: 'login' | 'register' | 'forgot', initialRole?: 'donor' | 'requester') => void;
  closeAuthModal: () => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  selectedDonorForContact: Donor | null;
  openContactDonor: (donor: Donor) => void;
  closeContactDonor: () => void;
  quickRequestModalOpen: boolean;
  setQuickRequestModalOpen: (open: boolean) => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Language state persisted in localStorage
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lifora-lang') as Language;
      if (saved === 'en' || saved === 'bn') return saved;
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lifora-lang', lang);
      document.documentElement.lang = lang;
      if (lang === 'bn') {
        document.documentElement.classList.add('lang-bn');
      } else {
        document.documentElement.classList.remove('lang-bn');
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    if (language === 'bn') {
      document.documentElement.classList.add('lang-bn');
    } else {
      document.documentElement.classList.remove('lang-bn');
    }
  }, [language]);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return getTranslation(language, key, params);
  }, [language]);

  // Theme state persisted in localStorage
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lifora-theme') as Theme;
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('lifora-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Shows a message in the visitor's language (English or Bangla).
  const languageRef = useRef<Language>(language);
  languageRef.current = language;
  const tr = (en: string, bn: string) => (languageRef.current === 'bn' ? bn : en);

  // A request link looks like https://site/?request=req-... and opens that request directly.
  const [sharedRequestId, setSharedRequestIdState] = useState<string | null>(() => {
    try { return new URLSearchParams(window.location.search).get('request'); } catch { return null; }
  });
  const sharedRequestIdRef = useRef<string | null>(sharedRequestId);
  const clearSharedRequest = () => {
    if (!sharedRequestIdRef.current) return;
    sharedRequestIdRef.current = null;
    setSharedRequestIdState(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('request');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    } catch { /* ignore */ }
  };

  const [activeView, setActiveViewState] = useState<NavView>(sharedRequestId ? 'shared-request' : 'home');
  const activeViewRef = useRef<NavView>(sharedRequestId ? 'shared-request' : 'home');
  const [historyIndex, setHistoryIndex] = useState(0);

  // Every page change is a browser-history entry, so the phone's back button and our Back button work the same way.
  useEffect(() => {
    try { window.history.replaceState({ lifora: activeViewRef.current, idx: 0 }, ''); } catch { /* ignore */ }
    const onPop = (e: PopStateEvent) => {
      const st = (e.state || {}) as { lifora?: NavView; idx?: number };
      const target: NavView = st.lifora || 'home';
      activeViewRef.current = target;
      setActiveViewState(target);
      setHistoryIndex(st.idx || 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setActiveViewRaw = (view: NavView) => {
    if (view === activeViewRef.current) return;
    activeViewRef.current = view;
    setActiveViewState(view);
    try {
      const idx = ((window.history.state as { idx?: number } | null)?.idx || 0) + 1;
      window.history.pushState({ lifora: view, idx }, '');
      setHistoryIndex(idx);
    } catch { /* ignore */ }
  };

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx || 0;
    if (idx > 0) window.history.back();
    else setActiveViewRaw('home');
  };

  const [donors, setDonors] = useState<Donor[]>([]);
  const [verifiedDonors, setVerifiedDonors] = useState<VerifiedDonor[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [centers, setCenters] = useState<BloodCenter[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [searchParams, setSearchParams] = useState<SearchState>({
    bloodGroup: '',
    location: '',
    urgency: ''
  });

  // Current logged in user
  const [currentUser, setCurrentUserState] = useState<User | null>(null); // signed out until you log in or register
  // The ref is updated synchronously so "log in, then go to the dashboard" is never blocked by a stale value.
  const currentUserRef = useRef<User | null>(null);
  const setCurrentUser: React.Dispatch<React.SetStateAction<User | null>> = (value) => {
    const next = typeof value === 'function' ? (value as (prev: User | null) => User | null)(currentUserRef.current) : value;
    if (next && !currentUserRef.current && mustReloadAfterLogin()) {
      // The login token is already saved. Reload so the signed-in session starts without any ad script on the page.
      window.location.reload();
      return;
    }
    currentUserRef.current = next;
    setCurrentUserState(next);
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [authInitialRole, setAuthInitialRole] = useState<'donor' | 'requester'>('donor');
  const [isSearchModalOpen, setIsSearchModalOpenRaw] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  // First visit (per browser session) by a signed-out visitor: a login / sign-up sheet slides in from the top.
  const [introOpen, setIntroOpen] = useState(false);
  const dismissIntro = () => {
    try { sessionStorage.setItem('lifora_intro_seen', '1'); } catch { /* private mode */ }
    setIntroOpen(false);
  };
  useEffect(() => {
    let seen = false;
    let hasSession = false;
    try { seen = !!sessionStorage.getItem('lifora_intro_seen'); hasSession = !!localStorage.getItem('lifora_token'); } catch { /* ignore */ }
    if (seen || hasSession) return;
    const timer = setTimeout(() => setIntroOpen(true), 800);
    return () => clearTimeout(timer);
  }, []);
  const [selectedDonorForContact, setSelectedDonorForContact] = useState<Donor | null>(null);
  const [quickRequestModalOpen, setQuickRequestModalOpenRaw] = useState(false);

  // Notification and Response State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [userResponses, setUserResponses] = useState<Record<string, BloodRequestResponse>>({});

  const fetchNotifications = useCallback(async () => {
    if (!currentUserRef.current) return;
    try {
      const res = await api.notifications.getAll();
      if (res?.notifications) {
        setNotifications(res.notifications);
        setUnreadNotificationCount(res.unreadCount || 0);
      }
    } catch {
      // silent fallback
    }
  }, [currentUser?.id]);

  // Function to load live backend data from the server
  const refreshData = useCallback(async () => {
    try {
      // 0. Verified donors (public, shown on the home page)
      const verifiedRes = await api.donors.getVerified(12);
      if (verifiedRes?.donors) setVerifiedDonors(verifiedRes.donors);
    } catch {
      // the home page simply hides the section
    }

    try {
      // 1. Fetch Donors
      const donorsRes = await api.donors.getAll();
      if (donorsRes?.donors) setDonors(donorsRes.donors);
    } catch {
      // not allowed for this account, or the server is busy
    }

    try {
      // 2. Fetch Requests
      const reqRes = await api.requests.getAll();
      if (reqRes?.requests) setRequests(reqRes.requests);
    } catch {
      // silent fallback
    }

    try {
      // 3. Fetch Centers
      const centersRes = await api.centers.getAll();
      if (centersRes?.centers) setCenters(centersRes.centers);
    } catch {
      // silent fallback
    }

    try {
      // 4. Fetch Inventory
      const invRes = await api.inventory.getAll();
      if (invRes?.inventory) setInventory(invRes.inventory);
    } catch {
      // silent fallback
    }

    try {
      // 5. Fetch authenticated user profile
      const meRes = await api.auth.getMe();
      if (meRes?.user) {
        setCurrentUser(meRes.user);
      }
    } catch (err) {
      // An ended or missing session means signed out. A short network problem must not sign anyone out.
      if ((err as ApiError)?.status === 401 || !localStorage.getItem('lifora_token')) setCurrentUser(null);
    }

    // 6. Fetch live notifications
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // New sign-ups, requests and responses appear when a signed-in person comes back to the tab (at most every 30 s).
  const refreshRef = useRef(refreshData);
  refreshRef.current = refreshData;
  const signedInId = currentUser?.id;
  useEffect(() => {
    if (!signedInId) return;
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 30000) return;
      last = Date.now();
      void refreshRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [signedInId]);

  useEffect(() => {
    fetchNotifications();
  }, [currentUser, fetchNotifications]);

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadNotificationCount(prev => Math.max(0, prev - 1));
    try {
      const res = await api.notifications.markAsRead(id);
      if (res?.unreadCount !== undefined) {
        setUnreadNotificationCount(res.unreadCount);
      }
    } catch {
      // keep optimistic
    }
  };

  const markAllNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadNotificationCount(0);
    try {
      await api.notifications.markAllAsRead();
    } catch {
      // keep optimistic
    }
  };

  const openAuthModal = (tab: 'login' | 'register' | 'forgot' = 'login', initialRole?: 'donor' | 'requester') => {
    setAuthModalTab(tab);
    if (initialRole) {
      setAuthInitialRole(initialRole);
    }
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthNotice(null);
  };

  // ---- Role-based access: donors and requesters each get their own feed and features ----
  const ROLE_VIEWS: Record<string, NavView[]> = {
    donor: ['home', 'requests', 'centers', 'donor-dashboard', 'about', 'onboarding', 'shared-request'],
    requester: ['home', 'find-blood', 'donate', 'centers', 'requester-dashboard', 'about', 'onboarding', 'shared-request'],
  };
  const canOpenView = (view: NavView): boolean => {
    const me = currentUserRef.current;
    if (!me) return true; // guests: gated separately
    if (me.role === 'admin' || me.role === 'pending') return true;
    return (ROLE_VIEWS[me.role] || []).includes(view);
  };
  const dashboardFor = (u: User): NavView =>
    u.role === 'donor' ? 'donor-dashboard' : u.role === 'requester' ? 'requester-dashboard' : u.role === 'admin' ? 'admin-dashboard' : 'onboarding';
  // After logging in or finishing the profile, a person who came from a request link goes back to that request.
  const landingFor = (u: User): NavView =>
    sharedRequestIdRef.current && u.role !== 'admin' && u.role !== 'pending' ? 'shared-request' : dashboardFor(u);

  // ---- Login gate: guests only get a light preview; everything else asks them to log in or sign up ----
  const GATED_VIEWS: NavView[] = ['find-blood', 'requests', 'centers', 'donor-dashboard', 'requester-dashboard', 'onboarding'];
  const requireLogin = (): boolean => {
    if (currentUserRef.current) return true;
    setAuthNotice(tr(
      'Please log in or sign up to continue. Guests can only see a short preview of LIFORA.',
      'চালিয়ে যেতে লগইন বা সাইন-আপ করুন। অতিথিরা লাইফোরার শুধু একটি ছোট প্রিভিউ দেখতে পারেন।'
    ));
    showToast(tr('Please log in or sign up to continue.', 'চালিয়ে যেতে লগইন বা সাইন-আপ করুন।'));
    openAuthModal('login');
    return false;
  };
  const setActiveView = (view: NavView) => {
    if (view !== 'shared-request') clearSharedRequest();
    if (view === 'donate') {
      // "Become a donor" starts with an account. Signed-in donors go to their dashboard, others re-choose their role.
      const me = currentUserRef.current;
      if (!me) {
        setAuthNotice(tr(
          'Create your account first. After you verify your email you can choose to become a donor.',
          'আগে আপনার অ্যাকাউন্ট খুলুন। ইমেইল যাচাই করার পর ডোনার হওয়া বেছে নিতে পারবেন।'
        ));
        openAuthModal('register', 'donor');
        return;
      }
      if (me.role === 'requester' && me.profileCompleted) { void switchRole('donor'); return; }
      setActiveViewRaw(me.role === 'donor' ? 'donor-dashboard' : 'onboarding');
      return;
    }
    if (GATED_VIEWS.includes(view) && !requireLogin()) return;
    if (!canOpenView(view)) {
      const me = currentUserRef.current as User;
      showToast(tr(
        `That page is not part of a ${me.role} account. Opening your dashboard instead.`,
        'এই পেজটি আপনার অ্যাকাউন্টের জন্য নয়। আপনার ড্যাশবোর্ড খোলা হচ্ছে।'
      ));
      setActiveViewRaw(dashboardFor(me));
      return;
    }
    setActiveViewRaw(view);
  };
  const setQuickRequestModalOpen = (open: boolean) => {
    if (open && !requireLogin()) return;
    setQuickRequestModalOpenRaw(open);
  };
  const setIsSearchModalOpen = (open: boolean) => {
    if (open && !requireLogin()) return;
    setIsSearchModalOpenRaw(open);
  };

  const openContactDonor = (donor: Donor) => {
    if (!requireLogin()) return;
    setSelectedDonorForContact(donor);
  };
  const closeContactDonor = () => setSelectedDonorForContact(null);

  const login = async (email: string, role: 'donor' | 'requester' | 'admin' = 'donor', password?: string): Promise<'ok' | 'verify' | 'error'> => {
    try {
      if (!password) {
        showToast(tr('Please enter your password.', 'আপনার পাসওয়ার্ড লিখুন।'));
        return 'error';
      }
      const res = await api.auth.login({ email, role, password });
      if (res.user) {
        if (res.user.role === 'admin' && !window.location.pathname.startsWith('/admin')) {
          // The administrator area is a separate page, not part of the public site.
          window.location.assign('/admin');
          return 'ok';
        }
        setCurrentUser(res.user);
        setIsAuthModalOpen(false);
        setActiveViewRaw(landingFor(res.user));
        showToast(res.user.role === 'pending'
          ? tr('Welcome! Please finish your profile.', 'স্বাগতম! আপনার প্রোফাইল সম্পূর্ণ করুন।')
          : tr(`Welcome back, ${res.user.name}!`, `আবার স্বাগতম, ${res.user.name}!`));
        return 'ok';
      }
      return 'error';
    } catch (err: any) {
      if (err?.needsVerification) {
        showToast(err.message);
        return 'verify';
      }
      showToast(err.message || tr('Authentication failed: Invalid email or password.', 'ইমেইল বা পাসওয়ার্ড ভুল।'));
      return 'error';
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('lifora_user');
    setCurrentUser(null);
    setActiveViewRaw('home');
    showToast(tr('You have been logged out.', 'আপনি লগআউট হয়েছেন।'));
  };

  // ---- Sign-up: 1) name/email/password  2) e-mail code  3) choose Donor/Requester + profile ----
  const registerAccount = async (name: string, email: string, password: string) => {
    try {
      const res = await api.auth.register({ name: name.trim(), email: email.trim(), password });
      showToast(res.emailSent ? tr('We emailed you a 6-digit verification code.', 'আমরা আপনাকে ৬ সংখ্যার যাচাই কোড ইমেইল করেছি।') : (res.message || ''));
      return { ok: true, email: res.email, devCode: res.devCode, emailSent: res.emailSent };
    } catch (err: any) {
      showToast(err?.message || tr('Could not create your account. Please try again.', 'অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।'));
      return { ok: false };
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    try {
      const res = await api.auth.verifyEmail(email, code);
      setCurrentUser(res.user);
      setIsAuthModalOpen(false);
      setAuthNotice(null);
      showToast(tr('Email verified! Now choose how you want to use LIFORA.', 'ইমেইল যাচাই হয়েছে! এবার বেছে নিন আপনি লাইফোরা কীভাবে ব্যবহার করবেন।'));
      return true;
    } catch (err: any) {
      showToast(err?.message || tr('This code is invalid or has expired.', 'কোডটি ভুল অথবা মেয়াদ শেষ।'));
      return false;
    }
  };

  const resendCode = async (email: string) => {
    try {
      const res = await api.auth.resendCode(email);
      showToast(res.message);
      return { ok: true, devCode: res.devCode };
    } catch (err: any) {
      showToast(err?.message || tr('Could not send a new code. Please try again shortly.', 'নতুন কোড পাঠানো যায়নি। একটু পরে আবার চেষ্টা করুন।'));
      return { ok: false };
    }
  };

  const completeOnboarding: AppContextType['completeOnboarding'] = async (profile) => {
    try {
      const res = await api.auth.onboarding(profile);
      setCurrentUser(res.user);
      try {
        const freshDonors = await api.donors.getAll();
        if (freshDonors?.donors) setDonors(freshDonors.donors);
      } catch { /* the lists reload on the next refresh */ }
      showToast(profile.role === 'donor'
        ? tr('You are now a LIFORA donor. Thank you!', 'আপনি এখন লাইফোরার ডোনার। ধন্যবাদ!')
        : tr('Your requester profile is ready.', 'আপনার রক্ত গ্রহীতার প্রোফাইল তৈরি হয়েছে।'));
      setActiveViewRaw(landingFor(res.user));
      return true;
    } catch (err: any) {
      showToast(err?.message || tr('Could not save your profile. Please try again.', 'প্রোফাইল সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।'));
      return false;
    }
  };

  // One account, two dashboards: switch without re-entering the profile.
  const switchRole = async (role: 'donor' | 'requester') => {
    if (currentUserRef.current?.role === role) {
      setActiveViewRaw(role === 'donor' ? 'donor-dashboard' : 'requester-dashboard');
      return true;
    }
    try {
      const res = await api.auth.switchRole(role);
      setCurrentUser(res.user);
      setActiveViewRaw(role === 'donor' ? 'donor-dashboard' : 'requester-dashboard');
      showToast(role === 'donor'
        ? tr('Switched to your donor dashboard.', 'আপনার ডোনার ড্যাশবোর্ডে এসেছেন।')
        : tr('Switched to your requester dashboard.', 'আপনার রক্ত গ্রহীতার ড্যাশবোর্ডে এসেছেন।'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err?.message || tr('Could not switch your role. Please try again.', 'ভূমিকা বদলানো যায়নি। আবার চেষ্টা করুন।'));
      return false;
    }
  };

  const updateProfile: AppContextType['updateProfile'] = async (profile) => {
    try {
      const res = await api.auth.updateProfile(profile);
      setCurrentUser(res.user);
      try {
        const freshDonors = await api.donors.getAll();
        if (freshDonors?.donors) setDonors(freshDonors.donors);
      } catch { /* ignore */ }
      showToast(tr('Profile updated.', 'প্রোফাইল আপডেট হয়েছে।'));
      return true;
    } catch (err: any) {
      showToast(err?.message || tr('Could not update your profile. Please try again.', 'প্রোফাইল আপডেট করা যায়নি। আবার চেষ্টা করুন।'));
      return false;
    }
  };

  const bookDonor = async (requestId: string, responseId: string) => {
    try {
      const res = await api.requests.book(requestId, responseId);
      if (res?.request) {
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...res.request, displayStatus: 'Donor booked' } : r));
        showToast(tr('Donor has been successfully booked!', 'ডোনারকে সফলভাবে বুক করা হয়েছে!'));
        fetchNotifications();
      }
    } catch (err: any) {
      showToast(err?.message || tr('Could not book this donor. Please try again.', 'এই ডোনারকে বুক করা যায়নি। আবার চেষ্টা করুন।'));
    }
  };

  const confirmDonation = async (requestId: string, donorId?: string, responseId?: string, units: number = 1) => {
    try {
      const res = await api.requests.confirmDonation(requestId, { donorId, responseId, units });
      if (res?.request) {
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...res.request, status: 'Fulfilled', displayStatus: 'Donated' } : r));
        if (res.donor) {
          setDonors(prev => prev.map(d => d.id === res.donor.id ? { ...d, ...res.donor } : d));
        }
        showToast(tr('Donation confirmed! Donor cooldown and hospital records updated.', 'রক্তদান নিশ্চিত হয়েছে! ডোনারের বিশ্রামের সময় ও হাসপাতালের রেকর্ড আপডেট হয়েছে।'));
        fetchNotifications();
      }
    } catch (err: any) {
      showToast(err?.message || tr('Could not confirm the donation. Please try again.', 'রক্তদান নিশ্চিত করা যায়নি। আবার চেষ্টা করুন।'));
    }
  };

  // Remembers which of these requests the signed-in donor already answered (also after a page reload).
  const userResponsesRef = useRef(userResponses);
  userResponsesRef.current = userResponses;
  const loadMyResponses = async (requestIds: string[]) => {
    const missing = requestIds.filter(id => !userResponsesRef.current[id]).slice(0, 20);
    for (const id of missing) {
      try {
        const r = await api.requests.getMyResponse(id);
        if (r?.hasResponded && r.response) setUserResponses(prev => ({ ...prev, [id]: r.response as BloodRequestResponse }));
      } catch { /* try again on the next visit */ }
    }
  };

  // The donor presses "I donated". The requester confirms it, or it counts by itself after 24 hours.
  const markDonated = async (requestId: string): Promise<boolean> => {
    try {
      const res = await api.requests.markDonated(requestId);
      if (res?.request) setRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...res.request } : r));
      if (res?.response) setUserResponses(prev => ({ ...prev, [requestId]: res.response }));
      showToast(tr(
        'Thank you! The requester was asked to confirm. If they do not answer within 24 hours it counts automatically.',
        'ধন্যবাদ! অনুরোধকারীকে নিশ্চিত করতে বলা হয়েছে। ২৪ ঘণ্টার মধ্যে সাড়া না দিলে এটি নিজে থেকেই গণনা হবে।'
      ));
      fetchNotifications();
      return true;
    } catch (err: any) {
      showToast(err?.message || tr('Could not save this. Please try again.', 'সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।'));
      return false;
    }
  };

  const createBloodRequest = async (data: Omit<BloodRequest, 'id' | 'createdAt' | 'responsesCount' | 'status'>) => {
    if (!currentUser) {
      showToast(tr('Please log in or register before posting a blood request.', 'রক্তের অনুরোধ দিতে আগে লগইন বা রেজিস্টার করুন।'));
      openAuthModal('login');
      return false;
    }
    try {
      const res = await api.requests.create(data);
      if (res?.request) {
        setRequests(prev => [res.request, ...prev]);
        showToast(tr(
          `Emergency blood request broadcasted for ${data.bloodGroup} at ${data.hospitalName}.`,
          `${data.hospitalName}-এ ${data.bloodGroup} রক্তের জরুরি অনুরোধ জানানো হয়েছে।`
        ));
        fetchNotifications();
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err?.message || tr('Your request could not be saved. Please log in and try again.', 'আপনার অনুরোধ সংরক্ষণ করা যায়নি। লগইন করে আবার চেষ্টা করুন।'));
      return false;
    }
  };

  const respondToRequest = async (requestId: string, customMessage?: string): Promise<{ success: boolean; alreadyResponded?: boolean; message?: string }> => {
    if (!currentUser) {
      const msg = tr('Please log in as a donor to respond to a blood request.', 'রক্তের অনুরোধে সাড়া দিতে ডোনার হিসেবে লগইন করুন।');
      showToast(msg);
      openAuthModal('login', 'donor');
      return { success: false, message: msg };
    }
    if (currentUser.role !== 'donor') {
      const msg = tr('Only registered donors can respond to a blood request.', 'শুধু নিবন্ধিত ডোনাররা রক্তের অনুরোধে সাড়া দিতে পারেন।');
      showToast(msg);
      return { success: false, message: msg };
    }

    if (userResponses[requestId]) {
      const msg = tr('You have already submitted a response to this blood request.', 'আপনি এই অনুরোধে আগেই সাড়া দিয়েছেন।');
      showToast(msg);
      return { success: false, alreadyResponded: true, message: msg };
    }

    try {
      const res = await api.requests.respond(requestId, { message: customMessage });

      if (res?.request) {
        setRequests(prev => prev.map(req => req.id === requestId ? res.request : req));
      }
      if (res?.response) {
        setUserResponses(prev => ({ ...prev, [requestId]: res.response }));
      }

      const successMsg = tr(
        'Thank you! Your response has been logged and the requester has been notified.',
        'ধন্যবাদ! আপনার সাড়া নথিভুক্ত হয়েছে এবং অনুরোধকারীকে জানানো হয়েছে।'
      );
      showToast(successMsg);
      fetchNotifications();
      return { success: true, message: successMsg };
    } catch (err: any) {
      if (err?.status === 409 || err?.message?.toLowerCase().includes('already responded')) {
        const errorMsg = tr('You have already responded to this blood request.', 'আপনি এই অনুরোধে আগেই সাড়া দিয়েছেন।');
        showToast(errorMsg);
        return { success: false, alreadyResponded: true, message: errorMsg };
      }
      const errorMsg = err?.message || tr('Your response could not be sent. Please log in as a donor and try again.', 'আপনার সাড়া পাঠানো যায়নি। ডোনার হিসেবে লগইন করে আবার চেষ্টা করুন।');
      showToast(errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  const updateInventoryItem = async (
    bloodGroup: BloodGroup, 
    units: number, 
    reserved: number, 
    status: InventoryStatus
  ) => {
    try {
      await api.inventory.update(bloodGroup, {
        availableUnits: units,
        reservedUnits: reserved,
        status
      });
    } catch (err: any) {
      showToast(err?.message || tr('Inventory could not be updated (administrator login required).', 'মজুত আপডেট করা যায়নি (অ্যাডমিন লগইন দরকার)।'));
      return;
    }

    setInventory(prev => prev.map(item => item.bloodGroup === bloodGroup
      ? { ...item, availableUnits: units, reservedUnits: reserved, status, lastUpdated: 'Just now' }
      : item));
    showToast(tr(`Blood inventory updated for group ${bloodGroup}.`, `${bloodGroup} গ্রুপের রক্তের মজুত আপডেট হয়েছে।`));
  };

  const updateInventoryUnits = async (bloodGroup: BloodGroup, delta: number) => {
    try {
      const res = await api.inventory.adjust(bloodGroup, delta);
      if (res?.item) {
        setInventory(prev => prev.map(item => item.bloodGroup === bloodGroup ? res.item : item));
        const sign = delta > 0 ? '+' : '';
        showToast(tr(`Inventory adjusted for ${bloodGroup} (${sign}${delta} units).`, `${bloodGroup} এর মজুত বদলানো হয়েছে (${sign}${delta} ব্যাগ)।`));
      }
    } catch (err: any) {
      showToast(err?.message || tr('Inventory could not be adjusted (administrator login required).', 'মজুত বদলানো যায়নি (অ্যাডমিন লগইন দরকার)।'));
    }
  };

  const toggleDonorAvailability = async (newStatus?: AvailabilityStatus) => {
    if (!currentUser) return;
    const updated = newStatus || (currentUser.availability === 'Available' ? 'Unavailable' : 'Available');

    try {
      // The server finds the donor card from the account's e-mail, so this works for donor accounts too.
      await api.donors.updateAvailability(currentUser.email, updated);
    } catch (err: any) {
      showToast(err?.message || tr('Availability could not be updated. Please try again.', 'অবস্থা আপডেট করা যায়নি। আবার চেষ্টা করুন।'));
      return;
    }

    setCurrentUser(prev => prev ? { ...prev, availability: updated } : null);
    setDonors(prev => prev.map(d => (d.email === currentUser.email ? { ...d, availability: updated } : d)));
    const label = updated === 'Available' ? 'প্রস্তুত' : updated === 'Unavailable' ? 'প্রস্তুত নয়' : 'সম্প্রতি রক্ত দিয়েছেন';
    showToast(tr(`Your donor availability is now: ${updated}`, `আপনার ডোনার অবস্থা এখন: ${label}`));
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        theme,
        toggleTheme,
        authNotice,
        introOpen,
        dismissIntro,
        canOpenView,
        switchRole,
        activeView,
        setActiveView,
        goBack,
        canGoBack: historyIndex > 0,
        sharedRequestId,
        donors,
        verifiedDonors,
        requests,
        centers,
        inventory,
        searchParams,
        setSearchParams,
        currentUser,
        login,
        logout,
        registerAccount,
        verifyEmail,
        resendCode,
        completeOnboarding,
        updateProfile,
        createBloodRequest,
        respondToRequest,
        bookDonor,
        confirmDonation,
        markDonated,
        loadMyResponses,
        notifications,
        unreadNotificationCount,
        userResponses,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        fetchNotifications,
        updateInventoryItem,
        updateInventoryUnits,
        toggleDonorAvailability,
        toastMessage,
        showToast,
        isAuthModalOpen,
        authModalTab,
        authInitialRole,
        openAuthModal,
        closeAuthModal,
        isSearchModalOpen,
        setIsSearchModalOpen,
        selectedDonorForContact,
        openContactDonor,
        closeContactDonor,
        quickRequestModalOpen,
        setQuickRequestModalOpen,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

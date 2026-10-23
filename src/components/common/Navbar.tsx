import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { localizeNotification } from '../../utils/notifications';
import { NavView } from '../../types';
import { 
  Search, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Droplet, 
  User as UserIcon, 
  LayoutDashboard, 
  ChevronDown,
  Bell,
  CheckCheck,
  PlusCircle,
  Heart,
  ShieldAlert,
  Globe,
  Check,
  ArrowLeft,
  Users
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    goBack,
    theme, 
    toggleTheme, 
    activeView, 
    setActiveView, 
    openAuthModal, 
    currentUser, 
    logout, 
    setIsSearchModalOpen,
    requests,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    setQuickRequestModalOpen,
    canOpenView,
    switchRole,
    language,
    setLanguage,
    t
  } = useApp();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Count active critical requests
  const criticalCount = requests.filter(r => r.urgency === 'Critical' && r.status === 'Pending').length;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const allNavItems: { label: string; view: NavView; badge?: number }[] = [
    { label: t('nav.home'), view: 'home' },
    { label: t('nav.findBlood'), view: 'find-blood' },
    { label: t('nav.donate'), view: 'donate' },
    { label: t('nav.requests'), view: 'requests', badge: criticalCount },
    { label: t('nav.centers'), view: 'centers' },
    { label: t('nav.about'), view: 'about' }
  ];
  // Donors and requesters each see only their own menu (donors: requests feed; requesters: donor search).
  const navItems = allNavItems.filter(i => !currentUser
    ? (i.view === 'home' || i.view === 'about')   // guests: no repeated sign-up prompts, the login card is on the home page
    : canOpenView(i.view) && !(i.view === 'donate' && currentUser.role === 'donor'));

  const handleNavClick = (view: NavView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setNotifDropdownOpen(false);
    setLangDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header 
      id="main-navigation"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled 
          ? 'bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1E293B] shadow-xs'
          : 'bg-[#F8FAFC]/90 dark:bg-[#0B0F17]/90 backdrop-blur-sm border-b border-[#E2E8F0]/70 dark:border-[#1E293B]/70'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 sm:h-17 flex items-center justify-between">
        
        {/* LEFT: Back button (every page except home) + Brand Logo */}
        {activeView !== 'home' && (
          <button
            id="nav-back-btn"
            onClick={goBack}
            aria-label={t('nav.back')}
            className="flex items-center gap-1 h-9 pl-2 pr-2.5 mr-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-white text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden min-[420px]:inline">{t('nav.back')}</span>
          </button>
        )}
        <button 
          id="nav-logo-btn"
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-1.5 min-[400px]:gap-2.5 mr-1 group text-left cursor-pointer focus:outline-none shrink-0"
        >
          <div className="relative w-8.5 h-8.5 rounded-xl bg-[#DC2626] flex items-center justify-center text-white shadow-xs transition-transform duration-200 group-hover:scale-105">
            <Droplet className="w-4.5 h-4.5 fill-white text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0B0F17]" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-[15px] min-[400px]:text-lg sm:text-xl tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              LIFORA
            </span>
            <span className="text-[9px] uppercase font-bold tracking-wider text-[#64748B] dark:text-[#94A3B8] -mt-1 hidden sm:block">
              {t('app.tagline')}
            </span>
          </div>
        </button>

        {/* CENTER: Desktop Navigation Links */}
        <nav id="desktop-nav-links" className="hidden lg:flex items-center gap-1 xl:gap-1.5">
          {navItems.map((item) => {
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                id={`nav-link-${item.view}`}
                onClick={() => handleNavClick(item.view)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'text-[#DC2626] dark:text-[#EF4444] bg-[#FEF2F2] dark:bg-[#2A1417] font-bold'
                    : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>{item.label}</span>
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-full bg-[#DC2626] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* RIGHT: User Actions & Utilities */}
        <div className="flex items-center gap-1 min-[400px]:gap-1.5 sm:gap-2 min-w-0">
          
          {/* Quick Search Button */}
          <button
            id="nav-search-btn"
            onClick={() => setIsSearchModalOpen(true)}
            aria-label="Search blood donors and requests"
            className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827]"
            title="Search Donors, Centers & Requests (⌘K)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Theme Switcher */}
          <button
            id="nav-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827]"
            title={`Toggle Theme (${theme})`}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#0F172A]" />
            )}
          </button>

          {/* Real-time Notifications Bell */}
          <div className={`relative ${currentUser ? '' : 'hidden sm:block'}`} ref={notifRef}>
            <button
              id="nav-notifications-btn"
              onClick={() => {
                setNotifDropdownOpen(!notifDropdownOpen);
                setUserDropdownOpen(false);
                setLangDropdownOpen(false);
              }}
              aria-label={`Notifications (${unreadNotificationCount} unread)`}
              className="relative w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827]"
              title={t('nav.notifications')}
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadNotificationCount > 0 && (
                <span 
                  id="nav-notif-badge"
                  className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-[#DC2626] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center border-2 border-white dark:border-[#0B0F17]"
                >
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div 
                id="nav-notifications-dropdown"
                className="absolute right-0 mt-2 w-72 sm:w-88 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] shadow-xl p-0 z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#0B0F17]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#0F172A] dark:text-[#F8FAFC]">{t('notif.title')}</span>
                    {unreadNotificationCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#FEF2F2] dark:bg-[#2A1417] text-[#DC2626]">
                        {unreadNotificationCount}
                      </span>
                    )}
                  </div>
                  {unreadNotificationCount > 0 && (
                    <button
                      id="notif-mark-all-read-btn"
                      onClick={() => markAllNotificationsAsRead()}
                      className="text-[11px] font-semibold text-[#DC2626] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3 h-3" />
                      {t('notif.markAllRead')}
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-[#E2E8F0]/60 dark:divide-[#1E293B]/60">
                  {notifications.length === 0 ? (
                    <div className="py-6 px-4 text-center">
                      <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-2 text-[#64748B]">
                        <Bell className="w-4 h-4 opacity-40" />
                      </div>
                      <p className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{t('notif.empty')}</p>
                      <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 max-w-[200px] mx-auto">
                        {t('notif.emptyDesc')}
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const isUnread = !notif.isRead;
                      return (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (isUnread) markNotificationAsRead(notif.id);
                            if (notif.requestId) {
                              setActiveView('requests');
                              setNotifDropdownOpen(false);
                            }
                          }}
                          className={`p-3.5 text-left transition-colors cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] flex items-start gap-3 ${
                            isUnread ? 'bg-red-50/60 dark:bg-red-950/20' : ''
                          }`}
                        >
                          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                            isUnread ? 'bg-[#DC2626] dark:bg-[#EF4444]' : 'bg-transparent'
                          }`} />

                          <div className="flex-1 min-w-0">
                            <p className={`text-xs truncate ${
                              isUnread ? 'font-bold text-[#0F172A] dark:text-white' : 'font-medium text-[#64748B] dark:text-[#94A3B8]'
                            }`}>
                              {localizeNotification(notif, language).title}
                            </p>
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-2 leading-relaxed mt-0.5">
                              {localizeNotification(notif, language).message}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* LANGUAGE SWITCHER — TOP-RIGHT AREA (Section 16, 17, 18, 42)               */}
          {/* Placed near Search, Theme, Notifications, before Post Request & Profile   */}
          {/* ========================================================================= */}
          <div className="relative" ref={langRef}>
            <button
              id="nav-language-btn"
              onClick={() => {
                setLangDropdownOpen(!langDropdownOpen);
                setUserDropdownOpen(false);
                setNotifDropdownOpen(false);
              }}
              aria-label="Change Language (English / বাংলা)"
              className="h-9 sm:h-10 px-1.5 min-[400px]:px-2.5 sm:px-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] hover:border-[#DC2626] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Switch Language / ভাষা পরিবর্তন করুন"
            >
              <Globe className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF4444] shrink-0" />
              <span className="font-bold text-xs tracking-tight">
                {language === 'en' ? 'EN' : 'বাং'}
              </span>
              <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 hidden sm:inline">
                {language === 'en' ? 'বাংলা' : 'English'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#64748B] ml-0.5 hidden min-[400px]:block" />
            </button>

            {langDropdownOpen && (
              <div 
                id="nav-language-dropdown"
                className="absolute right-0 mt-2 w-36 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] shadow-xl p-1.5 z-50"
              >
                <button
                  onClick={() => {
                    setLanguage('en');
                    setLangDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                    language === 'en'
                      ? 'bg-[#FEF2F2] dark:bg-[#2A1417] text-[#DC2626] dark:text-[#EF4444] font-bold'
                      : 'text-[#0F172A] dark:text-[#F8FAFC] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <span>English</span>
                  {language === 'en' && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setLanguage('bn');
                    setLangDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                    language === 'bn'
                      ? 'bg-[#FEF2F2] dark:bg-[#2A1417] text-[#DC2626] dark:text-[#EF4444] font-bold'
                      : 'text-[#0F172A] dark:text-[#F8FAFC] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <span>বাংলা</span>
                  {language === 'bn' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {(currentUser?.role === 'requester' || currentUser?.role === 'admin') && (
          <button
            onClick={() => setQuickRequestModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 h-8.5 sm:h-9 px-3 rounded-lg border border-[#DC2626]/30 bg-[#FEF2F2] dark:bg-[#2A1417] text-[#DC2626] dark:text-[#EF4444] hover:bg-[#FEE2E2] font-semibold text-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t('btn.postRequest')}</span>
          </button>
          )}

          {/* User Profile / Auth State */}
          {currentUser ? (
            <div className="relative" ref={userRef}>
              <button
                id="nav-user-menu-btn"
                onClick={() => {
                  setUserDropdownOpen(!userDropdownOpen);
                  setNotifDropdownOpen(false);
                  setLangDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 min-[400px]:gap-2 h-8.5 sm:h-9 px-1.5 min-[400px]:px-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] hover:border-[#DC2626] text-[#0F172A] dark:text-[#F8FAFC] text-xs font-semibold transition-colors cursor-pointer"
              >
                <div className="w-5.5 h-5.5 rounded-md bg-[#FEF2F2] dark:bg-[#2A1417] text-[#DC2626] dark:text-[#EF4444] flex items-center justify-center font-bold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <span className="hidden md:inline max-w-[90px] truncate">{currentUser.name.split(' ')[0]}</span>
                <ChevronDown className="w-3 h-3 text-[#64748B] hidden min-[400px]:block" />
              </button>

              {userDropdownOpen && (
                <div 
                  id="nav-user-dropdown"
                  className="absolute right-0 mt-2 w-60 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] shadow-xl p-2 z-50"
                >
                  <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-[#1E293B] mb-1">
                    <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">{currentUser.name}</p>
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">{currentUser.email}</p>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1.5 rounded-full bg-[#FEF2F2] dark:bg-[#2A1417] text-[#DC2626] dark:text-[#EF4444] text-[10px] font-bold uppercase tracking-wider">
                      {t('nav.role')}: {t(`role.${currentUser.role}`)}
                    </div>
                  </div>

                  {/* Role Specific Actions */}
                  {currentUser.role === 'donor' && (
                    <button
                      onClick={() => handleNavClick('donor-dashboard')}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#DC2626]" />
                      <span>{t('nav.donorDashboard')}</span>
                    </button>
                  )}

                  {(currentUser.role === 'requester' || currentUser.role === 'donor') && currentUser.profileCompleted && (
                    <button
                      onClick={() => { setUserDropdownOpen(false); void switchRole(currentUser.role === 'donor' ? 'requester' : 'donor'); }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-[#0D7A5F] dark:text-[#10B981] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      <span>{currentUser.role === 'donor' ? t('nav.switchToRequester') : t('nav.switchToDonor')}</span>
                    </button>
                  )}

                  {currentUser.role === 'requester' && (
                    <button
                      onClick={() => handleNavClick('requester-dashboard')}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#DC2626]" />
                      <span>{t('nav.requesterDashboard')}</span>
                    </button>
                  )}

                  <div className="pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B] mt-1">
                    <button
                      onClick={() => { logout(); setUserDropdownOpen(false); }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#2A1417] rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                id="nav-login-btn"
                onClick={() => openAuthModal('login')}
                className="whitespace-nowrap shrink-0 h-8.5 sm:h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#DC2626] text-[#0F172A] dark:text-[#F8FAFC] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer bg-white dark:bg-[#111827]"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#64748B] hidden min-[400px]:block" />
                <span>{t('nav.login')}</span>
              </button>

            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            id="nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[#0F172A] dark:text-[#F8FAFC] hover:bg-black/5 dark:hover:bg-white/10 border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827]"
          >
            {mobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>

        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div id="mobile-menu-drawer" className="lg:hidden border-b border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17] px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top duration-200">
          
          {/* Mobile Language Switcher Row */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] mb-2">
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>Language / ভাষা</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  language === 'en'
                    ? 'bg-[#DC2626] text-white'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('bn')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  language === 'bn'
                    ? 'bg-[#DC2626] text-white'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>

          {currentUser && (
            <div className="grid grid-cols-1 gap-2 mb-2">
              {(currentUser.role === 'requester' || currentUser.role === 'admin') && (
                <button
                  onClick={() => { setQuickRequestModalOpen(true); setMobileMenuOpen(false); }}
                  className="py-2 px-3 rounded-lg bg-[#DC2626] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{t('btn.postRequest')}</span>
                </button>
              )}
            </div>
          )}

          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => handleNavClick(item.view)}
              className={`w-full px-3.5 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between ${
                activeView === item.view
                  ? 'bg-[#FEF2F2] dark:bg-[#2A1417] text-[#DC2626] dark:text-[#EF4444] font-bold'
                  : 'text-[#475569] dark:text-[#CBD5E1] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <span>{item.label}</span>
              {Boolean(item.badge && item.badge > 0) && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[#DC2626] text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {currentUser && (
            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] mt-2 space-y-1">
              {currentUser.role === 'donor' && (
                <button
                  onClick={() => handleNavClick('donor-dashboard')}
                  className="w-full px-3.5 py-2 rounded-lg text-left text-xs font-semibold text-[#0F172A] dark:text-white flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#DC2626]" />
                  <span>{t('nav.donorDashboard')}</span>
                </button>
              )}
              {currentUser.role === 'requester' && (
                <button
                  onClick={() => handleNavClick('requester-dashboard')}
                  className="w-full px-3.5 py-2 rounded-lg text-left text-xs font-semibold text-[#0F172A] dark:text-white flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#DC2626]" />
                  <span>{t('nav.requesterDashboard')}</span>
                </button>
              )}
              {(currentUser.role === 'requester' || currentUser.role === 'donor') && currentUser.profileCompleted && (
                <button
                  onClick={() => { setMobileMenuOpen(false); void switchRole(currentUser.role === 'donor' ? 'requester' : 'donor'); }}
                  className="w-full px-3.5 py-2 rounded-lg text-left text-xs font-semibold text-[#0D7A5F] dark:text-[#10B981] flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>{currentUser.role === 'donor' ? t('nav.switchToRequester') : t('nav.switchToDonor')}</span>
                </button>
              )}
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full px-3.5 py-2 rounded-lg text-left text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#2A1417] flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4" />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

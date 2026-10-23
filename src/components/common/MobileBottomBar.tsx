import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavView } from '../../types';
import { Home, Search, HeartHandshake, Droplet, User, Bell } from 'lucide-react';

export const MobileBottomBar: React.FC = () => {
  const { 
    activeView, 
    setActiveView, 
    currentUser, 
    openAuthModal, 
    requests,
    unreadNotificationCount,
    canOpenView,
    t,
    language 
  } = useApp();

  const criticalCount = requests.filter(r => r.urgency === 'Critical' && r.status === 'Pending').length;

  const navItems = [
    {
      id: 'home' as NavView,
      label: language === 'bn' ? 'হোম' : 'Home',
      icon: Home
    },
    {
      id: 'find-blood' as NavView,
      label: language === 'bn' ? 'রক্ত খুঁজুন' : 'Find Blood',
      icon: Search
    },
    {
      id: 'requests' as NavView,
      label: language === 'bn' ? 'অনুরোধ' : 'Requests',
      icon: Droplet,
      badge: criticalCount > 0 ? criticalCount : undefined
    },
    {
      id: 'donate' as NavView,
      label: language === 'bn' ? 'রক্তদান' : 'Donate',
      icon: HeartHandshake
    },
    {
      id: (currentUser?.role === 'requester' ? 'requester-dashboard' : 'donor-dashboard') as NavView,
      label: currentUser ? (language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard') : (language === 'bn' ? 'লগইন' : 'Profile'),
      icon: User,
      requiresAuth: !currentUser
    }
  ];

  const roleItems = !currentUser
    ? navItems.filter(i => i.id === 'home' || i.requiresAuth)   // guests: Home and the Log in / Profile tab only
    : navItems.filter(i => i.requiresAuth || (canOpenView(i.id) && !(i.id === 'donate' && currentUser.role === 'donor') && !(currentUser.role === 'admin' && i.id === 'donor-dashboard')));

  const handleSelect = (item: typeof navItems[0]) => {
    if (item.requiresAuth) {
      openAuthModal('login');
      return;
    }
    setActiveView(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav 
      aria-label={language === 'bn' ? 'মোবাইল নেভিগেশন' : 'Mobile Navigation'}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-t border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-safe transition-colors duration-200"
    >
      <div className="flex items-center justify-around h-15 max-w-lg mx-auto px-2">
        {roleItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative cursor-pointer ${
                isActive 
                  ? 'text-[#DC2626] dark:text-[#EF4444]' 
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#DC2626] text-white font-bold text-[9px] flex items-center justify-center leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-[#DC2626] dark:bg-[#EF4444]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

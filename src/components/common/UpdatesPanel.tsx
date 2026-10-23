import React from 'react';
import { Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { localizeNotification } from '../../utils/notifications';

/** "Latest updates" for a dashboard: the newest notifications of the given kinds, tap to mark as read. */
export const UpdatesPanel: React.FC<{ kinds: string[]; empty: string }> = ({ kinds, empty }) => {
  const { notifications, markNotificationAsRead, language } = useApp();
  const bn = language === 'bn';
  const items = notifications.filter(n => kinds.includes(n.type)).slice(0, 5);

  return (
    <section aria-label={bn ? 'সর্বশেষ খবর' : 'Latest updates'} className="mb-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#12181C] border border-[#E2E8F0] dark:border-[#222D35]">
      <h2 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-[#DC2626]" aria-hidden="true" /> {bn ? 'সর্বশেষ খবর' : 'Latest updates'}
      </h2>
      {items.length === 0 ? (
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map(raw => { const n = { ...raw, ...localizeNotification(raw, language) }; return (
            <li key={raw.id}>
              <button
                type="button"
                onClick={() => markNotificationAsRead(raw.id)}
                className={`w-full text-left p-3 rounded-2xl border text-xs cursor-pointer ${raw.isRead ? 'border-[#E2E8F0] dark:border-[#222D35] bg-transparent' : 'border-[#0D7A5F]/40 bg-[#0D7A5F]/5'}`}
              >
                <span className="block font-bold text-[#0F172A] dark:text-white">
                  {n.title}{!raw.isRead && <span className="ml-2 text-[10px] font-bold text-[#0D7A5F]">{bn ? 'নতুন' : 'NEW'}</span>}
                </span>
                <span className="block mt-0.5 text-[#64748B] dark:text-[#94A3B8]">{n.message}</span>
              </button>
            </li>
          ); })}
        </ul>
      )}
    </section>
  );
};

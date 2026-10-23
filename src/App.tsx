import React, { lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { Toast } from './components/common/Toast';
import { AuthModal } from './components/common/AuthModal';
import { MobileBottomBar } from './components/common/MobileBottomBar';
import { SiteNotice, MedicalDisclaimer } from './components/common/SiteNotice';
import { GuestPreviewCard } from './components/home/GuestPreviewCard';
import { IntroSheet } from './components/common/IntroSheet';
import { motion, AnimatePresence } from 'motion/react';

// Homepage Sections
import { HeroSection } from './components/home/HeroSection';
import { AdSlot } from './components/common/AdSlot';

// Code-splitting: pages, modals and below-the-fold sections download only when they are needed.
const TrustStats = lazy(() => import('./components/home/TrustStats').then(m => ({ default: m.TrustStats })));
const HowItWorks = lazy(() => import('./components/home/HowItWorks').then(m => ({ default: m.HowItWorks })));
const BloodAvailabilitySection = lazy(() => import('./components/home/BloodAvailabilitySection').then(m => ({ default: m.BloodAvailabilitySection })));
const DonorDiscoverySection = lazy(() => import('./components/home/DonorDiscoverySection').then(m => ({ default: m.DonorDiscoverySection })));
const DonationJourneySection = lazy(() => import('./components/home/DonationJourneySection').then(m => ({ default: m.DonationJourneySection })));
const BloodCompatibilitySection = lazy(() => import('./components/home/BloodCompatibilitySection').then(m => ({ default: m.BloodCompatibilitySection })));
const FaqSection = lazy(() => import('./components/home/FaqSection').then(m => ({ default: m.FaqSection })));
const FindBloodPage = lazy(() => import('./components/pages/FindBloodPage').then(m => ({ default: m.FindBloodPage })));
const BloodRequestsPage = lazy(() => import('./components/pages/BloodRequestsPage').then(m => ({ default: m.BloodRequestsPage })));
const BloodCentersPage = lazy(() => import('./components/pages/BloodCentersPage').then(m => ({ default: m.BloodCentersPage })));
const DonorDashboardPage = lazy(() => import('./components/pages/DonorDashboardPage').then(m => ({ default: m.DonorDashboardPage })));
const AboutPage = lazy(() => import('./components/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const SharedRequestPage = lazy(() => import('./components/pages/SharedRequestPage').then(m => ({ default: m.SharedRequestPage })));
const OnboardingPage = lazy(() => import('./components/pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const RequesterDashboardPage = lazy(() => import('./components/pages/RequesterDashboardPage').then(m => ({ default: m.RequesterDashboardPage })));
const SearchModal = lazy(() => import('./components/common/SearchModal').then(m => ({ default: m.SearchModal })));
const ContactDonorModal = lazy(() => import('./components/common/ContactDonorModal').then(m => ({ default: m.ContactDonorModal })));
const CreateRequestModal = lazy(() => import('./components/common/CreateRequestModal').then(m => ({ default: m.CreateRequestModal })));

// Page Views

const AppContent: React.FC = () => {
  const { activeView: requestedView, currentUser, canOpenView } = useApp();
  // A signed-out visitor can never be shown a members-only page, even right after logging out.
  const MEMBERS_ONLY = ['find-blood', 'requests', 'centers', 'donor-dashboard', 'requester-dashboard', 'onboarding'];
  // Signed out: preview only. Signed in but profile unfinished: always the onboarding page.
  const ownDashboard = currentUser?.role === 'donor' ? 'donor-dashboard' : currentUser?.role === 'requester' ? 'requester-dashboard' : 'home';
  const activeView = !currentUser && MEMBERS_ONLY.includes(requestedView)
    ? 'home'
    : currentUser?.role === 'pending' ? 'onboarding'
    : currentUser && !canOpenView(requestedView) ? ownDashboard
    : requestedView;
  const role = currentUser?.role;

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC] font-sans antialiased selection:bg-[#DC2626] selection:text-white transition-colors duration-200 flex flex-col justify-between overflow-x-hidden pb-16 md:pb-0">
      
      {/* Subtle Healthcare Ambient Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        {/* Soft calm crimson & neutral orbs */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#DC2626]/[0.025] dark:bg-[#DC2626]/[0.04] blur-[120px]" />
        <div className="absolute top-1/2 -right-32 w-[550px] h-[550px] rounded-full bg-slate-400/[0.04] dark:bg-slate-700/[0.06] blur-[140px]" />
      </div>

      <SiteNotice />

      {/* Top Fixed / Sticky Navigation Bar */}
      <Navbar />

      {/* Main Content View Switcher with Animated Transitions */}
      <main className="flex-grow relative z-10">
        <Suspense fallback={<div className="min-h-[40vh]" aria-busy="true" />}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeView === 'home' && (
              currentUser ? (
              <div className="space-y-0">
                <HeroSection />
                <TrustStats />
                <HowItWorks />
                <AdSlot />
                <BloodAvailabilitySection />
                <DonorDiscoverySection />
                <DonationJourneySection />
                <BloodCompatibilitySection />
                <AdSlot />
                <FaqSection />
              </div>
              ) : (
              /* Guests: a light preview on the left and an always-visible login / sign-up card on the right (desktop). */
              <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_27rem] lg:items-start">
                <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
                  <HeroSection />
                </div>
                {/* One login / sign-up card: right-hand column on desktop, directly under the hero on phones. */}
                <aside aria-label="Log in or sign up" className="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-20 lg:self-start px-4 py-8 sm:px-6 lg:p-6 lg:pt-24">
                  <AuthModal inline />
                </aside>
                <div className="order-3 min-w-0 space-y-0 lg:col-start-1 lg:row-start-2">
                  <GuestPreviewCard />
                  <HowItWorks />
                  <AdSlot />
                  <DonorDiscoverySection />
                  <BloodCompatibilitySection />
                  <AdSlot />
                  <FaqSection />
                  </div>
              </div>
              )
            )}

            {activeView === 'find-blood' && <FindBloodPage />}
            {activeView === 'onboarding' && <OnboardingPage />}
            {activeView === 'requests' && <BloodRequestsPage />}
            {activeView === 'centers' && <BloodCentersPage />}
            {activeView === 'donor-dashboard' && <DonorDashboardPage />}
            {activeView === 'requester-dashboard' && <RequesterDashboardPage />}
            {activeView === 'shared-request' && <SharedRequestPage />}
            {activeView === 'about' && <AboutPage />}
          </motion.div>
        </AnimatePresence>
        </Suspense>
      </main>

      {/* Universal Footer */}
      <Footer />
      <MedicalDisclaimer />

      {/* Mobile Bottom Navigation Bar (App-like thumb reachability) */}
      <MobileBottomBar />

      {/* Modals & Portals */}
      <AuthModal />
      <IntroSheet />
      <Suspense fallback={null}>
        <SearchModal />
        <ContactDonorModal />
        <CreateRequestModal />
      </Suspense>
      <Toast />

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

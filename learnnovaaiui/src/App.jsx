import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HomePage, HistoryPage, ReportPage } from './pages';
import { AuthProvider, AuthModal } from './features/auth';
import { PricingModal } from './features/payment';

import { useAuth } from './features/auth';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedReportId, setSelectedReportId] = useState('REP-2026-001');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  // Tự động lắng nghe sự kiện khi một tác vụ cần đăng nhập hoặc cần nạp từ
  React.useEffect(() => {
    const handleAuthRequired = () => {
      setAuthMode('signin');
      setIsAuthOpen(true);
    };
    const handlePricingRequired = () => {
      setIsPricingOpen(true);
    };

    window.addEventListener('learnova:auth-required', handleAuthRequired);
    window.addEventListener('learnova:pricing-required', handlePricingRequired);

    return () => {
      window.removeEventListener('learnova:auth-required', handleAuthRequired);
      window.removeEventListener('learnova:pricing-required', handlePricingRequired);
    };
  }, []);

  const handleOpenAuth = (mode = 'signin') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleOpenPricing = () => {
    setIsPricingOpen(true);
  };

  const handleNavigate = (page) => {
    if ((page === 'history' || page === 'report') && !isAuthenticated) {
      handleOpenAuth('signin');
      return;
    }
    setCurrentPage(page);
  };

  const handleSelectReport = (reportId) => {
    setSelectedReportId(reportId);
    setCurrentPage('report');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onOpenPricing={handleOpenPricing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'home' && (
          <HomePage onOpenAuth={handleOpenAuth} onOpenPricing={handleOpenPricing} />
        )}
        {currentPage === 'history' && (
          <HistoryPage onSelectReport={handleSelectReport} onOpenAuth={handleOpenAuth} />
        )}
        {currentPage === 'report' && (
          <ReportPage reportId={selectedReportId} onBack={() => setCurrentPage('history')} />
        )}
      </main>

      {/* Auth Modal for Sign In & Sign Up */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Pricing & PayOS VietQR Modal */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        onOpenAuth={handleOpenAuth}
      />

      {/* Modern Footer */}
      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-md py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <div>
            LearnovaAI © 2026 • Hệ thống Phát hiện Đạo văn & PhoBERT AI Detector
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400">
            <span className="hover:text-indigo-600 transition-colors">Winnowing Fingerprinting</span>
            <span>•</span>
            <span className="hover:text-indigo-600 transition-colors">Vector Qdrant DB</span>
            <span>•</span>
            <span className="hover:text-indigo-600 transition-colors">PhoBERT AI Engine</span>
            <span>•</span>
            <span className="hover:text-indigo-600 transition-colors">FastAPI Core</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HomePage, HistoryPage, ReportPage } from './pages';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedReportId, setSelectedReportId] = useState('REP-2026-001');

  const handleSelectReport = (reportId) => {
    setSelectedReportId(reportId);
    setCurrentPage('report');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Navigation */}
      <Navbar currentPage={currentPage} onNavigate={(page) => setCurrentPage(page)} />

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: '1180px',
          width: '100%',
          margin: '0 auto',
          padding: '2rem 1.5rem 4rem',
        }}
      >
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'history' && <HistoryPage onSelectReport={handleSelectReport} />}
        {currentPage === 'report' && (
          <ReportPage reportId={selectedReportId} onBack={() => setCurrentPage('history')} />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '1.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-muted, #9ca3af)',
          backgroundColor: 'rgba(15, 17, 23, 0.7)',
        }}
      >
        <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            LearnovaAI © 2026 • Hệ thống Phát hiện Đạo văn, Truy vết Thời gian & Phân tích AI
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <span>Winnowing Algorithm</span>
            <span>Vector Qdrant DB</span>
            <span>Internet Archive API</span>
            <span>FastAPI Backend</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

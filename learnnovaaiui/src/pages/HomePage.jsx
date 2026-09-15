import React, { useState } from 'react';
import { PlagiarismChecker } from '../features/plagiarism';
import { AIDetector } from '../features/ai-detector';

export function HomePage() {
  const [activeTab, setActiveTab] = useState('plagiarism'); // 'plagiarism' | 'ai-detector'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero section with switch tabs */}
      <div style={{ textAlign: 'center', maxWidth: '780px', margin: '1rem auto 0' }}>
        <h1
          style={{
            margin: '0 0 0.75rem',
            fontSize: '2.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #f3f4f6 30%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-1px',
          }}
        >
          Hệ thống Kiểm định Độc bản & AI
        </h1>
        <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '1.05rem', lineHeight: '1.6' }}>
          Phát hiện đạo văn bằng thuật toán Winnowing & Vector Similarity, truy vết mốc thời gian xuất bản và nhận diện văn bản tạo bởi AI.
        </p>

        {/* Feature switcher pill */}
        <div
          style={{
            display: 'inline-flex',
            marginTop: '1.5rem',
            padding: '5px',
            backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.05))',
            borderRadius: '9999px',
            border: '1px solid var(--border, #2e303a)',
          }}
        >
          <button
            onClick={() => setActiveTab('plagiarism')}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === 'plagiarism' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: '#ffffff',
              fontWeight: activeTab === 'plagiarism' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'plagiarism' ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
            }}
          >
            🔍 Kiểm tra Đạo văn & Đối soát ngày
          </button>
          <button
            onClick={() => setActiveTab('ai-detector')}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === 'ai-detector' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'transparent',
              color: '#ffffff',
              fontWeight: activeTab === 'ai-detector' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'ai-detector' ? '0 2px 10px rgba(168, 85, 247, 0.4)' : 'none',
            }}
          >
            🤖 Nhận diện AI (GD2 Mở rộng)
          </button>
        </div>
      </div>

      {/* Feature Content */}
      <div style={{ marginTop: '0.5rem' }}>
        {activeTab === 'plagiarism' ? <PlagiarismChecker /> : <AIDetector />}
      </div>
    </div>
  );
}

export default HomePage;

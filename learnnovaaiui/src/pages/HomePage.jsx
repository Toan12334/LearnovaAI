import React, { useState } from 'react';
import { PlagiarismChecker } from '../features/plagiarism';
import { AIDetector } from '../features/ai-detector';
import { Shield, Sparkles, Bot, Search } from 'lucide-react';

export function HomePage() {
  const [activeTab, setActiveTab] = useState('plagiarism'); // 'plagiarism' | 'ai-detector'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
      {/* Hero section */}
      <div style={{ textAlign: 'center', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '9999px',
            background: 'rgba(79, 124, 255, 0.12)',
            border: '1px solid rgba(79, 124, 255, 0.25)',
            color: '#818cf8',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '1rem',
          }}
        >
          <Shield size={14} />
          <span>Hệ thống Kiểm định Độc bản & Bản quyền Tri thức 2026</span>
        </div>

        <h1
          style={{
            margin: '0 0 0.85rem',
            fontSize: '2.8rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ffffff 40%, #93c5fd 80%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em',
            lineHeight: '1.2',
          }}
        >
          LearnovaAI Plagiarism Detector
        </h1>

        <p
          style={{
            color: '#94a3b8',
            fontSize: '1.1rem',
            lineHeight: '1.6',
            maxWidth: '680px',
            margin: '0 auto',
          }}
        >
          Đối soát đạo văn chính xác bằng thuật toán Fingerprinting Winnowing, phân tích ngữ nghĩa qua Vector Database Qdrant và đối chiếu trực tuyến với Google Serper.
        </p>

        {/* Feature switcher pill */}
        <div
          style={{
            display: 'inline-flex',
            marginTop: '1.75rem',
            padding: '4px',
            backgroundColor: '#151C2F',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          }}
        >
          <button
            onClick={() => setActiveTab('plagiarism')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.6rem',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === 'plagiarism' ? 'linear-gradient(135deg, #4F7CFF, #8B5CF6)' : 'transparent',
              color: '#ffffff',
              fontWeight: activeTab === 'plagiarism' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.25s ease',
              boxShadow: activeTab === 'plagiarism' ? '0 4px 15px rgba(79, 124, 255, 0.4)' : 'none',
            }}
          >
            <Search size={15} />
            <span>Kiểm tra Đạo văn & Đối soát Nguồn</span>
          </button>
          <button
            onClick={() => setActiveTab('ai-detector')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.6rem',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === 'ai-detector' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'transparent',
              color: '#ffffff',
              fontWeight: activeTab === 'ai-detector' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.25s ease',
              boxShadow: activeTab === 'ai-detector' ? '0 4px 15px rgba(168, 85, 247, 0.4)' : 'none',
            }}
          >
            <Bot size={15} />
            <span>Nhận diện AI (GD2)</span>
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

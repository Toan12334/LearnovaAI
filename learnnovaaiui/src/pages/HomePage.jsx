import React, { useState } from 'react';
import { PlagiarismChecker } from '../features/plagiarism';
import { AIDetector } from '../features/ai-detector';
import { Shield, Bot, Search, Cpu } from 'lucide-react';

export function HomePage() {
  const [activeTab, setActiveTab] = useState('plagiarism'); // 'plagiarism' | 'ai-detector'

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold mb-4 shadow-xs">
          <Shield className="w-3.5 h-3.5 text-indigo-600" />
          <span>Hệ thống Kiểm định Độc bản & PhoBERT AI Detector 2026</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-3">
          Learnova<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600">AI</span> Studio
        </h1>

        <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
          Đối soát đạo văn bằng thuật toán Winnowing & Semantic Vector Qdrant, kết hợp mô hình PhoBERT AI Detector phân tích tác giả theo ngữ cảnh.
        </p>

        {/* Feature Switcher Pills */}
        <div className="inline-flex p-1.5 mt-8 rounded-2xl bg-slate-200/70 backdrop-blur-md border border-slate-300/60 shadow-lg shadow-slate-200/50">
          
          <button
            onClick={() => setActiveTab('plagiarism')}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
              activeTab === 'plagiarism'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Kiểm tra Đạo văn & Đối soát Nguồn</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-detector')}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
              activeTab === 'ai-detector'
                ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/30 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Nhận diện PhoBERT AI</span>
          </button>

        </div>
      </div>

      {/* Main Feature Container */}
      <div className="w-full">
        {activeTab === 'plagiarism' ? <PlagiarismChecker /> : <AIDetector />}
      </div>

    </div>
  );
}

export default HomePage;

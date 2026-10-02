import React, { useState } from 'react';
import { PlagiarismChecker } from '../features/plagiarism';
import { AIDetector } from '../features/ai-detector';
import {
  ShieldCheck,
  Sparkles,
  Zap,
  Database,
  Cpu,
  Search,
  Bot,
  CheckCircle2,
  ArrowRight,
  Lock,
  Globe,
  BarChart3,
  ChevronDown,
  Layers,
  Award,
  HelpCircle,
  FileCheck
} from 'lucide-react';

export function HomePage() {
  const [activeTab, setActiveTab] = useState('plagiarism'); // 'plagiarism' | 'ai-detector'
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'Mô hình PhoBERT AI Detector trong LearnovaAI có gì đặc biệt?',
      a: 'LearnovaAI sử dụng mô hình PhoBERT Fine-Tuned (toanoppa10012004/phobert-vietnamese-ai-detector) tối ưu riêng cho tiếng Việt. Thay vì đếm tần suất từ rời rạc như các công cụ thông thường, PhoBERT phân tích ngữ cảnh theo từng đoạn 2-3 câu, cho độ chính xác cao và tránh báo động nhầm.',
    },
    {
      q: 'Hệ thống đối soát đạo văn qua các nguồn dữ liệu nào?',
      a: 'Quy trình đối soát 6 bước của chúng tôi kết hợp thuật toán Fingerprinting Winnowing, cơ sở dữ liệu Vector Qdrant đối soát tri thức nội bộ và Serper API để truy quét các nguồn báo chí, bài báo khoa học và website trực tuyến.',
    },
    {
      q: 'Dữ liệu văn bản của tôi có được giữ an toàn và bảo mật không?',
      a: 'Có. Tất cả văn bản kiểm tra được mã hóa bảo mật theo tiêu chuẩn Enterprise. LearnovaAI cam kết không tự ý bán hay công khai nội dung của người dùng cho bên thứ ba.',
    },
    {
      q: 'Tính năng Chứng thực mốc thời gian (Timestamp Audit) hoạt động ra sao?',
      a: 'Tính năng này truy vấn trực tiếp Wayback Machine (Internet Archive) để xác thực thời điểm chính xác nguồn trích dẫn được xuất bản lần đầu trên Internet, giúp giải quyết tranh chấp bản quyền minh bạch.',
    },
  ];

  return (
    <div className="flex flex-col gap-16 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
      
      {/* 1. HERO SECTION */}
      <section className="text-center max-w-4xl mx-auto relative pt-4 pb-2">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400/15 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-purple-400/15 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Enterprise Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 text-slate-100 text-xs font-semibold shadow-lg shadow-indigo-950/10 mb-6 border border-slate-700/60 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-indigo-300 font-bold">LearnovaAI Studio v2.5</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">Nền tảng Kiểm định Độc bản Enterprise</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] mb-6">
          Giải Pháp Phân Tích Độc Bản &{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600">
            PhoBERT AI Detector
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed max-w-3xl mx-auto mb-10">
          Tích hợp thuật toán Winnowing, Vector Database Qdrant và mô hình Deep Learning PhoBERT fine-tuned — mang đến độ chính xác tối ưu cho ngôn ngữ tiếng Việt.
        </p>

        {/* Business Feature Mode Selector */}
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl shadow-slate-900/30 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveTab('plagiarism')}
            className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer ${
              activeTab === 'plagiarism'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Search className="w-4 h-4 text-indigo-300" />
            <span>Đối Soát Đạo Văn & Nguồn Web</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai-detector')}
            className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer ${
              activeTab === 'ai-detector'
                ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/40 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-4 h-4 text-purple-300" />
            <span>Nhận Diện PhoBERT AI</span>
          </button>
        </div>
      </section>

      {/* 2. MAIN WORKSPACE STUDIO CONTAINER */}
      <section className="w-full relative">
        <div className="p-2 sm:p-4 rounded-3xl bg-white/70 backdrop-blur-2xl border border-slate-200/80 shadow-2xl shadow-indigo-950/5">
          {activeTab === 'plagiarism' ? <PlagiarismChecker /> : <AIDetector />}
        </div>
      </section>

      {/* 3. ENTERPRISE METRICS BANNER */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-indigo-100/30 border border-indigo-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Độ chính xác</span>
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">99.4%</div>
            <p className="text-xs font-medium text-slate-500">Mô hình PhoBERT AI Fine-Tuned Tiếng Việt</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50/80 to-purple-100/30 border border-purple-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Kho Vector Qdrant</span>
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/30">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">10M+</div>
            <p className="text-xs font-medium text-slate-500">Vector tài liệu tri thức đối soát ngữ nghĩa</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-emerald-100/30 border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Tốc độ xử lý</span>
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">&lt; 2.5s</div>
            <p className="text-xs font-medium text-slate-500">Thời gian phản hồi trung bình / lượt check</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-50/80 to-amber-100/30 border border-amber-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Bảo mật dữ liệu</span>
            <div className="p-2 rounded-xl bg-amber-600 text-white shadow-md shadow-amber-600/30">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">100%</div>
            <p className="text-xs font-medium text-slate-500">Bảo mật thông tin & Chuẩn ISO 27001 UI</p>
          </div>
        </div>
      </section>

      {/* 4. CORE VALUE PILLARS (WHY CHOOSE US) */}
      <section className="flex flex-col gap-10 py-6">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Công Nghệ Tiên Tiến 2026</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Tại Sao Chọn LearnovaAI Enterprise?
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-2">
            Giải pháp kết hợp sức mạnh của Mô hình Học sâu Transformer và Hệ thống Tìm kiếm Ngữ nghĩa Vector.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">PhoBERT Deep Learning</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Phân tích ngữ cảnh đoạn văn 2-3 câu bằng Hugging Face model fine-tuned riêng cho ngôn ngữ tiếng Việt.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Truy Quét Web Realtime</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Tích hợp Serper API truy quét hàng triệu trang web, báo chí và cổng tri thức để tìm kiếm nguồn trùng lặp.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Qdrant Vector Database</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Sử dụng FastEmbed Embeddings phát hiện diễn đạt lại (paraphrase) mà không bị giới hạn bởi từ khóa cứng.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Báo Cáo Visual Heatmap</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Xuất báo cáo trực quan với mã màu phân cấp rủi ro, hỗ trợ tra cứu chứng thực mốc thời gian xuất bản.
            </p>
          </div>
        </div>
      </section>

      {/* 5. 4-STEP PIPELINE VISUAL WORKFLOW */}
      <section className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Quy trình xử lý 6 bước</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
            Kiểm Định Độc Bản & AI Diễn Ra Như Thế Nào?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col gap-3">
            <span className="text-xs font-mono font-bold text-indigo-400">01 / BƯỚC NẠP</span>
            <h4 className="text-base font-bold text-white">Nhập Văn Bản & Upload File</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hệ thống tiếp nhận dữ liệu từ ô nhập trực tiếp hoặc trích xuất văn bản từ tệp PDF, DOCX, TXT.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col gap-3">
            <span className="text-xs font-mono font-bold text-purple-400">02 / BƯỚC VECTOR</span>
            <h4 className="text-base font-bold text-white">Tách Câu & Embeddings</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Văn bản được làm sạch (TextCleaner), tách câu chính xác và tạo dấu vân tay Winnowing Fingerprinting.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col gap-3">
            <span className="text-xs font-mono font-bold text-emerald-400">03 / BƯỚC ĐỐI SOÁT</span>
            <h4 className="text-base font-bold text-white">Song Song Qdrant & PhoBERT</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Truy quét kho Vector Qdrant, kết hợp chạy mô hình Transformer PhoBERT đánh giá xác suất AI theo đoạn.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col gap-3">
            <span className="text-xs font-mono font-bold text-amber-400">04 / BƯỚC BÁO CÁO</span>
            <h4 className="text-base font-bold text-white">Xuất Báo Cáo Heatmap</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tổng hợp điểm %, tô màu Heatmap từng câu và lưu vết Audit Trail tự động vào lịch sử người dùng.
            </p>
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="max-w-3xl mx-auto w-full py-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Giải Đáp Thắc Mắc</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Câu Hỏi Thường Gặp</h2>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full p-5 text-left font-bold text-sm text-slate-800 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                    openFaq === idx ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7. BOTTOM CTA BANNER */}
      <section className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="max-w-xl">
          <h3 className="text-2xl font-black mb-2">Sẵn Sàng Kiểm Định Độc Bản Cho Nội Dung Của Bạn?</h3>
          <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed">
            Thực hiện kiểm tra Đạo văn và PhoBERT AI Detector ngay bây giờ với tốc độ xử lý tức thì và báo cáo minh bạch.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-indigo-950 font-bold text-sm shadow-xl hover:bg-indigo-50 transition-all transform hover:scale-[1.03] shrink-0 cursor-pointer"
        >
          <span>Trải nghiệm ngay</span>
          <ArrowRight className="w-4 h-4 text-indigo-600" />
        </button>
      </section>

    </div>
  );
}

export default HomePage;

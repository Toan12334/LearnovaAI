import { useState } from 'react';
import { Card } from '../../components/Card';
import { AIDetectorForm } from './components/AIDetectorForm';
import { AIDetectorResult } from './components/AIDetectorResult';
import { aiDetectorApi } from '../../services/aiDetectorApi';
import { historyService } from '../../services/historyService';
import { useAuth } from '../auth';
import { Cpu, AlertCircle, Sparkles, Lock } from 'lucide-react';

export function AIDetector({ onOpenAuth }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { user, isAuthenticated } = useAuth();

  const handleRequireAuth = () => {
    if (onOpenAuth) {
      onOpenAuth('signin');
    } else {
      window.dispatchEvent(new CustomEvent('learnova:auth-required'));
    }
  };

  const handleAnalyze = async (payload) => {
    if (!isAuthenticated || !user) {
      handleRequireAuth();
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await aiDetectorApi.detectAI(payload);
      setResult(res);

      // Save to user history automatically
      const aiScore = res.overall_ai_score ?? Math.round((res.ai_probability || 0) * 100);
      const titleSnippet = payload.text.trim().substring(0, 60) + (payload.text.length > 60 ? '...' : '');

      historyService.saveCheckResult(
        {
          id: `AI-${Date.now().toString().slice(-6)}`,
          type: 'ai_detection',
          title: `Phân tích AI: ${titleSnippet}`,
          author: user ? (user.full_name || user.email) : 'Khách',
          score: aiScore,
          status: aiScore >= 50 ? 'Tín hiệu AI Cao' : 'Nội dung Người viết',
          sourcesCount: 0,
          sourceFile: payload.sourceFile || null,
          result: res,
        },
        user?.id
      );

    } catch (requestError) {
      setError(requestError.message || 'Không thể kết nối với mô hình PhoBERT AI Detector.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Auth Gate Banner for unauthenticated visitors */}
      {!isAuthenticated && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-500/30 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                Yêu cầu đăng nhập để phân tích PhoBERT AI
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-400/20 text-purple-300 px-2 py-0.5 rounded-md border border-purple-400/30">
                  Model v2.0
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                Đăng nhập để khởi chạy mô hình Deep Learning phân tích Perplexity & Heatmap câu tiếng Việt.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleRequireAuth}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition-all cursor-pointer shadow-sm text-center"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth ? onOpenAuth('signup') : handleRequireAuth()}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:brightness-110 transition-all cursor-pointer shadow-sm text-center"
            >
              Đăng ký miễn phí
            </button>
          </div>
        </div>
      )}

      <Card
        title="🤖 Nhận diện AI Generated (PhoBERT AI Detector)"
        subtitle="Sử dụng mô hình Transformer tiếng Việt PhoBERT fine-tuned (toanoppa10012004/phobert-vietnamese-ai-detector) để phân tích tác giả văn bản"
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-xs">
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
            PhoBERT Fine-Tuned Model v2.0
          </span>
        }
      >
        <AIDetectorForm
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          isAuthenticated={isAuthenticated}
          onRequireAuth={handleRequireAuth}
        />
        {error && (
          <div role="alert" className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}
      </Card>

      {result && (
        <Card
          title="📈 Báo cáo Định lượng Trí tuệ Nhân tạo (PhoBERT AI)"
          subtitle="Kết quả phân tích ngữ cảnh theo từng đoạn 2-3 câu và đánh giá xác suất tác giả"
          badge={
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3 h-3" /> Hoàn tất & Đã lưu Lịch sử
            </span>
          }
        >
          <AIDetectorResult result={result} />
        </Card>
      )}
    </div>
  );
}

export default AIDetector;

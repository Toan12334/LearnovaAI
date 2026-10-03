import { useState } from 'react';
import { Card } from '../../components/Card';
import { AIDetectorForm } from './components/AIDetectorForm';
import { AIDetectorResult } from './components/AIDetectorResult';
import { aiDetectorApi } from '../../services/aiDetectorApi';
import { historyService } from '../../services/historyService';
import { useAuth } from '../auth';
import { Cpu, AlertCircle, Sparkles } from 'lucide-react';

export function AIDetector() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleAnalyze = async (payload) => {
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
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
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
        <AIDetectorForm onAnalyze={handleAnalyze} isLoading={isLoading} />
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

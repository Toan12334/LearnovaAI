import { useState } from 'react';
import { Card } from '../../components/Card';
import { AIDetectorForm } from './components/AIDetectorForm';
import { AIDetectorResult } from './components/AIDetectorResult';
import { aiDetectorApi } from '../../services/aiDetectorApi';

export function AIDetector() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (payload) => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await aiDetectorApi.detectAI(payload);
      setResult(res);
    } catch (requestError) {
      setError(requestError.message || 'Không thể phân tích văn bản.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Card
        title="🤖 Nhận diện Nội dung Sinh bởi Trí tuệ Nhân tạo (AI Detector)"
        subtitle="Sử dụng RoBERTa Transformer Classifier để đánh giá khả năng văn bản do AI tạo ra"
        badge={
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            Giai đoạn mở rộng (GD2)
          </span>
        }
      >
        <AIDetectorForm onAnalyze={handleAnalyze} isLoading={isLoading} />
      {error && (
        <div role="alert" style={{ color: '#fca5a5', fontSize: '0.9rem', marginTop: '1rem' }}>
          {error}
        </div>
      )}
      </Card>

      {result && (
        <Card
          title="📈 Báo cáo Định lượng Trí tuệ Nhân tạo"
          subtitle="Kết quả RoBERTa theo từng câu và trạng thái tin cậy của checkpoint"
        >
          <AIDetectorResult result={result} />
        </Card>
      )}
    </div>
  );
}

export default AIDetector;

import { useState } from 'react';
import { Button } from '../../../components/Button';

export function AIDetectorForm({ onAnalyze, isLoading = false }) {
  const [text, setText] = useState('');
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim().length < 50) return;
    onAnalyze({ text, language: 'auto' });
  };

  const handleSampleAI = () => {
    setText(
      'Trong thời đại bùng nổ công nghệ số, việc ứng dụng trí tuệ nhân tạo không chỉ mang lại hiệu suất vượt trội mà còn đặt ra nhiều thách thức mới cho giáo dục. Do đó, việc xây dựng một cơ chế phát hiện tự động hóa là một yêu cầu cấp thiết và mang tính sống còn.'
    );
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted, #9ca3af)' }}>
          Nhập văn bản cần phân tích bằng RoBERTa:
        </span>
        <button
          type="button"
          onClick={handleSampleAI}
          style={{
            background: 'transparent',
            border: '1px dashed #a855f7',
            color: '#c084fc',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          Dán mẫu văn bản AI
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập hoặc dán nội dung nghi ngờ do ChatGPT, Claude, Gemini hoặc DeepSeek tạo ra..."
          rows={7}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid var(--border, #2e303a)',
            background: 'var(--input-bg, rgba(0, 0, 0, 0.2))',
            color: 'inherit',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: 'var(--text-muted, #9ca3af)',
            marginTop: '0.35rem',
          }}
        >
          <span>{wordCount} từ</span>
          <span>Tối thiểu 50 ký tự · tối đa 300.000 ký tự</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #9ca3af)' }}>
          RoBERTa đa ngôn ngữ tự động xử lý tiếng Việt và tiếng Anh.
        </span>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          disabled={text.trim().length < 50}
          style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
          }}
        >
          🤖 Nhận diện AI Generated
        </Button>
      </div>
    </form>
  );
}

export default AIDetectorForm;

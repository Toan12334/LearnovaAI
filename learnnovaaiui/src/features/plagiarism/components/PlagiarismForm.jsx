import React, { useState } from 'react';
import { Button } from '../../../components/Button';

export function PlagiarismForm({ onCheck, isLoading = false }) {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [mode, setMode] = useState('text'); // 'text' or 'file'
  const [threshold, setThreshold] = useState(70);
  const [language, setLanguage] = useState('vi');
  const [checkTimestamp, setCheckTimestamp] = useState(true);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'text') {
      if (!text.trim()) return;
      onCheck({
        type: 'text',
        text,
        threshold,
        language,
        checkTimestamp,
      });
    } else {
      if (!selectedFile) return;
      onCheck({
        type: 'file',
        file: selectedFile,
        threshold,
        language,
        checkTimestamp,
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSampleText = () => {
    const sample = `Trí tuệ nhân tạo (AI) đang định hình lại phương thức giảng dạy và học tập trong kỷ nguyên số. Hệ thống phát hiện đạo văn hiện đại không chỉ dựa vào việc so khớp chuỗi ký tự (exact match với thuật toán Winnowing), mà còn kết hợp tìm kiếm ngữ nghĩa (semantic search) qua Vector Database để xác định các câu văn được diễn đạt lại (paraphrased text). Đồng thời, việc truy vết dấu mốc thời gian xuất bản (timestamp audit) từ siêu dữ liệu trang web và Internet Archive đóng vai trò then chốt để xác định ai mới là tác giả đầu tiên.`;
    setText(sample);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Input Mode Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--border, #2e303a)', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setMode('text')}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              border: 'none',
              background: mode === 'text' ? '#6366f1' : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            Nhập văn bản
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              border: 'none',
              background: mode === 'file' ? '#6366f1' : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            Tải tệp lên (.pdf, .docx, .txt)
          </button>
        </div>

        {mode === 'text' && (
          <button
            type="button"
            onClick={handleSampleText}
            style={{
              background: 'transparent',
              border: '1px dashed #6366f1',
              color: '#818cf8',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Dán đoạn văn bản mẫu
          </button>
        )}
      </div>

      {/* Main Input Area */}
      {mode === 'text' ? (
        <div style={{ position: 'relative' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dán bài viết, bài báo hoặc tài liệu cần kiểm tra đạo văn vào đây..."
            rows={8}
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
            <span>{wordCount} từ | {charCount} ký tự</span>
            <span>Tối đa: 10,000 từ / lượt kiểm tra</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            border: '2px dashed var(--border, #3e4150)',
            borderRadius: '12px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: 'var(--input-bg, rgba(0, 0, 0, 0.15))',
          }}
          onClick={() => document.getElementById('file-upload-input').click()}
        >
          <input
            id="file-upload-input"
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
          {selectedFile ? (
            <div>
              <p style={{ fontWeight: 600, color: '#818cf8' }}>{selectedFile.name}</p>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 500 }}>Nhấp để chọn tệp hoặc kéo thả vào đây</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)' }}>
                Hỗ trợ các định dạng PDF, Microsoft Word (.docx) và Plain Text (.txt)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Advanced Settings */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          padding: '1rem',
          borderRadius: '10px',
          background: 'var(--settings-bg, rgba(255, 255, 255, 0.03))',
          border: '1px solid var(--border, #2e303a)',
        }}
      >
        {/* Similarity Threshold Slider */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 500 }}>
            Ngưỡng tương đồng: <span style={{ color: '#818cf8', fontWeight: 600 }}>{threshold}%</span>
          </label>
          <input
            type="range"
            min="30"
            max="95"
            step="5"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#6366f1' }}
          />
        </div>

        {/* Language */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 500 }}>
            Ngôn ngữ tài liệu
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border, #2e303a)',
              background: 'var(--input-bg, #1f2028)',
              color: 'inherit',
              fontSize: '0.85rem',
            }}
          >
            <option value="vi">Tiếng Việt (Vietnamese)</option>
            <option value="en">Tiếng Anh (English)</option>
          </select>
        </div>

        {/* Timestamp Audit Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1.25rem' }}>
          <input
            type="checkbox"
            id="timestamp-check"
            checked={checkTimestamp}
            onChange={(e) => setCheckTimestamp(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
          />
          <label htmlFor="timestamp-check" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
            Đối soát mốc thời gian xuất bản (Wayback Archive)
          </label>
        </div>
      </div>

      {/* Submit button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          disabled={mode === 'text' ? !text.trim() : !selectedFile}
        >
          🔍 Bắt đầu kiểm tra đạo văn
        </Button>
      </div>
    </form>
  );
}

export default PlagiarismForm;

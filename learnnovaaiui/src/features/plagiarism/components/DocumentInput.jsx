import React, { useState, useRef } from 'react';
import {
  Upload,
  Sparkles,
  Type,
  Clock,
  FileText,
  X,
  Sliders,
  Globe,
  AlertCircle,
} from 'lucide-react';

export function DocumentInput({ onCheck, isLoading = false }) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [threshold, setThreshold] = useState(75);
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [validationError, setValidationError] = useState('');

  const fileInputRef = useRef(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleSampleText = () => {
    setTitle('Nghiên cứu ứng dụng Trí tuệ nhân tạo và Học máy 2026');
    setText(
      `Học máy là một nhánh của trí tuệ nhân tạo liên quan đến việc xây dựng các ứng dụng học từ dữ liệu. ` +
      `Deep learning sử dụng các mạng nơ-ron sâu với nhiều tầng ẩn để trích xuất đặc trưng phức tạp. ` +
      `Trí tuệ nhân tạo đang định hình lại phương thức giảng dạy và nghiên cứu khoa học trong kỷ nguyên số. ` +
      `Hệ thống phát hiện đạo văn hiện đại kết hợp thuật toán Fingerprinting Winnowing đối chiếu chuẩn xác ` +
      `cùng cơ sở dữ liệu Vector Qdrant để phân tích ngữ nghĩa và đối soát nguồn Internet thông qua Google Serper.`
    );
    setSelectedFile(null);
    setValidationError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        setValidationError('Định dạng file không hỗ trợ. Vui lòng chọn PDF, DOCX hoặc TXT.');
        return;
      }
      setSelectedFile(file);
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
      setValidationError('');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (selectedFile) {
      onCheck({
        type: 'file',
        file: selectedFile,
        title: title || selectedFile.name,
        similarity_threshold: threshold / 100,
        enable_web_search: enableWebSearch,
      });
      return;
    }

    if (!text.trim() || text.trim().length < 15) {
      setValidationError('Nội dung kiểm tra cần tối thiểu 15 ký tự (hoặc tải tệp lên).');
      return;
    }

    onCheck({
      type: 'text',
      text: text.trim(),
      title: title.trim() || 'Văn bản kiểm tra',
      similarity_threshold: threshold / 100,
      enable_web_search: enableWebSearch,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%' }}>
      {/* Background Glow Effect */}
      <div
        style={{
          position: 'absolute',
          inset: '-2px',
          background: 'linear-gradient(135deg, rgba(79, 124, 255, 0.35), rgba(139, 92, 246, 0.35), rgba(0, 212, 255, 0.2))',
          borderRadius: '24px',
          filter: 'blur(16px)',
          opacity: 0.6,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Container Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          backgroundColor: '#151C2F',
          borderRadius: '20px',
          border: '1px solid rgba(79, 124, 255, 0.2)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Top Header / Title Input & Sample Text Button */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '240px' }}>
            <FileText size={18} color="#818cf8" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề tài liệu / tiểu luận (tùy chọn)..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: showSettings ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: showSettings ? '#a5b4fc' : '#94a3b8',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Sliders size={14} />
              <span>Cấu hình đối soát</span>
            </button>

            <button
              type="button"
              onClick={handleSampleText}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#818cf8',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Sparkles size={14} />
              <span>Dán văn bản mẫu</span>
            </button>
          </div>
        </div>

        {/* Optional Settings Panel */}
        {showSettings && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              padding: '1rem',
              borderRadius: '12px',
              backgroundColor: 'rgba(11, 16, 32, 0.8)',
              border: '1px solid rgba(79, 124, 255, 0.15)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8' }}>Ngưỡng tương đồng (Cosine Threshold):</span>
                <span style={{ color: '#00D4FF', fontWeight: 600 }}>{threshold}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                step="5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#4F7CFF', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input
                type="checkbox"
                id="web-search-toggle"
                checked={enableWebSearch}
                onChange={(e) => setEnableWebSearch(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#4F7CFF', cursor: 'pointer' }}
              />
              <label htmlFor="web-search-toggle" style={{ fontSize: '0.82rem', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Globe size={14} color="#38bdf8" />
                <span>Bật đối soát nguồn trực tuyến (Google Serper API)</span>
              </label>
            </div>
          </div>
        )}

        {/* Selected File Banner if present */}
        {selectedFile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.25)', color: '#818cf8' }}>
                <FileText size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{selectedFile.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB • Sẵn sàng tải lên kiểm tra file
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveFile}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Xóa tệp"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Text Input Area */}
        {!selectedFile && (
          <div style={{ position: 'relative' }}>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (validationError) setValidationError('');
              }}
              placeholder="Dán hoặc nhập nội dung văn bản cần kiểm tra đạo văn vào đây (tối thiểu 15 ký tự)..."
              rows={8}
              style={{
                width: '100%',
                backgroundColor: 'rgba(11, 16, 32, 0.55)',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1rem',
                fontSize: '1rem',
                lineHeight: '1.7',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(79, 124, 255, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            />
          </div>
        )}

        {/* Validation Error Message */}
        {validationError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#f87171',
              fontSize: '0.85rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.25)',
            }}
          >
            <AlertCircle size={16} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Bottom Bar: Stats, File Formats & Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            paddingTop: '0.5rem',
          }}
        >
          {/* Stats & Format Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#0B1020',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Type size={14} color="#818cf8" />
              <span>{wordCount} từ</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#0B1020',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Clock size={14} color="#38bdf8" />
              <span>{readTime} phút đọc</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Hỗ trợ:</span>
              {['PDF', 'DOCX', 'TXT'].map((ext) => (
                <span
                  key={ext}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#94a3b8',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,.txt"
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '12px',
                border: '1px solid rgba(79, 124, 255, 0.3)',
                backgroundColor: 'rgba(21, 28, 47, 0.8)',
                color: '#e2e8f0',
                fontSize: '0.88rem',
                fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Upload size={16} />
              <span>Tải file lên</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.6rem',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #4F7CFF 0%, #8B5CF6 100%)',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 600,
                boxShadow: '0 4px 20px rgba(79, 124, 255, 0.4)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transform: isLoading ? 'none' : 'translateY(0)',
                transition: 'all 0.2s ease',
              }}
            >
              {isLoading ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>Đang phân tích...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Kiểm tra ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default DocumentInput;

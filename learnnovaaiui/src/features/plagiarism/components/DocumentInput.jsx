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
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileUp,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { Lock } from 'lucide-react';
import { uploadService } from '../../../services/uploadService';

export function DocumentInput({ onCheck, isLoading = false, isAuthenticated = true, onRequireAuth }) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseWarning, setParseWarning] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
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
    setFileMeta(null);
    setParseWarning(null);
    setValidationError('');
  };

  const processFile = async (file) => {
    if (!file) return;

    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setValidationError('Định dạng file không hỗ trợ. Vui lòng chọn PDF (.pdf), Word (.docx) hoặc Text (.txt).');
      return;
    }

    if (fileExt === '.doc') {
      setValidationError('Định dạng Word cũ (.doc) không được hỗ trợ trực tiếp. Vui lòng lưu tệp thành .docx hoặc .pdf rồi tải lên.');
      return;
    }

    setValidationError('');
    setParseWarning(null);
    setIsParsingFile(true);

    try {
      const result = await uploadService.uploadAndParseFile(file);

      setSelectedFile(file);
      setFileMeta({
        name: file.name,
        size: file.size,
        format: result.file_format || fileExt.replace('.', ''),
        page_count: result.page_count,
        word_count: result.word_count || (result.extracted_text ? result.extracted_text.split(/\s+/).filter(Boolean).length : 0),
      });

      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }

      const extracted = result.extracted_text || '';
      setText(extracted);

      if (result.warning) {
        setParseWarning(result.warning);
      } else if (!extracted.trim() || extracted.trim().length < 15) {
        setParseWarning('Không thể trích xuất văn bản từ tệp này (có thể là tệp PDF dạng ảnh quét). Vui lòng thử tệp PDF dạng văn bản hoặc file Word.');
      }
    } catch (err) {
      console.error('[DocumentInput parse error]:', err);
      const errMsg = err.response?.data?.detail || err.message || 'Không thể trích xuất nội dung từ tệp đã chọn.';
      setValidationError(errMsg);
      setSelectedFile(null);
      setFileMeta(null);
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading && !isParsingFile) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isLoading || isParsingFile) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileMeta(null);
    setParseWarning(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (isParsingFile) {
      setValidationError('Đang trích xuất nội dung từ tệp, vui lòng chờ trong giây lát...');
      return;
    }

    if (!isAuthenticated) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText || trimmedText.length < 15) {
      setValidationError('Nội dung kiểm tra cần tối thiểu 15 ký tự (vui lòng nhập văn bản hoặc tải tệp có chứa chữ).');
      return;
    }

    onCheck({
      type: 'text',
      text: trimmedText,
      title: title.trim() || selectedFile?.name || 'Văn bản kiểm tra',
      similarity_threshold: threshold / 100,
      enable_web_search: enableWebSearch,
      file: selectedFile,
      fileMeta: fileMeta,
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const getFileBadgeColor = (format) => {
    switch (format?.toLowerCase()) {
      case 'pdf':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      case 'docx':
      case 'doc':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
      default:
        return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%' }}>
      {/* Background Glow Effect */}
      <div
        style={{
          position: 'absolute',
          inset: '-2px',
          background: isDragging
            ? 'linear-gradient(135deg, rgba(79, 124, 255, 0.6), rgba(0, 212, 255, 0.5))'
            : 'linear-gradient(135deg, rgba(79, 124, 255, 0.35), rgba(139, 92, 246, 0.35), rgba(0, 212, 255, 0.2))',
          borderRadius: '24px',
          filter: 'blur(16px)',
          opacity: isDragging ? 0.9 : 0.6,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'all 0.3s ease',
        }}
      />

      {/* Main Container Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          position: 'relative',
          zIndex: 1,
          backgroundColor: '#151C2F',
          borderRadius: '20px',
          border: isDragging ? '2px dashed #4F7CFF' : '1px solid rgba(79, 124, 255, 0.2)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          transition: 'border 0.2s ease',
        }}
      >
        {/* Top Header / Title Input & Settings & Sample Text Button */}
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
              placeholder="Tiêu đề tài liệu / tiểu luận (tự động điền theo tên tệp)..."
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

        {/* Parsing File Indicator */}
        {isParsingFile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              backgroundColor: 'rgba(79, 124, 255, 0.12)',
              border: '1px solid rgba(79, 124, 255, 0.3)',
              color: '#93c5fd',
              fontSize: '0.88rem',
            }}
          >
            <Loader2 size={18} className="animate-spin text-indigo-400" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>Đang trích xuất nội dung từ tệp tài liệu...</span>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Hệ thống đang đọc cấu trúc bảng, đoạn văn và chuyển hóa thành văn bản phân tích.
              </span>
            </div>
          </div>
        )}

        {/* Selected File Banner Card (Extracted info) */}
        {fileMeta && !isParsingFile && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '220px' }}>
              {/* Badge Icon */}
              <div
                style={{
                  padding: '0.55rem',
                  borderRadius: '10px',
                  backgroundColor: getFileBadgeColor(fileMeta.format).bg,
                  border: `1px solid ${getFileBadgeColor(fileMeta.format).border}`,
                  color: getFileBadgeColor(fileMeta.format).text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={22} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.92rem' }}>
                    {fileMeta.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '4px',
                      backgroundColor: getFileBadgeColor(fileMeta.format).bg,
                      color: getFileBadgeColor(fileMeta.format).text,
                      border: `1px solid ${getFileBadgeColor(fileMeta.format).border}`,
                    }}
                  >
                    {fileMeta.format}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                  <span>{formatFileSize(fileMeta.size)}</span>
                  <span>•</span>
                  <span style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} />
                    Đã trích xuất {fileMeta.word_count?.toLocaleString()} từ
                    {fileMeta.page_count ? ` (${fileMeta.page_count} trang)` : ''}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#cbd5e1',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title="Thay đổi tệp khác"
              >
                <RefreshCw size={13} />
                <span>Đổi tệp</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title="Xóa tệp đính kèm"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Warning if PDF is image scanned or no words found */}
        {parseWarning && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              color: '#fbbf24',
              fontSize: '0.85rem',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 600 }}>Cảnh báo trích xuất tài liệu:</div>
              <div style={{ marginTop: '2px', lineHeight: '1.4' }}>{parseWarning}</div>
            </div>
          </div>
        )}

        {/* Text Input Area (Always available so user can view/edit extracted text) */}
        <div style={{ position: 'relative' }}>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (validationError) setValidationError('');
            }}
            placeholder="Dán hoặc nhập nội dung văn bản cần kiểm tra đạo văn vào đây (hoặc kéo thả / bấm 'Tải file lên' để đọc từ Word, PDF)..."
            rows={8}
            disabled={isLoading || isParsingFile}
            style={{
              width: '100%',
              backgroundColor: 'rgba(11, 16, 32, 0.55)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1rem',
              fontSize: '0.98rem',
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

          {isDragging && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                color: '#60a5fa',
                pointerEvents: 'none',
              }}
            >
              <FileUp size={36} className="animate-bounce" />
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>Thả tệp PDF, DOCX hoặc TXT vào đây để đọc nội dung</span>
            </div>
          )}
        </div>

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
              <span style={{ fontWeight: 600, color: wordCount > 0 ? '#f8fafc' : '#94a3b8' }}>
                {wordCount.toLocaleString()} từ
              </span>
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
              <span>~{readTime} phút đọc</span>
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
              accept=".pdf,.docx,.txt"
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  if (onRequireAuth) onRequireAuth();
                  return;
                }
                fileInputRef.current?.click();
              }}
              disabled={isLoading || isParsingFile}
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
                cursor: (isLoading || isParsingFile) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {isParsingFile ? (
                <>
                  <Loader2 size={16} className="animate-spin text-indigo-400" />
                  <span>Đang đọc tệp...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>{fileMeta ? 'Chọn tệp khác' : 'Tải file lên'}</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={isLoading || isParsingFile}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.6rem',
                borderRadius: '12px',
                border: 'none',
                background: !isAuthenticated
                  ? 'linear-gradient(135deg, #475569 0%, #334155 100%)'
                  : 'linear-gradient(135deg, #4F7CFF 0%, #8B5CF6 100%)',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 600,
                boxShadow: !isAuthenticated
                  ? '0 4px 15px rgba(51, 65, 85, 0.3)'
                  : '0 4px 20px rgba(79, 124, 255, 0.4)',
                cursor: (isLoading || isParsingFile) ? 'not-allowed' : 'pointer',
                opacity: (isLoading || isParsingFile) ? 0.7 : 1,
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
              ) : !isAuthenticated ? (
                <>
                  <Lock size={16} />
                  <span>Đăng nhập để Kiểm tra</span>
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

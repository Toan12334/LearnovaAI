import React, { useState, useRef } from 'react';
import { FileUp, FileText, CheckCircle2, AlertCircle, Loader2, X, File, FileCode } from 'lucide-react';
import { uploadService } from '../services/uploadService';

export function FileUploadZone({ onFileParsed, onClearFile, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileMeta, setFileMeta] = useState(null);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
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

    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    setError(null);
    setWarning(null);
    setIsLoading(true);

    try {
      const result = await uploadService.uploadAndParseFile(file);
      setFileMeta(result);
      if (result.warning) {
        setWarning(result.warning);
      }
      if (onFileParsed) {
        onFileParsed(result.extracted_text, result);
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Lỗi xử lý file.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFileMeta(null);
    setError(null);
    setWarning(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onClearFile) onClearFile();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const getBadgeFormat = (format) => {
    switch (format?.toLowerCase()) {
      case 'pdf':
        return { label: 'PDF', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'docx':
        return { label: 'WORD (DOCX)', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'txt':
        return { label: 'TEXT', bg: 'bg-slate-100 text-slate-700 border-slate-300' };
      default:
        return { label: format?.toUpperCase() || 'FILE', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.docx,.txt"
        className="hidden"
      />

      {!fileMeta && !isLoading && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all cursor-pointer select-none ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/70 shadow-lg scale-[1.01]'
              : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs border border-indigo-100/80">
            <FileUp className="w-7 h-7" />
          </div>

          <h4 className="text-sm font-semibold text-slate-800 mb-1">
            Kéo thả tài liệu vào đây hoặc <span className="text-indigo-600 underline underline-offset-2">chọn từ máy tính</span>
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-3">
            Hỗ trợ file văn bản <strong className="text-slate-700">Word (.docx)</strong>, <strong className="text-slate-700">PDF (.pdf)</strong>, và <strong className="text-slate-700">Text (.txt)</strong> (Tối đa 10MB)
          </p>

          <div className="inline-flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              DOCX
            </span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              PDF
            </span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              TXT
            </span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 text-center bg-indigo-50/30">
          <Loader2 className="w-8 h-8 mx-auto mb-3 text-indigo-600 animate-spin" />
          <h4 className="text-sm font-semibold text-slate-800">Đang trích xuất dữ liệu từ file...</h4>
          <p className="text-xs text-slate-500 mt-1">Vui lòng chờ trong giây lát</p>
        </div>
      )}

      {fileMeta && !isLoading && (
        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 text-sm">{fileMeta.filename}</span>
                {fileMeta.file_format && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getBadgeFormat(fileMeta.file_format).bg}`}>
                    {getBadgeFormat(fileMeta.file_format).label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                <span>Dung lượng: {formatFileSize(fileMeta.size_bytes)}</span>
                <span>•</span>
                <span>Từ: {fileMeta.word_count.toLocaleString('vi-VN')}</span>
                <span>•</span>
                <span>Ký tự: {fileMeta.char_count.toLocaleString('vi-VN')}</span>
                {fileMeta.page_count > 1 && (
                  <>
                    <span>•</span>
                    <span>Số trang: {fileMeta.page_count}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mt-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã trích xuất thành công văn bản thô sẵn sàng kiểm tra.</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shrink-0 self-start md:self-center cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Đổi file khác</span>
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Lỗi nạp file:</strong> {error}
          </div>
        </div>
      )}

      {warning && (
        <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Cảnh báo:</strong> {warning}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUploadZone;

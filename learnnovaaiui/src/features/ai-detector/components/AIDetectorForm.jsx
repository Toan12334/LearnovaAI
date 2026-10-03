import { useState } from 'react';
import { Button } from '../../../components/Button';
import { FileUploadZone } from '../../../components/FileUploadZone';
import { Sparkles, FileText, Trash2, ArrowRight, FileUp, Edit3 } from 'lucide-react';

export function AIDetectorForm({ onAnalyze, isLoading = false }) {
  const [inputMode, setInputMode] = useState('text'); // 'text' | 'upload'
  const [text, setText] = useState('');
  const [sourceFile, setSourceFile] = useState(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim().length < 50) return;
    onAnalyze({ text, language: 'auto', sourceFile });
  };

  const handleSampleAI = () => {
    setInputMode('text');
    setSourceFile(null);
    setText(
      'Nhà em có nuôi một chú chó rất đáng yêu tên là Mít. Mít có bộ lông màu vàng óng, mềm mượt như một chiếc áo nhỏ lúc nào cũng sạch sẽ. Đôi mắt chú đen tròn, long lanh và lúc nào cũng nhìn mọi người như muốn trò chuyện. Hai chiếc tai lúc nào cũng vểnh lên mỗi khi nghe thấy tiếng động lạ. Chiếc mũi đen bóng và rất thính, chỉ cần nghe tiếng xe của bố từ ngoài cổng là Mít đã chạy ra đón. Bốn chân chú chắc khỏe, dưới bàn chân có những lớp đệm thịt mềm giúp chú chạy nhảy rất nhanh.'
    );
  };

  const handleClear = () => {
    setText('');
    setSourceFile(null);
  };

  const handleFileParsed = (extractedText, fileMetadata) => {
    setText(extractedText);
    setSourceFile({
      filename: fileMetadata.filename,
      file_format: fileMetadata.file_format,
      size_bytes: fileMetadata.size_bytes,
      page_count: fileMetadata.page_count,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setInputMode('text')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              inputMode === 'text'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Nhập / Dán văn bản</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              inputMode === 'upload'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileUp className="w-3.5 h-3.5 text-indigo-500" />
            <span>Tải file Word / PDF / TXT</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSampleAI}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200/80 hover:bg-purple-100 hover:border-purple-300 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Mẫu AI</span>
          </button>

          {text && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      {inputMode === 'upload' && (
        <FileUploadZone
          onFileParsed={handleFileParsed}
          onClearFile={handleClear}
          disabled={isLoading}
        />
      )}

      {/* Text Area Input / Preview */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5 text-xs text-slate-500 font-medium">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Nội dung văn bản phân tích {sourceFile ? `(từ file ${sourceFile.filename})` : ''}:</span>
          </label>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            inputMode === 'upload'
              ? 'Nội dung trích xuất từ file Word/PDF sẽ hiển thị tại đây...'
              : 'Nhập hoặc dán đoạn văn bản nghi ngờ do ChatGPT, Claude, Gemini hoặc DeepSeek tạo ra tại đây...'
          }
          rows={7}
          className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 font-normal text-sm leading-relaxed resize-y focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
        />

        <div className="flex items-center justify-between mt-2 text-xs font-medium text-slate-500 px-1">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">{wordCount} từ</span>
            <span>·</span>
            <span>{charCount} ký tự</span>
          </div>
          <div>
            {charCount < 50 ? (
              <span className="text-amber-600 font-semibold">Tối thiểu 50 ký tự ({50 - charCount} ký tự còn lại)</span>
            ) : (
              <span className="text-emerald-600 font-semibold">✓ Đủ điều kiện phân tích</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-500 font-medium">
          Mô hình PhoBERT AI Detector phân tích ngữ cảnh theo từng đoạn 2-3 câu.
        </span>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          disabled={text.trim().length < 50}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Nhận diện AI Generated
        </Button>
      </div>
    </form>
  );
}

export default AIDetectorForm;

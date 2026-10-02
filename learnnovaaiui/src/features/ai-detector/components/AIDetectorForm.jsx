import { useState } from 'react';
import { Button } from '../../../components/Button';
import { Sparkles, FileText, Trash2, ArrowRight } from 'lucide-react';

export function AIDetectorForm({ onAnalyze, isLoading = false }) {
  const [text, setText] = useState('');
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim().length < 50) return;
    onAnalyze({ text, language: 'auto' });
  };

  const handleSampleAI = () => {
    setText(
      'Nhà em có nuôi một chú chó rất đáng yêu tên là Mít. Mít có bộ lông màu vàng óng, mềm mượt như một chiếc áo nhỏ lúc nào cũng sạch sẽ. Đôi mắt chú đen tròn, long lanh và lúc nào cũng nhìn mọi người như muốn trò chuyện. Hai chiếc tai lúc nào cũng vểnh lên mỗi khi nghe thấy tiếng động lạ. Chiếc mũi đen bóng và rất thính, chỉ cần nghe tiếng xe của bố từ ngoài cổng là Mít đã chạy ra đón. Bốn chân chú chắc khỏe, dưới bàn chân có những lớp đệm thịt mềm giúp chú chạy nhảy rất nhanh.'
    );
  };

  const handleClear = () => {
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Nhập hoặc dán văn bản tiếng Việt cần kiểm tra:</span>
        </label>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSampleAI}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200/80 hover:bg-purple-100 hover:border-purple-300 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Dán mẫu văn bản AI</span>
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

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập hoặc dán đoạn văn bản nghi ngờ do ChatGPT, Claude, Gemini hoặc DeepSeek tạo ra tại đây..."
          rows={8}
          className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 font-normal text-base leading-relaxed resize-y focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
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

import { useState } from 'react';
import { DocumentInput } from './components/DocumentInput';
import { PlagiarismReportView } from './components/PlagiarismReportView';
import { TimestampAudit } from './components/TimestampAudit';
import { plagiarismApi } from '../../services/plagiarismApi';
import { uploadService } from '../../services/uploadService';
import { historyService } from '../../services/historyService';
import { useAuth } from '../auth';
import { AlertCircle, RefreshCw, X, Lock, Zap } from 'lucide-react';

export function PlagiarismChecker({ onOpenAuth }) {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [originalText, setOriginalText] = useState('');
  const [auditSource, setAuditSource] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const { user, isAuthenticated, updateWordsBalance } = useAuth();

  const handleRequireAuth = () => {
    if (onOpenAuth) {
      onOpenAuth('signin');
    } else {
      window.dispatchEvent(new CustomEvent('learnova:auth-required'));
    }
  };

  const handleCheck = async (payload) => {
    if (!isAuthenticated || !user) {
      handleRequireAuth();
      return;
    }

    setIsLoading(true);
    setApiError(null);
    setAuditSource(null);
    setProgressPercentage(10);
    setStatusMessage('Đang kết nối API Backend và khởi tạo tác vụ...');

    try {
      let res;
      let checkTitle = payload.title || 'Văn bản kiểm tra';
      let fullContent = (payload.text || '').trim();

      // Trường hợp gửi file mà chưa có text (fallback tự động parse)
      if (!fullContent && payload.file) {
        setStatusMessage('Đang tải file lên và trích xuất nội dung văn bản...');
        setProgressPercentage(20);
        const parsed = await uploadService.uploadAndParseFile(payload.file);
        fullContent = (parsed.extracted_text || '').trim();
        checkTitle = payload.file.name;
        if (!fullContent || fullContent.length < 15) {
          throw new Error(parsed.warning || 'Nội dung file quá ngắn hoặc không trích xuất được văn bản (có thể là file PDF ảnh scan).');
        }
      }

      if (!fullContent || fullContent.length < 15) {
        throw new Error('Nội dung văn bản cần tối thiểu 15 ký tự để tiến hành đối soát.');
      }

      // Lưu trữ văn bản gốc trọn vẹn để hiển thị trên Báo cáo và Modal Diff
      setOriginalText(fullContent);

      setStatusMessage('Đang khởi tạo tác vụ kiểm tra ngầm (Background Task)...');
      setProgressPercentage(30);

      const initRes = await plagiarismApi.checkTextAsync({
        text: fullContent,
        title: checkTitle,
        enable_web_search: payload.enable_web_search,
        similarity_threshold: payload.similarity_threshold,
      });

      const docId = initRes.document_id;
      let pollRes = initRes;
      let attempts = 0;
      const maxAttempts = 120; // 120 * 1.5s = 3 minutes timeout safety

      while (pollRes.status === 'processing' && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        attempts += 1;
        pollRes = await plagiarismApi.getStatus(docId);
        if (pollRes) {
          if (pollRes.current_step) {
            setStatusMessage(pollRes.current_step);
          }
          if (typeof pollRes.progress_percentage === 'number') {
            setProgressPercentage(pollRes.progress_percentage);
          }
        }
      }

      if (pollRes.status === 'failed') {
        throw new Error(pollRes.current_step || 'Quá trình đối soát ngầm gặp lỗi.');
      }

      res = pollRes;
      setProgressPercentage(100);

      setReport(res);
      setStatusMessage('');

      // Auto save to user history
      const plagScore = res.plagiarism_score ?? 0;
      const checkDocId = res.document_id || `PLAG-${Date.now().toString().slice(-6)}`;
      historyService.saveCheckResult(
        {
          id: checkDocId,
          document_id: res.document_id || null,
          type: 'plagiarism',
          title: checkTitle,
          author: user ? (user.full_name || user.email) : 'Khách',
          score: plagScore,
          status: plagScore >= 50 ? 'Trùng lặp cao' : plagScore >= 20 ? 'Cần xem xét' : 'Độc bản an toàn',
          sourcesCount: res.matches ? res.matches.length : 0,
          result: res,
        },
        user?.id
      );

      // Cập nhật số dư từ tức thì trên giao diện
      if (updateWordsBalance && user?.words_balance) {
        const usedWords = res.word_count || (payload.text ? payload.text.trim().split(/\s+/).length : 0);
        updateWordsBalance(Math.max(0, user.words_balance - usedWords));
      }

    } catch (err) {
      console.error('[PlagiarismChecker Error]:', err);
      setApiError(
        err.message || 'Không thể kiểm tra đạo văn. Vui lòng kiểm tra lại kết nối đến máy chủ Backend.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setReport(null);
    setAuditSource(null);
    setApiError(null);
    setProgressPercentage(0);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* Auth Gate Banner for unauthenticated visitors */}
      {!isAuthenticated && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                Yêu cầu đăng nhập để khởi chạy kiểm tra
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-400/30">
                  Tặng 5.000 từ
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Đăng nhập để đối soát toàn văn, lưu lịch sử và tra cứu nguồn gốc tri thức tự động.
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
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:brightness-110 transition-all cursor-pointer shadow-sm text-center"
            >
              Đăng ký miễn phí
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {apiError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900 mb-1">
                Lỗi xử lý API Kiểm tra Đạo văn:
              </h4>
              <p className="text-sm font-medium leading-relaxed">{apiError}</p>
              {apiError.toLowerCase().includes('số dư') && (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('learnova:pricing-required'))}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Nạp thêm gói từ ngay qua VietQR</span>
                </button>
              )}
              {import.meta.env.DEV ? (
                <p className="text-xs text-rose-600/80 mt-2 font-medium">
                  💡 Hãy đảm bảo FastAPI Backend đang chạy tại <code className="bg-rose-100 px-1.5 py-0.5 rounded font-mono text-rose-900">http://localhost:8000</code>.
                </p>
              ) : (
                <p className="text-xs text-rose-600/80 mt-2 font-medium">
                  💡 Vui lòng kiểm tra lại đường truyền mạng hoặc thử lại sau ít phút.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-rose-100/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Banner with step info and animated progress bar */}
      {isLoading && (
        <div className="p-5 rounded-2xl bg-white/95 border border-indigo-100 shadow-xl shadow-indigo-500/10 backdrop-blur flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
              <span className="text-sm font-bold text-slate-800">
                {statusMessage || 'Đang thực thi quy trình kiểm tra đạo văn...'}
              </span>
            </div>
            {progressPercentage > 0 && (
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                {progressPercentage}%
              </span>
            )}
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(8, progressPercentage)}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Content: Document Input or Analysis Report */}
      {!report ? (
        <DocumentInput
          onCheck={handleCheck}
          isLoading={isLoading}
          isAuthenticated={isAuthenticated}
          onRequireAuth={handleRequireAuth}
        />
      ) : (
        <PlagiarismReportView
          report={report}
          originalText={originalText}
          onBack={handleBack}
          onAuditTimestamp={(source) => setAuditSource(source)}
        />
      )}

      {/* Timestamp Audit Modal / Section */}
      {auditSource && (
        <div className="mt-4">
          <TimestampAudit
            source={auditSource}
            onClose={() => setAuditSource(null)}
          />
        </div>
      )}
    </div>
  );
}

export default PlagiarismChecker;

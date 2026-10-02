import React, { useState } from 'react';
import { DocumentInput } from './components/DocumentInput';
import { PlagiarismReportView } from './components/PlagiarismReportView';
import { TimestampAudit } from './components/TimestampAudit';
import { plagiarismApi } from '../../services/plagiarismApi';
import { historyService } from '../../services/historyService';
import { useAuth } from '../auth';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export function PlagiarismChecker() {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [originalText, setOriginalText] = useState('');
  const [auditSource, setAuditSource] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const { user } = useAuth();

  const handleCheck = async (payload) => {
    setIsLoading(true);
    setApiError(null);
    setAuditSource(null);
    setStatusMessage('Đang kết nối API Backend và gửi văn bản...');

    try {
      let res;
      let checkTitle = 'Văn bản kiểm tra';
      if (payload.type === 'file') {
        setStatusMessage('Đang tải file lên và trích xuất nội dung văn bản...');
        res = await plagiarismApi.checkDocument(payload.file);
        checkTitle = payload.file.name;
        setOriginalText(`[Tệp đính kèm: ${payload.file.name} - ${(payload.file.size / 1024).toFixed(1)} KB]`);
      } else {
        setStatusMessage('Đang thực thi pipeline 6 bước (Tách câu, Embeddings, Quét Qdrant & Serper)...');
        res = await plagiarismApi.checkText({
          text: payload.text,
          title: payload.title,
          enable_web_search: payload.enable_web_search,
          similarity_threshold: payload.similarity_threshold,
        });
        checkTitle = payload.title || payload.text.slice(0, 50) + '...';
        setOriginalText(payload.text);
      }

      setReport(res);
      setStatusMessage('');

      // Auto save to user history
      const plagScore = res.plagiarism_score ?? 0;
      historyService.saveCheckResult(
        {
          id: res.document_id ? `PLAG-${res.document_id.slice(-6)}` : `PLAG-${Date.now().toString().slice(-6)}`,
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
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
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
              <p className="text-xs text-rose-600/80 mt-2 font-medium">
                💡 Hãy đảm bảo FastAPI Backend đang chạy tại <code className="bg-rose-100 px-1.5 py-0.5 rounded font-mono text-rose-900">http://localhost:8000</code>.
              </p>
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

      {/* Loading Banner with step info */}
      {isLoading && (
        <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-indigo-900 flex items-center gap-3 shadow-md shadow-indigo-500/5">
          <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
          <span className="text-sm font-semibold">
            {statusMessage || 'Đang thực thi quy trình kiểm tra đạo văn...'}
          </span>
        </div>
      )}

      {/* Main Content: Document Input or Analysis Report */}
      {!report ? (
        <DocumentInput onCheck={handleCheck} isLoading={isLoading} />
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

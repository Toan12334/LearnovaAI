import React, { useState } from 'react';
import { DocumentInput } from './components/DocumentInput';
import { PlagiarismReportView } from './components/PlagiarismReportView';
import { TimestampAudit } from './components/TimestampAudit';
import { plagiarismApi } from '../../services/plagiarismApi';
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export function PlagiarismChecker() {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [originalText, setOriginalText] = useState('');
  const [auditSource, setAuditSource] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const handleCheck = async (payload) => {
    setIsLoading(true);
    setApiError(null);
    setAuditSource(null);
    setStatusMessage('Đang kết nối API Backend và gửi văn bản...');

    try {
      let res;
      if (payload.type === 'file') {
        setStatusMessage('Đang tải file lên và trích xuất nội dung văn bản...');
        res = await plagiarismApi.checkDocument(payload.file);
        setOriginalText(`[Tệp đính kèm: ${payload.file.name} - ${(payload.file.size / 1024).toFixed(1)} KB]`);
      } else {
        setStatusMessage('Đang thực thi pipeline 6 bước (Tách câu, Embeddings, Quét Qdrant & Serper)...');
        res = await plagiarismApi.checkText({
          text: payload.text,
          title: payload.title,
          enable_web_search: payload.enable_web_search,
          similarity_threshold: payload.similarity_threshold,
        });
        setOriginalText(payload.text);
      }

      setReport(res);
      setStatusMessage('');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Error Banner if any */}
      {apiError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            color: '#fca5a5',
          }}
        >
          <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#f87171', marginBottom: '0.2rem' }}>
              Lỗi xử lý API Kiểm tra Đạo văn:
            </div>
            <div style={{ fontSize: '0.88rem', lineHeight: '1.5' }}>{apiError}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              💡 Mẹo: Hãy đảm bảo FastAPI Backend đang chạy tại <code style={{ color: '#818cf8' }}>http://localhost:8000</code> với lệnh <code style={{ color: '#818cf8' }}>uvicorn src.main:app --port 8000</code>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setApiError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1.1rem',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading Banner with step info */}
      {isLoading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            backgroundColor: 'rgba(79, 124, 255, 0.1)',
            border: '1px solid rgba(79, 124, 255, 0.3)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            color: '#cbd5e1',
          }}
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              border: '2.5px solid rgba(79, 124, 255, 0.2)',
              borderTopColor: '#4F7CFF',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              flexShrink: 0,
            }}
          />
          <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
            {statusMessage || 'Đang phân tích kiểm tra đạo văn...'}
          </div>
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
        <div style={{ marginTop: '1rem' }}>
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

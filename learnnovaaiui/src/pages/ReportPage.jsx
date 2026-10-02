import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { formatDate } from '../utils/formatDate';
import { historyService } from '../services/historyService';
import { useAuth } from '../features/auth';
import { AIDetectorResult } from '../features/ai-detector/components/AIDetectorResult';
import { PlagiarismReportView } from '../features/plagiarism/components/PlagiarismReportView';
import { ArrowLeft, Printer, Download, Bot, Search, Calendar, User, FileText } from 'lucide-react';

export function ReportPage({ reportId = 'REP-2026-001', onBack }) {
  const { user } = useAuth();
  const [historyItem, setHistoryItem] = useState(null);

  useEffect(() => {
    const history = historyService.getHistory(user?.id);
    const found = history.find((h) => h.id === reportId);
    if (found) {
      setHistoryItem(found);
    } else {
      // Fallback default sample if not found in history
      setHistoryItem({
        id: reportId,
        type: reportId.startsWith('AI') ? 'ai_detection' : 'plagiarism',
        title: 'Báo cáo kiểm tra tài liệu mẫu',
        author: user ? (user.full_name || user.email) : 'Người dùng',
        date: new Date().toISOString(),
        score: 68.0,
        result: null,
      });
    }
  }, [reportId, user]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    if (!historyItem) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(historyItem, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${historyItem.id}_report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!historyItem) return null;

  const isAI = historyItem.type === 'ai_detection';

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={onBack}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Quay lại Lịch sử
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5" />}
          >
            In báo cáo
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handleDownloadJSON}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Tải File JSON
          </Button>
        </div>
      </div>

      {/* Main Report Card Container */}
      <Card
        title={`Báo Cáo Kiểm Định: ${historyItem.id}`}
        subtitle={`Người thực hiện: ${historyItem.author} • Thời gian: ${formatDate(historyItem.date)}`}
        badge={
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isAI
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}
          >
            {isAI ? <Bot className="w-3.5 h-3.5 text-purple-600" /> : <Search className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{isAI ? 'PhoBERT AI Detection Result' : 'Plagiarism Audit Result'}</span>
          </span>
        }
      >
        <div className="flex flex-col gap-6">
          
          {/* Document Title Header */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-lg font-bold text-slate-800 mb-1">
              {historyItem.title}
            </h4>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {historyItem.author}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDate(historyItem.date)}
              </span>
            </div>
          </div>

          {/* Render corresponding form/result view */}
          {isAI ? (
            historyItem.result ? (
              <AIDetectorResult result={historyItem.result} />
            ) : (
              <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                Không tìm thấy dữ liệu chi tiết cho lượt check PhoBERT này.
              </div>
            )
          ) : (
            historyItem.result ? (
              <PlagiarismReportView
                report={historyItem.result}
                originalText={historyItem.title}
                onBack={onBack}
              />
            ) : (
              <div className="p-6 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm">
                Đang hiển thị báo cáo đối soát kiểm tra đạo văn cho mã <strong>{historyItem.id}</strong>. Điểm số trùng lặp ghi nhận: <strong>{historyItem.score}%</strong>.
              </div>
            )
          )}

        </div>
      </Card>
    </div>
  );
}

export default ReportPage;

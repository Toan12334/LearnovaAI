import React, { useState, useEffect } from "react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { formatDate } from "../utils/formatDate";
import { historyService } from "../services/historyService";
import { useAuth } from "../features/auth";
import { AIDetectorResult } from "../features/ai-detector/components/AIDetectorResult";
import { PlagiarismReportView } from "../features/plagiarism/components/PlagiarismReportView";
import { ArrowLeft, Printer, Download, Bot, Search, Calendar, User } from "lucide-react";

import plagiarismApi from "../services/plagiarismApi";

export function ReportPage({ reportId = "REP-2026-001", onBack }) {
  const { user } = useAuth();
  const [historyItem, setHistoryItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, user?.id]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const history = historyService.getHistory(user?.id);
      let found = history.find(
        (h) => h.id === reportId || h.document_id === reportId || (h.id?.startsWith("PLAG-") && reportId.endsWith(h.id.replace("PLAG-", "")))
      );

      // If no local result or missing matches, attempt fetching from backend API
      if (!found || !found.result || !found.result.matches) {
        try {
          const lookupId = found?.document_id || reportId;
          const data = await plagiarismApi.getReportById(lookupId);
          if (data && data.document) {
            const doc = data.document || {};
            const dbMatches = data.matches || [];

            const resultPayload = doc.result_payload || {
              document_id: doc.id || reportId,
              title: doc.title || "Văn bản kiểm tra",
              word_count: doc.word_count || 0,
              total_chunks: data.total_chunks || doc.total_chunks || 0,
              matched_chunks_count: doc.matched_chunks_count || dbMatches.length,
              plagiarism_score: doc.plagiarism_score || 0,
              exact_match_score: doc.exact_match_score || 0,
              paraphrase_score: doc.paraphrase_score || 0,
              coverage_percentage: doc.coverage_percentage,
              coverage_text: doc.coverage_text,
              warning: doc.warning,
              status: doc.status || "completed",
              matches: dbMatches,
              matches_count: dbMatches.length,
            };

            const apiItem = {
              id: doc.id || reportId,
              document_id: doc.id || reportId,
              type: doc.type || (doc.ai_score != null && doc.ai_score > 0 ? "ai_detection" : "plagiarism"),
              title: doc.title || "Văn bản kiểm tra",
              author: user ? (user.full_name || user.email) : "Người dùng",
              date: doc.created_at || new Date().toISOString(),
              score: Math.round(doc.plagiarism_score ?? 0),
              status: doc.status || ((doc.plagiarism_score ?? 0) >= 50 ? "Trùng lặp cao" : (doc.plagiarism_score ?? 0) >= 20 ? "Cần xem xét" : "Độc bản an toàn"),
              sourcesCount: dbMatches.length,
              result: resultPayload,
              user_id: user?.id,
            };

            found = found ? { ...found, result: resultPayload, author: apiItem.author, sourcesCount: dbMatches.length } : apiItem;
            historyService.saveCheckResult(found, user?.id);
          }
        } catch (apiErr) {
          console.warn("Không thể tải báo cáo từ API:", apiErr);
        }
      }

      if (found) {
        if (!found.author || found.author === "Người dùng" || found.author === "Khách") {
          found = { ...found, author: user ? (user.full_name || user.email || "Người dùng") : "Khách" };
        }
        setHistoryItem(found);
      } else {
        setHistoryItem({
          id: reportId,
          document_id: reportId,
          type: reportId.startsWith("AI") ? "ai_detection" : "plagiarism",
          title: "Báo cáo kiểm tra tài liệu",
          author: user ? (user.full_name || user.email) : "Người dùng",
          date: new Date().toISOString(),
          score: 0,
          result: null,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleDownloadJSON = () => {
    if (!historyItem) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(historyItem, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `${historyItem.id}_report.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Đang tải báo cáo...</p>
        </div>
      </div>
    );
  }

  if (!historyItem) return null;

  const isAI = historyItem.type === "ai_detection";

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <Button size="sm" variant="secondary" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Quay lại Lịch sử
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} icon={<Printer className="w-3.5 h-3.5" />}>
            In báo cáo
          </Button>
          <Button size="sm" variant="primary" onClick={handleDownloadJSON} icon={<Download className="w-3.5 h-3.5" />}>
            Tải File JSON
          </Button>
        </div>
      </div>

      <Card
        title={`Báo Cáo Kiểm Định: ${historyItem.id}`}
        subtitle={`Người thực hiện: ${historyItem.author} • Thời gian: ${formatDate(historyItem.date)}`}
        badge={
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isAI ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
            {isAI ? <Bot className="w-3.5 h-3.5 text-purple-600" /> : <Search className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{isAI ? "PhoBERT AI Detection Result" : "Plagiarism Audit Result"}</span>
          </span>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-lg font-bold text-slate-800 mb-1">{historyItem.title}</h4>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" />{historyItem.author}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />{formatDate(historyItem.date)}</span>
            </div>
          </div>

          {isAI ? (
            historyItem.result ? (
              <AIDetectorResult result={historyItem.result} />
            ) : (
              <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                Không tìm thấy dữ liệu phân tích chi tiết cho lượt kiểm tra PhoBERT này.
              </div>
            )
          ) : historyItem.result ? (
            <PlagiarismReportView report={historyItem.result} originalText={historyItem.result?.original_text || historyItem.title} onBack={onBack} />
          ) : (
            <div className="p-6 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm flex flex-col gap-3">
              <p>Báo cáo đối soát kiểm tra đạo văn cho mã <strong>{historyItem.id}</strong>.</p>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="p-3 bg-white rounded-lg border border-indigo-100">
                  <div className="text-xs text-indigo-500 font-semibold mb-1">Điểm trùng lặp</div>
                  <div className="text-2xl font-black text-indigo-700">{historyItem.score}%</div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-indigo-100">
                  <div className="text-xs text-indigo-500 font-semibold mb-1">Trạng thái</div>
                  <div className="text-sm font-bold text-slate-700">{historyItem.score >= 50 ? "⚠️ Cần xem xét" : "✅ An toàn"}</div>
                </div>
              </div>
              <p className="text-xs text-indigo-600 mt-1">Dữ liệu chi tiết sẽ có ở các lượt check tiếp theo sau khi hệ thống cập nhật.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ReportPage;

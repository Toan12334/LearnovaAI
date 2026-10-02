import React from 'react';
import { ShieldAlert, ShieldCheck, HelpCircle, Layers, Clock, Cpu } from 'lucide-react';

export function AIDetectorResult({ result }) {
  if (!result) return null;

  const {
    ai_probability: aiProbability = 0,
    statistical_score_percentage: statisticalScorePercentage = 0,
    ai_generated_percentage: aiGeneratedPercentage,
    human_written_percentage: humanWrittenPercentage,
    sentence_heatmap: sentenceHeatmap = [],
    total_chunks: totalChunks = 0,
    processing_time_ms: processingTimeMs = 0,
    model_health: modelHealth = {},
    summary = '',
  } = result;

  const isReliable = modelHealth.is_reliable !== false;
  const aiPercent = aiGeneratedPercentage ?? (aiProbability === null ? null : Math.round(aiProbability * 100));
  const humanPercent = humanWrittenPercentage ?? (aiPercent === null ? null : Math.round((100 - aiPercent) * 100) / 100);
  const isLikelyAI = isReliable && (aiPercent !== null ? aiPercent >= 50 : aiProbability >= 0.5);
  const isMixed = isReliable && (aiPercent !== null ? aiPercent >= 20 && aiPercent < 50 : aiProbability >= 0.2 && aiProbability < 0.5);

  const formatPercent = (score) => score === null || score === undefined ? '—' : `${Math.round(score * 100)}%`;

  const verdict = !isReliable
    ? {
        title: 'Chưa thể kết luận tác giả',
        colorClass: 'text-slate-700',
        bgClass: 'bg-slate-50 border-slate-200',
        badgeBg: 'bg-slate-200 text-slate-700',
        icon: <HelpCircle className="w-8 h-8 text-slate-500" />,
      }
    : isLikelyAI
    ? {
        title: 'Tín hiệu AI Cao (PhoBERT AI)',
        colorClass: 'text-rose-700',
        bgClass: 'bg-gradient-to-br from-rose-50/90 via-pink-50/50 to-rose-50/30 border-rose-200/90 shadow-md shadow-rose-500/5',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
        icon: <ShieldAlert className="w-8 h-8 text-rose-600" />,
      }
    : isMixed
    ? {
        title: 'Nội dung có thể được AI hỗ trợ',
        colorClass: 'text-amber-700',
        bgClass: 'bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-50/30 border-amber-200/90 shadow-md shadow-amber-500/5',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: <HelpCircle className="w-8 h-8 text-amber-600" />,
      }
    : {
        title: 'Văn bản do Người viết',
        colorClass: 'text-emerald-700',
        bgClass: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-emerald-50/30 border-emerald-200/90 shadow-md shadow-emerald-500/5',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: <ShieldCheck className="w-8 h-8 text-emerald-600" />,
      };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Primary Verdict Banner */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 rounded-2xl border ${verdict.bgClass} transition-all`}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-white/80 shadow-sm border border-slate-200/60 shrink-0">
            {verdict.icon}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Kết quả PhoBERT AI Detector
            </div>
            <h3 className={`text-2xl font-black mt-0.5 tracking-tight ${verdict.colorClass}`}>
              {verdict.title}
            </h3>
            {summary && (
              <p className="mt-2 text-sm text-slate-600 font-medium leading-relaxed max-w-xl">
                {summary}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className={`text-4xl font-black leading-none ${verdict.colorClass}`}>
            {aiPercent === null ? '—' : `${aiPercent}%`}
          </div>
          <div className="text-xs font-bold text-slate-500 mt-1.5">
            Xác suất AI do PhoBERT đánh giá
          </div>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Tỷ lệ AI
          </span>
          <div className="text-2xl font-black text-rose-600 mt-2">
            {aiPercent === null ? '—' : `${aiPercent}%`}
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, aiPercent || 0))}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Tỷ lệ Người viết
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {humanPercent === null ? '—' : `${humanPercent}%`}
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, humanPercent || 0))}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Xác suất tổng thể
          </span>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {statisticalScorePercentage}%
          </div>
          <span className="text-[11px] font-semibold text-slate-400 mt-2 truncate flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-400" />
            {modelHealth.model_name || 'toanoppa10012004/phobert-vietnamese-ai-detector'}
          </span>
        </div>

      </div>

      {/* Info Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span>Đã phân tích <strong>{sentenceHeatmap.length}</strong> đoạn (gộp 2-3 câu mỗi khối).</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>Thời gian phản hồi: <strong>{(processingTimeMs / 1000).toFixed(2)}s</strong></span>
        </div>
      </div>

      {/* Passage Heatmap Section */}
      {sentenceHeatmap.length > 0 && (
        <div className="mt-2">
          <h4 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span>Bản đồ nhiệt theo đoạn 2-3 câu (PhoBERT Analysis):</span>
          </h4>
          
          <div className="flex flex-col gap-3">
            {sentenceHeatmap.map((item) => {
              const isAiSentence = item.is_ai === true;
              const isUnknown = item.is_ai === null;

              return (
                <div
                  key={item.sentence_index}
                  className={`p-4 rounded-xl border text-sm leading-relaxed transition-all ${
                    isAiSentence
                      ? 'bg-rose-50/70 border-rose-200/90 text-rose-950 border-l-4 border-l-rose-500'
                      : 'bg-emerald-50/40 border-emerald-200/80 text-emerald-950 border-l-4 border-l-emerald-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 bg-white/80 px-2.5 py-0.5 rounded-md border border-slate-200/60">
                      {item.sentence_range || `Đoạn #${item.sentence_index + 1}`}
                    </span>
                    
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        isUnknown
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : isAiSentence
                          ? 'bg-rose-100 text-rose-700 border-rose-300'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      }`}
                    >
                      {isUnknown ? 'Chưa kết luận' : `${formatPercent(item.ai_score)} AI`}
                    </span>
                  </div>
                  
                  <div className="font-normal text-slate-800 leading-relaxed">
                    {item.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

export default AIDetectorResult;

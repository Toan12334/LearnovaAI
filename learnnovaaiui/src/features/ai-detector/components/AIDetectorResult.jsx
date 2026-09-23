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
  const humanPercent = humanWrittenPercentage ?? (aiPercent === null ? null : 100 - aiPercent);
  const isLikelyAI = isReliable && aiProbability >= 0.5;
  const isMixed = isReliable && aiProbability >= 0.2 && aiProbability < 0.5;
  const formatPercent = (score) => score === null || score === undefined ? '—' : `${Math.round(score * 100)}%`;
  const verdict = !isReliable
    ? { text: 'Chưa thể kết luận — cần hiệu chỉnh checkpoint', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' }
    : isLikelyAI
    ? { text: 'Tín hiệu AI thống kê cao', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
    : isMixed
      ? { text: 'Nội dung có thể được AI hỗ trợ chỉnh sửa', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }
      : { text: 'Nội dung có dấu hiệu do người viết', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', borderRadius: '12px', backgroundColor: verdict.bg, border: `1px solid ${verdict.color}40` }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase' }}>Kết quả thống kê</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: verdict.color, marginTop: '4px' }}>{verdict.text}</div>
          {summary && <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', maxWidth: '42rem' }}>{summary}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: verdict.color, lineHeight: 1 }}>{aiPercent === null ? '—' : `${aiPercent}%`}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>Tỷ lệ AI có thể kết luận</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1.25rem', borderRadius: '12px', background: 'var(--settings-bg, rgba(255, 255, 255, 0.03))', border: '1px solid var(--border, #2e303a)' }}>
        <div><span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Tỷ lệ AI</span><div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>{aiPercent === null ? '—' : `${aiPercent}%`}</div></div>
        <div><span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Tỷ lệ người viết</span><div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>{humanPercent === null ? '—' : `${humanPercent}%`}</div></div>
        <div><span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Tỷ lệ câu vượt ngưỡng</span><div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>{statisticalScorePercentage}%</div><span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Kết hợp Perplexity và Burstiness</span></div>
      </div>

      {!isReliable && <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', color: '#e2e8f0', background: 'rgba(148, 163, 184, 0.12)', border: '1px solid rgba(148, 163, 184, 0.4)' }}>
        {modelHealth.warnings?.join(' ') || 'Kết quả thống kê không đủ tin cậy để kết luận tác giả.'}
      </div>}

      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)' }}>Đã phân tích {totalChunks} chunk trong {(processingTimeMs / 1000).toFixed(2)} giây.</div>

      {sentenceHeatmap.length > 0 && <div>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Điểm thống kê theo câu:</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sentenceHeatmap.map((item) => {
            const isAiSentence = item.is_ai === true;
            const isUnknown = item.is_ai === null;
            return <div key={item.sentence_index} style={{ padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.6', backgroundColor: isAiSentence ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.03)', borderLeft: `4px solid ${isAiSentence ? '#ef4444' : '#10b981'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9ca3af)' }}>Câu #{item.sentence_index + 1}</span><span style={{ fontSize: '0.75rem', fontWeight: 600, color: isUnknown ? '#94a3b8' : isAiSentence ? '#ef4444' : '#10b981' }}>{isUnknown ? 'Chưa kết luận' : `${formatPercent(item.ai_score)} AI`}</span></div>
              <div>{item.text}</div>
            </div>;
          })}
        </div>
      </div>}
    </div>
  );
}

export default AIDetectorResult;

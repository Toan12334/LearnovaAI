import React from 'react';

export function AIDetectorResult({ result }) {
  if (!result) return null;

  const {
    aiProbability = 0,
    humanProbability = 100,
    perplexityScore = 18.4,
    burstinessScore = 22.1,
    classification = 'AI_GENERATED',
    sentenceAnalysis = [],
  } = result;

  const isLikelyAI = aiProbability >= 60;
  const isMixed = aiProbability >= 35 && aiProbability < 60;

  const getVerdictLabel = () => {
    if (isLikelyAI) return { text: 'Khả năng cao do AI tạo (AI-Generated)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    if (isMixed) return { text: 'Nội dung có thể do AI hỗ trợ chỉnh sửa (Mixed Content)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    return { text: 'Nội dung thuần tự nhiên do người viết (Human Written)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
  };

  const verdict = getVerdictLabel();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Verdict banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: verdict.bg,
          border: `1px solid ${verdict.color}40`,
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase' }}>
            Kết luận tổng quát
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: verdict.color, marginTop: '4px' }}>
            {verdict.text}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: verdict.color, lineHeight: 1 }}>
            {aiProbability}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
            Xác suất AI
          </div>
        </div>
      </div>

      {/* Probability Bars and Linguistic Signals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          padding: '1.25rem',
          borderRadius: '12px',
          background: 'var(--settings-bg, rgba(255, 255, 255, 0.03))',
          border: '1px solid var(--border, #2e303a)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Tỷ lệ người viết (Human)</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>
            {humanProbability}%
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Độ rối từ ngữ (Perplexity)</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>
            {perplexityScore}
          </div>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Càng thấp càng giống phong cách AI</span>
        </div>

        <div>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Độ biến thiên câu (Burstiness)</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c084fc', marginTop: '4px' }}>
            {burstinessScore}
          </div>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Người viết thường có độ biến thiên cao hơn</span>
        </div>
      </div>

      {/* Sentence-by-sentence analysis */}
      {sentenceAnalysis && sentenceAnalysis.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
            Phân tích chi tiết từng câu:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sentenceAnalysis.map((item, idx) => {
              const isAiSentence = item.score > 60;
              return (
                <div
                  key={idx}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    backgroundColor: isAiSentence ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    borderLeft: `4px solid ${isAiSentence ? '#ef4444' : '#10b981'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9ca3af)' }}>Câu #{idx + 1}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isAiSentence ? '#ef4444' : '#10b981' }}>
                      {item.score}% AI
                    </span>
                  </div>
                  <div>{item.sentence}</div>
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

import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Clock,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';

/**
 * Tách văn bản thành danh sách câu hoàn chỉnh
 */
function splitSentences(text = '') {
  if (!text) return [];
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
}

/**
 * Chuẩn hóa một từ để so khớp (bỏ dấu câu, chuyển chữ thường)
 */
function cleanWord(w = '') {
  return w.toLowerCase().replace(/[.,;:!?…"''\(\)\[\]\{\}\-\—]/g, '').trim();
}

/**
 * Tìm câu trong bài viết của người dùng khớp nhất với đoạn nguồn
 */
function findBestMatchingSentence(fullText = '', matchedText = '') {
  if (!fullText || !matchedText) return fullText || matchedText || '';
  
  const sentences = splitSentences(fullText);
  if (sentences.length <= 1) return fullText;

  const targetWords = matchedText.split(/\s+/).map(cleanWord).filter((w) => w.length >= 2);
  const targetSet = new Set(targetWords);

  let bestSentence = sentences[0];
  let maxScore = -1;

  for (const sentence of sentences) {
    const sWords = sentence.split(/\s+/).map(cleanWord).filter((w) => w.length >= 2);
    if (sWords.length === 0) continue;

    // Đếm số từ chung
    let common = 0;
    for (const w of sWords) {
      if (targetSet.has(w)) common++;
    }

    // Tỷ lệ trùng khớp Jaccard
    const score = common / Math.max(1, sWords.length + targetWords.length - common);
    if (score > maxScore) {
      maxScore = score;
      bestSentence = sentence;
    }
  }

  return bestSentence;
}

/**
 * Thuật toán phát hiện Cụm từ liên tiếp (Continuous Phrase Matching):
 * - CHỈ bôi đỏ khi trùng từ 3 từ liên tiếp trở lên (Continuous N-grams / Phrasing).
 * - KHÔNG bôi đỏ các từ đơn lẻ 1-2 từ rời rạc.
 * - Gom các từ liên tiếp thành 1 dải highlight liền mạch tự nhiên (giống bút dạ quang của Turnitin).
 */
function analyzeContinuousPhrases(userText = '', sourceText = '', minPhraseLength = 3) {
  if (!userText || !sourceText) {
    return {
      userSegments: [{ isMatched: false, text: userText || '' }],
      sourceSegments: [{ isMatched: false, text: sourceText || '' }],
      matchedWordCount: 0,
      totalUserWords: (userText || '').split(/\s+/).filter(Boolean).length,
    };
  }

  const userWords = userText.split(/\s+/).filter(Boolean);
  const sourceWords = sourceText.split(/\s+/).filter(Boolean);

  const cleanUser = userWords.map(cleanWord);
  const cleanSource = sourceWords.map(cleanWord);

  const matchedUserIndices = new Set();
  const matchedSourceIndices = new Set();

  // Tìm các chuỗi con liên tiếp (Common Substrings) dài từ minPhraseLength từ trở lên
  const effectiveMinLen = Math.min(minPhraseLength, Math.max(2, cleanSource.length));

  for (let i = 0; i < cleanUser.length; i++) {
    for (let j = 0; j < cleanSource.length; j++) {
      let len = 0;
      while (
        i + len < cleanUser.length &&
        j + len < cleanSource.length &&
        cleanUser[i + len] === cleanSource[j + len] &&
        cleanUser[i + len].length > 0
      ) {
        len++;
      }

      // Nếu cụm từ trùng nhau đạt ngưỡng từ liên tiếp
      if (len >= effectiveMinLen) {
        for (let k = 0; k < len; k++) {
          matchedUserIndices.add(i + k);
          matchedSourceIndices.add(j + k);
        }
      }
    }
  }

  // Nếu câu nguồn ngắn hoặc paraphrased cao mà phrase matching chưa bắt đủ,
  // kiểm tra bổ sung các cụm 2 từ có nghĩa nếu cả 2 câu có độ tương đồng cao
  if (matchedUserIndices.size === 0 && cleanSource.length <= 5) {
    for (let i = 0; i < cleanUser.length; i++) {
      for (let j = 0; j < cleanSource.length; j++) {
        if (
          cleanUser[i] === cleanSource[j] &&
          cleanUser[i].length >= 3 &&
          ((i + 1 < cleanUser.length && j + 1 < cleanSource.length && cleanUser[i + 1] === cleanSource[j + 1]) ||
            (i > 0 && j > 0 && cleanUser[i - 1] === cleanSource[j - 1]))
        ) {
          matchedUserIndices.add(i);
          matchedSourceIndices.add(j);
        }
      }
    }
  }

  // Gom các từ liên tiếp thành các đoạn phân đoạn (Segments) liền mạch
  const buildSegments = (words, matchedSet) => {
    const segments = [];
    let currentSegment = null;

    words.forEach((word, index) => {
      const isMatched = matchedSet.has(index);
      if (!currentSegment || currentSegment.isMatched !== isMatched) {
        currentSegment = { isMatched, text: word };
        segments.push(currentSegment);
      } else {
        currentSegment.text += ' ' + word;
      }
    });

    return segments;
  };

  return {
    userSegments: buildSegments(userWords, matchedUserIndices),
    sourceSegments: buildSegments(sourceWords, matchedSourceIndices),
    matchedWordCount: matchedUserIndices.size,
    totalUserWords: userWords.length,
  };
}

export function SideBySideDiffModal({
  isOpen,
  onClose,
  matches = [],
  currentIndex = 0,
  onNavigate,
  originalText = '',
  onAuditTimestamp,
}) {
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);
  const [showFullDoc, setShowFullDoc] = useState(false);

  if (!isOpen || !matches || matches.length === 0) return null;

  const currentMatch = matches[currentIndex] || matches[0];
  const {
    matched_text = '',
    similarity_score = 0,
    match_type = 'EXACT',
    matched_url = null,
    matched_document_id = null,
    source_type = 'web',
  } = currentMatch;

  const simPercent = Math.round(
    Number(similarity_score) > 1 ? Number(similarity_score) : Number(similarity_score) * 100
  );

  const isExact = match_type === 'EXACT' || simPercent >= 88;

  // Lấy chính xác câu tương ứng trong bài viết người dùng (thay vì nhét cả bài 100 từ vào)
  const targetSentence =
    currentMatch.user_text ||
    findBestMatchingSentence(originalText, matched_text) ||
    matched_text;

  const textToAnalyze = showFullDoc && originalText ? originalText : targetSentence;

  // Phân tích cụm từ liên tiếp (loại bỏ bôi đỏ lẻ tẻ)
  const diffResult = analyzeContinuousPhrases(textToAnalyze, matched_text, 3);

  const handleCopy = (text, isUser = true) => {
    navigator.clipboard.writeText(text);
    if (isUser) {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else {
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < matches.length - 1) {
      onNavigate(currentIndex + 1);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(5, 8, 20, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1080px',
          maxHeight: '92vh',
          backgroundColor: '#0F172A',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 1. MODAL HEADER */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: '#131D36',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: isExact ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${isExact ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              }}
            >
              {isExact ? <ShieldAlert size={22} color="#f87171" /> : <AlertTriangle size={22} color="#fbbf24" />}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Đối Chiếu Song Song Cụm Từ (Side-by-side Diff View)
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    backgroundColor: isExact ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: isExact ? '#fca5a5' : '#fde047',
                    border: `1px solid ${isExact ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                  }}
                >
                  {isExact ? '🔴 Trùng Khớp Nguyên Văn (EXACT)' : '🟡 Xào Xáo / Diễn Đạt Lại (PARAPHRASED)'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
                Đoạn nghi vấn {currentIndex + 1} / {matches.length} • Độ tương đồng ngữ nghĩa:
                <b style={{ color: isExact ? '#f87171' : '#fbbf24', marginLeft: '0.3rem' }}>{simPercent}%</b>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Navigation buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: '0.5rem' }}>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: currentIndex === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.08)',
                  color: currentIndex === 0 ? '#475569' : '#e2e8f0',
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                  gap: '0.25rem',
                }}
                title="Đoạn nghi vấn trước"
              >
                <ArrowLeft size={14} /> Trước
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === matches.length - 1}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor:
                    currentIndex === matches.length - 1
                      ? 'rgba(255, 255, 255, 0.02)'
                      : 'rgba(255, 255, 255, 0.08)',
                  color: currentIndex === matches.length - 1 ? '#475569' : '#e2e8f0',
                  cursor: currentIndex === matches.length - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                  gap: '0.25rem',
                }}
                title="Đoạn nghi vấn tiếp theo"
              >
                Sau <ArrowRight size={14} />
              </button>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.color = '#fca5a5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. MODAL BODY (2-COLUMN DIFF VIEW) */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Top Source Meta Bar */}
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderRadius: '12px',
              backgroundColor: 'rgba(21, 28, 47, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#94a3b8' }}>Nguồn phát hiện:</span>
              {matched_url ? (
                <a
                  href={matched_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: '#38bdf8',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontWeight: 600,
                  }}
                >
                  <span>{matched_url}</span>
                  <ExternalLink size={13} />
                </a>
              ) : (
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                  🏛️ Kho lưu trữ luận văn nội bộ (ID: {matched_document_id || 'Qdrant Collection'})
                </span>
              )}
            </div>

            {matched_url && onAuditTimestamp && (
              <button
                type="button"
                onClick={() => onAuditTimestamp({ url: matched_url, title: matched_url })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: '#a5b4fc',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Clock size={13} /> Đối soát ngày xuất bản (Wayback Machine)
              </button>
            )}
          </div>

          {/* TWO COLUMNS: User Document vs Matched Source */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* LEFT COLUMN: User Text */}
            <div
              style={{
                backgroundColor: '#131B2E',
                borderRadius: '16px',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: '0.85rem 1.15rem',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <BookOpen size={16} color="#818cf8" />
                  <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>
                    Bài viết của bạn ({showFullDoc ? 'Toàn văn bản' : 'Câu nghi vấn'})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {originalText && originalText.length > targetSentence.length && (
                    <button
                      type="button"
                      onClick={() => setShowFullDoc(!showFullDoc)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: showFullDoc ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: showFullDoc ? '#c7d2fe' : '#94a3b8',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                      title={showFullDoc ? 'Chuyển về xem câu nghi vấn' : 'Xem toàn bài viết'}
                    >
                      {showFullDoc ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                      <span>{showFullDoc ? 'Xem câu này' : 'Xem cả bài'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopy(textToAnalyze, true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#94a3b8',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedUser ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                    <span>{copiedUser ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              {/* Column Content: Highlighting liền mạch tự nhiên */}
              <div
                style={{
                  padding: '1.25rem',
                  fontSize: '0.98rem',
                  lineHeight: '1.9',
                  color: '#cbd5e1',
                  minHeight: '180px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                }}
              >
                {diffResult.userSegments.map((seg, idx) =>
                  seg.isMatched ? (
                    <mark
                      key={idx}
                      style={{
                        backgroundColor: isExact ? 'rgba(239, 68, 68, 0.22)' : 'rgba(245, 158, 11, 0.22)',
                        color: isExact ? '#fca5a5' : '#fde047',
                        borderBottom: `2.5px solid ${isExact ? '#ef4444' : '#f59e0b'}`,
                        borderRadius: '3px',
                        padding: '0.1rem 0.2rem',
                        fontWeight: 600,
                      }}
                    >
                      {seg.text}
                    </mark>
                  ) : (
                    <span key={idx}>{seg.text} </span>
                  )
                )}
              </div>

              {/* Column Footer */}
              <div
                style={{
                  padding: '0.65rem 1.15rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.78rem',
                  color: '#94a3b8',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Tổng từ: {diffResult.totalUserWords} từ</span>
                <span>
                  Từ trong cụm trùng: <b style={{ color: isExact ? '#f87171' : '#fbbf24' }}>{diffResult.matchedWordCount} từ</b>
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: Matched Source Text */}
            <div
              style={{
                backgroundColor: '#131B2E',
                borderRadius: '16px',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: '0.85rem 1.15rem',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Sparkles size={16} color="#38bdf8" />
                  <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>
                    Nội dung đối chiếu từ Nguồn ngoài
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(matched_text, false)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {copiedSource ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                  <span>{copiedSource ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              {/* Column Content: Highlighting liền mạch tự nhiên */}
              <div
                style={{
                  padding: '1.25rem',
                  fontSize: '0.98rem',
                  lineHeight: '1.9',
                  color: '#cbd5e1',
                  minHeight: '180px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                }}
              >
                {diffResult.sourceSegments.map((seg, idx) =>
                  seg.isMatched ? (
                    <mark
                      key={idx}
                      style={{
                        backgroundColor: isExact ? 'rgba(239, 68, 68, 0.22)' : 'rgba(245, 158, 11, 0.22)',
                        color: isExact ? '#fca5a5' : '#fde047',
                        borderBottom: `2.5px solid ${isExact ? '#ef4444' : '#f59e0b'}`,
                        borderRadius: '3px',
                        padding: '0.1rem 0.2rem',
                        fontWeight: 600,
                      }}
                    >
                      {seg.text}
                    </mark>
                  ) : (
                    <span key={idx}>{seg.text} </span>
                  )
                )}
              </div>

              {/* Column Footer */}
              <div
                style={{
                  padding: '0.65rem 1.15rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.78rem',
                  color: '#94a3b8',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Loại nguồn: {source_type === 'web' ? 'Google Web Crawl' : 'Qdrant Internal'}</span>
                <span style={{ color: '#38bdf8' }}>Đối chiếu trực tiếp</span>
              </div>
            </div>
          </div>

          {/* 3. ACADEMIC RECOMMENDATION & ANALYSIS */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              backgroundColor: isExact ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${isExact ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
            }}
          >
            <Info size={18} color={isExact ? '#f87171' : '#fbbf24'} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
              <b style={{ color: isExact ? '#f87171' : '#fbbf24' }}>
                {isExact ? 'Khuyến nghị xử lý Trùng khớp Nguyên văn:' : 'Khuyến nghị xử lý Diễn đạt lại (Paraphrase):'}
              </b>{' '}
              {isExact
                ? 'Đoạn văn này có cụm từ trùng khớp nguyên văn trên 85% so với nguồn ngoài. Theo chuẩn học thuật, bạn cần đặt đoạn này trong dấu ngoặc kép và bổ sung chỉ dẫn trích dẫn tác giả (Citation) ở cuối câu, hoặc diễn đạt lại bằng ngôn ngữ riêng.'
                : 'Mô hình Vector ngữ nghĩa phát hiện cấu trúc ý tưởng tương đồng vượt ngưỡng (> 75%). Khuyến nghị bạn bổ sung luận điểm cá nhân hoặc trích dẫn nguồn ý tưởng ban đầu.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SideBySideDiffModal;

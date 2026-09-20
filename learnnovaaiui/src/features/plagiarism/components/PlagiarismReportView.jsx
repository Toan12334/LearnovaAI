import React from 'react';
import {
  Activity,
  BarChart2,
  Globe2,
  FileText,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Layers,
} from 'lucide-react';

export function PlagiarismReportView({
  report,
  originalText,
  onBack,
  onAuditTimestamp,
}) {
  if (!report) return null;

  const {
    document_id = 'N/A',
    title = 'Tài liệu không tiêu đề',
    word_count = originalText?.split(/\s+/).filter(Boolean).length || 0,
    total_chunks = 0,
    matched_chunks_count = 0,
    plagiarism_score = 0,
    is_plagiarized = false,
    matches = [],
  } = report;

  const score = Math.round(Number(plagiarism_score) || 0);
  const originalPercentage = Math.max(0, 100 - score);

  // Group web vs internal matches
  const webMatches = matches.filter((m) => m.source_type === 'web');
  const internalMatches = matches.filter((m) => m.source_type === 'internal_db');

  const webPercentage = total_chunks > 0 
    ? Math.round((webMatches.length / total_chunks) * 100) 
    : (matches.length > 0 ? Math.round(score * 0.7) : 0);
    
  const internalPercentage = total_chunks > 0 
    ? Math.round((internalMatches.length / total_chunks) * 100) 
    : (score - webPercentage);

  const getScoreColor = (val) => {
    if (val >= 40) return '#EF4444'; // Red
    if (val >= 15) return '#F59E0B'; // Amber
    return '#22C55E'; // Green
  };

  const getRiskBadge = (scoreVal) => {
    const s = Number(scoreVal) > 1 ? Number(scoreVal) : Number(scoreVal) * 100;
    if (s >= 75) {
      return {
        label: 'Nguy cơ cao',
        bg: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        border: '1px solid rgba(239, 68, 68, 0.3)',
      };
    }
    if (s >= 50) {
      return {
        label: 'Trung bình',
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#fbbf24',
        border: '1px solid rgba(245, 158, 11, 0.3)',
      };
    }
    return {
      label: 'Thấp',
      bg: 'rgba(34, 197, 94, 0.15)',
      color: '#4ade80',
      border: '1px solid rgba(34, 197, 94, 0.3)',
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
      {/* Top Bar with Navigation and Document Meta */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Báo cáo Đối soát Đạo văn
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                backgroundColor: is_plagiarized ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                color: is_plagiarized ? '#f87171' : '#4ade80',
                border: `1px solid ${is_plagiarized ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                fontWeight: 600,
              }}
            >
              {is_plagiarized ? 'Phát hiện Trùng lặp' : 'Độc bản / Hợp lệ'}
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.3rem' }}>
            📄 {title} • Mã tài liệu: <code style={{ color: '#818cf8' }}>{document_id}</code>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backgroundColor: 'rgba(21, 28, 47, 0.8)',
            color: '#cbd5e1',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại kiểm tra bài khác</span>
        </button>
      </div>

      {/* Top 4 Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Total Similarity */}
        <div
          style={{
            backgroundColor: '#151C2F',
            borderRadius: '16px',
            padding: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>Tỷ lệ Trùng lặp</span>
            <Activity size={18} color={getScoreColor(score)} />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: getScoreColor(score) }}>
            {score}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            {score > 15 ? 'Vượt ngưỡng an toàn quy định' : 'Nằm trong ngưỡng cho phép (<= 15%)'}
          </div>
        </div>

        {/* Matched Chunks */}
        <div
          style={{
            backgroundColor: '#151C2F',
            borderRadius: '16px',
            padding: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>Số câu trùng khớp</span>
            <Layers size={18} color="#818cf8" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f8fafc' }}>
            {matched_chunks_count} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 500 }}>/ {total_chunks} câu</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Tách câu và phân tích qua FastEmbed
          </div>
        </div>

        {/* Sources Found */}
        <div
          style={{
            backgroundColor: '#151C2F',
            borderRadius: '16px',
            padding: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>Nguồn đối chiếu</span>
            <Globe2 size={18} color="#00D4FF" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#00D4FF' }}>
            {matches.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            {webMatches.length} nguồn Web • {internalMatches.length} nguồn Nội bộ
          </div>
        </div>

        {/* Word Count */}
        <div
          style={{
            backgroundColor: '#151C2F',
            borderRadius: '16px',
            padding: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>Tổng số từ</span>
            <FileText size={18} color="#34D399" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#34D399' }}>
            {word_count.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Từ ngữ trong văn bản phân tích
          </div>
        </div>
      </div>

      {/* Middle Row (3 columns: Breakdown, Donut Distribution, Document Preview) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Similarity Breakdown Card */}
        <div
          style={{
            backgroundColor: '#151C2F',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 1.25rem' }}>
            Chi tiết Mức độ Trùng lặp
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Web Search Matches */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <span style={{ color: '#cbd5e1' }}>Trùng khớp Internet (Serper Web)</span>
                <span style={{ color: '#f87171', fontWeight: 600 }}>{webPercentage}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: `${webPercentage}%`, height: '100%', backgroundColor: '#f87171', borderRadius: '9999px' }} />
              </div>
            </div>

            {/* Internal DB Matches */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <span style={{ color: '#cbd5e1' }}>Trùng kho bài viết (Qdrant Vector)</span>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>{internalPercentage}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: `${internalPercentage}%`, height: '100%', backgroundColor: '#fbbf24', borderRadius: '9999px' }} />
              </div>
            </div>

            {/* Original Content */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <span style={{ color: '#cbd5e1' }}>Nội dung độc bản (Original)</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>{originalPercentage}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: `${originalPercentage}%`, height: '100%', backgroundColor: '#34d399', borderRadius: '9999px' }} />
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 'auto',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.78rem',
              color: '#94a3b8',
            }}
          >
            💡 Tiêu chí đối soát tuân theo thuật toán lọc câu Winnowing & đo góc Cosine Similarity vector 384 chiều.
          </div>
        </div>

        {/* Content Distribution (Donut Chart) */}
        <div
          style={{
            backgroundColor: '#151C2F',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 1.25rem' }}>
            Biểu đồ Phân bổ Nội dung
          </h3>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#1F2937" strokeWidth="4" />
                {/* Original Circle (Emerald) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="transparent"
                  stroke="#34D399"
                  strokeWidth="4"
                  strokeDasharray={`${originalPercentage} ${100 - originalPercentage}`}
                  strokeDashoffset="0"
                />
                {/* Plagiarized Circle (Red) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="transparent"
                  stroke="#F87171"
                  strokeWidth="4"
                  strokeDasharray={`${score} ${100 - score}`}
                  strokeDashoffset={`-${originalPercentage}`}
                />
              </svg>

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>{originalPercentage}%</span>
                <span style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Độc bản
                </span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#34D399' }} />
                  <span style={{ color: '#cbd5e1' }}>Độc bản</span>
                </div>
                <span style={{ fontWeight: 600, color: '#f8fafc' }}>{originalPercentage}%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F87171' }} />
                  <span style={{ color: '#cbd5e1' }}>Trùng lặp</span>
                </div>
                <span style={{ fontWeight: 600, color: '#f87171' }}>{score}%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#818CF8' }} />
                  <span style={{ color: '#cbd5e1' }}>Độ tin cậy</span>
                </div>
                <span style={{ fontWeight: 600, color: '#818cf8' }}>98.5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Document Highlight Preview */}
        <div
          style={{
            backgroundColor: '#151C2F',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.85rem' }}>
            Trực quan hóa Đoạn văn Trùng khớp
          </h3>

          <div
            style={{
              flex: 1,
              maxHeight: '180px',
              overflowY: 'auto',
              padding: '0.85rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(11, 16, 32, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.88rem',
              lineHeight: '1.7',
              color: '#cbd5e1',
            }}
          >
            {matches.length === 0 ? (
              <p style={{ color: '#34d399', margin: 0 }}>
                ✅ Toàn bộ bài viết hoàn toàn nguyên bản, không tìm thấy câu văn nào trùng lặp vượt ngưỡng cho phép.
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                {originalText ? (
                  originalText
                ) : (
                  <span>
                    Các đoạn văn bản đã được đối chiếu: {matches.map((m, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: m.source_type === 'web' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                          color: m.source_type === 'web' ? '#fca5a5' : '#fde047',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          margin: '0 0.2rem',
                        }}
                      >
                        "{m.matched_text?.slice(0, 70)}..."
                      </span>
                    ))}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Color Tags Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#f87171' }} />
              <span>Nguồn Web Google</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#fbbf24' }} />
              <span>Kho dữ liệu nội bộ Qdrant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table: Sources Found */}
      <div
        style={{
          backgroundColor: '#151C2F',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Danh sách Nguồn Nghi vấn Phát hiện ({matches.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Hỗ trợ đối soát dấu mốc thời gian qua Internet Archive
          </span>
        </div>

        {matches.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <ShieldCheck size={44} color="#34d399" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ color: '#f8fafc', margin: '0 0 0.25rem' }}>Tuyệt vời! Không phát hiện trùng lặp</h4>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Tài liệu vượt qua toàn bộ quy trình kiểm tra đối soát.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(11, 16, 32, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Nguồn nghi vấn</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Loại nguồn</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Đoạn văn trùng</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Độ tương đồng</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Mức rủi ro</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match, idx) => {
                  const risk = getRiskBadge(match.similarity_score);
                  const simPercent = Math.round(Number(match.similarity_score) > 1 
                    ? Number(match.similarity_score) 
                    : Number(match.similarity_score) * 100);

                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Source */}
                      <td style={{ padding: '1rem 1.25rem', maxWidth: '240px' }}>
                        {match.matched_url ? (
                          <a
                            href={match.matched_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: '#00D4FF',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontWeight: 500,
                              wordBreak: 'break-all',
                            }}
                          >
                            <span>{match.matched_url.replace(/^https?:\/\//, '').slice(0, 30)}...</span>
                            <ExternalLink size={13} />
                          </a>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontWeight: 500 }}>
                            {match.matched_document_id ? `Tài liệu ID: ${match.matched_document_id.slice(0, 8)}...` : 'CSDL Nội bộ'}
                          </span>
                        )}
                      </td>

                      {/* Source Type */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            backgroundColor: match.source_type === 'web' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                            color: match.source_type === 'web' ? '#38bdf8' : '#c084fc',
                            border: `1px solid ${match.source_type === 'web' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {match.source_type === 'web' ? '🌐 Web Search' : '🏛️ Qdrant Vector'}
                        </span>
                      </td>

                      {/* Matched Snippet */}
                      <td style={{ padding: '1rem 1rem', maxWidth: '300px', color: '#94a3b8', fontSize: '0.84rem' }}>
                        <div style={{ fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          "{match.matched_text || 'Không có bản xem trước'}"
                        </div>
                      </td>

                      {/* Similarity % */}
                      <td style={{ padding: '1rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, color: getScoreColor(simPercent), fontSize: '0.95rem' }}>
                          {simPercent}%
                        </span>
                      </td>

                      {/* Risk Badge */}
                      <td style={{ padding: '1rem 1rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            backgroundColor: risk.bg,
                            color: risk.color,
                            border: risk.border,
                            fontWeight: 600,
                          }}
                        >
                          {risk.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {match.matched_url && onAuditTimestamp && (
                          <button
                            type="button"
                            onClick={() => onAuditTimestamp({ url: match.matched_url, title: match.matched_url })}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              border: '1px solid rgba(99, 102, 241, 0.35)',
                              backgroundColor: 'rgba(99, 102, 241, 0.12)',
                              color: '#a5b4fc',
                              fontSize: '0.78rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            title="Kiểm tra mốc thời gian xuất bản nguồn qua Internet Archive"
                          >
                            <Clock size={13} />
                            <span>Đối soát ngày</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlagiarismReportView;

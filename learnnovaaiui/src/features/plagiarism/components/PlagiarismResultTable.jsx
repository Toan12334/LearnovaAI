import React from 'react';
import { formatDate } from '../../../utils/formatDate';
import { Button } from '../../../components/Button';

export function PlagiarismResultTable({ results, onAuditTimestamp, onSelectSource }) {
  if (!results || !results.sources || results.sources.length === 0) {
    return (
      <div
        style={{
          padding: '2.5rem',
          textAlign: 'center',
          background: 'rgba(34, 197, 94, 0.05)',
          borderRadius: '12px',
          border: '1px dashed rgba(34, 197, 94, 0.3)',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
        <h4 style={{ margin: '0 0 0.5rem', color: '#4ade80' }}>Không phát hiện nội dung trùng lặp</h4>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #9ca3af)' }}>
          Văn bản đạt tiêu chuẩn độc bản và vượt qua bài kiểm tra ngưỡng đối sánh.
        </p>
      </div>
    );
  }

  const { overallScore = 0, exactMatchScore = 0, semanticScore = 0, sources = [] } = results;

  const getScoreColor = (score) => {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          padding: '1.25rem',
          borderRadius: '12px',
          background: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
          border: '1px solid var(--border, #2e303a)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)' }}>Tổng độ trùng lặp</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: getScoreColor(overallScore) }}>
            {overallScore}%
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)' }}>Trùng khớp tuyệt đối (Winnowing)</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 600, color: '#f87171' }}>
            {exactMatchScore}%
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)' }}>Tương đồng ngữ nghĩa (Semantic)</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 600, color: '#fbbf24' }}>
            {semanticScore}%
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)' }}>Số nguồn đối chiếu</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 600, color: '#818cf8' }}>
            {sources.length} nguồn
          </div>
        </div>
      </div>

      {/* Sources Comparison Table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.9rem',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '2px solid var(--border, #2e303a)',
                color: 'var(--text-muted, #9ca3af)',
              }}
            >
              <th style={{ padding: '0.75rem 0.5rem' }}>Nguồn nghi vấn</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Trùng khớp</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Mẫu câu phát hiện</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Ngày công bố</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source, index) => (
              <tr
                key={source.id || index}
                style={{
                  borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.05))',
                  transition: 'background 0.15s ease',
                }}
              >
                {/* Source details */}
                <td style={{ padding: '0.85rem 0.5rem', maxWidth: '240px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                    {source.title || 'Tài liệu không rõ tiêu đề'}
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.75rem',
                      color: '#818cf8',
                      textDecoration: 'none',
                      display: 'inline-block',
                      maxWidth: '220px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {source.url}
                  </a>
                </td>

                {/* Similarity */}
                <td style={{ padding: '0.85rem 0.5rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: `${getScoreColor(source.similarity)}20`,
                      color: getScoreColor(source.similarity),
                      border: `1px solid ${getScoreColor(source.similarity)}50`,
                    }}
                  >
                    {source.similarity}%
                  </span>
                </td>

                {/* Snippet */}
                <td style={{ padding: '0.85rem 0.5rem', maxWidth: '280px', color: 'var(--text-muted, #9ca3af)', fontSize: '0.82rem' }}>
                  <div style={{ fontStyle: 'italic' }}>
                    "{source.snippet || 'N/A'}"
                  </div>
                </td>

                {/* Published Date */}
                <td style={{ padding: '0.85rem 0.5rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                  {formatDate(source.publishedDate, 'date-only')}
                </td>

                {/* Actions */}
                <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                    {onAuditTimestamp && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onAuditTimestamp(source)}
                        title="Đối soát ngày xuất bản qua Internet Archive"
                      >
                        ⏱️ Đối soát ngày
                      </Button>
                    )}
                    {onSelectSource && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectSource(source)}
                      >
                        Chi tiết
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlagiarismResultTable;

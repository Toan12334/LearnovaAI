import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { formatDate } from '../utils/formatDate';
import { highlightText } from '../utils/highlightText';

export function ReportPage({ reportId = 'REP-2026-001', onBack }) {
  const sampleReport = {
    id: reportId,
    title: 'Tiểu luận: Ứng dụng Học sâu trong nhận dạng giọng nói tiếng Việt',
    checkedAt: '2026-09-12T10:15:00Z',
    author: 'Nguyễn Văn An',
    wordCount: 1840,
    charCount: 11200,
    overallScore: 68,
    exactScore: 42,
    semanticScore: 78,
    aiScore: 18,
    fullText: `Trí tuệ nhân tạo đang định hình lại phương thức giảng dạy và học tập trong kỷ nguyên số. Các mô hình mạng nơ-ron tích chập và Transformer đã đem lại bước nhảy vọt về độ chính xác khi xử lý âm thanh tiếng Việt mang thanh điệu phong phú. Trong các hệ thống nhận dạng hiện đại, việc sử dụng thuật toán Winnowing kết hợp tìm kiếm ngữ nghĩa qua Vector Database giúp đối chiếu các đoạn văn bản có cùng bản chất ngữ nghĩa dù đã bị thay đổi cấu trúc câu. Đồng thời, việc truy vết dấu mốc thời gian xuất bản đóng vai trò then chốt để xác định ai mới là tác giả đầu tiên của công trình nghiên cứu.`,
    matches: [
      { start: 0, end: 90, score: 88, sourceUrl: 'https://tapchigiaoduc.edu.vn/article/ai-in-education' },
      { start: 200, end: 320, score: 75, sourceUrl: 'https://vjol.info.vn/index.php/jcs/article/view/84920' },
      { start: 330, end: 460, score: 62, sourceUrl: 'https://khoahoccongnghe.gov.vn/bai-viet/timestamp-archive-check' },
    ],
    sources: [
      {
        id: '1',
        title: 'Nghiên cứu ứng dụng Trí tuệ nhân tạo trong Giáo dục đại học',
        url: 'https://tapchigiaoduc.edu.vn/article/ai-in-education',
        similarity: 78,
        publishedDate: '2023-04-15T09:00:00Z',
        waybackVerified: true,
      },
      {
        id: '2',
        title: 'Tổng quan các thuật toán phát hiện đạo văn hiện đại',
        url: 'https://vjol.info.vn/index.php/jcs/article/view/84920',
        similarity: 54,
        publishedDate: '2023-10-20T14:15:00Z',
        waybackVerified: true,
      },
      {
        id: '3',
        title: 'Truy vết mốc thời gian xuất bản bằng Wayback Machine',
        url: 'https://khoahoccongnghe.gov.vn/bai-viet/timestamp-archive-check',
        similarity: 46,
        publishedDate: '2024-01-10T11:00:00Z',
        waybackVerified: false,
      },
    ],
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Button size="sm" variant="secondary" onClick={onBack}>
            ← Quay lại danh sách
          </Button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button size="sm" variant="outline" onClick={handlePrint}>
            🖨️ In / Xuất PDF
          </Button>
          <Button size="sm" variant="primary">
            📥 Tải báo cáo kiểm định (.JSON)
          </Button>
        </div>
      </div>

      {/* Main Report Card */}
      <Card
        title={`Báo Cáo Kiểm Định Bản Quyền: ${sampleReport.id}`}
        subtitle={`Thời gian tạo: ${formatDate(sampleReport.checkedAt)} • Tác giả: ${sampleReport.author}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <h4 style={{ margin: '0 0 0.25rem' }}>{sampleReport.title}</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #9ca3af)' }}>
              Độ dài tài liệu: {sampleReport.wordCount} từ ({sampleReport.charCount} ký tự)
            </div>
          </div>

          {/* Metric cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
            }}
          >
            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Độ trùng lặp tổng</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>
                {sampleReport.overallScore}%
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Trùng lặp cấu trúc (Winnowing)</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
                {sampleReport.exactScore}%
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Tương đồng ngữ nghĩa (Vector)</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#818cf8' }}>
                {sampleReport.semanticScore}%
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Chỉ số sinh bởi AI</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
                {sampleReport.aiScore}%
              </div>
            </div>
          </div>

          {/* Highlighted text preview */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>
              Văn bản đã phân đoạn và gắn cờ đối soát:
            </h4>
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '10px',
                background: 'var(--input-bg, rgba(0, 0, 0, 0.25))',
                border: '1px solid var(--border, #2e303a)',
                lineHeight: '1.9',
                fontSize: '0.95rem',
              }}
            >
              {highlightText(sampleReport.fullText, sampleReport.matches)}
            </div>
          </div>

          {/* Sources breakdown */}
          <div>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
              Chi tiết các nguồn phát hiện trùng lặp & Mốc thời gian xuất bản:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sampleReport.sources.map((source) => (
                <div
                  key={source.id}
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #2e303a)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{source.title}</div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.8rem', color: '#818cf8', textDecoration: 'none' }}
                    >
                      {source.url}
                    </a>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                      Công bố ngày: {formatDate(source.publishedDate)} • {source.waybackVerified ? '✅ Đã đối soát Wayback Machine' : '⚠️ Chưa lưu trên Wayback'}
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: '6px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      {source.similarity}% trùng khớp
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ReportPage;

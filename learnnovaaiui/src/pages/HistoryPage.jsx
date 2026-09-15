import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { formatDate } from '../utils/formatDate';

export function HistoryPage({ onSelectReport }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Sample history records
  const [historyItems] = useState([
    {
      id: 'REP-2026-001',
      title: 'Tiểu luận: Ứng dụng Học sâu trong nhận dạng giọng nói tiếng Việt',
      author: 'Nguyễn Văn An',
      date: '2026-09-12T10:15:00Z',
      type: 'Tệp tải lên (.docx)',
      similarity: 68,
      status: 'Cần lưu ý',
      sourcesCount: 3,
    },
    {
      id: 'REP-2026-002',
      title: 'Đề xuất giải pháp kiến trúc Microservices trên nền Kubernetes',
      author: 'Trần Thị Mai',
      date: '2026-09-11T14:30:00Z',
      type: 'Văn bản trực tiếp',
      similarity: 12,
      status: 'Đạt chuẩn',
      sourcesCount: 1,
    },
    {
      id: 'REP-2026-003',
      title: 'Nghiên cứu tác động của LLM đến phương pháp giảng dạy phổ thông',
      author: 'Lê Hoàng Nam',
      date: '2026-09-08T09:00:00Z',
      type: 'Tệp tải lên (.pdf)',
      similarity: 84,
      status: 'Nguy cơ cao',
      sourcesCount: 6,
    },
    {
      id: 'REP-2026-004',
      title: 'Tài liệu hướng dẫn an toàn thông tin doanh nghiệp vừa và nhỏ',
      author: 'Phạm Minh Đức',
      date: '2026-09-05T16:45:00Z',
      type: 'Văn bản trực tiếp',
      similarity: 22,
      status: 'Đạt chuẩn',
      sourcesCount: 2,
    },
  ]);

  const filteredItems = historyItems.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (similarity) => {
    if (similarity >= 70) {
      return { label: 'Trùng lặp cao', bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '#ef4444' };
    }
    if (similarity >= 40) {
      return { label: 'Cần xem xét', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '#f59e0b' };
    }
    return { label: 'Độc bản an toàn', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '#10b981' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Card
        title="📑 Lịch sử Kiểm tra Đạo văn & Đối soát"
        subtitle="Danh sách các lượt kiểm tra tài liệu và báo cáo đã thực hiện"
        action={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Tìm kiếm báo cáo, tiêu đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border, #2e303a)',
                background: 'var(--input-bg, rgba(0,0,0,0.2))',
                color: 'inherit',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border, #2e303a)', color: 'var(--text-muted, #9ca3af)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Mã / Tiêu đề tài liệu</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Phương thức</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Thời gian thực hiện</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Độ tương đồng</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Trạng thái</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const badge = getStatusBadge(item.similarity);
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.05))',
                    }}
                  >
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-h, #ffffff)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#818cf8', marginTop: '2px' }}>
                        {item.id} • Tác giả: {item.author}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted, #9ca3af)', fontSize: '0.85rem' }}>
                      {item.type}
                    </td>

                    <td style={{ padding: '1rem 0.5rem', fontSize: '0.85rem' }}>
                      {formatDate(item.date)}
                    </td>

                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ fontWeight: 700, color: badge.color, fontSize: '1rem' }}>
                        {item.similarity}%
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>
                        {item.sourcesCount} nguồn
                      </span>
                    </td>

                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}50`,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onSelectReport(item.id)}
                      >
                        Xem báo cáo
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default HistoryPage;

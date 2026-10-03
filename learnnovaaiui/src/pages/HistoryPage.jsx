import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { formatDate } from '../utils/formatDate';
import { historyService } from '../services/historyService';
import { useAuth } from '../features/auth';
import { Search, Bot, Trash2, Calendar, FileText, ArrowRight, Layers, ShieldAlert, ShieldCheck } from 'lucide-react';

export function HistoryPage({ onSelectReport }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'plagiarism' | 'ai_detection'
  const [historyItems, setHistoryItems] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    // 1. Fast initial load from LocalStorage
    const items = historyService.getHistory(user?.id);
    setHistoryItems(items);

    // 2. If user is logged in, sync with Supabase DB (crucial for new devices/cleared cache)
    if (user?.id) {
      const syncedItems = await historyService.fetchAndSyncHistory(user.id);
      setHistoryItems(syncedItems);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử kiểm tra?')) {
      historyService.clearHistory(user?.id);
      loadHistory();
    }
  };

  const filteredItems = historyItems.filter((item) => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.author && item.author.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (item) => {
    const score = item.score ?? 0;
    if (item.type === 'ai_detection') {
      if (score >= 50) {
        return { label: 'Tín hiệu AI Cao', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      }
      if (score >= 20) {
        return { label: 'AI Hỗ trợ', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      }
      return { label: 'Người viết', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    } else {
      if (score >= 70) {
        return { label: 'Trùng lặp cao', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      }
      if (score >= 40) {
        return { label: 'Cần xem xét', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      }
      return { label: 'Độc bản an toàn', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <Card
        title="📑 Lịch sử Kiểm tra & Phân tích"
        subtitle={`Danh sách các lượt kiểm tra Đạo văn và PhoBERT AI Detector của ${user ? (user.full_name || user.email) : 'bạn'}`}
        action={
          <div className="flex items-center gap-3">
            {historyItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa lịch sử</span>
              </button>
            )}
          </div>
        }
      >
        {/* Filters & Search Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
          
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({historyItems.length})
            </button>
            
            <button
              onClick={() => setActiveTab('plagiarism')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'plagiarism'
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-indigo-500" />
              <span>Đạo văn ({historyItems.filter((i) => i.type === 'plagiarism').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ai_detection')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'ai_detection'
                  ? 'bg-white text-purple-600 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-purple-500" />
              <span>PhoBERT AI ({historyItems.filter((i) => i.type === 'ai_detection').length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Tìm kiếm mã, tiêu đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-slate-50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

        </div>

        {/* History Table */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700 mb-1">Chưa có lịch sử kiểm tra nào</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hãy thực hiện kiểm tra Đạo văn hoặc PhoBERT AI Detector trên trang chủ, kết quả sẽ tự động lưu tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Loại / Mã / Tiêu đề</th>
                  <th className="py-3 px-3">Người thực hiện</th>
                  <th className="py-3 px-3">Thời gian</th>
                  <th className="py-3 px-3">Điểm số</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredItems.map((item) => {
                  const badge = getStatusBadge(item);
                  const isAI = item.type === 'ai_detection';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Title & Type */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                              isAI ? 'bg-purple-50 text-purple-600 border border-purple-200/60' : 'bg-indigo-50 text-indigo-600 border border-indigo-200/60'
                            }`}
                          >
                            {isAI ? <Bot className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 line-clamp-1">
                              {item.title}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-medium text-indigo-600">{item.id}</span>
                              <span>•</span>
                              <span>{isAI ? 'PhoBERT AI Check' : 'Đối soát Đạo văn'}</span>
                              {item.sourceFile && (
                                <>
                                  <span>•</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border uppercase ${
                                    item.sourceFile.file_format === 'pdf' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    item.sourceFile.file_format === 'docx' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}>
                                    {item.sourceFile.file_format || 'FILE'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="py-3.5 px-3 text-xs font-semibold text-slate-600">
                        {item.author || 'Khách'}
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-3 text-xs font-medium text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(item.date)}</span>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-lg font-black ${
                              isAI
                                ? item.score >= 50
                                  ? 'text-rose-600'
                                  : 'text-emerald-600'
                                : item.score >= 40
                                ? 'text-rose-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {item.score}%
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {isAI ? 'AI' : 'Trùng'}
                          </span>
                        </div>
                      </td>

                      {/* Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectReport(item.id)}
                          icon={<ArrowRight className="w-3.5 h-3.5" />}
                        >
                          Xem chi tiết
                        </Button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default HistoryPage;

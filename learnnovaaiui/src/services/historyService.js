/**
 * User History Management Service
 * Saves & retrieves check history for each user after every Plagiarism & PhoBERT AI check.
 */

import plagiarismApi from './plagiarismApi';

const HISTORY_STORAGE_KEY_PREFIX = 'learnnova_history_';

export const historyService = {
  /**
   * Get storage key for a specific user ID or guest
   */
  getStorageKey(userId = null) {
    return `${HISTORY_STORAGE_KEY_PREFIX}${userId || 'guest'}`;
  },

  /**
   * Get history items for the specified user synchronously from localStorage
   * @param {string|null} userId 
   * @returns {Array} List of check records
   */
  getHistory(userId = null) {
    try {
      const key = this.getStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (!raw) return this.getDefaultSampleHistory(userId);
      return JSON.parse(raw);
    } catch (e) {
      console.error('Lỗi đọc lịch sử từ localStorage:', e);
      return [];
    }
  },

  /**
   * Fetch user history from Supabase DB and sync with LocalStorage.
   * Useful when signing in on a new device or empty local cache.
   * @param {string|null} userId 
   * @returns {Promise<Array>}
   */
  async fetchAndSyncHistory(userId = null) {
    const localItems = this.getHistory(userId);

    // If guest user, return local cache immediately
    if (!userId) {
      return localItems;
    }

    try {
      const res = await plagiarismApi.getHistory();
      if (res && Array.isArray(res.documents) && res.documents.length > 0) {
        const dbItems = res.documents.map((doc) => ({
          id: doc.id || `DOC-${Date.now()}`,
          type: doc.type || (doc.ai_score !== undefined ? 'ai_detection' : 'plagiarism'),
          title: doc.title || 'Văn bản kiểm tra',
          author: doc.author || 'Người dùng',
          date: doc.created_at || doc.date || new Date().toISOString(),
          score: doc.plagiarism_score ?? doc.score ?? 0,
          status: doc.status || ((doc.plagiarism_score ?? doc.score ?? 0) >= 50 ? 'Cần lưu ý' : 'An toàn'),
          sourcesCount: doc.sources_count || 0,
          result: doc.result_payload || doc.result || null,
          user_id: userId,
        }));

        // Merge DB items with local items (DB items take precedence if duplicated)
        const dbIds = new Set(dbItems.map((i) => i.id));
        const merged = [
          ...dbItems,
          ...localItems.filter((i) => !dbIds.has(i.id) && !i.id.startsWith('AI-2026-') && !i.id.startsWith('PLAG-2026-')),
        ];

        const key = this.getStorageKey(userId);
        localStorage.setItem(key, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('Không thể đồng bộ lịch sử từ CSDL (đang sử dụng LocalStorage):', err);
    }

    return localItems;
  },

  /**
   * Save a new check record into history immediately (LocalStorage + optional sync)
   * @param {Object} item 
   * @param {string|null} userId 
   */
  saveCheckResult(item, userId = null) {
    try {
      const history = this.getHistory(userId);
      const newItem = {
        id: item.id || `CHECK-${Date.now()}`,
        type: item.type || 'plagiarism', // 'plagiarism' | 'ai_detection'
        title: item.title || 'Văn bản kiểm tra',
        author: item.author || (userId ? 'Người dùng' : 'Khách'),
        date: new Date().toISOString(),
        score: item.score ?? 0,
        status: item.status || (item.score >= 50 ? 'Cần lưu ý' : 'An toàn'),
        sourcesCount: item.sourcesCount || 0,
        sourceFile: item.sourceFile || null,
        result: item.result || null,
        user_id: userId,
      };

      // Filter out duplicate ID if exists and prepend new record
      const updated = [newItem, ...history.filter((h) => h.id !== newItem.id)];
      const key = this.getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(updated));
      return newItem;
    } catch (e) {
      console.error('Lỗi lưu lịch sử check:', e);
      return null;
    }
  },

  /**
   * Clear all history for a user
   */
  clearHistory(userId = null) {
    try {
      const key = this.getStorageKey(userId);
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Lỗi xóa lịch sử:', e);
    }
  },

  /**
   * Default sample history items for display
   */
  getDefaultSampleHistory(userId) {
    return [
      {
        id: 'AI-2026-089',
        type: 'ai_detection',
        title: 'Đoạn văn miêu tả chú chó Mít (Phân tích PhoBERT AI Detector)',
        author: userId ? 'Người dùng' : 'Khách',
        date: new Date(Date.now() - 3600000).toISOString(),
        score: 92.4,
        status: 'Tín hiệu AI Cao',
        sourcesCount: 0,
        result: {
          ai_probability: 0.924,
          statistical_score_percentage: 92.4,
          ai_generated_percentage: 92.4,
          human_written_percentage: 7.6,
          summary: 'Rất cao (92.40%): văn bản có dấu hiệu mạnh do AI tạo ra.',
          sentence_heatmap: [
            { sentence_index: 0, sentence_range: 'Câu 1 - 3', text: 'Nhà em có nuôi một chú chó rất đáng yêu tên là Mít. Mít có bộ lông màu vàng óng, mềm mượt như một chiếc áo nhỏ lúc nào cũng sạch sẽ. Đôi mắt chú đen tròn, long lanh...', ai_score: 0.9101, is_ai: true },
            { sentence_index: 1, sentence_range: 'Câu 4 - 6', text: 'Hai chiếc tai lúc nào cũng vểnh lên mỗi khi nghe thấy tiếng động lạ. Chiếc mũi đen bóng và rất thính...', ai_score: 0.3889, is_ai: false },
            { sentence_index: 2, sentence_range: 'Câu 7 - 9', text: 'Mỗi buổi chiều, em thường chơi bóng cùng Mít ngoài sân. Chú chạy theo quả bóng, rồi ngoạm lấy và mang trở lại...', ai_score: 0.9300, is_ai: true }
          ]
        }
      },
      {
        id: 'PLAG-2026-001',
        type: 'plagiarism',
        title: 'Tiểu luận: Ứng dụng Học sâu trong nhận dạng giọng nói tiếng Việt',
        author: userId ? 'Người dùng' : 'Nguyễn Văn An',
        date: '2026-09-12T10:15:00Z',
        score: 68.0,
        status: 'Cần lưu ý',
        sourcesCount: 3,
      },
      {
        id: 'PLAG-2026-002',
        type: 'plagiarism',
        title: 'Đề xuất giải pháp kiến trúc Microservices trên nền Kubernetes',
        author: userId ? 'Người dùng' : 'Trần Thị Mai',
        date: '2026-09-11T14:30:00Z',
        score: 12.0,
        status: 'An toàn',
        sourcesCount: 1,
      },
    ];
  }
};

export default historyService;


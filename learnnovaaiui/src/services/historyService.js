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
        // Map local items for fast lookup and result preservation
        const localMap = new Map();
        localItems.forEach((item) => {
          if (item.id) localMap.set(item.id, item);
          if (item.document_id) localMap.set(item.document_id, item);
          if (item.id?.startsWith('PLAG-')) {
            const suffix = item.id.replace('PLAG-', '').toLowerCase();
            localMap.set(`suffix_${suffix}`, item);
          }
        });

        const dbItems = res.documents.map((doc) => {
          const docId = doc.id || `DOC-${Date.now()}`;
          const isAi = doc.type === 'ai_detection' || 
            (doc.ai_score != null && doc.ai_score > 0 && (!doc.plagiarism_score || doc.plagiarism_score === 0));
          
          const rawScore = isAi 
            ? (doc.ai_score ?? doc.score ?? 0) 
            : (doc.plagiarism_score ?? doc.score ?? 0);
          const score = typeof rawScore === 'number' ? Math.round(rawScore) : Number(rawScore) || 0;

          // Check if local cache has full result payload (e.g. detailed matches)
          const matchedLocal = localMap.get(docId) || 
            localMap.get(`suffix_${docId.slice(-6).toLowerCase()}`);

          const fullResult = doc.result_payload || doc.result || matchedLocal?.result || null;

          return {
            id: docId,
            document_id: docId,
            type: isAi ? 'ai_detection' : 'plagiarism',
            title: doc.title || (matchedLocal?.title) || 'Văn bản kiểm tra',
            author: doc.author || matchedLocal?.author || 'Người dùng',
            date: doc.created_at || doc.date || new Date().toISOString(),
            score: score,
            status: doc.status || (isAi 
              ? (score >= 50 ? 'Tín hiệu AI Cao' : 'Nội dung Người viết')
              : (score >= 50 ? 'Trùng lặp cao' : score >= 20 ? 'Cần xem xét' : 'Độc bản an toàn')),
            sourcesCount: doc.sources_count || (fullResult?.matches?.length ?? 0),
            sourceFile: doc.sourceFile || matchedLocal?.sourceFile || null,
            result: fullResult,
            user_id: userId,
          };
        });

        // Merge DB items with unique local-only items (AI checks or local sample data)
        const dbIds = new Set(dbItems.map((i) => i.id));
        const dbSuffixes = new Set(dbItems.map((i) => i.id.slice(-6).toLowerCase()));

        const localOnlyItems = localItems.filter((i) => {
          if (dbIds.has(i.id)) return false;
          if (i.document_id && dbIds.has(i.document_id)) return false;
          if (i.id?.startsWith('PLAG-')) {
            const suf = i.id.replace('PLAG-', '').toLowerCase();
            if (dbSuffixes.has(suf)) return false;
          }
          // Do not persist mock sample items once user has real DB items
          if (i.id?.startsWith('PLAG-2026-') || i.id?.startsWith('AI-2026-')) return false;
          return true;
        });

        const merged = [...dbItems, ...localOnlyItems];

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


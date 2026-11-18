// Chuyên mục tin Việt Nam: tab trên trang và tên feed RSS VnExpress tương ứng.
// Tách khỏi sources.ts để giao diện (chạy trên trình duyệt) dùng được mà không kéo theo code gọi nguồn.
export const VN_CATEGORIES = [
  { id: 'latest', label: 'Mới nhất', feed: 'tin-moi-nhat' },
  { id: 'society', label: 'Xã hội', feed: 'thoi-su' },
  { id: 'business', label: 'Kinh tế', feed: 'kinh-doanh' },
  { id: 'sports', label: 'Thể thao', feed: 'the-thao' },
  { id: 'tech', label: 'Công nghệ', feed: 'so-hoa' },
] as const;

export type VnCategoryId = (typeof VN_CATEGORIES)[number]['id'];

// Chủ đề của trang Game. "Tất cả" là RSS GameK; mỗi game còn lại là một truy vấn Google News, nên thêm game
// chỉ cần thêm một dòng ở đây. Cú pháp truy vấn giống ô tìm kiếm Google (dấu nháy để tìm cả cụm, OR).
export const GAME_TOPICS = [
  { id: 'all', label: 'Tất cả', query: null },
  { id: 'valorant', label: 'Valorant', query: 'Valorant' },
  {
    id: 'lol',
    label: 'Liên Minh Huyền Thoại',
    query: '"Liên Minh Huyền Thoại" OR LMHT OR "League of Legends"',
  },
] as const;

export type GameTopicId = (typeof GAME_TOPICS)[number]['id'];

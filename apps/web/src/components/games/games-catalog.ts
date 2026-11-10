// Danh sách game hiển thị ở /games. Thêm game mới chỉ cần thêm một mục ở đây
// cùng khoá i18n `games.<id>.{title,description,tags}`.
export type GameStatus = 'playable' | 'soon';

export type GameEntry = {
  id: string;
  href: string;
  status: GameStatus;
  /** Hai màu nền trời của ảnh bìa. */
  cover: [string, string];
  /** Banner 16:9 trên thẻ game (bản gốc nét cao để ở art-source/banner/). */
  banner: string;
  /**
   * Nhân vật đứng trên sân khấu đầu trang. Dùng bản ảnh nét cao (512px, thư mục hd/) vì ở đây
   * nhân vật hiện to — ảnh 256px trong game phóng lên sẽ mờ. Game không có nhân vật (Vẽ Đoán)
   * thì bỏ trống; chỉ game đứng đầu danh sách mới lên sân khấu.
   */
  cast?: { base: string; ids: string[] };
};

export const GAMES: GameEntry[] = [
  {
    id: 'bongBongBum',
    href: '/games/bong-bong-bum',
    status: 'playable',
    cover: ['#8fdcf8', '#3a9fe0'],
    banner: '/games/bong-bong-bum/banner.jpg',
    cast: {
      base: '/games/bong-bong-bum/characters/hd',
      ids: ['emberlark', 'frostline', 'voltrook'],
    },
  },
  {
    id: 'sonLanhDia',
    href: '/games/son-lanh-dia',
    status: 'playable',
    cover: ['#ffd6ec', '#7fd8f7'],
    banner: '/games/son-lanh-dia/banner.jpg',
    cast: { base: '/games/son-lanh-dia/characters', ids: ['mochi', 'bin', 'kem'] },
  },
  {
    id: 'veDoan',
    href: '/games/ve-doan',
    status: 'playable',
    cover: ['#2b2060', '#1b1440'],
    // Dựng từ art-source/ve-doan/banner.html (HTML/CSS của chính game), không phải ảnh tạo bằng AI.
    banner: '/games/ve-doan/banner.jpg',
  },
  {
    id: 'coCaNgua',
    href: '/games/co-ca-ngua',
    status: 'playable',
    cover: ['#2a3038', '#0e1013'],
    // Dựng từ art-source/co-ca-ngua/banner.html (HTML/CSS của chính game), không phải ảnh tạo bằng AI.
    banner: '/games/co-ca-ngua/banner.jpg',
  },
];

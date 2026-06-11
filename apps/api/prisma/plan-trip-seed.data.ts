import { DEFAULT_PLAN_TRIP_SLUG, type PlanTripUpsertBody } from '@atomic-habits/shared';

const ACCOMMODATION_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=80',
  'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=900&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80',
];

export const DEFAULT_PLAN_TRIP_SLUG_VALUE = DEFAULT_PLAN_TRIP_SLUG;

export const defaultPlanTripSeed: PlanTripUpsertBody & { slug: string } = {
  slug: DEFAULT_PLAN_TRIP_SLUG,
  name: 'Kế hoạch chuyến Vũng Tàu',
  description: 'Mọi thứ ở một nơi — ai đi, đi bằng gì, ở đâu và ăn gì trên đường.',
  eyebrow: 'Đi biển · Bạn bè & gia đình',
  datesLabel: 'Chiều CN 3/5 – Sáng T3 5/5/2026',
  members: [],
  transport: [
    {
      id: 'seed-transport-car',
      icon: 'car',
      title: 'Xe riêng',
      description: 'Phương án chính — linh hoạt giờ giấc và chỗ để hành lý.',
      details: [
        '2 xe · 7 chỗ mỗi xe · hẹn tập trung chiều CN 3/5 lúc 15:00',
        'Đi cao tốc CT01 → HCM–Long Thành–Dầu Giây → QL51',
        '~2 giờ · phí cao tốc ~150.000đ/xe',
        'Villa có chỗ đậu xe',
      ],
    },
    {
      id: 'seed-transport-ferry',
      icon: 'ferry',
      title: 'Phà Cát Lái (dự phòng)',
      description: 'Tuyến thay thế khi cao tốc kẹt — đẹp nhưng lâu hơn.',
      details: [
        'Phà Cát Lái → Nhơn Trạch → đường ven biển Vũng Tàu',
        'Phà chạy 24/7 · chờ ~15 phút · ~30.000đ/xe',
        'Phù hợp xe máy hoặc nhóm nhỏ',
        'Thêm 45–60 phút so với đi cao tốc',
      ],
    },
  ],
  accommodation: {
    eyebrow: 'Nơi lưu trú',
    name: 'Ocean Breeze Villa — Bãi Sau',
    address: '18 Trần Phú, Phường 1, Vũng Tàu, Bà Rịa–Vũng Tàu',
    checkInTime: 'CN 3/5/2026 · chiều, dự kiến ~17:30',
    checkOutTime: 'T3 5/5/2026 · sáng, trước 11:00',
    contactInfo: 'Chị Lan · 0903 456 789 · Ưu tiên Zalo/WhatsApp',
    amenities: [
      '4 phòng ngủ · ngủ tối đa 12 người',
      'Hồ bơi riêng',
      'Khu BBQ',
      'Bếp đầy đủ',
      'Biển cách 5 phút đi bộ',
      'Wi-Fi miễn phí',
      'Đậu được 3 xe',
    ],
    notes:
      'Mang khăn tắm đi biển. Giữ im lặng sau 22:00. Cổng hồ bơi có khóa an toàn trẻ em — đóng khi không dùng.',
    images: ACCOMMODATION_IMAGES,
  },
  itinerary: {
    days: [
      {
        id: 'seed-day-1',
        label: 'Ngày 1 — CN 3/5 (chiều)',
        entries: [
          {
            id: 'seed-day-1-entry-1',
            time: '15:00',
            title: 'Khởi hành từ TP.HCM',
            location: 'Điểm tập trung (thông báo sau)',
            type: 'travel',
          },
          {
            id: 'seed-day-1-entry-2',
            time: '17:30',
            title: 'Đến nơi & nhận phòng',
            location: 'Ocean Breeze Villa',
            type: 'activity',
          },
          {
            id: 'seed-day-1-entry-3',
            time: '18:30',
            title: 'Ăn tối',
            location: 'Chợ đêm gần Bãi Trước',
            meal: 'Hải sản xiên, bánh khọt',
            type: 'meal',
          },
          {
            id: 'seed-day-1-entry-4',
            time: '20:00',
            title: 'Dạo biển tối',
            location: 'Bãi Trước',
            type: 'activity',
          },
        ],
      },
      {
        id: 'seed-day-2',
        label: 'Ngày 2 — T2 4/5',
        entries: [
          {
            id: 'seed-day-2-entry-1',
            time: '08:00',
            title: 'Ăn sáng tại villa',
            location: 'Ocean Breeze Villa',
            meal: 'Bánh mì, trứng, trái cây — nấu chung',
            type: 'meal',
          },
          {
            id: 'seed-day-2-entry-2',
            time: '09:30',
            title: 'Tượng Chúa Kitô',
            location: 'Núi Nhỏ',
            type: 'activity',
          },
          {
            id: 'seed-day-2-entry-3',
            time: '12:00',
            title: 'Ăn trưa',
            location: 'Bánh Khọt Gốc Vườn',
            meal: 'Bánh khọt, nem nướng',
            type: 'meal',
          },
          {
            id: 'seed-day-2-entry-4',
            time: '14:30',
            title: 'Bơi & nghỉ ngơi',
            location: 'Villa',
            type: 'activity',
          },
          {
            id: 'seed-day-2-entry-5',
            time: '17:00',
            title: 'Dạo Bãi Trước',
            location: 'Bãi Trước',
            type: 'activity',
          },
          {
            id: 'seed-day-2-entry-6',
            time: '19:00',
            title: 'BBQ tối',
            location: 'Sân villa',
            meal: 'Hải sản & rau nướng — potluck cả nhóm',
            type: 'meal',
          },
        ],
      },
      {
        id: 'seed-day-3',
        label: 'Ngày 3 — T3 5/5 (sáng)',
        entries: [
          {
            id: 'seed-day-3-entry-1',
            time: '07:30',
            title: 'Cà phê sáng',
            location: 'Bãi Sau',
            meal: 'Cà phê sữa đá',
            type: 'meal',
          },
          {
            id: 'seed-day-3-entry-2',
            time: '09:00',
            title: 'Trả phòng & thu dọn',
            location: 'Ocean Breeze Villa',
            type: 'activity',
          },
          {
            id: 'seed-day-3-entry-3',
            time: '09:30',
            title: 'Về TP.HCM',
            location: 'Cao tốc CT01',
            type: 'travel',
          },
        ],
      },
    ],
  },
};

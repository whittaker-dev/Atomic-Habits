// Dữ liệu bàn Cờ tỷ phú: 40 ô quanh bàn theo hành trình Bắc → Nam, giá đất và tiền thuê, hai bộ thẻ
// sự kiện. Tiền tính bằng triệu đồng ("tr"). Số liệu kinh tế (tỉ lệ giá/tiền thuê) theo khung quen
// thuộc của thể loại cờ tỷ phú; tên ô, nhóm, thẻ và lời thẻ là của riêng game này.

/** Tám nhóm đất theo vùng; màu là màu bột sơn mài của nhóm. */
export const GROUPS = [
  { name: 'Tây Bắc', color: '#7a4424', house: 500 },
  { name: 'Vịnh Bắc Bộ', color: '#2f8f83', house: 500 },
  { name: 'Hà Nội', color: '#c8576b', house: 1000 },
  { name: 'Cố đô Huế', color: '#d9762b', house: 1000 },
  { name: 'Đà Nẵng – Hội An', color: '#b3261e', house: 1500 },
  { name: 'Cao nguyên & biển', color: '#d6a72c', house: 1500 },
  { name: 'Miền Tây', color: '#3e7d3a', house: 2000 },
  { name: 'Sài Gòn', color: '#2b3f7a', house: 2000 },
] as const;

export type Square =
  | { kind: 'go'; name: string }
  | { kind: 'jail'; name: string }
  | { kind: 'rest'; name: string }
  | { kind: 'toJail'; name: string }
  | { kind: 'land'; name: string; group: number; price: number; rent: readonly number[] }
  | { kind: 'station'; name: string; price: number }
  | { kind: 'utility'; name: string; price: number }
  | { kind: 'luck'; name: string }
  | { kind: 'gift'; name: string }
  | { kind: 'tax'; name: string; amount: number };

const land = (name: string, group: number, price: number, rent: number[]): Square => ({
  kind: 'land',
  name,
  group,
  price,
  // Tiền thuê: [chưa xây, 1 nhà, 2 nhà, 3 nhà, 4 nhà, khách sạn].
  rent,
});

export const BOARD: Square[] = [
  { kind: 'go', name: 'Xuất phát' },
  land('Hà Giang', 0, 600, [20, 100, 300, 900, 1600, 2500]),
  { kind: 'gift', name: 'Lì xì' },
  land('Sa Pa', 0, 600, [40, 200, 600, 1800, 3200, 4500]),
  { kind: 'tax', name: 'Thuế thu nhập', amount: 2000 },
  { kind: 'station', name: 'Ga Hà Nội', price: 2000 },
  land('Ninh Bình', 1, 1000, [60, 300, 900, 2700, 4000, 5500]),
  { kind: 'luck', name: 'Vận may' },
  land('Cát Bà', 1, 1000, [60, 300, 900, 2700, 4000, 5500]),
  land('Hạ Long', 1, 1200, [80, 400, 1000, 3000, 4500, 6000]),
  { kind: 'jail', name: 'Tạm giữ' },
  land('Phố Hàng Đào', 2, 1400, [100, 500, 1500, 4500, 6250, 7500]),
  { kind: 'utility', name: 'Điện lực', price: 1500 },
  land('Tràng Tiền', 2, 1400, [100, 500, 1500, 4500, 6250, 7500]),
  land('Hồ Gươm', 2, 1600, [120, 600, 1800, 5000, 7000, 9000]),
  { kind: 'station', name: 'Ga Huế', price: 2000 },
  land('Đại Nội', 3, 1800, [140, 700, 2000, 5500, 7500, 9500]),
  { kind: 'gift', name: 'Lì xì' },
  land('Lăng Cô', 3, 1800, [140, 700, 2000, 5500, 7500, 9500]),
  land('Phong Nha', 3, 2000, [160, 800, 2200, 6000, 8000, 10000]),
  { kind: 'rest', name: 'Nghỉ chân' },
  land('Bà Nà', 4, 2200, [180, 900, 2500, 7000, 8750, 10500]),
  { kind: 'luck', name: 'Vận may' },
  land('Hội An', 4, 2200, [180, 900, 2500, 7000, 8750, 10500]),
  land('Cầu Rồng', 4, 2400, [200, 1000, 3000, 7500, 9250, 11000]),
  { kind: 'station', name: 'Ga Đà Nẵng', price: 2000 },
  land('Đà Lạt', 5, 2600, [220, 1100, 3300, 8000, 9750, 11500]),
  land('Nha Trang', 5, 2600, [220, 1100, 3300, 8000, 9750, 11500]),
  { kind: 'utility', name: 'Nước sạch', price: 1500 },
  land('Mũi Né', 5, 2800, [240, 1200, 3600, 8500, 10250, 12000]),
  { kind: 'toJail', name: 'Bị tạm giữ' },
  land('Cần Thơ', 6, 3000, [260, 1300, 3900, 9000, 11000, 12750]),
  land('Phú Quốc', 6, 3000, [260, 1300, 3900, 9000, 11000, 12750]),
  { kind: 'gift', name: 'Lì xì' },
  land('Côn Đảo', 6, 3200, [280, 1500, 4500, 10000, 12000, 14000]),
  { kind: 'station', name: 'Ga Sài Gòn', price: 2000 },
  { kind: 'luck', name: 'Vận may' },
  land('Chợ Bến Thành', 7, 3500, [350, 1750, 5000, 11000, 13000, 15000]),
  { kind: 'tax', name: 'Thuế xa xỉ', amount: 1000 },
  land('Phố Nguyễn Huệ', 7, 4000, [500, 2000, 6000, 14000, 17000, 20000]),
];

export const SIZE = BOARD.length;
export const JAIL = 10;
export const GO_SALARY = 2000;
export const JAIL_FINE = 500;
export const START_CASH = 15000;
export const HOTEL = 5;

export const isOwnable = (s: Square) =>
  s.kind === 'land' || s.kind === 'station' || s.kind === 'utility';
export const priceOf = (s: Square) => (isOwnable(s) ? (s as { price: number }).price : 0);
export const OWNABLE = BOARD.map((s, i) => (isOwnable(s) ? i : -1)).filter((i) => i >= 0);
/** Các ô thuộc một nhóm đất. */
export const groupSquares = (group: number) =>
  BOARD.map((s, i) => (s.kind === 'land' && s.group === group ? i : -1)).filter((i) => i >= 0);
export const STATIONS = BOARD.map((s, i) => (s.kind === 'station' ? i : -1)).filter((i) => i >= 0);
export const UTILITIES = BOARD.map((s, i) => (s.kind === 'utility' ? i : -1)).filter((i) => i >= 0);

/** Hiển thị tiền: 15.000 tr. */
export const money = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} tr`;

export type CardEffect =
  | { t: 'money'; amount: number }
  | { t: 'moveTo'; square: number }
  | { t: 'moveBy'; steps: number }
  | { t: 'nearest'; kind: 'station' | 'utility' }
  | { t: 'jail' }
  | { t: 'freeJail' }
  | { t: 'repairs'; house: number; hotel: number }
  /** Mỗi người chơi khác đưa (amount > 0) hoặc nhận (amount < 0) chừng này. */
  | { t: 'each'; amount: number };

export type Card = { text: string; effect: CardEffect };

/** Vận may: phần lớn là đi lại trên bàn. */
export const LUCK: Card[] = [
  {
    text: 'Chuyến bay sớm: tới thẳng Xuất phát, nhận 2.000 tr.',
    effect: { t: 'moveTo', square: 0 },
  },
  { text: 'Đặt được vé rẻ ra Phú Quốc.', effect: { t: 'moveTo', square: 32 } },
  { text: 'Hẹn bạn ở Hồ Gươm.', effect: { t: 'moveTo', square: 14 } },
  { text: 'Đi công tác Phố Nguyễn Huệ.', effect: { t: 'moveTo', square: 39 } },
  { text: 'Ra ga gần nhất bắt tàu.', effect: { t: 'nearest', kind: 'station' } },
  { text: 'Ra ga gần nhất bắt tàu.', effect: { t: 'nearest', kind: 'station' } },
  { text: 'Kiểm tra đồng hồ ở trạm gần nhất.', effect: { t: 'nearest', kind: 'utility' } },
  { text: 'Quên ví ở quán, quay lại 3 ô.', effect: { t: 'moveBy', steps: -3 } },
  { text: 'Đi xe không đội mũ bảo hiểm: bị tạm giữ.', effect: { t: 'jail' } },
  { text: 'Có người quen: thẻ ra khỏi tạm giữ, giữ dùng sau.', effect: { t: 'freeJail' } },
  { text: 'Trúng vé số giải ba: nhận 1.500 tr.', effect: { t: 'money', amount: 1500 } },
  { text: 'Cổ tức cuối năm: nhận 500 tr.', effect: { t: 'money', amount: 500 } },
  { text: 'Vượt đèn đỏ: nộp phạt 150 tr.', effect: { t: 'money', amount: -150 } },
  {
    text: 'Sửa sang cơ ngơi: mỗi nhà 250 tr, mỗi khách sạn 1.000 tr.',
    effect: { t: 'repairs', house: 250, hotel: 1000 },
  },
  {
    text: 'Được bầu trưởng hội đồng hương: chiêu đãi mỗi người 500 tr.',
    effect: { t: 'each', amount: -500 },
  },
  { text: 'Khoản vay đáo hạn có lãi: nhận 1.500 tr.', effect: { t: 'money', amount: 1500 } },
];

/** Lì xì: phần lớn là tiền vào tiền ra. */
export const GIFT: Card[] = [
  { text: 'Lì xì đầu năm: nhận 1.000 tr.', effect: { t: 'money', amount: 1000 } },
  {
    text: 'Ngân hàng tính nhầm có lợi cho bạn: nhận 2.000 tr.',
    effect: { t: 'money', amount: 2000 },
  },
  { text: 'Hoàn thuế: nhận 200 tr.', effect: { t: 'money', amount: 200 } },
  { text: 'Sinh nhật bạn: mỗi người mừng 100 tr.', effect: { t: 'each', amount: 100 } },
  { text: 'Bán được lô gốm Bát Tràng: nhận 450 tr.', effect: { t: 'money', amount: 450 } },
  { text: 'Tiền lãi tiết kiệm: nhận 1.000 tr.', effect: { t: 'money', amount: 1000 } },
  { text: 'Bảo hiểm đáo hạn: nhận 1.000 tr.', effect: { t: 'money', amount: 1000 } },
  { text: 'Nhận thừa kế: 1.000 tr.', effect: { t: 'money', amount: 1000 } },
  { text: 'Phí bác sĩ: nộp 500 tr.', effect: { t: 'money', amount: -500 } },
  { text: 'Viện phí: nộp 1.000 tr.', effect: { t: 'money', amount: -1000 } },
  { text: 'Học phí cho con: nộp 500 tr.', effect: { t: 'money', amount: -500 } },
  { text: 'Tiền điện mùa hè tăng vọt: nộp 300 tr.', effect: { t: 'money', amount: -300 } },
  { text: 'Phí tư vấn: nhận 250 tr.', effect: { t: 'money', amount: 250 } },
  { text: 'Đi thẳng tới Xuất phát, nhận 2.000 tr.', effect: { t: 'moveTo', square: 0 } },
  { text: 'Kê khai thiếu: bị tạm giữ.', effect: { t: 'jail' } },
  { text: 'Được bảo lãnh: thẻ ra khỏi tạm giữ, giữ dùng sau.', effect: { t: 'freeJail' } },
];

/** Màu và tên quân của sáu người chơi. */
export const TOKENS = [
  { name: 'Son', color: '#c0392b' },
  { name: 'Ngọc', color: '#1f9e89' },
  { name: 'Vàng', color: '#d9a62e' },
  { name: 'Chàm', color: '#3a5bb8' },
  { name: 'Ngà', color: '#e9dfc9' },
  { name: 'Tím', color: '#8b4bb5' },
] as const;
export const MAX_PLAYERS = TOKENS.length;

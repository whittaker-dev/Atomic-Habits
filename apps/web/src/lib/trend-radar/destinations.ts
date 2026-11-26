// Quốc gia và thành phố cho ô chọn nơi ở trang Du lịch. Tách khỏi sources.ts để giao diện dùng được.
//
// id là mã địa điểm của Open-Meteo (GeoNames), lấy bằng API tìm kiếm của họ (lọc theo nước, chọn nơi đông dân
// nhất). name là tên hiển thị và cũng là từ khoá tìm tin, nên ghi theo cách báo Việt hay viết, không theo
// tên trong dữ liệu gốc (ví dụ dữ liệu gốc ghi "Thành Phố Hạ Long", "Jeju City", "Nhân Xuyên").

export type City = { id: number; name: string };

export type PopularCountry = { name: string; cities: readonly City[] };

/**
 * Các nước người Việt hay đi, mỗi nước vài thành phố gợi ý; thành phố đầu tiên được mở khi chọn nước.
 * Tên nước ghi sẵn ở đây (không lấy từ Intl) vì danh sách này được vẽ cả ở server lẫn trình duyệt, mà Node
 * và trình duyệt có thể đặt tên nước khác nhau, làm React báo lệch khi hydrate.
 */
export const POPULAR_DESTINATIONS: Record<string, PopularCountry> = {
  VN: {
    name: 'Việt Nam',
    cities: [
      { id: 1583992, name: 'Đà Nẵng' },
      { id: 1581130, name: 'Hà Nội' },
      { id: 1566083, name: 'TP. Hồ Chí Minh' },
      { id: 8531735, name: 'Phú Quốc' },
      { id: 1580541, name: 'Hội An' },
      { id: 1580240, name: 'Huế' },
      { id: 1572151, name: 'Nha Trang' },
      { id: 1584071, name: 'Đà Lạt' },
      { id: 1580410, name: 'Hạ Long' },
      { id: 1568043, name: 'Sa Pa' },
      { id: 1562414, name: 'Vũng Tàu' },
      { id: 1568574, name: 'Quy Nhơn' },
    ],
  },
  JP: {
    name: 'Nhật Bản',
    cities: [
      { id: 1850147, name: 'Tokyo' },
      { id: 1853909, name: 'Osaka' },
      { id: 1857910, name: 'Kyoto' },
      { id: 2128295, name: 'Sapporo' },
      { id: 1863967, name: 'Fukuoka' },
      { id: 1856057, name: 'Nagoya' },
      { id: 1856035, name: 'Okinawa (Naha)' },
    ],
  },
  KR: {
    name: 'Hàn Quốc',
    cities: [
      { id: 1835848, name: 'Seoul' },
      { id: 1838524, name: 'Busan' },
      { id: 1846266, name: 'Jeju' },
      { id: 1843564, name: 'Incheon' },
    ],
  },
  CN: {
    name: 'Trung Quốc',
    // Nhiều nơi ở đây người Việt gọi bằng tên Hán Việt; nguồn địa danh không biết vài tên (Đại Lý, Phượng Hoàng),
    // nên phải có sẵn ở đây thì gõ tên Hán Việt mới ra.
    cities: [
      { id: 1816670, name: 'Bắc Kinh' },
      { id: 1796236, name: 'Thượng Hải' },
      { id: 1809858, name: 'Quảng Châu' },
      { id: 1795565, name: 'Thâm Quyến' },
      { id: 1815286, name: 'Thành Đô' },
      { id: 1814906, name: 'Trùng Khánh' },
      { id: 1804651, name: 'Côn Minh' },
      { id: 1814093, name: 'Đại Lý' },
      { id: 1813253, name: 'Lệ Giang' },
      { id: 7910932, name: 'Shangri-La' },
      { id: 1813171, name: 'Trương Gia Giới' },
      { id: 7304020, name: 'Phượng Hoàng cổ trấn' },
      { id: 1809498, name: 'Quế Lâm' },
      { id: 1799869, name: 'Nam Ninh' },
      { id: 1808926, name: 'Hàng Châu' },
      { id: 1886760, name: 'Tô Châu' },
      { id: 1799962, name: 'Nam Kinh' },
      { id: 1790630, name: 'Tây An' },
      { id: 1790645, name: 'Hạ Môn' },
      { id: 1796556, name: 'Tam Á' },
      { id: 2037013, name: 'Cáp Nhĩ Tân' },
    ],
  },
  TW: {
    name: 'Đài Loan',
    cities: [
      { id: 1668341, name: 'Đài Bắc' },
      { id: 1673820, name: 'Cao Hùng' },
      { id: 1668399, name: 'Đài Trung' },
    ],
  },
  TH: {
    name: 'Thái Lan',
    cities: [
      { id: 1609350, name: 'Bangkok' },
      { id: 1153671, name: 'Chiang Mai' },
      { id: 1151254, name: 'Phuket' },
      { id: 1614295, name: 'Pattaya' },
    ],
  },
  SG: { name: 'Singapore', cities: [{ id: 1880252, name: 'Singapore' }] },
  MY: {
    name: 'Malaysia',
    cities: [
      { id: 1735161, name: 'Kuala Lumpur' },
      { id: 1735106, name: 'Penang' },
      { id: 1734759, name: 'Malacca' },
      { id: 1733432, name: 'Kota Kinabalu' },
    ],
  },
  ID: {
    name: 'Indonesia',
    cities: [
      { id: 1645528, name: 'Bali (Denpasar)' },
      { id: 1642911, name: 'Jakarta' },
      { id: 1621177, name: 'Yogyakarta' },
    ],
  },
  PH: {
    name: 'Philippines',
    cities: [
      { id: 1701668, name: 'Manila' },
      { id: 1717512, name: 'Cebu' },
    ],
  },
  KH: {
    name: 'Campuchia',
    cities: [
      { id: 1821306, name: 'Phnom Penh' },
      { id: 1822214, name: 'Siem Reap' },
    ],
  },
  LA: {
    name: 'Lào',
    cities: [
      { id: 1651944, name: 'Viêng Chăn' },
      { id: 1655559, name: 'Luang Prabang' },
    ],
  },
  AU: {
    name: 'Úc',
    cities: [
      { id: 2147714, name: 'Sydney' },
      { id: 2158177, name: 'Melbourne' },
      { id: 2174003, name: 'Brisbane' },
    ],
  },
  FR: {
    name: 'Pháp',
    cities: [
      { id: 2988507, name: 'Paris' },
      { id: 2990440, name: 'Nice' },
      { id: 2996944, name: 'Lyon' },
    ],
  },
  GB: {
    name: 'Anh',
    cities: [
      { id: 2643743, name: 'London' },
      { id: 2650225, name: 'Edinburgh' },
      { id: 2643123, name: 'Manchester' },
    ],
  },
  IT: {
    name: 'Ý',
    cities: [
      { id: 3169070, name: 'Rome' },
      { id: 3173435, name: 'Milan' },
      { id: 3164603, name: 'Venice' },
      { id: 3176959, name: 'Florence' },
    ],
  },
  DE: {
    name: 'Đức',
    cities: [
      { id: 2950159, name: 'Berlin' },
      { id: 2867714, name: 'Munich' },
      { id: 2925533, name: 'Frankfurt' },
    ],
  },
  CH: {
    name: 'Thụy Sĩ',
    cities: [
      { id: 2657896, name: 'Zurich' },
      { id: 2660646, name: 'Geneva' },
      { id: 2659811, name: 'Lucerne' },
    ],
  },
  US: {
    name: 'Mỹ',
    cities: [
      { id: 5128581, name: 'New York' },
      { id: 5368361, name: 'Los Angeles' },
      { id: 5391959, name: 'San Francisco' },
      { id: 5506956, name: 'Las Vegas' },
    ],
  },
  AE: {
    name: 'UAE (Dubai)',
    cities: [
      { id: 292223, name: 'Dubai' },
      { id: 292968, name: 'Abu Dhabi' },
    ],
  },
};

export const DEFAULT_PLACE_ID = 1583992;

/** Tên hiển thị của một thành phố gợi ý, hoặc null nếu mã không nằm trong danh sách gợi ý. */
export function curatedCityName(id: number): string | null {
  for (const { cities } of Object.values(POPULAR_DESTINATIONS)) {
    const city = cities.find((c) => c.id === id);
    if (city) return city.name;
  }
  return null;
}

// Mọi mã nước ISO 3166-1 alpha-2, để chọn được cả những nước không có trong danh sách gợi ý.
// Tên tiếng Việt lấy từ Intl.DisplayNames nên không cần lưu ở đây.
const ALL_COUNTRY_CODES = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW ' +
  'BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI ' +
  'FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN ' +
  'IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME ' +
  'MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF ' +
  'PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV ' +
  'SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE ' +
  'YT ZA ZM ZW'
).split(' ');

export type Country = { code: string; name: string };

/**
 * Mọi quốc gia, tên tiếng Việt, xếp theo tên. Chỉ gọi trên trình duyệt (sau khi trang đã hydrate): tên từ Intl
 * khác nhau giữa Node và từng trình duyệt nên không vẽ được giống hệt ở server.
 */
export function allCountries(): Country[] {
  const names = new Intl.DisplayNames(['vi'], { type: 'region' });
  return ALL_COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code }))
    .filter((c) => c.name !== c.code)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

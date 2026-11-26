// Đổi mã thời tiết WMO (Open-Meteo trả về) sang chữ tiếng Việt và nhóm biểu tượng. Tách khỏi sources.ts để
// giao diện chạy trên trình duyệt dùng được. Bảng mã: https://open-meteo.com/en/docs (mục "WMO Weather interpretation codes").

export type WeatherKind =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm';

const CODES: Record<number, [string, WeatherKind]> = {
  0: ['Trời quang', 'clear'],
  1: ['Ít mây', 'partly'],
  2: ['Có mây', 'partly'],
  3: ['Nhiều mây', 'cloudy'],
  45: ['Sương mù', 'fog'],
  48: ['Sương mù đóng băng', 'fog'],
  51: ['Mưa phùn nhẹ', 'drizzle'],
  53: ['Mưa phùn', 'drizzle'],
  55: ['Mưa phùn dày', 'drizzle'],
  56: ['Mưa phùn băng giá', 'drizzle'],
  57: ['Mưa phùn băng giá', 'drizzle'],
  61: ['Mưa nhỏ', 'rain'],
  63: ['Mưa vừa', 'rain'],
  65: ['Mưa to', 'rain'],
  66: ['Mưa băng giá', 'rain'],
  67: ['Mưa băng giá', 'rain'],
  71: ['Tuyết rơi nhẹ', 'snow'],
  73: ['Tuyết rơi', 'snow'],
  75: ['Tuyết rơi dày', 'snow'],
  77: ['Hạt tuyết', 'snow'],
  80: ['Mưa rào nhẹ', 'rain'],
  81: ['Mưa rào', 'rain'],
  82: ['Mưa rào rất to', 'rain'],
  85: ['Mưa tuyết', 'snow'],
  86: ['Mưa tuyết dày', 'snow'],
  95: ['Dông', 'storm'],
  96: ['Dông kèm mưa đá', 'storm'],
  99: ['Dông kèm mưa đá lớn', 'storm'],
};

export function describeWeather(code: number): { label: string; kind: WeatherKind } {
  const [label, kind] = CODES[code] ?? ['Không rõ', 'cloudy'];
  return { label, kind };
}

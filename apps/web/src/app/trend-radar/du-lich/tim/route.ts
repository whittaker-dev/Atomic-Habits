import { NextResponse, type NextRequest } from 'next/server';
import { searchPlaces } from '@/lib/trend-radar/sources';

// Gợi ý thành phố cho ô chọn nơi ở trang Du lịch. Đi qua server để mọi lời gọi nguồn ngoài nằm chung một chỗ
// (sources.ts) và được cache như các nguồn khác.
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  // Mã nước 2 chữ (ví dụ JP) để chỉ gợi ý thành phố trong nước đang chọn; giá trị khác bị bỏ qua.
  const country = request.nextUrl.searchParams.get('country')?.toUpperCase() ?? '';
  if (query.length < 2) return NextResponse.json({ places: [] });
  try {
    const places = await searchPlaces(
      query.slice(0, 80),
      /^[A-Z]{2}$/.test(country) ? country : undefined,
    );
    return NextResponse.json({ places });
  } catch (err) {
    console.error('[trend-radar] tìm địa điểm', err);
    return NextResponse.json(
      { places: [], error: 'Không tìm được địa điểm lúc này.' },
      { status: 502 },
    );
  }
}

import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../..'),
  images: {
    // Ảnh tin của /trend-radar. VnExpress chỉ trả ảnh 1200px (URL có chữ ký, không đổi cỡ được),
    // nên để Next thu nhỏ lại thay vì bắt người xem tải vài MB ảnh cho mấy ô thumbnail.
    remotePatterns: [
      { protocol: 'https', hostname: '*.vnecdn.net' },
      { protocol: 'https', hostname: '*.mediacdn.vn' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: '*.gstatic.com' },
      // Ảnh địa điểm (Wikipedia) và ảnh khách sạn (TripAdvisor) ở trang Du lịch.
      // Mỗi bên phát ảnh từ vài tên miền con (Wikipedia: upload., thumb.), nên cho cả tên miền.
      { protocol: 'https', hostname: '**.wikimedia.org' },
      { protocol: 'https', hostname: '**.tripadvisor.com' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/vung-tau-trip',
        destination: '/plan-trip',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { TrendRadarData } from '@/lib/trend-radar/sources';

// Dữ liệu được tải một lần ở layout rồi chia cho mọi trang con qua context, để chuyển qua lại giữa
// các mục không phải gửi lại cùng một khối dữ liệu.

type Value = { data: TrendRadarData; now: number };

const TrendRadarContext = createContext<Value | null>(null);

export function TrendRadarProvider({
  data,
  children,
}: {
  data: TrendRadarData;
  children: ReactNode;
}) {
  // Lần vẽ đầu dùng giờ lấy dữ liệu để khớp với HTML của server; sau đó mới chuyển sang giờ thật
  // của máy và cập nhật mỗi phút cho các nhãn "x phút trước".
  const [now, setNow] = useState(() => Date.parse(data.fetchedAt));
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return <TrendRadarContext.Provider value={{ data, now }}>{children}</TrendRadarContext.Provider>;
}

export function useTrendRadar(): Value {
  const value = useContext(TrendRadarContext);
  if (!value) throw new Error('useTrendRadar phải nằm trong TrendRadarProvider');
  return value;
}

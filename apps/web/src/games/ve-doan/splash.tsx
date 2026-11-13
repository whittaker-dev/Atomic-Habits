'use client';

import { useEffect, useRef, useState } from 'react';
import { BulbString, Marquee } from './kit';
import { loadRoomSave } from './online';
import { DISPLAY } from './theme';

// Màn loading lúc mới vào Vẽ Đoán: biển hiệu đèn chạy viền như sân khấu hội chợ sắp mở màn, dưới
// là dây bóng đèn sáng dần theo tiến độ tải thật (các mặt chữ Lalezar / Be Vietnam Pro, phần vẽ mã
// QR của phòng chờ). Tải xong thì mờ dần; hiện ít nhất một nhịp cho kịp nhìn, lâu nhất vài giây
// (mạng chậm thì vào trước, chữ tự đổi sang font riêng khi tải về).

const MIN_MS = 1200;
const MAX_MS = 8000;
const FADE_MS = 450;
const BULBS = 12;

/** Các mặt chữ màn đầu dùng tới (đúng các độ đậm trong FONT_URL). */
const FACES = [
  "400 1em 'Lalezar'",
  "500 1em 'Be Vietnam Pro'",
  "600 1em 'Be Vietnam Pro'",
  "700 1em 'Be Vietnam Pro'",
  "800 1em 'Be Vietnam Pro'",
];
// Google Fonts tách chữ có dấu ra tệp riêng và chỉ tải khi trang cần: mẫu có dấu để tải luôn phần đó,
// không thì chữ tiếng Việt vẫn nháy font khi vào màn chính.
const SAMPLE = 'Vẽ Đoán ạ';

export function Splash({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    // F5 trong phòng: chủ phòng là đồng hồ của cả phòng, khách đang chờ nối lại, người vẽ đang mất
    // giờ — không giữ màn này thêm nhịp nào, font lúc đó đã nằm sẵn trong bộ nhớ đệm.
    const back = loadRoomSave() !== null;
    let alive = true;
    let finished = 0;
    const jobs: Promise<unknown>[] = [
      ...FACES.map((face) => document.fonts?.load(face, SAMPLE) ?? Promise.resolve()),
      // Mã QR ở phòng chờ vẽ bằng thư viện tải riêng: tải trước để mở phòng là QR hiện ngay.
      import('qrcode'),
    ].map((job) =>
      // Lỗi tải thì vẫn vào game: chữ dùng font dự phòng, QR tự tải lại lúc mở phòng.
      job
        .catch(() => undefined)
        .then(() => {
          finished++;
        }),
    );

    const t0 = performance.now();
    // Mỗi phần tải xong là một nấc thật; giữa các nấc thanh tự nhích dần, dừng ở 90%.
    let raf = 0;
    const tick = () => {
      const guess = 0.9 * (1 - Math.exp(-((performance.now() - t0) / 1000) * 1.2));
      setProgress((p) => Math.max(p, finished / jobs.length, guess));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const ready = Promise.all([
      ...jobs,
      document.fonts?.ready ?? Promise.resolve(),
      wait(back ? 0 : reduce ? 200 : MIN_MS),
    ]);
    void Promise.race([ready, wait(MAX_MS)]).then(() => {
      if (!alive) return;
      cancelAnimationFrame(raf);
      setProgress(1);
      setLeaving(true);
      setTimeout(() => alive && done.current(), reduce ? 0 : FADE_MS);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const percent = Math.round(progress * 100);
  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-10 bg-[color:var(--vd-tarp)] bg-[radial-gradient(110%_55%_at_50%_-8%,var(--vd-tarpHi)_0%,transparent_70%)] px-6 transition-opacity duration-[450ms] motion-reduce:transition-none ${leaving ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="w-full max-w-sm">
        <Marquee>
          <p
            className={`${DISPLAY} pt-3 text-[68px] leading-[0.9] text-[color:var(--vd-gold)] [text-shadow:0_3px_0_var(--vd-redDeep),0_0_24px_rgb(255_201_60/0.45)]`}
          >
            Vẽ Đoán
          </p>
          <p className="mt-1 text-[15px] font-semibold text-[color:var(--vd-bulb)]">
            Sân khấu sắp mở màn…
          </p>
        </Marquee>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {/* Thanh tiến độ là dây đèn đếm giờ của game: mỗi phần tải xong sáng thêm bóng. */}
        <div
          role="progressbar"
          aria-label="Đang tải Vẽ Đoán"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          {/* Dây đèn mang role="timer" ("Còn N giây") của đồng hồ trong trận: ẩn khỏi trình đọc
              màn hình, thanh tiến độ bên ngoài đã báo phần trăm. */}
          <div aria-hidden>
            <BulbString total={BULBS} lit={Math.round(progress * BULBS)} perRow={BULBS} />
          </div>
        </div>
        <p
          aria-hidden
          className="text-center text-xs font-bold tracking-[0.12em] text-[color:var(--vd-mute)] uppercase tabular-nums"
        >
          Lên đèn {percent}%
        </p>
      </div>
    </div>
  );
}

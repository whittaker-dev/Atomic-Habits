import { boardFloor } from './art';

// Những gì màn loading nạp trước khi vào Cờ cá ngựa. Game không có ảnh hay âm thanh tải về (cảnh 3D
// vẽ bằng canvas trong art.ts, tiếng tổng hợp bằng WebAudio), nên thứ phải chờ là font: Anton cho
// tiêu đề, nút và số bậc khắc trên mặt bàn; Barlow Semi Condensed cho chữ thường. Font về rồi thì
// vẽ sẵn mặt bàn đá — phần nặng nhất khi dựng cảnh 3D — để vào ván (kể cả ván dở sau F5) không khựng.

// Câu mẫu có dấu: Google Fonts chia mỗi font thành mảnh latin / latin-ext / vietnamese theo dải ký
// tự; đo bằng chữ không dấu thì mảnh tiếng Việt chưa tải và chữ có dấu vẫn nháy font khi vào game.
const SAMPLE = 'Cờ cá ngựa · Đổ 123456';
const FACES = ['1em Anton', ...[500, 600, 700, 800].map((w) => `${w} 1em "Barlow Semi Condensed"`)];

/**
 * Nạp từng font rồi vẽ sẵn mặt bàn; `onProgress` nhận 0..1 sau mỗi việc xong. Font lỗi không chặn
 * game: trình duyệt dùng font dự phòng như khi chưa có màn loading.
 */
export async function preloadAssets(onProgress: (progress: number) => void) {
  const total = FACES.length + 1;
  let done = 0;
  const step = () => onProgress(++done / total);
  await Promise.all(
    FACES.map((face) =>
      document.fonts
        .load(face, SAMPLE)
        .catch(() => undefined)
        .then(step),
    ),
  );
  await document.fonts.ready;
  // Vẽ mặt bàn chặn luồng chính một lúc: nhường một nhịp để màn loading kịp hiện tiến độ font trước.
  await new Promise((r) => setTimeout(r, 0));
  boardFloor();
  step();
}

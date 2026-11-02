// Viết caption cho 1 video bằng Claude.
// Dùng:  node scripts/write-caption.mjs queue/ngay-tap-nguc.mp4
// Đọc brief từ queue/<tên>.json, ghi caption ra queue/<tên>.caption.txt
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadEnv, sidecar} from './lib.mjs';

const SYSTEM = `Bạn là người viết caption cho Facebook Page "Rise Core Day" — kênh hướng dẫn tập gym và ăn uống cho người mới, có 2 nhân vật hoạt hình: Coach Tạ (huấn luyện viên) và Tí (bạn mới tập).
Giọng văn: tiếng Việt, thân thiện như bạn tập cùng, câu ngắn, dễ đọc trên điện thoại.
Cấu trúc caption:
1. Dòng đầu là hook gây tò mò (dưới 80 ký tự).
2. 3–6 dòng tóm tắt nội dung chính, mỗi dòng bắt đầu bằng 1 emoji phù hợp.
3. 1 câu kêu gọi lưu bài / bình luận.
4. 5–8 hashtag tiếng Việt và tiếng Anh liên quan.
Quy tắc: chỉ dùng thông tin có trong brief, không bịa số liệu hay cam kết kết quả (ví dụ "lên 5kg cơ trong 1 tháng"). Không nói xấu cơ thể ai. Nếu có lời khuyên dinh dưỡng thì giữ nguyên con số trong brief.
Chỉ trả về đúng nội dung caption, không thêm lời dẫn.`;

export async function writeCaption(videoPath) {
  loadEnv();
  const briefPath = sidecar(videoPath, '.json');
  const outPath = sidecar(videoPath, '.caption.txt');
  if (!fs.existsSync(briefPath)) throw new Error(`Không thấy brief ${briefPath}`);
  const brief = JSON.parse(fs.readFileSync(briefPath, 'utf8'));

  if (fs.existsSync(outPath)) {
    console.log(`ℹ️ Đã có caption sẵn: ${outPath} (xóa file này nếu muốn Claude viết lại)`);
    return fs.readFileSync(outPath, 'utf8');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    if (!brief.fallbackCaption) throw new Error('Thiếu ANTHROPIC_API_KEY và brief không có fallbackCaption');
    fs.writeFileSync(outPath, brief.fallbackCaption);
    return brief.fallbackCaption;
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
      max_tokens: 800,
      system: SYSTEM,
      messages: [{role: 'user', content: `Brief video:\n${JSON.stringify(brief, null, 2)}`}],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Claude API lỗi ${res.status}: ${json.error?.message || JSON.stringify(json).slice(0, 300)}`);
  const caption = json.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  fs.writeFileSync(outPath, caption);
  console.log(`✍️  Caption đã ghi vào ${outPath}`);
  return caption;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = process.argv[2];
  if (!v) {
    console.error('Dùng: node scripts/write-caption.mjs queue/<video>.mp4');
    process.exit(1);
  }
  console.log(await writeCaption(v));
}

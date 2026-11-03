#!/usr/bin/env bash
# Làm trọn 1 bài tiếng Anh tới hàng đợi: giọng đọc (có nghe lại) → render → chuẩn hoá cho Reels →
# ../queue/<id>.mp4 + brief .json + .caption.txt. Sau đó chạy `node scripts/run-next.mjs` trong risecore/
# để tải lên mục Nháp.
# Dùng:  scripts/build-lesson.sh bai-02-thank-you TiengAnh-02-ThankYou
set -euo pipefail

id="$1"
comp="$2"
queue="../queue/$id"

node scripts/make-voice.mjs "$id"
npx remotion render "$comp" "out/$id.mp4" --log=error
# Chuẩn hoá giống quy ước trong risecore/CLAUDE.md (yuv420p, GOP đóng 2s, AAC 48kHz)
ffmpeg -v error -y -i "out/$id.mp4" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 -g 60 -keyint_min 60 \
  -sc_threshold 0 -flags +cgop -c:a aac -b:a 160k -ar 48000 -ac 2 -movflags +faststart "$queue.mp4"
# Ảnh bìa — run-next.mjs gắn vào video sau khi upload (khung đầu của video chỉ có nền trống)
npx remotion still TiengAnh-Cover "$queue.cover.jpg" --props="{\"lessonId\":\"$id\"}" --image-format=jpeg --jpeg-quality=90 --log=error

# Brief + caption lấy từ chính file kịch bản (caption đã viết sẵn, không cần ANTHROPIC_API_KEY)
node --input-type=module -e "
import fs from 'node:fs';
const l = JSON.parse(fs.readFileSync('public/lessons/$id.json', 'utf8'));
const hook = l.scenes.find((s) => s.type === 'hook');
const brief = {
  title: \`\${l.series} · Bài \${l.number}: \${hook.title} — \${hook.subtitle}\`,
  characters: ['Cơm', 'Mia'],
  content: l.scenes.map((s) => s.type === 'phrase' ? \`\${s.en} — \${s.vi}\` : s.type === 'quiz' ? \`Đố vui: \${s.question} (\${s.options.join(' / ')})\` : \`\${s.type}: \${s.title}\`),
  fallbackCaption: l.fallbackCaption,
};
fs.writeFileSync('$queue.json', JSON.stringify(brief, null, 2) + '\n');
fs.writeFileSync('$queue.caption.txt', l.fallbackCaption);
"
echo "✅ $id → $queue.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$queue.mp4" | cut -c1-4)s)"

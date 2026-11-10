#!/usr/bin/env bash
# Làm trọn 1 reel 3D tới hàng đợi: giọng đọc (có nghe lại) → render → chuẩn hoá cho Reels + âm lượng −14 LUFS →
# ../queue/<id>.mp4 + .cover.jpg + brief .json + .caption.txt. Sau đó chạy `node scripts/run-next.mjs` trong risecore/
# để tải lên mục Nháp.
# Dùng:  scripts/build-voxel.sh voxel-02-bored Voxel-02-Bored
set -euo pipefail

id="$1"
comp="$2"
queue="../queue/$id"

node scripts/make-voice.mjs "$id"
# --gl=angle: Chrome headless mới có WebGL cho Three.js
npx remotion render "$comp" "out/$id.mp4" --gl=angle --log=error
# Chuẩn hoá giống bài học (yuv420p, GOP đóng 2s, AAC 48kHz); bản thô chỉ ~−19 LUFS nên kéo lên −14
ffmpeg -v error -y -i "out/$id.mp4" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 -g 60 -keyint_min 60 \
  -sc_threshold 0 -flags +cgop -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 160k -ar 48000 -ac 2 -movflags +faststart "$queue.mp4"
npx remotion still Voxel-Cover "$queue.cover.jpg" --props="{\"reelId\":\"$id\"}" --gl=angle --image-format=jpeg --jpeg-quality=90 --log=error

# Brief + caption lấy từ chính file kịch bản
node --input-type=module -e "
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync('public/lessons/$id.json', 'utf8'));
const brief = {
  title: \`\${r.series} · \${r.number}: \${r.cover.kicker} \${r.cover.title}\`,
  characters: ['Cơm', 'Mia'],
  content: r.scenes.map((s) => \`\${s.card.text} — \${s.card.sub}\`),
  fallbackCaption: r.caption,
};
fs.writeFileSync('$queue.json', JSON.stringify(brief, null, 2) + '\n');
fs.writeFileSync('$queue.caption.txt', r.caption);
"
echo "✅ $id → $queue.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$queue.mp4" | cut -c1-4)s)"

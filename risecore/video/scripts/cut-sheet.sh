#!/usr/bin/env bash
# Cắt bảng sticker 3 cột x 4 hàng (nền xanh #00FF00) thành 12 PNG nền trong suốt.
# Dùng:  scripts/cut-sheet.sh characters/source/com-sheet.webp com
# Ra:    public/characters/<tên>/<biểu cảm>.png — mọi ô cùng kích thước để đổi biểu cảm không bị nhảy vị trí.
set -euo pipefail

sheet="$1"
name="$2"
out="public/characters/$name"
# Thứ tự 12 ô theo prompt trong characters/PROMPTS.md
poses=(wave talk cheer embarrassed wow think thumbs point laugh confused announce clap)

IFS=x read -r W H < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$sheet")
cw=$((W / 3))
ch=$((H / 4))
mkdir -p "$out"

for i in "${!poses[@]}"; do
  col=$((i % 3))
  row=$((i / 3))
  # Cắt lùi vào 4px để không dính viền của ô bên cạnh.
  # Ngưỡng colorkey hẹp (0.2) và không dùng despill: nhân vật có thể mặc đồ xanh lá (khăn, áo đấu),
  # ngưỡng rộng hơn hoặc despill sẽ xoá/làm đen luôn phần đó.
  ffmpeg -v error -y -i "$sheet" \
    -vf "crop=$((cw - 8)):$((ch - 8)):$((col * cw + 4)):$((row * ch + 4)),format=rgba,colorkey=0x00FF00:0.2:0.1" \
    -frames:v 1 "$out/${poses[$i]}.png"
done
echo "✅ ${#poses[@]} biểu cảm → $out"

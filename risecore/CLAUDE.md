# Rise Core Day — bối cảnh dự án cho Claude

Luôn trả lời người dùng bằng **tiếng Việt**, giọng thân thiện, ngắn gọn.

## Dự án là gì
Kênh Facebook Page **Rise Core Day** (https://www.facebook.com/risecoreday): video hoạt hình ngắn 9:16
hướng dẫn **tập gym và ăn uống cho người mới**. Video làm bằng **Remotion**, đăng tự động bằng GitHub Actions.
Thư mục `risecore/` nằm trong repo Atomic-Habits (repo **public**) — không đụng tới code ngoài `risecore/`
và `.github/workflows/risecore-post-reel.yml`.

```
risecore/
├── CLAUDE.md            ← file này
├── video/               ← project Remotion (nhân vật, các cảnh, nhạc)
├── scripts/             ← lấy Page token, viết caption bằng Claude, đăng Reels
├── queue/               ← video chờ đăng: <tên>.mp4 + <tên>.json (brief) [+ <tên>.caption.txt]
└── posted.json          ← lịch sử đã đăng (bot tự ghi)
```

## Skill cần cài cho Claude Code
- Remotion Agent Skills: `npx skills add remotion-dev/skills` (chạy trong `risecore/video/`).
  Làm theo các skill đó khi viết code Remotion (interpolate inline, `Interactive.*`, không dùng CSS animation…).

## Quy ước video (giữ đồng nhất cả series)
- 1080×1920, 30fps, 60–90 giây (Reels tối đa 90s). Cảnh ghép bằng `TransitionSeries`, chuyển cảnh 12 frame.
- Font **Be Vietnam Pro** (local, `video/public/fonts`, nạp trong `src/fonts.ts`) — có dấu tiếng Việt.
- Không dùng emoji trong video (Chrome headless không có font emoji) — vẽ icon bằng SVG.
- Bảng màu: nền `#0E1220`, đỏ `#FF4D4D`, vàng `#FFD23F`, mint `#2EE6A6`, xanh `#3DA5FF`.
- Vùng an toàn: chữ quan trọng cách mép ≥80px, giữ nội dung chính trong khoảng y 110–1550
  (đáy màn hình bị UI của Reels/TikTok che). Tiêu đề ≥84px, chữ phụ ≥40px.
- Cấu trúc 1 video bài tập: Hook (2 nhân vật nói chuyện) → Giáo án tổng quan → Khởi động →
  4 bài tập (layout `ExerciseLayout`: tên VN + tên EN, sân khấu có nhân vật diễn động tác + đếm REP,
  3 ô hiệp/rep/nghỉ, 2 lưu ý của Coach) → Lỗi hay gặp (SAI/ĐÚNG) → Ăn uống/phục hồi → CTA sang tập kế tiếp.

## Nhân vật (bản gốc, tự vẽ bằng SVG — không dùng nhân vật có bản quyền)
- **Coach Tạ**: HLV, da nâu, băng đô vàng, áo ba lỗ đỏ, có còi. Tự tin, hay nhắc kỹ thuật.
- **Tí**: bạn mới tập, tóc rối nâu, áo thun xanh, má hồng. Hay làm sai để Coach sửa.
- Rig trong `video/src/rig/`:
  - `FrontChar` — nhìn chính diện: `who`, `x`, `y` (chân), `s`, `handL/handR` (toạ độ tay, IK tự tính khuỷu),
    `mouth` (0–1, nói), `mood` (happy/sad/shock/proud), `blink`.
  - `SideLifter` — nhìn nghiêng để diễn bài tập; tư thế tính trong `rig/poses.ts`
    (`benchPose`, `inclinePose`, `pushupPose`), số rep bằng `rep()` trong `rig/math.ts`.
  - Dụng cụ: `rig/equipment.tsx` (ghế phẳng, ghế dốc, cáp, thảm).
- Muốn thêm bài mới (ví dụ kéo xà, chèo tạ): viết hàm pose mới trong `poses.ts` theo cùng cách.

## Âm thanh
Nhạc nền + SFX tự tổng hợp bằng `video/scripts/make_audio.py` (numpy) → `video/public/audio/`.
Không dùng nhạc/âm thanh có bản quyền. Người dùng có thể thay nhạc trending khi đăng tay.

## Render (trên máy)
```bash
cd risecore/video && npm i
npx remotion studio                       # xem trước
npx remotion render NgayTapNguc out/video.mp4
```
Trước khi bỏ vào hàng đợi, chuẩn hoá cho Reels (yuv420p, GOP đóng 2s, AAC 48kHz):
```bash
ffmpeg -i out/video.mp4 -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 -g 60 -keyint_min 60 \
  -sc_threshold 0 -flags +cgop -c:a aac -b:a 160k -ar 48000 -ac 2 -movflags +faststart ../queue/<tên>.mp4
```
Kèm `../queue/<tên>.json` (brief: title, characters, content[], fallbackCaption) — xem `queue/ngay-tap-nguc.json`.
Tên file đặt theo ngày (`2026-11-05-ngay-tap-lung.mp4`) vì hàng đợi đăng theo thứ tự tên.

## Flow đăng Facebook (đã xong)
- Workflow `.github/workflows/risecore-post-reel.yml`: 19:00 giờ VN mỗi ngày + bấm tay (DRAFT/PUBLISHED).
- `scripts/run-next.mjs`: lấy video kế tiếp → `write-caption.mjs` (Claude API, model trong `CLAUDE_MODEL`)
  → `post-reel.mjs` (Reels API 3 bước: start → rupload → finish) → ghi `posted.json` → xoá mp4 đã đăng.
- Mặc định `FB_VIDEO_STATE=DRAFT` (nháp trong Meta Business Suite để người dùng duyệt). Luôn gửi `is_ai_generated=true`.
- Secrets trên GitHub: `FB_PAGE_ID`, `FB_PAGE_TOKEN`, `ANTHROPIC_API_KEY`. Lấy token: `scripts/get-page-token.mjs`.
- App Meta ID: 983371887652377. Graph API v26.0.
- Giới hạn Reels: 3–90s, ≥540×960, tối đa 30 Reels API/24h.
- `DRY_RUN=1 node scripts/run-next.mjs` để chạy thử không gọi Facebook.

## Quy tắc an toàn
- KHÔNG bao giờ commit `.env`, token, App Secret, API key (repo public). Chạy `git status` trước khi commit.
- KHÔNG in token ra log. Không thêm trigger `pull_request_target` vào workflow.
- Nội dung: chỉ đưa số liệu tập/dinh dưỡng phổ biến, có căn cứ (ví dụ đạm 1,6–2,2g/kg/ngày);
  không hứa kết quả ("lên 5kg cơ/tháng"), không body-shaming, nhắc người mới ưu tiên kỹ thuật hơn mức tạ.
- Nếu làm nội dung cho trẻ em: kênh/page riêng, chỉ vận động vui chơi, không tập tạ, không ăn kiêng.

## Việc tiếp theo (người dùng đã đồng ý hướng đi)
1. Làm video **Ngày tập lưng** (cùng cấu trúc, cùng nhân vật) → bỏ vào `queue/`.
2. Series tiếp: chân, vai, tay, + video ăn uống xen kẽ.
3. Nâng cấp: chuyển video thành template nhận JSON (props + `calculateMetadata`) để GitHub Actions
   tự viết kịch bản bằng Claude → render → đăng (giữ chế độ DRAFT để duyệt).
4. Có thể thêm TikTok sau (Content Posting API; app chưa audit thì bài bị ép riêng tư → nên dùng chế độ đẩy vào nháp).

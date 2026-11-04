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
- Người dùng cho phép thêm các gói `@remotion/*` mà skill Remotion cần, không cần hỏi lại
  (`npx remotion add <gói>` để đúng version với project).

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

## Series "Tiếng Anh mỗi ngày" (đang làm, đăng chung Page Rise Core)
- **Không có lịch cố định**: người dùng tự đăng khi rảnh. KHÔNG nhắc ngày/lịch đăng (vd "thứ 2-4-6")
  trong video, lời thoại hay caption; kêu gọi chỉ nói "Follow để học bài tiếp theo".
- Trình độ mới bắt đầu (trẻ em + người lớn mất gốc), sau này tăng dần. ~45–60 giây/bài.
- **Lời thoại 100% tiếng Anh**, phụ đề tiếng Việt (màu vàng) dưới từng câu. Coach Tạ và Tí không xuất hiện.
- Nhân vật là **ảnh hoạt hình 3D kiểu Pixar, nửa người, vẽ bằng AI** (người dùng không muốn kiểu sticker
  viền trắng, cũng không vẽ bằng SVG). Mặt Cơm giống bộ sticker gốc của người dùng.
  - **Cơm** — nhân vật chính (tóc đen, kính đen, áo thun đen, đồng hồ), lặp lại câu mẫu. Giọng Liam.
  - **Mia** — cô gái tóc nâu búi rối, mắt nâu to, khuyên bạc, áo thun trắng; nói câu mẫu. Giọng Jessica.
  - Bảng gốc: `video/characters/source/<ai>-sheet.webp` (3×4 ô, nền #00FF00). Prompt: `video/characters/PROMPTS.md`
    (người dùng vẽ bằng ChatGPT). Cắt: `cd video && scripts/cut-sheet.sh characters/source/<ai>-sheet.webp <ai> despill`
    (`despill` xoá viền xanh trên tóc; bỏ nếu nhân vật mặc đồ xanh lá) → `public/characters/<ai>/<pose>.png`.
    12 pose theo thứ tự ô: wave talk cheer embarrassed wow think thumbs point laugh confused announce clap.
    Không có pose "đứng yên" (AI vẽ ô đó thành vẫy tay).
  - Ảnh bị cắt ngang thắt lưng; khung phụ đề luôn hiện và đè lên đáy nhân vật để che đường cắt.
  - Bối cảnh: quán cà phê xoá phông vẽ bằng code (`src/english/CafeBackground.tsx`: hình khối + blur + lớp phủ
    tối phía trên cho chữ dễ đọc). Có thể thay bằng ảnh AI (prompt ở PROMPTS.md mục 3) nếu người dùng gửi.
  - Mỗi câu trong kịch bản có `pose` (người nói) và `listen` (người nghe); lúc đếm ngược cả 2 tự chuyển `think`.
- Cấu trúc: hook (tình huống quen) → 3 câu mẫu (Mia nói, Cơm lặp) → đố vui A/B đếm ngược 3s → kêu gọi bình luận bằng tiếng Anh.
- Mỗi bài là 1 file kịch bản `video/public/lessons/bai-NN-<slug>.json` (scenes: hook/phrase/quiz/cta; hook có
  `cliche` = câu "quốc dân" bị gạch; mỗi câu có `speaker`, `say` tiếng Anh, `vi` phụ đề, `pose`/`listen`,
  `burst` chữ nổ tuỳ chọn, `pauseBefore` giây). Đăng ký bài trong `video/src/english/lessons.ts` → composition
  `TiengAnh-NN-<Ten>` tự có trong Root (folder `TiengAnh`), độ dài tự tính theo giọng đọc.
- Khung video (LessonVideo) có sẵn "action": phụ đề karaoke theo từng từ, người nói to lên/người nghe tối đi,
  nhảy khi đổi sang cheer/clap/wow/laugh, rung màn hình khi có pose `wow`, chữ nổ trên đầu, card trượt + whoosh.
- **Làm 1 bài trọn gói**: `cd video && scripts/build-lesson.sh <id> <composition>` (giọng → render → chuẩn hoá →
  `queue/<id>.mp4` + `<id>.cover.jpg` + brief + caption), rồi `cd .. && node scripts/run-next.mjs` để tải lên Nháp.
- **Ảnh bìa** (`src/english/LessonCover.tsx`, Still `TiengAnh-Cover`): Facebook mặc định lấy khung hình đầu làm ảnh
  preview (chỉ có nền trống), nên mỗi bài có ảnh bìa riêng — "Đừng chỉ nói" + câu nhàm bị gạch + 2 nhân vật.
  `run-next.mjs` tự gắn sau khi upload; gắn tay cho video đã có: `node scripts/set-thumbnail.mjs <video_id> <ảnh.jpg>`
  (Graph `POST /{video_id}/thumbnails`, `is_preferred=true`).
- Giọng đọc (`scripts/make-voice.mjs`): ElevenLabs with-timestamps (lấy mốc từng chữ cho karaoke), Cơm = Liam,
  Mia = Jessica (giọng premade). Mỗi câu mới được speech-to-text nghe lại, lệch thì in ⚠️ — đọc từng cảnh báo:
  tên "Cơm" → "Com/come", "A!/B!" → "Hey/Be", số → chữ số là bình thường; sai nghĩa (vd "won" → "want") thì sửa câu.
  Key `ELEVENLABS_API_KEY` ở `risecore/.env`. Gói Free: 10.000 ký tự/tháng (bài ~350–470 ký tự),
  **không gọi API được giọng Voice Library**, không có giấy phép thương mại (nâng Starter khi Page kiếm tiền).
  Câu đã tạo được dùng lại, sửa câu nào thì chỉ tạo lại câu đó.
- Đã làm: bài 1–11 (How are you, Thank you, You're welcome, Sorry, Order coffee, Compliments, Say no, What?,
  Yes, Really?, Goodbye) và bài 12–21 (Hungry, Tired, I don't know, Wait, Busy, Help, Good luck, Delicious,
  Happy, Hurry up) — tất cả đã lên mục Nháp 2026-11-03 kèm ảnh bìa. Bài 1–2 đã đăng; bài 3–15 đã hẹn giờ
  (T2-T4-T6 lúc 19:00 VN, 4/11 → 2/12). **Đợt 2**: bài 16–21 còn ở Nháp, hẹn được từ 18/11 (Facebook chỉ cho hẹn
  trước ≤29 ngày): `node scripts/schedule-draft.mjs bai-16=2026-12-04 bai-17=2026-12-07 bai-18=2026-12-09 bai-19=2026-12-11 bai-20=2026-12-14 bai-21=2026-12-16`.
  Hẹn giờ chỉ đổi ngày đăng, caption và ảnh bìa giữ nguyên. Lịch này chỉ ở Facebook — vẫn KHÔNG nhắc lịch trong video/caption.
  Bài 22 trở đi: chủ đề mới, không lặp lại các câu trên. ElevenLabs tháng 11 gần hết ký tự (reset 2026-12-03).

## Series "Đoán từ tiếng Anh" (người dùng đã duyệt khung 2026-11-04)
- Mỗi clip 1 chủ đề (bắt đầu: Đi học), 8 từ xếp dễ → khó, ~74 giây. Cùng Cơm, Mia, nền quán cà phê, khung phụ đề.
- Mỗi từ: chữ tiếng Việt to ở trên + hình SVG trong vòng đếm ngược 5 giây (tích tắc mỗi giây) + ô trống theo số chữ cái,
  còn 2 giây thì lộ chữ đầu → "ding", lật ô ra đáp án, Mia đọc từ, Cơm lặp lại. Lúc đếm ngược 2 nhân vật tự "think".
- Mở đầu: Mia mời chơi; kết: bảng ôn cả 8 từ (hình + EN + VN), hỏi "Bạn đúng mấy từ?" + follow.
- Kịch bản `video/public/lessons/doan-tu-NN-<chủ đề>.json` (cảnh intro → word… → outro; mỗi word có `vi`, `en`, `icon`,
  câu đầu `pauseBefore: 5`). Khung: `src/english/WordQuizVideo.tsx` (dùng chung buildTimeline/Stickers/Subtitle với bài học).
  Hình minh hoạ nằm trong `ICONS` của file đó — chủ đề mới thì vẽ thêm icon. Composition `DoanTu-NN-<Ten>` (folder `DoanTu`).
- Giọng: `node scripts/make-voice.mjs doan-tu-NN-<chủ đề>` (~270 ký tự/clip). Ảnh bìa: Still `DoanTu-Cover`
  ("Bạn đoán được mấy từ?" + 4 hình đầu có dấu ?). `build-lesson.sh` chưa hỗ trợ loại này (đọc cảnh `hook`) nên làm tay:
  render → chuẩn hoá ffmpeg như trên → `queue/<id>.mp4` + `.cover.jpg` + brief `.json` + `.caption.txt` → `run-next.mjs`.
  Caption KHÔNG ghi đáp án (lộ trò chơi), chỉ hook + chủ đề + kêu gọi bình luận số từ đúng.
- Clip 1 (Đi học: Book, Pencil, Teacher, Ruler, Eraser, Backpack, Classroom, Homework) đã lên Nháp 2026-11-04
  (video_id 1819687389162882) kèm ảnh bìa.

## Flow đăng Facebook (đã xong)
- **Làm xong video là tải lên mục Nháp ngay từ máy**: bỏ mp4 + brief vào `queue/` rồi chạy `node scripts/run-next.mjs`
  trong `risecore/` (dùng `FB_PAGE_ID`/`FB_PAGE_TOKEN` trong `risecore/.env`). Người dùng tự bấm đăng trong
  Meta Business Suite → Nội dung → Bản nháp. Không commit mp4 (script xoá mp4 sau khi đăng), chỉ commit brief, caption, `posted.json`.
- Workflow `.github/workflows/risecore-post-reel.yml`: **không chạy theo lịch**, chỉ bấm tay (DRAFT/PUBLISHED) khi cần đăng từ GitHub.
- `scripts/run-next.mjs`: lấy video kế tiếp → `write-caption.mjs` (Claude API, model trong `CLAUDE_MODEL`;
  không có key thì dùng `<tên>.caption.txt` hoặc `fallbackCaption` trong brief)
  → `post-reel.mjs` (Reels API 3 bước: start → rupload → finish) → ghi `posted.json` → xoá mp4 đã đăng.
- Page Rise Core (id 644865365381501) thuộc Business portfolio nên không hiện trong `/me/accounts`;
  `get-page-token.mjs` tự tra theo handle `FB_PAGE_HANDLE`.
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
0. Ưu tiên: series **Tiếng Anh mỗi ngày** (bài 1–21 đã lên Nháp 2026-11-03). Bài sau theo cùng khung.
   TikTok: người dùng đã tạo app (loại "Other") và để `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET` trong `risecore/.env`,
   nhưng tạm gác — làm Facebook Reels trước. Khi làm: Content Posting API, quyền `video.upload` (đẩy vào nháp TikTok).
1. (Series gym tạm dừng) Video **Ngày tập lưng** (cùng cấu trúc, cùng nhân vật).
2. Series gym tiếp: chân, vai, tay, + video ăn uống xen kẽ.
3. Nâng cấp: chuyển video thành template nhận JSON (props + `calculateMetadata`) để GitHub Actions
   tự viết kịch bản bằng Claude → render → đăng (giữ chế độ DRAFT để duyệt).
4. Có thể thêm TikTok sau (Content Posting API; app chưa audit thì bài bị ép riêng tư → nên dùng chế độ đẩy vào nháp).

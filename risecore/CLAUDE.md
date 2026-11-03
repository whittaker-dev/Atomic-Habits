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
- Mỗi bài là 1 file kịch bản `video/public/lessons/<ngày>-<slug>.json` (scenes: hook/phrase/quiz/cta, mỗi câu có
  `speaker`, `say` tiếng Anh, `vi` phụ đề, `pauseBefore` giây). Code dựng hình ở `video/src/english/`,
  composition đăng ký trong `Root.tsx` (folder `TiengAnh`), độ dài tự tính theo giọng đọc.
- Giọng đọc: `cd video && node scripts/make-voice.mjs <id>` → ElevenLabs, Cơm = Liam, Mia = Jessica (giọng premade).
  Key `ELEVENLABS_API_KEY` ở `risecore/.env`. Gói Free: 10.000 ký tự/tháng, **không gọi API được giọng Voice Library**,
  không có giấy phép thương mại (nâng Starter khi Page kiếm tiền). Câu đã tạo được dùng lại, sửa câu nào thì chỉ tạo lại câu đó.
- Sau khi tạo giọng: cho ElevenLabs speech-to-text nghe lại từng câu để chắc đọc đúng kịch bản, rồi render.

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
0. Ưu tiên: series **Tiếng Anh mỗi ngày** (bài 1 "How are you?" đã lên Nháp 2026-11-03). Bài sau theo cùng khung.
1. (Series gym tạm dừng) Video **Ngày tập lưng** (cùng cấu trúc, cùng nhân vật).
2. Series gym tiếp: chân, vai, tay, + video ăn uống xen kẽ.
3. Nâng cấp: chuyển video thành template nhận JSON (props + `calculateMetadata`) để GitHub Actions
   tự viết kịch bản bằng Claude → render → đăng (giữ chế độ DRAFT để duyệt).
4. Có thể thêm TikTok sau (Content Posting API; app chưa audit thì bài bị ép riêng tư → nên dùng chế độ đẩy vào nháp).

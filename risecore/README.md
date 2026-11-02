# Rise Core Day · Tự động đăng Reels lên Facebook

> Thư mục này nằm trong repo Atomic-Habits. Workflow ở `.github/workflows/risecore-post-reel.yml` (gốc repo), mọi lệnh bên dưới chạy **bên trong thư mục `risecore/`**.

Flow: `queue/` (video + brief) → **Claude** viết caption → **Facebook Reels API** đăng lên Page → ghi log `posted.json`.
Mặc định đăng ở chế độ **DRAFT** (nháp) để bạn duyệt trong Meta Business Suite rồi mới đăng thật.

## 1. Lấy Page token (làm 1 lần, trên máy bạn)

1. Vào **developers.facebook.com/apps** → app `983371887652377` → **App settings → Basic**, copy **App Secret**.
   Nếu app chưa có quyền Page: **Use cases → Add** → chọn use case quản lý Page (“Manage everything on your Page”).
2. Mở **developers.facebook.com/tools/explorer**:
   - *Meta App*: chọn app của bạn.
   - *User or Page*: **Get User Access Token**.
   - *Permissions*: thêm `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`.
   - Bấm **Generate Access Token**, đăng nhập, **chọn Page Rise Core Day** khi được hỏi, rồi copy token.
3. Trên máy bạn:
   ```bash
   cp .env.example .env      # dán FB_APP_SECRET và FB_SHORT_USER_TOKEN vào .env
   node scripts/get-page-token.mjs
   ```
   Script tự đổi sang token dài hạn, tìm Page `risecoreday`, rồi ghi `FB_PAGE_ID` + `FB_PAGE_TOKEN` (không hết hạn) vào `.env`.

> ⚠️ Không gửi App Secret / token cho ai, không commit file `.env` (đã có trong `.gitignore`).
> Token bị lộ: vào Graph API Explorer tạo lại, hoặc đổi mật khẩu Facebook để vô hiệu hoá.

## 2. Thử trên máy

```bash
DRY_RUN=1 node scripts/run-next.mjs          # chạy thử, không gọi Facebook
node scripts/run-next.mjs                    # đăng NHÁP video kế tiếp trong queue/
FB_VIDEO_STATE=PUBLISHED node scripts/run-next.mjs   # đăng thật
```
Bản nháp nằm ở **Meta Business Suite → Nội dung → Bản nháp**.

## 3. Chạy tự động mỗi ngày bằng GitHub Actions

1. Tạo repo **private** trên GitHub, push thư mục này lên.
2. **Settings → Secrets and variables → Actions → New repository secret**:
   `FB_PAGE_ID`, `FB_PAGE_TOKEN`, `ANTHROPIC_API_KEY`.
   (Hoặc dùng GitHub CLI: `gh secret set FB_PAGE_TOKEN --body "$(grep ^FB_PAGE_TOKEN= .env | cut -d= -f2-)"`)
3. Bước duyệt (chọn 1):
   - **Nháp trên Facebook** (mặc định): video vào Bản nháp của Meta Business Suite, bạn xem rồi tự bấm đăng.
   - **Duyệt trên GitHub** (chỉ repo public): Settings → Environments → `facebook` → bật **Required reviewers** (chọn bạn),
     chuyển 3 secret sang mục **Environment secrets** của `facebook`, rồi đặt biến `FB_VIDEO_STATE` = `PUBLISHED`.
     Mỗi ngày GitHub gửi thông báo, bạn bấm Approve thì video mới được đăng và token mới được mở khoá.
   Muốn đăng thẳng không qua nháp: **Settings → Secrets and variables → Actions → Variables** thêm `FB_VIDEO_STATE` = `PUBLISHED`.

Lịch mặc định: 19:00 giờ VN mỗi ngày (sửa `cron` trong `.github/workflows/risecore-post-reel.yml` ở gốc repo).
Chạy tay: tab **Actions → Rise Core Day · Đăng Reel lên Facebook → Run workflow**.

## 4. Thêm video mới

Mỗi video cần 2 file cùng tên trong `queue/` (đăng theo thứ tự tên file):
- `2026-11-05-ngay-tap-lung.mp4` — 9:16, 3–90 giây, H.264 + AAC 48kHz
- `2026-11-05-ngay-tap-lung.json` — brief nội dung (xem mẫu `ngay-tap-nguc.json`)

Sau khi đăng, file .mp4 được xóa khỏi `queue/` để repo không phình to (đặt `KEEP_POSTED_VIDEOS=1` nếu muốn giữ).
Muốn tự viết caption: tạo thêm `…caption.txt`, script sẽ dùng file đó thay vì gọi Claude.

## Giới hạn cần biết
- Reels chỉ đăng được lên **Page** (không phải trang cá nhân), thời lượng **3–90 giây**.
- Tối đa **30 Reels/24 giờ** qua API.
- Script tự gắn nhãn `is_ai_generated=true` vì video và caption được tạo bằng AI.
- Hẹn giờ: `FB_VIDEO_STATE=SCHEDULED` + `FB_SCHEDULE_AT=2026-11-03T19:00:00+07:00` (từ 10 phút đến 29 ngày tới).

## Repo public — lưu ý bảo mật
- Secrets (token, API key) **không** hiện trong code hay log, kể cả repo public. Đừng bao giờ commit file `.env` — chạy `git status` trước mỗi lần commit.
- Workflow chỉ chạy theo lịch và khi bạn bấm tay, không chạy theo pull request từ người lạ. Đừng thêm trigger `pull_request_target`.
- Video trong `queue/` ai cũng xem được trước giờ đăng.
- Repo public không có hoạt động 60 ngày thì GitHub tự tắt lịch chạy. Bot commit mỗi lần đăng nên bình thường không bị; nếu hàng đợi trống lâu, vào tab Actions bật lại.

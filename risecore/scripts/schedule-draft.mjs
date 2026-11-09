// Hẹn giờ đăng cho Reel đang nằm ở mục Nháp. Giờ đăng cố định 07:00 sáng giờ VN (00:00 UTC cùng ngày).
// Dùng:  node scripts/schedule-draft.mjs bai-15=2026-12-02 bai-16=2026-12-04 …   (tên file trong posted.json = ngày)
// Facebook chỉ nhận lịch cách hiện tại 10 phút – 29 ngày. Gọi lại bước finish của /video_reels với
// video_state=SCHEDULED trên video đã là nháp thì lỗi code 6000, nên phải POST thẳng vào /{video_id}.
import fs from 'node:fs';
import {GRAPH, graph, loadEnv, need} from './lib.mjs';

loadEnv();
need('FB_PAGE_TOKEN');
const token = process.env.FB_PAGE_TOKEN;
const posted = JSON.parse(fs.readFileSync('posted.json', 'utf8'));
const args = process.argv.slice(2);
if (!args.length) {
  console.error('Dùng: node scripts/schedule-draft.mjs <tên>=<YYYY-MM-DD> …');
  process.exit(1);
}

for (const arg of args) {
  const [prefix, day] = arg.split('=');
  const entry = posted.find((p) => p.file.startsWith(`queue/${prefix}`));
  if (!entry) throw new Error(`Không thấy ${prefix} trong posted.json`);
  const ts = Math.floor(new Date(`${day}T00:00:00Z`).getTime() / 1000);
  const now = Date.now() / 1000;
  if (!ts || ts < now + 600 || ts > now + 29 * 86400) throw new Error(`${arg}: ngày phải cách hiện tại từ 10 phút đến 29 ngày`);

  // Không bao giờ đụng vào video đã đăng công khai
  const before = await graph('GET', `${GRAPH()}/${entry.videoId}`, {access_token: token, fields: 'published'});
  if (before.published) {
    console.log(`⏭️  ${prefix}: đã đăng công khai, bỏ qua`);
    continue;
  }
  await graph('POST', `${GRAPH()}/${entry.videoId}`, {access_token: token, scheduled_publish_time: String(ts)});
  const after = await graph('GET', `${GRAPH()}/${entry.videoId}`, {access_token: token, fields: 'status'});
  const p = after.status?.publishing_phase;
  console.log(`🗓️  ${prefix} (${entry.videoId}): ${p?.publish_status} ${p?.publish_time}`);
}

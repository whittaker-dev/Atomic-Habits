// Hẹn giờ (hoặc dời giờ) đăng cho Reel ở mục Nháp / đã hẹn. Mặc định 07:00 sáng giờ VN; thêm giờ VN sau chữ T nếu cần.
// Dùng:  node scripts/schedule-draft.mjs bai-15=2026-12-02 su-that-01-octopus=2026-12-04T11:00 …
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
  // Bỏ qua bản đã xoá: tên bản cũ (voxel-01-very-like) là tiền tố của bản thay thế (voxel-01-very-like-v2)
  const entry = posted.find((p) => p.file.startsWith(`queue/${prefix}`) && p.state !== 'DELETED');
  if (!entry) throw new Error(`Không thấy ${prefix} trong posted.json`);
  const when = day.includes('T') ? `${day}:00+07:00` : `${day}T07:00:00+07:00`;
  const ts = Math.floor(new Date(when).getTime() / 1000);
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

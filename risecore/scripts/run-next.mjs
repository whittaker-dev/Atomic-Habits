// Lấy video kế tiếp trong queue/ chưa đăng -> viết caption -> đăng -> ghi log vào posted.json.
import fs from 'node:fs';
import path from 'node:path';
import {loadEnv, sidecar} from './lib.mjs';
import {writeCaption} from './write-caption.mjs';
import {postReel} from './post-reel.mjs';
import {setThumbnail} from './set-thumbnail.mjs';

loadEnv();
const LOG = 'posted.json';
const posted = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : [];
const done = new Set(posted.map((p) => p.file));

const next = fs
  .readdirSync('queue')
  .filter((f) => f.endsWith('.mp4'))
  .sort()
  .map((f) => path.join('queue', f))
  .find((f) => !done.has(f));

if (!next) {
  console.log('📭 Hàng đợi trống — thêm video .mp4 + brief .json vào queue/ nhé.');
  process.exit(0);
}

try {
  console.log(`▶️  Video kế tiếp: ${next}`);
  const caption = await writeCaption(next);
  const r = await postReel(next, {caption});
  const cover = sidecar(next, '.cover.jpg');
  if (!r.dryRun && fs.existsSync(cover)) await setThumbnail(r.videoId, cover);
  if (!r.dryRun) {
    posted.push({file: next, videoId: r.videoId, state: r.state, link: r.link, at: new Date().toISOString()});
    fs.writeFileSync(LOG, JSON.stringify(posted, null, 2) + '\n');
    // Xóa file video đã đăng để repo không phình to (brief + caption vẫn giữ lại)
    if (process.env.KEEP_POSTED_VIDEOS !== '1') {
      fs.unlinkSync(next);
      if (fs.existsSync(cover)) fs.unlinkSync(cover);
      console.log(`🧹 Đã xóa ${next} khỏi hàng đợi`);
    }
  }
} catch (e) {
  console.error('❌', e.message);
  process.exit(1);
}

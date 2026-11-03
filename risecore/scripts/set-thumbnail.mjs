// Gắn ảnh bìa (thumbnail) cho 1 video đã upload — Facebook mặc định lấy khung hình đầu, thường trống.
// Dùng:  node scripts/set-thumbnail.mjs <video_id> queue/<tên>.cover.jpg
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GRAPH, graph, loadEnv, need} from './lib.mjs';

export async function setThumbnail(videoId, imagePath) {
  loadEnv();
  need('FB_PAGE_TOKEN');
  const form = new FormData();
  form.set('access_token', process.env.FB_PAGE_TOKEN);
  form.set('is_preferred', 'true');
  form.set('source', new Blob([fs.readFileSync(imagePath)], {type: 'image/jpeg'}), 'cover.jpg');
  await graph('POST', `${GRAPH()}/${videoId}/thumbnails`, {}, {body: form});
  console.log(`🖼️  Đã gắn ảnh bìa ${imagePath} cho video ${videoId}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [videoId, image] = process.argv.slice(2);
  if (!videoId || !image) {
    console.error('Dùng: node scripts/set-thumbnail.mjs <video_id> <ảnh.jpg>');
    process.exit(1);
  }
  setThumbnail(videoId, image).catch((e) => {
    console.error('❌', e.message);
    process.exit(1);
  });
}

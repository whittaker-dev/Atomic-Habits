// Đăng 1 video lên Facebook Page dưới dạng Reel (3 bước: start -> upload -> finish).
// Dùng:  node scripts/post-reel.mjs queue/ngay-tap-nguc.mp4
// Caption lấy từ queue/<tên>.caption.txt. DRY_RUN=1 để chạy thử không gọi Facebook.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {RUPLOAD, graph, loadEnv, need, sidecar, sleep} from './lib.mjs';

function checkVideo(file) {
  const size = fs.statSync(file).size;
  if (size > 1024 * 1024 * 1024) throw new Error('Video lớn hơn 1GB');
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', file]).toString();
    const j = JSON.parse(out);
    const dur = Number(j.format.duration);
    const v = j.streams.find((s) => s.width);
    if (dur < 3 || dur > 90) throw new Error(`Reels phải dài 3–90 giây, video này ${dur.toFixed(1)}s`);
    if (v && (v.width < 540 || v.height < 960)) throw new Error(`Độ phân giải tối thiểu 540×960, video này ${v.width}×${v.height}`);
    console.log(`🎬 ${file}: ${dur.toFixed(1)}s, ${v?.width}×${v?.height}, ${(size / 1e6).toFixed(1)} MB`);
  } catch (e) {
    if (e.code === 'ENOENT') console.log('ℹ️ Không có ffprobe, bỏ qua bước kiểm tra thời lượng.');
    else throw e;
  }
  return size;
}

export async function postReel(videoPath, {state, scheduleAt, caption} = {}) {
  loadEnv();
  const dry = process.env.DRY_RUN === '1';
  if (!dry) need('FB_PAGE_ID', 'FB_PAGE_TOKEN');
  const pageId = process.env.FB_PAGE_ID || 'PAGE_ID';
  const token = process.env.FB_PAGE_TOKEN || 'TOKEN';
  const videoState = (state || process.env.FB_VIDEO_STATE || 'DRAFT').toUpperCase();
  if (!['DRAFT', 'PUBLISHED', 'SCHEDULED'].includes(videoState)) throw new Error(`FB_VIDEO_STATE không hợp lệ: ${videoState}`);

  const description = caption ?? fs.readFileSync(sidecar(videoPath, '.caption.txt'), 'utf8');
  const size = checkVideo(videoPath);

  const finish = {
    access_token: token,
    video_id: '',
    upload_phase: 'finish',
    video_state: videoState,
    description,
    is_ai_generated: 'true',
  };
  if (videoState === 'SCHEDULED') {
    const when = scheduleAt || process.env.FB_SCHEDULE_AT;
    const ts = Math.floor(new Date(when).getTime() / 1000);
    const now = Date.now() / 1000;
    if (!ts || ts < now + 600 || ts > now + 29 * 86400) throw new Error('FB_SCHEDULE_AT phải cách hiện tại từ 10 phút đến 29 ngày');
    finish.scheduled_publish_time = String(ts);
  }

  if (dry) {
    console.log(`🧪 DRY_RUN — sẽ đăng lên Page ${pageId} với trạng thái ${videoState}`);
    console.log('--- Caption ---\n' + description + '\n---------------');
    return {dryRun: true};
  }

  console.log('1/4 Mở phiên upload…');
  const start = await graph('POST', `/${pageId}/video_reels`, {upload_phase: 'start', access_token: token});
  const videoId = start.video_id;

  console.log(`2/4 Upload ${(size / 1e6).toFixed(1)} MB…`);
  await graph('POST', `${RUPLOAD()}/${videoId}`, {}, {
    headers: {Authorization: `OAuth ${token}`, offset: '0', file_size: String(size), 'Content-Type': 'application/octet-stream'},
    body: fs.readFileSync(videoPath),
  });

  console.log('3/4 Chờ Facebook nhận file…');
  for (let i = 0; i < 60; i++) {
    const s = (await graph('GET', `/${videoId}`, {fields: 'status', access_token: token})).status;
    if (s.uploading_phase?.status === 'error' || s.video_status === 'upload_failed') {
      throw new Error(`Upload lỗi: ${JSON.stringify(s.uploading_phase?.errors || s)}`);
    }
    if (s.processing_phase?.error) throw new Error(`Xử lý lỗi: ${s.processing_phase.error.message}`);
    if (['complete', 'completed'].includes(s.uploading_phase?.status)) break;
    await sleep(5000);
  }

  console.log(`4/4 Hoàn tất (${videoState})…`);
  await graph('POST', `/${pageId}/video_reels`, {...finish, video_id: videoId});

  let status = null;
  for (let i = 0; i < 36; i++) {
    status = (await graph('GET', `/${videoId}`, {fields: 'status,permalink_url', access_token: token}));
    const pub = status.status?.publishing_phase;
    if (status.status?.processing_phase?.error) throw new Error(`Xử lý lỗi: ${status.status.processing_phase.error.message}`);
    if (pub?.status === 'error') throw new Error(`Đăng lỗi: ${JSON.stringify(pub.error || pub)}`);
    if (pub?.status === 'complete' || pub?.status === 'completed' || videoState === 'DRAFT') break;
    await sleep(5000);
  }
  const link = status?.permalink_url ? `https://www.facebook.com${status.permalink_url}` : '(xem trong Meta Business Suite)';
  console.log(`✅ Xong! video_id=${videoId} · ${videoState === 'DRAFT' ? 'đang ở mục Nháp' : link}`);
  return {videoId, state: videoState, link};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = process.argv[2];
  if (!v) {
    console.error('Dùng: node scripts/post-reel.mjs queue/<video>.mp4');
    process.exit(1);
  }
  postReel(v).catch((e) => {
    console.error('❌', e.message);
    process.exit(1);
  });
}

// Tạo giọng đọc cho 1 bài tiếng Anh: đọc public/lessons/<id>.json -> public/voice/<id>/NN.mp3|wav + manifest.json
// Dùng:  node scripts/make-voice.mjs 2026-11-04-how-are-you
// Có ELEVENLABS_API_KEY trong .env thì dùng ElevenLabs, không thì dùng giọng có sẵn của macOS (chỉ để xem trước).
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {loadEnv} from '../../scripts/lib.mjs';

// Key có thể nằm ở video/.env hoặc risecore/.env (chung file với token Facebook)
loadEnv('.env');
loadEnv('../.env');
const id = process.argv[2];
if (!id) {
  console.error('Dùng: node scripts/make-voice.mjs <lesson-id>');
  process.exit(1);
}

const lesson = JSON.parse(fs.readFileSync(`public/lessons/${id}.json`, 'utf8'));
const outDir = `public/voice/${id}`;
const manifestPath = path.join(outDir, 'manifest.json');
fs.mkdirSync(outDir, {recursive: true});

const provider = process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'macos';
// Mặc định là giọng premade (gói Free gọi API được; giọng trong Voice Library thì không): Cơm = Liam, Mia = Jessica
const VOICES = {
  elevenlabs: {
    com: process.env.ELEVENLABS_VOICE_COM || 'TX3LPaxmHKxFdv7VOQHJ',
    mia: process.env.ELEVENLABS_VOICE_MIA || 'cgSgspJ2msm6clMCkdW9',
  },
  macos: {com: 'Daniel', mia: 'Samantha'},
};
const voices = VOICES[provider];

/** Ghép mốc thời gian từng ký tự thành từng từ, dùng cho phụ đề karaoke. */
function toWords(a) {
  const words = [];
  let cur = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
      return;
    }
    cur ??= {w: '', start: Math.round(a.character_start_times_seconds[i] * 1000) / 1000, end: 0};
    cur.w += ch;
    cur.end = Math.round(a.character_end_times_seconds[i] * 1000) / 1000;
  });
  if (cur) words.push(cur);
  return words;
}

// Dùng endpoint with-timestamps (cùng giá với endpoint thường) để có mốc thời gian từng chữ
async function elevenlabs(text, voice, file) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json'},
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
      voice_settings: {stability: 0.5, similarity_boost: 0.75, style: 0.3},
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs lỗi ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  fs.writeFileSync(file, Buffer.from(j.audio_base64, 'base64'));
  return toWords(j.alignment);
}

/** Cho ElevenLabs speech-to-text nghe lại để bắt câu đọc sai/nuốt chữ. Chỉ in cảnh báo, không chặn. */
async function transcribe(file) {
  const fd = new FormData();
  fd.append('model_id', 'scribe_v1');
  fd.append('language_code', 'eng');
  fd.append('file', new Blob([fs.readFileSync(file)], {type: 'audio/mpeg'}), path.basename(file));
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {method: 'POST', headers: {'xi-api-key': process.env.ELEVENLABS_API_KEY}, body: fd});
  return res.ok ? (await res.json()).text : `(không nghe lại được: ${res.status})`;
}

// So sánh bỏ dấu câu, đổi số thành chữ đơn giản; tên riêng tiếng Việt (Cơm) được bỏ dấu
const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b10\b/g, 'ten')
    .replace(/[^a-z' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function macos(text, voice, file) {
  execFileSync('say', ['-v', voice, '--file-format=WAVE', '--data-format=LEI16@44100', '-o', file, text]);
}

const duration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());

// Câu nào đã tạo với cùng giọng + cùng chữ thì dùng lại, đỡ tốn credit ElevenLabs
const old = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {lines: []};
const lines = lesson.scenes.flatMap((s) => s.lines);
const out = [];

for (const [i, line] of lines.entries()) {
  const voice = voices[line.speaker];
  const ext = provider === 'elevenlabs' ? 'mp3' : 'wav';
  const file = path.join(outDir, `${String(i).padStart(2, '0')}.${ext}`);
  const prev = old.lines[i];
  const same = prev && prev.provider === provider && prev.voice === voice && prev.say === line.say;
  if (same && fs.existsSync(path.join('public', prev.file))) {
    out.push({...prev, speaker: line.speaker});
    continue;
  }
  console.log(`🎙️  ${i} [${line.speaker}] ${line.say}`);
  let words;
  if (provider === 'elevenlabs') {
    words = await elevenlabs(line.say, voice, file);
    const heard = await transcribe(file);
    if (norm(heard) !== norm(line.say)) console.log(`   ⚠️  nghe lại thành: "${heard}" — kiểm tra câu này`);
  } else {
    macos(line.say, voice, file);
  }
  out.push({provider, voice, speaker: line.speaker, say: line.say, file: path.relative('public', file), duration: duration(file), words});
}

// Xoá file thừa của lần tạo trước (bài bị bớt câu hoặc đổi định dạng)
const keep = new Set(out.map((l) => path.basename(l.file)).concat('manifest.json'));
for (const f of fs.readdirSync(outDir)) if (!keep.has(f)) fs.unlinkSync(path.join(outDir, f));

fs.writeFileSync(manifestPath, JSON.stringify({id, provider, lines: out}, null, 2) + '\n');
const total = out.reduce((a, l) => a + l.duration, 0);
console.log(`✅ ${out.length} câu, ${total.toFixed(1)}s giọng đọc (${provider}) → ${manifestPath}`);

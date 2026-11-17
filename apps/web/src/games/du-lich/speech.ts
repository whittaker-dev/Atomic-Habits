import type { Lang } from './dictation';
import { voiceUrl } from './voice-file';

// Giọng đọc của hai game du lịch. Mỗi từ, mỗi câu trong data.ts có sẵn một file ghi âm (giọng Samantha
// cho tiếng Anh, Tingting cho tiếng Trung; ghi bằng scripts/record-voices.ts), phát qua một thẻ
// <audio> dùng chung. Không dựa vào giọng đọc của trình duyệt (Web Speech API) vì nó chập chờn: có
// trình duyệt liệt kê đủ giọng mà đọc thì im lặng, Chrome có lúc kẹt hẳn tới khi mở lại, nhiều điện
// thoại không có giọng tiếng Trung.
//
// Câu mới thêm vào data.ts mà chưa chạy script ghi âm thì chưa có file: khi đó mới nhờ giọng đọc của
// trình duyệt, để game vẫn chơi được (kiểm thử du-lich/dictation.test.ts báo những câu còn thiếu file).

const LOCALE: Record<Lang, string> = { en: 'en-US', zh: 'zh-CN' };

// Âm thanh im lặng rất ngắn: phát trong lần bấm đầu tiên để Safari trên iPhone mở khoá thẻ <audio>.
const SILENT =
  'data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

/** Tốc độ khi bấm "nghe chậm": chậm lại nhưng giữ cao độ giọng (preservesPitch). */
const SLOW_RATE = 0.65;

let audio: HTMLAudioElement | null = null;
const player = () => (audio ??= new Audio());

/**
 * Mở khoá phát tiếng: Safari trên iPhone chỉ cho một thẻ <audio> phát nếu lần phát đầu nằm trong một
 * lần chạm. Gọi ngay trong nút bắt đầu chơi; từ đó thẻ dùng chung phát được câu nào cũng được.
 */
export function primeSpeech() {
  if (typeof window === 'undefined') return;
  const a = player();
  a.src = SILENT;
  void a.play().catch(() => undefined);
}

/** Đọc một từ/câu; đang đọc dở câu khác thì ngắt câu đó. `slow` đọc chậm để nghe rõ từng âm. */
export function speak(text: string, lang: Lang, slow = false) {
  if (typeof window === 'undefined') return;
  stopSpeaking();
  const a = player();
  let fellBack = false;
  const fallback = () => {
    if (fellBack || a.dataset.text !== text) return;
    fellBack = true;
    speakWithBrowser(text, lang, slow);
  };
  a.dataset.text = text;
  a.src = voiceUrl(text, lang);
  // Đổi src thì tốc độ về mặc định, nên đặt sau.
  a.defaultPlaybackRate = a.playbackRate = slow ? SLOW_RATE : 1;
  a.preservesPitch = true;
  a.onerror = fallback;
  a.play().catch((e: DOMException) => {
    // NotAllowedError: chưa có lần chạm nào trên trang; AbortError: bị câu sau ngắt. Còn lại (thường là
    // không có file) thì nhờ giọng trình duyệt.
    if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') fallback();
  });
}

export function stopSpeaking() {
  if (audio) {
    audio.onerror = null;
    audio.pause();
  }
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}

/** Tải sẵn file của câu sắp hỏi để bấm là nghe ngay. */
export function preloadVoice(text: string, lang: Lang) {
  if (typeof window === 'undefined') return;
  void fetch(voiceUrl(text, lang)).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Dự phòng: giọng đọc của trình duyệt, chỉ cho câu chưa có file ghi âm
// ---------------------------------------------------------------------------

const PREFERRED: Record<Lang, string[]> = {
  en: [
    'Google US English',
    'Samantha',
    'Microsoft Aria',
    'Microsoft Jenny',
    'Alex',
    'Karen',
    'Daniel',
  ],
  zh: [
    'Google 普通话（中国大陆）',
    'Tingting',
    'Ting-Ting',
    'Microsoft Xiaoxiao',
    'Microsoft Yunxi',
    'Lili',
  ],
};

// Các giọng "hiệu ứng" của macOS (Bubbles, Zarvox...) cũng gắn nhãn en-US / zh-CN: né đi.
const NOVELTY =
  /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Ralph|Kathy|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley/;

function pick(lang: Lang): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const ours = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(lang));
  for (const name of PREFERRED[lang]) {
    const v = ours.find((o) => o.name.startsWith(name));
    if (v) return v;
  }
  const plain = ours.filter((v) => !NOVELTY.test(v.name) && !/HK|yue/i.test(v.lang));
  return plain.find((v) => v.lang.replace('_', '-') === LOCALE[lang]) ?? plain[0] ?? null;
}

// Giữ tham chiếu tới câu đang đọc: Chrome có lỗi bỏ dở câu khi đối tượng câu bị thu hồi bộ nhớ.
let utterance: SpeechSynthesisUtterance | null = null;

function speakWithBrowser(text: string, lang: Lang, slow: boolean) {
  const s = window.speechSynthesis;
  const voice = s && pick(lang);
  if (!s || !voice) return;
  s.cancel();
  utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = slow ? 0.6 : 0.9;
  s.speak(utterance);
}

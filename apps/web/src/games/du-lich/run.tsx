'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { sfx, unlockAudio } from './audio';
import {
  check,
  createDeck,
  draw,
  HEARTS,
  LEG,
  legPlan,
  pattern,
  points,
  type Card,
  type Check,
  type Deck,
  type Lang,
  type Topic,
} from './dictation';
import { IconCheck, IconClose, IconHeart, IconSlow, IconSpeaker } from './icons';
import { SpeakButton } from './speak-button';
import { preloadVoice, speak, stopSpeaking } from './speech';

// Màn chơi nghe-viết, dùng chung cho hai game du lịch. Không mang màu hay font riêng: mọi thứ đọc từ
// biến CSS --dl-* mà mỗi game đặt ở thẻ gốc (giấy hộ chiếu của English Traveler, giấy dó và son của
// Du lịch Trung Hoa), còn nhãn chặng và màn tới nơi do game tự vẽ.
//
// Một chuyến: các chặng sáu câu; máy đọc, người chơi gõ lại, Enter để chấm rồi Enter để đi tiếp (ô gõ
// giữ tiêu điểm suốt ván để bàn phím điện thoại không bật lên tắt xuống). Sai mất một tim, tới nơi được
// hồi một tim; hết tim là hết chuyến. Điểm chỉ sống trong ván này, tải lại trang là chơi lại từ 0.

export type Turn = { card: Card; input: string; result: Check; gained: number };
export type Summary = { score: number; legs: number; turns: Turn[] };

/** Hoạt ảnh dùng chung, mỗi game nhúng vào thẻ <style> của mình. Tắt khi giảm chuyển động. */
export const RUN_CSS = `
@keyframes dl-rise{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
.dl-rise{animation:dl-rise .35s cubic-bezier(.16,1,.3,1) both}
@keyframes dl-gain{0%{transform:translateY(6px) scale(.8);opacity:0}30%{transform:translateY(-4px) scale(1.15);opacity:1}100%{transform:translateY(-18px);opacity:0}}
.dl-gain{animation:dl-gain 1.1s cubic-bezier(.16,1,.3,1) both}
@keyframes dl-shake{0%,100%{transform:none}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
.dl-shake{animation:dl-shake .35s ease-out}
@media (prefers-reduced-motion:reduce){.dl-rise,.dl-gain,.dl-shake{animation:none}}
`;

const VERDICT: Record<Check['verdict'], string> = {
  right: 'Chính xác!',
  close: 'Gần đúng, sửa lại chút nhé',
  wrong: 'Chưa đúng',
};

type Phase = 'ask' | 'done' | 'arrive';

export function Run({
  lang,
  topics,
  legLabel,
  arrival,
  onExit,
  onOver,
}: {
  lang: Lang;
  topics: Topic[];
  /** Nhãn chặng đang đi (từ đâu tới đâu), game vẽ theo thế giới của nó. */
  legLabel: (leg: number) => ReactNode;
  /** Màn tới nơi sau mỗi chặng; gọi `onGo` để đi chặng tiếp. */
  arrival: (leg: number, onGo: () => void) => ReactNode;
  onExit: () => void;
  onOver: (s: Summary) => void;
}) {
  const deck = useRef<Deck | null>(null);
  const [leg, setLeg] = useState(0);
  const [step, setStep] = useState(0);
  const [card, setCard] = useState<Card | null>(null);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>('ask');
  const [result, setResult] = useState<Check | null>(null);
  const [hinted, setHinted] = useState(false);
  const [score, setScore] = useState(0);
  const [gained, setGained] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const turns = useRef<Turn[]>([]);
  const field = useRef<HTMLInputElement>(null);

  const deal = (legNo: number, stepNo: number) => {
    deck.current ??= createDeck(topics);
    setCard(draw(deck.current, topics, legPlan(legNo)[stepNo]!));
    // Tải sẵn giọng đọc của lá kế tiếp mỗi loại, để câu sau bấm là nghe ngay.
    for (const next of [deck.current.words[0], deck.current.sentences[0]])
      if (next) preloadVoice(next.text, lang);
    setInput('');
    setResult(null);
    setHinted(false);
    setPhase('ask');
    requestAnimationFrame(() => field.current?.focus());
  };

  // Lá đầu tiên rút trên máy khách (bộ bài xáo ngẫu nhiên, không dựng lúc render trên máy chủ).
  useEffect(() => {
    deal(0, 0);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chia một lần khi vào ván
  }, []);

  // Lá mới: đọc lên sau một nhịp ngắn để người chơi kịp nhìn.
  useEffect(() => {
    if (!card) return;
    const t = setTimeout(() => speak(card.text, lang), 250);
    return () => clearTimeout(t);
  }, [card, lang]);

  if (!card) return null;

  const submit = () => {
    if (phase !== 'ask' || !input.trim()) return;
    unlockAudio();
    const c = check(input, card, lang);
    const nextStreak = c.verdict === 'wrong' ? 0 : streak + 1;
    const pts = points(card.kind, c, hinted, c.verdict === 'wrong' ? 0 : streak);
    setResult(c);
    setStreak(nextStreak);
    setScore((s) => s + pts);
    setGained(pts);
    if (c.verdict === 'wrong') {
      setHearts((h) => h - 1);
      sfx.wrong();
    } else sfx.right();
    // Đọc lại đáp án để nghe đối chiếu với điều mình vừa viết.
    speak(card.text, lang);
    turns.current.push({ card, input, result: c, gained: pts });
    setPhase('done');
  };

  const giveUp = () => {
    if (phase !== 'ask') return;
    unlockAudio();
    const c: Check = { verdict: 'wrong', tones: false };
    setResult(c);
    setStreak(0);
    setGained(0);
    setHearts((h) => h - 1);
    sfx.wrong();
    speak(card.text, lang);
    turns.current.push({ card, input: '', result: c, gained: 0 });
    setPhase('done');
  };

  const next = () => {
    if (phase !== 'done') return;
    if (hearts <= 0) {
      onOver({ score, legs: leg, turns: turns.current });
      return;
    }
    if (step + 1 >= LEG) {
      sfx.stamp();
      setHearts((h) => Math.min(HEARTS, h + 1));
      setPhase('arrive');
      return;
    }
    setStep(step + 1);
    deal(leg, step + 1);
  };

  if (phase === 'arrive')
    return (
      <>
        {arrival(leg, () => {
          sfx.depart();
          setLeg(leg + 1);
          setStep(0);
          deal(leg + 1, 0);
        })}
      </>
    );

  const done = phase === 'done';
  const verdict = result?.verdict;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[color:var(--dl-mute)] hover:bg-[color:var(--dl-tile)] hover:text-[color:var(--dl-ink)]"
          aria-label="Kết thúc chuyến"
        >
          <IconClose className="h-6 w-6" />
        </button>
        <div className="relative flex flex-1 items-baseline gap-2">
          <span
            className="text-3xl font-bold tabular-nums [font-family:var(--dl-display)]"
            aria-label={`${score} điểm`}
          >
            {score}
          </span>
          <span className="text-sm font-semibold text-[color:var(--dl-mute)]">điểm</span>
          {streak >= 2 && (
            <span className="rounded-full bg-[color:var(--dl-tile)] px-2 py-0.5 text-xs font-bold text-[color:var(--dl-accentInk)] shadow-[inset_0_0_0_1.5px_var(--dl-line)]">
              {streak} câu liền
            </span>
          )}
          {done && gained > 0 && (
            <span
              key={turns.current.length}
              className="dl-gain absolute -top-3 left-0 text-lg font-bold text-[color:var(--dl-good)]"
              aria-hidden
            >
              +{gained}
            </span>
          )}
        </div>
        <div className="flex text-[color:var(--dl-bad)]" aria-label={`Còn ${hearts} lượt sai`}>
          {Array.from({ length: HEARTS }, (_, i) => (
            <IconHeart key={i} filled={i < hearts} className="h-5 w-5" />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {legLabel(leg)}
        <ol className="flex shrink-0 gap-1.5" aria-label={`Câu ${step + 1} trên ${LEG} của chặng`}>
          {Array.from({ length: LEG }, (_, i) => (
            <li
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                i < step || (i === step && done)
                  ? 'bg-[color:var(--dl-accent)]'
                  : i === step
                    ? 'bg-[color:var(--dl-accent)] opacity-40'
                    : 'bg-[color:var(--dl-line)]'
              }`}
            />
          ))}
        </ol>
      </div>

      <section
        className="flex flex-col items-center gap-4 rounded-[var(--dl-r)] bg-[color:var(--dl-card)] px-5 py-6 text-center shadow-[inset_0_0_0_1.5px_var(--dl-line),0_14px_28px_-22px_var(--dl-ink)]"
        aria-label="Đề"
      >
        <p className="text-sm font-semibold text-[color:var(--dl-mute)]">
          {card.kind === 'word' ? 'Nghe một từ' : 'Nghe một câu'} ·{' '}
          {topics.find((t) => t.id === card.topic)?.name}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              speak(card.text, lang);
              field.current?.focus();
            }}
            className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--dl-accent)] text-[color:var(--dl-onAccent)] shadow-[0_6px_0_var(--dl-accentDeep)] transition-transform active:translate-y-1 active:shadow-none"
            aria-label="Nghe lại"
          >
            <IconSpeaker className="h-10 w-10" />
          </button>
          <button
            type="button"
            onClick={() => {
              speak(card.text, lang, true);
              field.current?.focus();
            }}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--dl-tile)] text-[color:var(--dl-ink)] shadow-[inset_0_0_0_1.5px_var(--dl-line),0_4px_0_var(--dl-line)] active:translate-y-1 active:shadow-none"
            aria-label="Nghe chậm"
          >
            <IconSlow className="h-7 w-7" />
          </button>
        </div>
        {hinted || done ? (
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold">{card.vi}</p>
            {!done && (
              <p className="font-mono text-[color:var(--dl-mute)]" aria-label="Khuôn chữ">
                {pattern(card, lang)}
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setHinted(true);
              field.current?.focus();
            }}
            className="text-sm font-bold text-[color:var(--dl-accentInk)] underline underline-offset-4"
          >
            Gợi ý nghĩa (còn nửa điểm)
          </button>
        )}
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (done) next();
          else submit();
        }}
        className="flex flex-col gap-3"
      >
        <label htmlFor="dl-answer" className="text-sm font-semibold text-[color:var(--dl-mute)]">
          {lang === 'en'
            ? 'Viết lại điều bạn nghe được'
            : 'Gõ pinyin của điều bạn nghe được (có hay không dấu đều được)'}
        </label>
        <input
          ref={field}
          id="dl-answer"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          readOnly={done}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint={done ? 'next' : 'done'}
          lang={lang === 'en' ? 'en' : 'zh-Latn-pinyin'}
          placeholder={lang === 'en' ? 'Gõ tiếng Anh…' : 'Ví dụ: ni hao hoặc nǐ hǎo'}
          className={`min-h-14 w-full rounded-[var(--dl-r)] bg-[color:var(--dl-tile)] px-4 text-xl font-semibold [font-family:var(--dl-target)] outline-none transition-shadow placeholder:font-normal placeholder:text-[color:var(--dl-mute)] placeholder:opacity-70 ${
            verdict === 'right'
              ? 'shadow-[inset_0_0_0_2px_var(--dl-good)]'
              : verdict === 'close'
                ? 'shadow-[inset_0_0_0_2px_var(--dl-accent)]'
                : verdict === 'wrong'
                  ? 'dl-shake shadow-[inset_0_0_0_2px_var(--dl-bad)]'
                  : 'shadow-[inset_0_0_0_1.5px_var(--dl-line)] focus:shadow-[inset_0_0_0_2px_var(--dl-accent)]'
          }`}
        />

        {done && result && (
          <div
            role="status"
            className={`dl-rise flex flex-col gap-2 rounded-[var(--dl-r)] px-4 py-3 ${
              verdict === 'wrong' ? 'bg-[color:var(--dl-badSoft)]' : 'bg-[color:var(--dl-goodSoft)]'
            }`}
          >
            <p
              className={`flex items-center gap-2 font-bold ${verdict === 'wrong' ? 'text-[color:var(--dl-badInk)]' : 'text-[color:var(--dl-goodInk)]'}`}
            >
              {verdict === 'wrong' ? (
                <IconClose className="h-5 w-5" />
              ) : (
                <IconCheck className="h-5 w-5" />
              )}
              {VERDICT[result.verdict]}
              {gained > 0 && <span className="ml-auto tabular-nums">+{gained}</span>}
            </p>
            <Answer card={card} result={result} lang={lang} />
            <p className="text-[color:var(--dl-mute)]">{card.vi}</p>
            {lang === 'zh' && result.verdict !== 'wrong' && !result.tones && (
              <p className="text-sm text-[color:var(--dl-mute)]">
                Gõ đúng cả dấu thanh (nǐ hǎo hoặc ni3 hao3) để được thêm nửa số điểm.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!done && !input.trim()}
            className="min-h-14 flex-1 rounded-[var(--dl-r)] bg-[color:var(--dl-accent)] px-6 text-lg font-bold text-[color:var(--dl-onAccent)] [font-family:var(--dl-display)] shadow-[0_4px_0_var(--dl-accentDeep)] transition-[transform,opacity] active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:shadow-none"
          >
            {done
              ? hearts <= 0
                ? 'Xem kết quả'
                : step + 1 >= LEG
                  ? 'Tới nơi'
                  : 'Tiếp'
              : 'Kiểm tra'}
          </button>
          {!done && (
            <button
              type="button"
              onClick={giveUp}
              className="min-h-14 rounded-[var(--dl-r)] px-4 font-semibold text-[color:var(--dl-mute)] hover:bg-[color:var(--dl-tile)] hover:text-[color:var(--dl-ink)]"
            >
              Chịu, xem đáp án
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/** Đáp án: tiếng Anh tô đỏ những từ viết sai; tiếng Trung hiện chữ Hán và pinyin. */
function Answer({ card, result, lang }: { card: Card; result: Check; lang: Lang }) {
  const speakBtn = (
    <button
      type="button"
      onClick={() => speak(card.text, lang)}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--dl-accent)] text-[color:var(--dl-onAccent)]"
      aria-label="Nghe lại đáp án"
    >
      <IconSpeaker className="h-5 w-5" />
    </button>
  );
  if (lang === 'zh')
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-2xl font-bold [font-family:var(--dl-target)]">{card.text}</span>
          <span className="text-lg font-semibold">{card.pron}</span>
        </div>
        <span className="ml-auto">{speakBtn}</span>
      </div>
    );
  return (
    <div className="flex items-center gap-3">
      <p className="flex flex-wrap gap-x-1.5 text-xl font-bold [font-family:var(--dl-target)]">
        {(result.marks ?? []).map((w, i) => (
          <span
            key={i}
            className={
              w.ok ? '' : 'text-[color:var(--dl-badInk)] underline decoration-2 underline-offset-4'
            }
          >
            {w.text}
          </span>
        ))}
        {!result.marks && card.text}
      </p>
      <span className="ml-auto">{speakBtn}</span>
    </div>
  );
}

/** Danh sách các câu đã làm trong chuyến, câu sai lên đầu để ôn lại. */
export function History({ turns, lang }: { turns: Turn[]; lang: Lang }) {
  const sorted = [...turns].sort(
    (a, b) => Number(a.result.verdict !== 'wrong') - Number(b.result.verdict !== 'wrong'),
  );
  return (
    <ul className="flex flex-col">
      {sorted.map((t, i) => (
        <li
          key={i}
          className="flex min-h-14 items-center gap-3 border-b border-[color:var(--dl-line)] py-2"
        >
          <span
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${
              t.result.verdict === 'wrong'
                ? 'bg-[color:var(--dl-bad)]'
                : 'bg-[color:var(--dl-good)]'
            }`}
            aria-label={t.result.verdict === 'wrong' ? 'Sai' : 'Đúng'}
          >
            {t.result.verdict === 'wrong' ? (
              <IconClose className="h-4 w-4" />
            ) : (
              <IconCheck className="h-4 w-4" />
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-lg font-bold [font-family:var(--dl-target)]">
                {t.card.text}
              </span>
              {t.card.pron && (
                <span className="text-sm font-semibold text-[color:var(--dl-mute)]">
                  {t.card.pron}
                </span>
              )}
            </span>
            <span className="text-sm text-[color:var(--dl-mute)]">
              {t.card.vi}
              {t.result.verdict === 'wrong' && t.input && <> · bạn viết “{t.input}”</>}
            </span>
          </span>
          <SpeakButton text={t.card.text} lang={lang} />
        </li>
      ))}
    </ul>
  );
}

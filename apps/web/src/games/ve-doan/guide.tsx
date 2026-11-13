'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { CODE_LENGTH } from '../bong-bong-bum/net';
import {
  drawerPoints,
  guessPoints,
  maskWord,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PICK_TIME,
  REVEAL_TIME,
} from './engine';
import { letterCount } from './guess';
import { EraserIcon, TrashIcon, UndoIcon } from './icons';
import { BulbString, Button, GuessFeed, Ticket } from './kit';
import { SEAT_GRACE_MS } from './online';
import { DISPLAY, INKS } from './theme';
import { PACK_LABEL, wordsOf, type PackId } from './words';

// Cẩm nang của Vẽ Đoán: cách chơi đầy đủ, viết theo đúng luật trong engine.ts / guess.ts / ink.ts.
// Số giây, số người và điểm đọc thẳng từ code luật để cẩm nang không nói sai khi luật đổi.

const PICK_S = PICK_TIME / 1000;
const REVEAL_S = REVEAL_TIME / 1000;

// Ví dụ điểm tính bằng chính hàm chấm điểm của ván.
const EXAMPLE_TOTAL_S = 80;
const EXAMPLE_LEFT_S = 60;
const EXAMPLE_GUESS = guessPoints(EXAMPLE_LEFT_S * 1000, EXAMPLE_TOTAL_S * 1000);
const GUESS_TOP = guessPoints(1, 1);
const GUESS_FLOOR = guessPoints(0, 1);
const DRAWER_TOP = drawerPoints(1, 1);
const DRAWER_EXAMPLE = drawerPoints(3, 4);

/** Từ mẫu cho hàng ô vé và bảng câu đoán; ô vé đã lật hai chữ như lúc còn một phần tư giờ. */
const SAMPLE_WORD = 'bánh chưng';
const SAMPLE_PATTERN = maskWord(SAMPLE_WORD, [1, 8]);
/** Bảng câu đoán mẫu: đủ ba màu sai, gần đúng, đúng như trong lượt thật (chấm theo guess.ts). */
const SAMPLE_NAMES = ['Lan', 'Minh', 'Bạn'];
const SAMPLE_FEED = [
  { by: 0, verdict: 'wrong' as const, text: 'cái nón' },
  { by: 1, verdict: 'near' as const, text: 'bánh tét' },
  { by: 2, verdict: 'correct' as const, text: 'banh chung', points: EXAMPLE_GUESS },
];

const PACKS = Object.keys(PACK_LABEL) as PackId[];

function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-2xl bg-[#2b2060]/60 p-5 ring-1 ring-[color:var(--vd-wire)]"
    >
      <h2 id={id} className="flex items-center gap-3">
        <span
          aria-hidden
          className={`${DISPLAY} flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--vd-gold)] pt-1 text-xl leading-none text-[color:var(--vd-ink)] shadow-[inset_0_-2px_0_var(--vd-goldDeep)]`}
        >
          {n}
        </span>
        <span className={`${DISPLAY} pt-1.5 text-[28px] leading-none text-[color:var(--vd-bulb)]`}>
          {title}
        </span>
      </h2>
      {children}
    </section>
  );
}

function Points({ children }: { children: ReactNode }) {
  return (
    <ul className="flex flex-col gap-2 text-[15px] leading-snug text-[color:var(--vd-bulb)]">
      {children}
    </ul>
  );
}

function Point({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        aria-hidden
        className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-[color:var(--vd-bulb)] shadow-[0_0_6px_2px_rgb(255_201_60/0.55)]"
      />
      <span>{children}</span>
    </li>
  );
}

const B = ({ children }: { children: ReactNode }) => (
  <b className="font-extrabold text-[color:var(--vd-gold)]">{children}</b>
);

/** Ô nhỏ giới thiệu một nút trên thanh công cụ vẽ, đúng hình nút thật. */
function Tool({ icon, label, note }: { icon: ReactNode; label: string; note: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[color:var(--vd-bulb)] ring-2 ring-[color:var(--vd-wire)] ring-inset"
      >
        {icon}
      </span>
      <span className="text-[15px] leading-snug">
        <b className="font-bold">{label}</b>
        <span className="text-[color:var(--vd-mute)]"> — {note}</span>
      </span>
    </li>
  );
}

export function Guide({ onBack }: { onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  // Mở cẩm nang là đổi cả màn: đưa tiêu điểm lên tiêu đề để trình đọc màn hình đọc từ đầu.
  useEffect(() => heading.current?.focus(), []);

  return (
    <article aria-labelledby="vd-guide" className="mx-auto flex max-w-xl flex-col gap-6 pt-2">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-bold tracking-[0.08em] text-[color:var(--vd-gold)] uppercase">
          Cẩm nang · Cách chơi
        </p>
        <h1
          id="vd-guide"
          ref={heading}
          tabIndex={-1}
          className={`${DISPLAY} pt-2 text-[56px] leading-[0.9] text-[color:var(--vd-gold)] outline-none [text-shadow:0_3px_0_var(--vd-redDeep)]`}
        >
          Vẽ Đoán
        </h1>
        <p className="text-[15px] leading-snug text-[color:var(--vd-bulb)]">
          Mỗi lượt một người vẽ một từ bí mật, cả phòng gõ đoán. Đoán ra càng nhanh càng nhiều điểm;
          người vẽ có điểm khi người khác đoán ra. Hết số lượt, ai nhiều điểm nhất thắng.
        </p>
      </header>

      <Section id="vd-g-room" n={1} title="Vào phòng">
        <Points>
          <Point>
            Chơi qua mạng, <B>mỗi người một điện thoại</B>, từ {MIN_PLAYERS} đến {MAX_PLAYERS}{' '}
            người. Không có chơi với máy hay chung một máy.
          </Point>
          <Point>
            Nhập tên rồi bấm <B>Tạo phòng</B>: bạn là chủ phòng (có vương miện). Phòng có mã{' '}
            {CODE_LENGTH} ký tự, mã QR và nút <B>Chép link mời</B>.
          </Point>
          <Point>
            Bạn bè quét QR, mở link mời, hoặc gõ mã vào ô <B>Mã phòng</B> ở màn chính rồi bấm{' '}
            <B>Vào</B>.
          </Point>
          <Point>
            Chủ phòng chọn số lượt vẽ (3, 6 hoặc 9 lượt cho cả phòng), thời gian vẽ (60, 80 hoặc 100
            giây) và bộ từ, rồi bấm <B>Bắt đầu</B> khi có ít nhất {MIN_PLAYERS} người. Ván đang chạy
            thì người mới chưa vào được, phải chờ chủ phòng về phòng chờ.
          </Point>
          <Point>
            Lỡ tải lại trang (F5) vẫn ở lại phòng: chủ phòng mở lại đúng mã và ván, khách tự nối lại
            ghế cũ. Rớt mạng lâu quá {SEAT_GRACE_MS / 1000} giây thì bị tính là rời phòng. Chủ phòng
            giữ đồng hồ và điểm của cả phòng: chủ phòng thoát hẳn là phòng đóng.
          </Point>
        </Points>
      </Section>

      <Section id="vd-g-turn" n={2} title="Một lượt chơi">
        <Points>
          <Point>
            Người vẽ đầu tiên bốc ngẫu nhiên, sau đó lần lượt theo thứ tự ghế (bỏ qua người đã rời).
            Ván nhiều lượt hơn số người thì có người vẽ lại.
          </Point>
          <Point>
            <B>Chọn từ:</B> người vẽ thấy ba từ, có {PICK_S} giây để chọn một. Hết giờ thì máy tự
            lấy từ đầu tiên. Từ đã ra trong ván không lặp lại cho tới khi bộ từ dùng hết.
          </Point>
          <Point>
            <B>Vẽ:</B> người vẽ vẽ bằng ngón tay, cả phòng thấy nét hiện ngay. Vẽ hình, đừng viết
            chữ!
          </Point>
          <Point>
            Dây bóng đèn là đồng hồ: <B>mỗi bóng một giây</B>, còn bao nhiêu giây sáng bấy nhiêu
            bóng, bóng sắp tắt nhấp nháy.
          </Point>
        </Points>
        <div aria-hidden className="rounded-xl bg-[color:var(--vd-tarp)] px-4 py-3">
          <BulbString total={20} lit={13} perRow={20} />
        </div>
        <Points>
          <Point>
            Người đoán thấy hàng ô vé: mỗi ô một chữ cái, khoảng trống tách các tiếng. Hết nửa thời
            gian thì lật sẵn một chữ (từ có từ 4 chữ cái), còn một phần tư thời gian thì lật thêm
            một chữ (từ có từ 7 chữ cái).
          </Point>
        </Points>
        <div className="flex flex-col items-center gap-2 rounded-xl bg-[color:var(--vd-tarp)] px-4 py-4">
          <Ticket pattern={SAMPLE_PATTERN} />
          <p className="text-center text-xs font-bold tracking-[0.08em] text-[color:var(--vd-mute)] uppercase">
            Ví dụ: {letterCount(SAMPLE_WORD)} chữ cái · {SAMPLE_WORD.split(' ').length} tiếng, đã
            lật 2 chữ
          </p>
        </div>
        <Points>
          <Point>
            Lượt kết thúc khi hết giờ, khi mọi người đã đoán ra, hoặc khi người vẽ bấm{' '}
            <B>Vẽ xong</B> (phải bấm hai lần cho chắc). Người vẽ rời phòng thì bỏ lượt, không ai có
            điểm.
          </Point>
          <Point>Hết lượt, đáp án và điểm của lượt hiện {REVEAL_S} giây rồi sang lượt kế.</Point>
        </Points>
      </Section>

      <Section id="vd-g-draw" n={3} title="Bút vẽ">
        <Points>
          <Point>Tám màu bút và ba cỡ bút (nhỏ, vừa, to). Chạm vào nút để xem tên.</Point>
        </Points>
        <ul className="flex flex-wrap gap-x-3 gap-y-2" aria-label="Tám màu bút">
          {INKS.map((ink) => (
            <li key={ink.hex} className="flex items-center gap-1.5 text-[13px] font-semibold">
              <span
                aria-hidden
                className="h-5 w-5 rounded-full shadow-[inset_0_-2px_0_rgb(0_0_0/0.25)] ring-1 ring-[color:var(--vd-wire)]"
                style={{ background: ink.hex }}
              />
              {ink.name}
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-2.5">
          <Tool
            icon={<EraserIcon />}
            label="Tẩy"
            note="xoá từng chỗ, nét tẩy to hơn bút đang chọn"
          />
          <Tool icon={<UndoIcon />} label="Hoàn tác" note="bỏ nét vừa vẽ, bấm nhiều lần được" />
          <Tool icon={<TrashIcon />} label="Xoá hết" note="xoá sạch bảng để vẽ lại" />
        </ul>
      </Section>

      <Section id="vd-g-guess" n={4} title="Đoán">
        <Points>
          <Point>
            Gõ vào ô <B>Câu đoán</B> rồi bấm <B>Đoán</B>, đoán bao nhiêu lần cũng được cho tới khi
            ra.
          </Point>
          <Point>
            <B>Gõ không dấu vẫn tính đúng</B>, hoa thường như nhau: “meo” là “mèo”, “banh chung” là
            “bánh chưng”.
          </Point>
          <Point>
            Có thể bỏ chữ đứng đầu như con, cái, quả, chiếc, cây, đôi, chùm, quyển: “mèo” cũng đúng
            với “con mèo”.
          </Point>
          <Point>
            <B>Gần đúng</B> (dòng vàng) khi sai một chữ cái (từ dài thì hai), hoặc trúng một tiếng
            của đáp án, như “bánh tét” khi đáp án là “bánh chưng”. Chưa có điểm, nhưng là đang đi
            đúng hướng.
          </Point>
          <Point>
            Câu đúng và câu gần đúng của người khác bị che chữ để không lộ đáp án. Đoán ra rồi thì
            chờ người khác.
          </Point>
        </Points>
        <div className="flex flex-col gap-2">
          <GuessFeed feed={SAMPLE_FEED} nameOf={(id) => SAMPLE_NAMES[id] ?? '?'} />
          <p className="text-center text-xs font-bold tracking-[0.08em] text-[color:var(--vd-mute)] uppercase">
            Ví dụ khi đáp án là “{SAMPLE_WORD}”
          </p>
        </div>
      </Section>

      <Section id="vd-g-score" n={5} title="Tính điểm">
        <Points>
          <Point>
            <B>Người đoán:</B> đoán ra ngay được {GUESS_TOP} điểm, giảm dần đều theo thời gian, sát
            giờ vẫn được {GUESS_FLOOR}. Ví dụ lượt {EXAMPLE_TOTAL_S} giây, đoán ra khi còn{' '}
            {EXAMPLE_LEFT_S} giây: {EXAMPLE_GUESS} điểm.
          </Point>
          <Point>
            <B>Người vẽ:</B> cả phòng đoán ra được {DRAWER_TOP} điểm, ít người hơn thì chia theo tỉ
            lệ. Ví dụ 3 trong 4 người đoán ra: {DRAWER_EXAMPLE} điểm. Không ai ra thì 0.
          </Point>
          <Point>Ai chưa đoán ra khi lượt kết thúc được 0 điểm lượt đó.</Point>
        </Points>
      </Section>

      <Section id="vd-g-end" n={6} title="Kết thúc ván">
        <Points>
          <Point>
            Ván kết thúc sau đủ số lượt đã chọn, hoặc sớm hơn khi phòng còn dưới {MIN_PLAYERS}{' '}
            người.
          </Point>
          <Point>
            Màn tổng kết xếp hạng theo tổng điểm (bằng điểm đứng đầu thì hoà) và bày lại tranh của
            cả ván. Chủ phòng chọn <B>Chơi ván nữa</B> hoặc <B>Về phòng chờ</B>.
          </Point>
        </Points>
      </Section>

      <Section id="vd-g-packs" n={7} title="Bộ từ">
        <Points>
          <Point>
            Toàn thứ vẽ được bằng vài nét và ai cũng gọi cùng một tên. Chủ phòng chọn bộ từ ở phòng
            chờ.
          </Point>
        </Points>
        <ul className="flex flex-col gap-2">
          {PACKS.map((pack) => (
            <li
              key={pack}
              className="flex flex-col gap-0.5 rounded-xl bg-[color:var(--vd-paper)] px-4 py-2.5 text-[color:var(--vd-ink)]"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className={`${DISPLAY} pt-1 text-2xl leading-none`}>{PACK_LABEL[pack]}</span>
                <span className="shrink-0 text-[13px] font-bold text-[color:var(--vd-inkSoft)]">
                  {wordsOf(pack).length} từ
                </span>
              </span>
              <span className="text-sm text-[color:var(--vd-inkSoft)]">
                {pack === 'mix'
                  ? 'Gộp cả bốn bộ bên dưới.'
                  : `Ví dụ: ${wordsOf(pack).slice(0, 3).join(', ')}…`}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Button onClick={onBack} className="w-full">
        Về màn chính
      </Button>
    </article>
  );
}

'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { COLS, MAX_PLAYERS, ROWS } from '../bong-bong-bum/map';
import { CODE_LENGTH } from '../bong-bong-bum/net';
import { Btn, CARD, DISPLAY, HEADING } from '../bong-bong-bum/ui';
import { ARENAS, propAt, type Arena, type Prop } from './arenas';
import {
  FINAL_AT,
  FIRE_COOLDOWN,
  MATCH_TIME,
  MAX_AMMO,
  RELOAD,
  SAFE_AFTER_STUN,
  SHOT_RANGE,
  STUN_TIME,
} from './engine';
import { ArenaThumb, DIFFICULTIES, PROP_COLOR, SquadImg } from './screens';
import { SQUAD } from './squad';

// Cẩm nang của Sơn Lãnh Địa: luật, điều khiển, sân, chế độ chơi và đội sơn. Số liệu đọc thẳng từ
// engine, sân và đội sơn để cẩm nang không lệch khi chỉnh luật.

/** Giây viết kiểu Việt (1,2 thay vì 1.2). */
const sec = (n: number) => String(n).replace('.', ',');

const PROP_LABEL: Record<Prop, string> = {
  crate: 'Thùng gỗ',
  pillar: 'Cột đá',
  wall: 'Tường thấp',
  pool: 'Hồ nước',
};

/**
 * Độ khó bot, viết theo PROFILE trong bot.ts: khó hơn thì chọn đích nhanh hơn, ít lan man hơn
 * (think, pick), bắn sớm hơn khi thẳng hàng (aim) và hay bắn mở đường hơn (spray).
 */
const DIFFICULTY_NOTE: Record<(typeof DIFFICULTIES)[number]['id'], string> = {
  easy: 'chọn đường chậm, hay đi lòng vòng; thấy bạn thẳng hàng thì một lúc sau mới bắn.',
  medium: 'chọn đường nhanh hơn, bắn khá nhanh khi bạn thẳng hàng.',
  hard: 'lao thẳng tới chỗ chưa sơn gần nhất, bắn gần như ngay khi bạn thẳng hàng trong tầm, đầy sơn thì bắn mở đường.',
};

/** Đếm vật cản theo loại để mô tả từng sân ("4 thùng gỗ · 4 cột đá…"). */
function propSummary(arena: Arena): string {
  const count = new Map<Prop, number>();
  arena.rows.forEach((row, y) =>
    [...row].forEach((_, x) => {
      const p = propAt(arena, x, y);
      if (p) count.set(p, (count.get(p) ?? 0) + 1);
    }),
  );
  return [...count].map(([p, n]) => `${n} ô ${PROP_LABEL[p].toLowerCase()}`).join(' · ');
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-block min-w-7 rounded-md border-2 border-b-[4px] border-[color:var(--bb-ink)] bg-white px-1.5 text-center font-['Nunito',sans-serif] text-xs font-extrabold">
      {children}
    </kbd>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={`${CARD} p-4`} aria-labelledby={id}>
      <h3 id={id} className={`${HEADING} text-2xl`}>
        {title}
      </h3>
      <div className="mt-2 text-sm font-bold text-slate-700">{children}</div>
    </section>
  );
}

const LIST = 'list-disc space-y-1.5 pl-5';

export function GuideScreen({ onBack }: { onBack: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Mở từ giữa sảnh (đã cuộn xuống trên điện thoại): đưa về đầu trang và đặt tiêu điểm vào tiêu đề
  // để trình đọc màn hình biết đã sang màn khác.
  useEffect(() => {
    window.scrollTo(0, 0);
    headingRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Btn tone="cream" onClick={onBack}>
          ← Về
        </Btn>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className={`${DISPLAY} text-4xl text-white outline-none [-webkit-text-stroke:2px_var(--bb-ink)] [paint-order:stroke_fill]`}
        >
          Cẩm nang
        </h2>
      </div>

      <Section id="sld-guide-goal" title="Mục tiêu">
        <ul className={LIST}>
          <li>
            Mỗi trận {MATCH_TIME / 60} phút trên sân {COLS}×{ROWS} ô. Chạy tới ô nào, ô đó đổi sang
            màu phe bạn — kể cả ô đối thủ đã sơn, giành lại được hết.
          </li>
          <li>
            Hết giờ, phe phủ nhiều ô sàn nhất thắng. Bằng ô nhau thì hoà. Thanh lãnh địa trên cùng
            màn trận cho biết mỗi phe đang giữ bao nhiêu phần trăm sàn.
          </li>
          <li>{FINAL_AT} giây cuối đồng hồ chuyển đỏ và nhấp nháy: lúc dốc sức giành sàn.</li>
        </ul>
      </Section>

      <Section id="sld-guide-controls" title="Điều khiển">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white p-3">
            <h4 className={`${HEADING} text-lg`}>Trên điện thoại</h4>
            <ul className={`${LIST} mt-1`}>
              <li>Kéo cần điều khiển bên trái để chạy lên, xuống, trái, phải.</li>
              <li>
                Chạm nút <b>Bắn!</b> bên phải. Ngay trên nút là số viên sơn còn lại.
              </li>
              <li>
                Nút <b>❚❚</b> ở góc trên: tạm dừng, chỉnh âm lượng, ẩn hoặc hiện nút cảm ứng.
              </li>
            </ul>
          </div>
          <div className="rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white p-3">
            <h4 className={`${HEADING} text-lg`}>Bàn phím</h4>
            <table className="mt-1 w-full border-separate border-spacing-y-1 text-left">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th scope="col" className="font-extrabold">
                    <span className="sr-only">Việc</span>
                  </th>
                  <th scope="col" className="font-extrabold">
                    Người 1
                  </th>
                  <th scope="col" className="font-extrabold">
                    Người 2
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row" className="pr-2">
                    Chạy
                  </th>
                  <td>
                    <Kbd>W</Kbd> <Kbd>A</Kbd> <Kbd>S</Kbd> <Kbd>D</Kbd>
                  </td>
                  <td>
                    <Kbd>↑</Kbd> <Kbd>←</Kbd> <Kbd>↓</Kbd> <Kbd>→</Kbd>
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="pr-2">
                    Bắn
                  </th>
                  <td>
                    <Kbd>Space</Kbd>
                  </td>
                  <td>
                    <Kbd>Enter</Kbd>
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="pr-2">
                    Tạm dừng
                  </th>
                  <td colSpan={2}>
                    <Kbd>Esc</Kbd>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-1 text-xs">Chơi một mình thì dùng bộ phím nào cũng được.</p>
          </div>
        </div>
        <p className="mt-2">
          Bóng sơn bay theo hướng bạn đang quay mặt, tức hướng chạy gần nhất — muốn bắn ai thì quay
          về phía người đó trước.
        </p>
      </Section>

      <Section id="sld-guide-shots" title="Bóng sơn và đứng hình">
        <ul className={LIST}>
          <li>
            Mang tối đa {MAX_AMMO} viên, cứ {sec(RELOAD)} giây tự nạp thêm một viên. Hai phát bắn
            cách nhau ít nhất {sec(FIRE_COOLDOWN)} giây.
          </li>
          <li>Bóng bay thẳng xa {SHOT_RANGE} ô và sơn mọi ô nó bay qua.</li>
          <li>
            Bóng vỡ khi trúng người, đụng vật cản hoặc hết tầm: sơn ô đó và bốn ô sát bên, thành
            hình dấu cộng.
          </li>
          <li>
            Trúng đối thủ thì họ đứng hình {sec(STUN_TIME)} giây: không chạy, không sơn, không nạp
            sơn. Hết đứng hình được miễn trúng thêm {sec(SAFE_AFTER_STUN)} giây.
          </li>
          <li>Chơi hai đội thì bóng sơn bay xuyên qua đồng đội, không làm ai đứng hình.</li>
        </ul>
      </Section>

      <Section id="sld-guide-arenas" title="Sân">
        <p>
          Bốn sân, chọn ở màn cài trận (hoặc để Ngẫu nhiên). Mọi vật cản đều chặn cả người lẫn bóng
          sơn và không sơn được.
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1" aria-label="Các loại vật cản">
          {(Object.keys(PROP_LABEL) as Prop[]).map((p) => (
            <li key={p} className="flex items-center gap-1.5">
              <span
                className="h-3.5 w-3.5 rounded-sm border-2 border-[color:var(--bb-ink)]"
                style={{ background: PROP_COLOR[p] }}
                aria-hidden
              />
              {PROP_LABEL[p]}
            </li>
          ))}
        </ul>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ARENAS.map((a) => (
            <li
              key={a.id}
              className="overflow-hidden rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white"
            >
              <div role="img" aria-label={`Sơ đồ sân ${a.name} nhìn từ trên xuống`}>
                <ArenaThumb arena={a} />
              </div>
              <p className="px-2 pt-1 font-extrabold text-[color:var(--bb-ink)]">{a.name}</p>
              <p className="px-2 pb-1.5 text-xs text-slate-600">{propSummary(a)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="sld-guide-modes" title="Chế độ chơi">
        <dl className="flex flex-col gap-2">
          <div>
            <dt className="font-extrabold text-[color:var(--bb-ink)]">Chơi với bot</dt>
            <dd>
              Bạn và 1–{MAX_PLAYERS - 1} bot. Bot tìm chỗ sàn chưa phải màu mình gần nhất để sơn,
              thấy đối thủ thẳng hàng trong tầm thì quay sang bắn.
            </dd>
          </div>
          <div>
            <dt className="font-extrabold text-[color:var(--bb-ink)]">2 người cùng máy</dt>
            <dd>
              Hai người chung một bàn phím (bộ phím Người 1 và Người 2), thêm 0–{MAX_PLAYERS - 2}{' '}
              bot nếu muốn.
            </dd>
          </div>
          <div>
            <dt className="font-extrabold text-[color:var(--bb-ink)]">Mời bạn (online)</dt>
            <dd>
              Tạo phòng rồi gửi link, mã {CODE_LENGTH} ký tự hoặc mã QR cho bạn bè. Tối đa{' '}
              {MAX_PLAYERS} người kể cả bot, cần ít nhất 2. Chủ phòng chọn sân, luật và bot; mỗi
              người tự chọn nhân vật, không ai trùng ai. Ai rớt mạng giữa trận thì bot chơi thay tới
              hết trận. Trận online không tạm dừng được, và chủ phòng tải lại trang là phòng đóng.
            </dd>
          </div>
          <div>
            <dt className="font-extrabold text-[color:var(--bb-ink)]">Luật</dt>
            <dd>
              <b>Mỗi người một màu</b>: ai cũng là một phe, sơn đúng màu nhân vật mình chọn.{' '}
              <b>Hai đội</b>: P1, P3, P5 đội Hồng · P2, P4, P6 đội Xanh, cả đội cộng chung số ô.
            </dd>
          </div>
          <div>
            <dt className="font-extrabold text-[color:var(--bb-ink)]">Độ khó bot</dt>
            <dd>
              <ul className={LIST}>
                {DIFFICULTIES.map((d) => (
                  <li key={d.id}>
                    <b>{d.label}</b>: {DIFFICULTY_NOTE[d.id]}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </Section>

      <Section id="sld-guide-squad" title="Đội sơn">
        <p>
          Tám nhân vật chạy nhanh như nhau, bắn như nhau — chỉ khác màu sơn. Chơi mỗi người một màu
          thì sàn của bạn mang đúng màu nhân vật bạn chọn.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SQUAD.map((d) => (
            <li
              key={d.id}
              className="flex flex-col overflow-hidden rounded-xl border-[3px] border-[color:var(--bb-ink)]"
              style={{
                background: `radial-gradient(circle at 50% 60%, #ffffff 0%, ${d.color}55 75%)`,
              }}
            >
              <span className="flex h-32 items-end justify-center px-1 pt-2">
                <SquadImg id={d.id} alt={`${d.name} vác súng sơn`} className="h-full w-full" />
              </span>
              <span
                className={`${DISPLAY} flex h-8 items-center justify-center text-lg text-[color:var(--bb-ink)]`}
                style={{ background: d.color }}
              >
                {d.name}
              </span>
              <p className="flex-1 bg-white px-2 py-1.5 text-xs font-bold text-slate-700">
                {d.blurb}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex justify-center">
        <Btn tone="sun" className="px-8 py-3 text-xl" onClick={onBack}>
          Đã hiểu, vào chơi!
        </Btn>
      </div>
    </div>
  );
}

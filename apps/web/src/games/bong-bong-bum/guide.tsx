'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AGENTS } from './agents';
import { ART_IDS } from './art';
import { CHARACTERS, characterById, type CharacterDef } from './characters';
import {
  DROP_CHANCE,
  FUSE,
  MATCH_TIME,
  MAX_BOMBS,
  MAX_LIVES,
  MAX_RANGE,
  MAX_SPEED_UPS,
  SAFE_AFTER_FREE,
  SUDDEN_AT,
  TRAP_TIME,
} from './engine';
import { BOARD_SIZE } from './leaderboard';
import { MAX_PLAYERS, THEMES } from './map';
import { CharacterGrid } from './screens';
import { Btn, CARD, CharCanvas, DISPLAY, HEADING, ItemIcon, ITEM_INFO, Keycap } from './ui';

// Cẩm nang mở từ trang chủ: cách chơi (viết theo đúng luật trong engine.ts, bot.ts, match.tsx)
// và cả dàn nhân vật vẽ bằng chính hình trong game. Số liệu đọc từ hằng số của engine để chữ
// không lệch khi luật đổi.

type Tab = 'rules' | 'cast';

const num = (n: number) => n.toLocaleString('vi-VN');

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${CARD} p-4`}>
      <h3 className={`${HEADING} text-2xl`}>{title}</h3>
      <div className="mt-2 text-sm font-bold leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

/** Dòng luật dạng "Tên: nội dung", cùng kiểu với bảng Vật phẩm & kỹ năng. */
function Rule({ name, children }: { name: string; children: ReactNode }) {
  return (
    <li>
      <span className="font-extrabold text-[color:var(--bb-coral)]">{name}:</span> {children}
    </li>
  );
}

function HowToPlay() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Mục tiêu">
        <p>
          Đặt bóng nổ để nhốt đối thủ vào bong bóng, rồi chạm vào bong bóng của họ để hạ. Người —
          hoặc đội — cuối cùng còn trụ lại là thắng.
        </p>
        <p className="mt-2">
          Mỗi trận dài {num(MATCH_TIME / 60)} phút. Hết giờ mà vẫn còn hơn một phe thì hoà.
        </p>
      </Section>

      <Section title="Điều khiển">
        <h4 className={`${HEADING} text-lg`}>Trên điện thoại</h4>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Kéo cần điều khiển tròn để đi 4 hướng.</li>
          <li>
            Chạm nút <b className="text-[color:var(--bb-coral)]">Bùm!</b> để đặt bóng. Đang bị nhốt
            mà có kim thì nút đổi thành <b>Kim</b> — chạm để tự thoát.
          </li>
          <li>
            Cầm dọc: cần và nút nằm dưới bản đồ. Xoay ngang: nổi hai bên. Nút ❚❚ trên cùng để tạm
            dừng, nút ? để xem vật phẩm.
          </li>
        </ul>
        <h4 className={`${HEADING} mt-3 text-lg`}>Bàn phím</h4>
        <div className="mt-1 grid grid-cols-[auto_1fr_1fr] items-center gap-x-3 gap-y-1.5">
          <span />
          <span>Người 1</span>
          <span>Người 2</span>
          {[
            ['Di chuyển', 'W A S D', '↑ ← ↓ →'],
            ['Đặt bóng / dùng kim', 'Space', 'Enter'],
            ['Tạm dừng', 'Esc', 'Esc'],
          ].map(([action, p1, p2]) => (
            <div key={action} className="contents">
              <span className="text-slate-600">{action}</span>
              <Keycap>{p1}</Keycap>
              <Keycap>{p2}</Keycap>
            </div>
          ))}
        </div>
        <p className="mt-2">
          Chơi một mình thì dùng được cả hai bộ phím. Giữ nhiều phím thì hướng bấm sau cùng được ưu
          tiên; đi hơi lệch làn vào góc tường thì nhân vật tự trượt vào lối.
        </p>
      </Section>

      <Section title="Luật bóng nổ">
        <ul className="space-y-1.5">
          <Rule name="Đặt bóng">
            Bóng nổ sau {num(FUSE)} giây theo hình chữ thập. Lúc đầu mỗi người đặt được 1 quả cùng
            lúc, tầm nổ 1 ô. Vừa đặt xong vẫn bước ra khỏi quả bóng dưới chân được, nhưng không đi
            xuyên qua quả bóng khác.
          </Rule>
          <Rule name="Khối">
            Khối cứng chặn vụ nổ. Khối mềm bị phá và vụ nổ dừng ở đó (trừ Bóng lửa); mỗi khối vỡ có
            khoảng {Math.round(DROP_CHANCE * 100)}% rơi ra vật phẩm. Vật phẩm trên sàn trúng nổ là
            mất.
          </Rule>
          <Rule name="Nổ dây chuyền">Vụ nổ chạm quả bóng khác thì quả đó nổ theo ngay.</Rule>
          <Rule name="Bị nhốt">
            Trúng nổ thì bị nhốt trong bong bóng {num(TRAP_TIME)} giây, chỉ bò chậm được. Hết giờ là
            bị loại.
          </Rule>
          <Rule name="Cứu & hạ">
            Đồng đội chạm vào bong bóng là được cứu (miễn nổ {num(SAFE_AFTER_FREE)} giây); đối thủ
            chạm vào là bị loại và họ được tính một lần hạ.
          </Rule>
          <Rule name="Đột tử">
            Còn {num(SUDDEN_AT)} giây thì khối cứng rơi dần theo vòng xoắn từ mép vào giữa. Bị khối
            đè là bị loại ngay, kể cả khi còn mạng phụ.
          </Rule>
        </ul>
      </Section>

      <Section title="Chế độ chơi">
        <ul className="space-y-1.5">
          <Rule name="Chơi với bot">
            Bạn và 1–{MAX_PLAYERS - 1} bot. Bot có ba mức: Dễ nghĩ chậm, hay sai và không đuổi theo
            người; Vừa biết đuổi theo; Khó phản ứng gần như tức thì và không mắc lỗi.
          </Rule>
          <Rule name="2 người cùng máy">
            Chung một bàn phím (bảng phím ở trên), thêm 0–{MAX_PLAYERS - 2} bot tuỳ ý.
          </Rule>
          <Rule name="Mời bạn qua mạng">
            Bấm Mời bạn để tạo phòng: có mã 6 ký tự, link và mã QR. Bạn bè quét QR, mở link hoặc
            nhập mã ở trang chính. Tối đa {MAX_PLAYERS} người; mỗi người chọn nhân vật, khách bấm
            Sẵn sàng, chủ phòng chọn bản đồ, luật, số bot, độ khó rồi bấm Bắt đầu. Trận qua mạng
            không tạm dừng được; ai rớt mạng thì bot chơi thay tới khi họ vào lại. Chủ phòng lỡ tay
            F5 vẫn mở lại đúng phòng; khách vào bằng link thì F5 cũng vào lại.
          </Rule>
          <Rule name="Luật">
            Mỗi người một phe, hoặc Hai đội: P1, P3, P5 đội Xanh · P2, P4, P6 đội Đỏ.
          </Rule>
          <Rule name="Bản đồ">
            {THEMES.length} bản đồ, mỗi nơi một kiểu bố trí khối:{' '}
            {THEMES.map((t) => t.name).join(', ')}, hoặc để Ngẫu nhiên.
          </Rule>
        </ul>
      </Section>

      <section className={`${CARD} p-4 lg:col-span-2`}>
        <h3 className={`${HEADING} text-2xl`}>Vật phẩm</h3>
        <p className="text-sm font-bold text-slate-600">
          Rơi ra khi phá khối mềm — đi vào là nhặt. Tối đa {MAX_BOMBS} quả bóng, tầm nổ {MAX_RANGE}{' '}
          ô, tăng tốc {MAX_SPEED_UPS} lần, giữ 3 kim và {MAX_LIVES} mạng phụ.
        </p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ITEM_INFO.map((it) => (
            <li
              key={it.kind}
              className="flex items-center gap-3 rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white p-2"
            >
              <ItemIcon kind={it.kind} size={44} />
              <div className="min-w-0">
                <p className="font-extrabold">{it.name}</p>
                <p className="text-sm font-bold leading-snug text-slate-600">{it.effect}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Section title="Điểm & bảng xếp hạng">
        <ul className="space-y-1.5">
          <Rule name="Điểm mỗi trận">
            100 cho mỗi người bạn hạ, 10 cho mỗi vật phẩm nhặt được, cộng 300 nếu thắng. Phân thân
            hạ được ai thì tính cho chủ.
          </Rule>
          <Rule name="Xếp hạng trong trận">
            Phe thắng đứng đầu, sau đó ai trụ lâu hơn xếp trên, bằng nhau thì xét điểm.
          </Rule>
          <Rule name="Bảng xếp hạng">
            Top {BOARD_SIZE} trên máy này, cộng dồn theo tên, xếp theo tổng điểm rồi số trận thắng.
            Mỗi máy chỉ ghi người chơi trên máy đó; bot không được ghi.
          </Rule>
        </ul>
      </Section>
    </div>
  );
}

const groupOf = (d: CharacterDef) =>
  AGENTS.some((a) => a.id === d.id)
    ? 'Đặc vụ 3D'
    : ART_IDS.includes(d.id)
      ? 'Ảnh vẽ tay'
      : 'Vẽ bằng code';

function Trait({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-1.5 rounded-full border-2 border-[color:var(--bb-ink)] bg-white px-2.5 py-0.5 text-xs font-extrabold">
      {children}
    </li>
  );
}

function Cast() {
  const [id, setId] = useState(CHARACTERS[0]!.id);
  const d = characterById(id);
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
      {/* Điện thoại: thẻ chi tiết đứng trên lưới để chạm nhân vật nào cũng thấy ngay, không phải cuộn. */}
      <section
        className={`${CARD} flex gap-4 p-4 md:order-2 md:flex-col md:items-center md:text-center`}
        aria-live="polite"
      >
        <div className="flex shrink-0 items-end justify-center gap-1">
          <div role="img" aria-label={`${d.name}, nhìn từ phía trước`}>
            <CharCanvas key={d.id} def={d} pose="win" size={96} />
          </div>
          {d.back && (
            <div role="img" aria-label={`${d.name}, nhìn từ sau lưng`}>
              <CharCanvas key={`${d.id}-up`} def={d} dir="up" animate={false} size={64} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h3 className={`${HEADING} text-2xl leading-tight`}>{d.name}</h3>
          <p className="mt-1 text-sm font-bold text-slate-700">{d.blurb}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5 md:justify-center" aria-label="Đặc điểm">
            <Trait>{groupOf(d)}</Trait>
            {d.aura && (
              <Trait>
                <span
                  className="h-3 w-3 rounded-full border-2 border-[color:var(--bb-ink)]"
                  style={{ background: d.aura }}
                  aria-hidden
                />
                Màu kỹ năng loé dưới chân khi đặt bóng
              </Trait>
            )}
            {d.flies && <Trait>Bay lơ lửng, để lại vệt lấp lánh</Trait>}
            {d.back && <Trait>Đi lên thì quay lưng</Trait>}
          </ul>
        </div>
      </section>
      <section className={`${CARD} p-4 md:order-1`}>
        <h3 className={`${HEADING} text-2xl`}>Dàn nhân vật ({CHARACTERS.length})</h3>
        <p className="mb-3 text-sm font-bold text-slate-600">
          Ai cũng chung một luật và sức mạnh như nhau — chỉ khác dáng vẻ và hiệu ứng. Chạm vào một
          nhân vật để xem.
        </p>
        <CharacterGrid value={id} onPick={setId} />
      </section>
    </div>
  );
}

export function GuideScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('rules');
  const heading = useRef<HTMLHeadingElement>(null);
  // Nút mở nằm giữa màn chính: không cuộn về đầu thì cẩm nang mở ra ở giữa chừng. Đưa tiêu điểm
  // vào tiêu đề để trình đọc màn hình bắt đầu từ đây.
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus();
  }, []);
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Btn tone="cream" onClick={onBack}>
          ← Về
        </Btn>
        <h2
          ref={heading}
          tabIndex={-1}
          className={`${DISPLAY} text-4xl text-white outline-none [-webkit-text-stroke:2px_var(--bb-ink)] [paint-order:stroke_fill]`}
        >
          Cẩm nang
        </h2>
      </div>
      <div className="flex gap-2" role="group" aria-label="Phần cẩm nang">
        <Btn
          tone={tab === 'rules' ? 'sun' : 'cream'}
          className="flex-1 py-2 text-lg sm:flex-none sm:px-8"
          pressed={tab === 'rules'}
          onClick={() => setTab('rules')}
        >
          Cách chơi
        </Btn>
        <Btn
          tone={tab === 'cast' ? 'sun' : 'cream'}
          className="flex-1 py-2 text-lg sm:flex-none sm:px-8"
          pressed={tab === 'cast'}
          onClick={() => setTab('cast')}
        >
          Nhân vật
        </Btn>
      </div>
      {tab === 'rules' ? <HowToPlay /> : <Cast />}
    </div>
  );
}

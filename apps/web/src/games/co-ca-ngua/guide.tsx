'use client';

import type { ReactNode } from 'react';
import { warhorseShape } from './art';
import type { House } from './board';
import { BotIcon, LinkIcon, PassIcon } from './icons';
import { Banner, Button, DieFace, Plate } from './kit';
import { DEFAULT_RULES } from './rules';
import { Slash } from './screens';
import { DISPLAY, HOUSES } from './theme';

// Cẩm nang của Cờ cá ngựa, mở từ màn vào game: luật đi quân viết theo đúng rules.ts / engine.ts
// (sửa luật ở đó thì sửa cả chữ ở đây), bốn công tắc luật, ba cách chơi, nút bấm trong ván, và bốn
// nhà — bốn đạo quân của game — với cờ trận, màu và dáng chiến mã lấy từ chính cảnh 3D.

/**
 * Dáng chiến mã của quân cờ 3D (art.ts) trải thành đường SVG: cùng một hình nên cẩm nang không vẽ
 * lệch với quân trên bàn. Hình gốc có trục y hướng lên, SVG hướng xuống nên lật dấu y.
 */
const HORSE_PATH =
  warhorseShape()
    .getPoints(8)
    .map((v, i) => `${i ? 'L' : 'M'}${v.x.toFixed(3)} ${(-v.y).toFixed(3)}`)
    .join('') + 'Z';

function Warhorse({ house, size = 56 }: { house: House; size?: number }) {
  const h = HOUSES[house];
  return (
    <svg width={size} height={size} viewBox="-0.55 -1.12 1.25 1.3" aria-hidden className="shrink-0">
      <path d={HORSE_PATH} fill={h.hex} stroke={h.deep} strokeWidth="0.03" />
      {/* Đế sắt và vòng sáng màu nhà như quân trên bàn. */}
      <path d="M-0.42 0.16h0.86l-0.06-0.12h-0.74z" fill="#4a525c" />
      <rect x="-0.38" y="0" width="0.76" height="0.045" fill={h.hex} />
    </svg>
  );
}

const Part = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section id={id} aria-labelledby={`${id}-h`} className="flex scroll-mt-4 flex-col gap-3">
    <h2 id={`${id}-h`} className={`${DISPLAY} text-[28px] leading-none`}>
      {title}
    </h2>
    {children}
  </section>
);

/** Một điều luật: tên in đậm, lời giải thích, có thể kèm hình minh hoạ bên phải. */
function Rule({ title, children, art }: { title: string; children: ReactNode; art?: ReactNode }) {
  return (
    <li>
      <Plate className="flex items-start gap-4 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="font-extrabold">{title}</h3>
          <div className="flex flex-col gap-1.5 text-[16px] leading-snug">{children}</div>
        </div>
        {art}
      </Plate>
    </li>
  );
}

const Note = ({ children }: { children: ReactNode }) => (
  <p className="text-[15px] text-[color:var(--cc-ash)]">{children}</p>
);

/** Bốn công tắc luật như ở màn chuẩn bị / phòng chờ; "bật sẵn" đọc thẳng từ DEFAULT_RULES. */
const TOGGLES = [
  {
    label: 'Ra quân bằng 1 hoặc 6',
    byDefault: DEFAULT_RULES.enterOn === 'oneOrSix',
    on: 'Đổ 1 hay 6 đều được ra quân.',
    off: 'Chỉ đổ 6 mới ra quân.',
  },
  {
    label: 'Đổ 6 được đổ thêm',
    byDefault: DEFAULT_RULES.bonusOnSix,
    on: 'Đổ 6 và có con đi được thì đi xong được đổ tiếp.',
    off: 'Đổ 6 cũng chuyển lượt như mọi số khác.',
  },
  {
    label: 'Đá ngựa',
    byDefault: DEFAULT_RULES.kick,
    on: 'Dừng đúng ô có ngựa nhà khác thì con đó bị đá về chuồng.',
    off: 'Ngựa các nhà đứng chung ô được, không ai bị đá.',
  },
  {
    label: 'Về chuồng leo đúng bậc',
    byDefault: DEFAULT_RULES.exactHome,
    on: 'Mỗi lần leo một bậc, phải đổ đúng số của bậc kế tiếp.',
    off: 'Leo theo số đổ, miễn không quá bậc 6.',
  },
];

const MODES = [
  {
    icon: <PassIcon />,
    title: 'Đánh chung máy',
    text: 'Một điện thoại chuyền quanh bàn. Mỗi nhà chọn Người, Máy hoặc Trống; cần ít nhất hai nhà. Tới lượt một người khác, màn “Trao quyền chỉ huy” lật lên màu cờ nhà đó: đưa máy cho họ rồi chạm “… ra trận”. Bàn xoay về phía người đang cầm máy.',
  },
  {
    icon: <BotIcon />,
    title: 'Đánh với máy',
    text: 'Bạn cầm nhà Đỏ, đấu một tới ba máy; nhà nào không cần thì để Trống. Máy tự đổ, tự đi.',
  },
  {
    icon: <LinkIcon />,
    title: 'Lập phòng online',
    text: 'Mỗi người một máy. Chủ phòng cầm nhà Đỏ, mời bạn bằng link, mã 6 ký tự hoặc mã QR, chọn luật và có thể cho máy ngồi ghế trống. Người được mời mở link, hoặc nhập mã ở ô “Có mã phòng?”. Chủ phòng giữ ván và đổ xúc xắc cho mọi người nên không ai gian được; ai rớt mạng thì máy đánh thay tới khi người đó vào lại.',
  },
];

const CONTROLS: [string, string][] = [
  ['Đổ', 'Nút màu cờ nhà bạn ở khay dưới, sáng lên khi tới lượt bạn. Chạm là tung xúc xắc.'],
  ['Bảng trên', 'Lượt của ai, và mỗi nhà đã về đích mấy con trên bốn.'],
  ['Khay dưới', 'Mặt xúc xắc vừa đổ và dòng báo chuyện gì đang diễn ra.'],
  ['Rời ván', 'Góc trên bên trái: bỏ ván đang đánh, hoặc rời phòng online.'],
  ['Loa', 'Góc trên bên phải: bật, tắt tiếng. Máy nhớ lựa chọn cho lần sau.'],
];

const HOUSE_NOTES = [
  'Đánh với máy hay làm chủ phòng online, bạn cầm nhà này. Chuồng chéo góc với nhà Vàng.',
  'Đi ngay sau Đỏ. Chuồng chéo góc với nhà Lam.',
  'Chuồng chéo góc với nhà Đỏ — hai nhà ở hai đầu bàn.',
  'Xong lượt Lam thì quay về Đỏ. Chuồng chéo góc với nhà Lục.',
];

const SECTIONS = [
  ['cc-goal', 'Cách chơi'],
  ['cc-rules', 'Luật tuỳ chọn'],
  ['cc-modes', 'Chơi cùng ai'],
  ['cc-houses', 'Bốn nhà'],
] as const;

export function GuideScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-9">
      <div className="flex flex-col gap-3">
        <h1 className={`${DISPLAY} text-[52px] leading-[0.9]`}>Cẩm nang</h1>
        <Slash />
        <p className="text-lg text-[color:var(--cc-ash)]">
          Binh thư cho người mới cầm quân: luật đi, các luật tuỳ chọn và bốn nhà trên bàn.
        </p>
        <nav aria-label="Mục lục" className="flex flex-wrap gap-2">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex min-h-11 items-center px-3 text-sm font-bold text-[color:var(--cc-ash)] shadow-[inset_0_0_0_1px_var(--cc-iron)] hover:text-[color:var(--cc-bone)] focus-visible:shadow-[inset_0_0_0_2px_var(--cc-ember)] focus-visible:outline-none"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <Part id="cc-goal" title="Cách chơi">
        <p className="text-[17px] leading-snug">
          Mỗi nhà có bốn chiến mã đứng trong chuồng. Đưa cả bốn con chạy gần trọn một vòng bàn rồi
          leo lên bậc 6 của đường về chuồng. Nhà nào đủ bốn con về đích trước là thắng; các nhà còn
          lại xếp hạng theo số con đã về, rồi theo tổng số bước đã đi.
        </p>
        <ul className="flex flex-col gap-2">
          <Rule title="Đổ xúc xắc" art={<DieFace value={5} size={40} />}>
            <p>
              Tới lượt bạn, chạm nút <b>Đổ</b>. Xúc xắc xương lăn từ phía bạn vào giữa bàn.
            </p>
            <p>
              Bạn không phải chọn con: chiến mã tự đi nước tốt nhất — đá được ngựa nhà khác thì đá,
              không thì ra quân, không nữa thì cho con tới được xa nhất đi. Không con nào đi được
              thì mất lượt.
            </p>
            <Note>
              Lượt đi theo chiều kim đồng hồ: Đỏ, Lục, Vàng, Lam; nhà để trống thì bỏ qua.
            </Note>
          </Rule>
          <Rule
            title="Ra quân"
            art={
              <span className="flex shrink-0 gap-1.5">
                <DieFace value={6} size={32} />
                {DEFAULT_RULES.enterOn === 'oneOrSix' && <DieFace value={1} size={32} />}
              </span>
            }
          >
            <p>
              Ngựa trong chuồng chỉ ra được khi đổ 6 — hoặc 1, nếu bật luật “Ra quân bằng 1 hoặc 6”.
              Con vừa ra đứng ở ô xuất quân: ô đá nhuộm màu nhà bạn, có mũi tên khắc chỉ chiều đi.
            </p>
            <Note>Ô xuất quân đang có ngựa nhà mình thì chưa ra thêm con nữa được.</Note>
          </Rule>
          <Rule title="Đi quân">
            <p>
              Ngựa đi đúng bằng số đổ, theo chiều kim đồng hồ quanh đường đá 56 ô. Đi ngang qua ngựa
              khác không bị chặn.
            </p>
            <Note>Hai con cùng nhà không được đứng chung một ô, trừ ô đích.</Note>
          </Rule>
          <Rule title="Đá ngựa">
            <p>
              Dừng đúng ô có ngựa nhà khác thì đá bay con đó về chuồng — nó phải ra quân lại từ đầu.
              Ra quân trúng ngựa địch đang đứng ở ô xuất quân của mình cũng là đá.
            </p>
            <Note>
              Chỉ đá được trên đường đá; lên đường về chuồng rồi thì không ai đá được nữa.
            </Note>
          </Rule>
          <Rule title="Về chuồng">
            <p>
              Chạy gần hết vòng, ngựa rẽ vào đường về chuồng của nhà mình: sáu bậc màu nhà, đánh số
              1 tới 6, dẫn vào tâm bàn. Số đổ không được đưa ngựa vượt quá bậc 6 — bậc 6 là đích.
            </p>
            <p>
              Đã đứng trên bậc thì mỗi lần chỉ leo một bậc và phải đổ đúng số của bậc kế tiếp: đứng
              bậc 2 phải đổ 3 mới lên bậc 3.
            </p>
            <Note>Đây là luật “Về chuồng leo đúng bậc”; tắt nó thì leo theo số đổ.</Note>
          </Rule>
          <Rule title="Đổ 6">
            <p>Đổ 6 và có con đi được thì đi xong được đổ thêm một lần.</p>
            <Note>Đây là luật “Đổ 6 được đổ thêm”.</Note>
          </Rule>
        </ul>
      </Part>

      <Part id="cc-rules" title="Luật tuỳ chọn">
        <p className="text-[17px] leading-snug">
          Bốn công tắc ở màn chia quân (chung máy, với máy) hoặc ở phòng chờ online — chỉ chủ phòng
          đổi được. Ván mới bắt đầu với mặc định ghi bên phải.
        </p>
        <ul className="flex flex-col gap-2">
          {TOGGLES.map((t) => (
            <li key={t.label}>
              <Plate className="flex flex-col gap-2 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-extrabold">{t.label}</h3>
                  <span
                    className={`shrink-0 px-2 py-0.5 text-xs font-bold uppercase ${
                      t.byDefault
                        ? 'bg-[color:var(--cc-ember)] text-[color:var(--cc-night)]'
                        : 'text-[color:var(--cc-ash)] shadow-[inset_0_0_0_1px_var(--cc-iron)]'
                    }`}
                  >
                    {t.byDefault ? 'Bật sẵn' : 'Tắt sẵn'}
                  </span>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[15px] leading-snug">
                  <dt className="font-bold text-[color:var(--cc-ember)]">Bật</dt>
                  <dd>{t.on}</dd>
                  <dt className="font-bold text-[color:var(--cc-ash)]">Tắt</dt>
                  <dd>{t.off}</dd>
                </dl>
              </Plate>
            </li>
          ))}
        </ul>
      </Part>

      <Part id="cc-modes" title="Chơi cùng ai">
        <ul className="flex flex-col gap-2">
          {MODES.map((m) => (
            <li key={m.title}>
              <Plate className="flex items-start gap-4 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-[color:var(--cc-ember)] text-[color:var(--cc-night)] [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]">
                  {m.icon}
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className={`${DISPLAY} text-xl leading-none`}>{m.title}</h3>
                  <p className="text-[16px] leading-snug">{m.text}</p>
                </div>
              </Plate>
            </li>
          ))}
        </ul>
        <Note>
          Lỡ tải lại trang giữa ván? Mở lại là vào đúng ván, đúng phòng đang dở — ở cả ba cách chơi.
        </Note>

        <h3 className={`${DISPLAY} mt-3 text-xl leading-none text-[color:var(--cc-ash)]`}>
          Trong ván
        </h3>
        <Plate className="px-4">
          <dl className="divide-y divide-[#4a525c]/70">
            {CONTROLS.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
                <dt className="shrink-0 font-extrabold sm:w-24">{k}</dt>
                <dd className="text-[16px] leading-snug">{v}</dd>
              </div>
            ))}
          </dl>
        </Plate>
      </Part>

      <Part id="cc-houses" title="Bốn nhà">
        <p className="text-[17px] leading-snug">
          Bốn đạo quân, mỗi nhà một màu cờ trận và bốn chiến mã sơn cùng màu trên đế sắt. Chuồng là
          sân đá ở một góc bàn, viền màu nhà; ô xuất quân và sáu bậc về chuồng nhuộm cùng màu. Bàn
          luôn nhìn từ phía nhà người cầm máy: chuồng nhà bạn ở góc gần, bên trái.
        </p>
        <ul className="grid grid-cols-2 gap-2">
          {HOUSES.map((h, i) => (
            <li key={h.name}>
              <Plate className="flex h-full flex-col gap-3 p-4">
                <span
                  aria-hidden
                  className="-mx-4 -mt-4 mb-1 block h-1.5"
                  style={{ background: h.hex }}
                />
                <div className="flex items-end justify-between gap-2">
                  <Banner house={i as House} size={40} />
                  <Warhorse house={i as House} />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className={`${DISPLAY} text-[26px] leading-none`} style={{ color: h.hex }}>
                    Nhà {h.name}
                  </h3>
                  <span className="text-xs font-bold text-[color:var(--cc-ash)] uppercase">
                    Lượt {i + 1}
                  </span>
                </div>
                <p className="text-[15px] leading-snug">{HOUSE_NOTES[i]}</p>
              </Plate>
            </li>
          ))}
        </ul>
      </Part>

      <Button className="w-full" onClick={onBack}>
        Đã rõ · Quay lại
      </Button>
    </div>
  );
}

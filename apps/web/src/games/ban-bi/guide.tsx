'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { sfx, unlockAudio } from './audio';
import { LEVELS, SPEEDUP_HALF_LIFE } from './engine';
import { createFighterView, type FighterView } from './fighter';
import { FORMS, type Form } from './forms';
import { Button, Glass } from './kit';
import { THRESHOLDS } from './power';
import { DISPLAY } from './theme';

// Cẩm nang của Bắn Bi Bá Khí: sáu cấp của võ sĩ xem trực tiếp trên cảnh 3D (chọn cấp nào võ sĩ
// chuyển sang dạng đó, bấm để xem lại cảnh lên cấp) và cách chơi rút từ đúng luật trong engine.ts,
// power.ts, scores.ts. Mở từ nút "Cẩm nang" ở màn chính.

const HAIR = ['Đen', 'Xanh lam', 'Tím', 'Vàng rực', 'Xanh băng', 'Bạc trắng'];

/** Những gì xuất hiện ở một dạng, đọc từ chính bảng dạng khí. */
function effects(f: Form) {
  const out = ['Hào quang lửa khí'];
  if (f.smoke > 0) out.push('khói cuộn quanh người');
  if (f.lightning) out.push('sét giật');
  if (f.longHair) out.push('tóc dài tới gót');
  if (f.rocks) out.push('đá bay lơ lửng');
  if (f.ascended) out.push('vầng sáng sau đầu, cột khí cầu vồng');
  return out.join(', ');
}

const Rule = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <h3 className={`${DISPLAY} text-base tracking-wider text-[color:var(--bb-ki)]`}>{title}</h3>
    <p className="text-[color:var(--bb-muted)]">{children}</p>
  </div>
);

export function Guide({ onBack }: { onBack: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<FighterView | null>(null);
  const [level, setLevel] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);

  // Nút mở nằm giữa màn chính: cuộn về đầu để cẩm nang mở từ tiêu đề, và đưa tiêu điểm vào đó.
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    const b = box.current;
    if (!c || !b) return;
    const v = createFighterView(c);
    view.current = v;
    const ro = new ResizeObserver(([e]) =>
      v.resize(Math.floor(e!.contentRect.width), Math.floor(e!.contentRect.height)),
    );
    ro.observe(b);
    return () => {
      ro.disconnect();
      v.dispose();
      view.current = null;
    };
  }, []);

  const pick = (i: number) => {
    setLevel(i);
    view.current?.setLevel(i);
  };
  // Lùi một cấp rồi lên lại: cảnh 3D diễn đúng màn gồng như trong trận.
  const replay = () => {
    const v = view.current;
    if (!v || level === 0) return;
    unlockAudio();
    v.setLevel(level - 1);
    v.setLevel(level);
    sfx.levelUp(level);
  };

  const form = FORMS[level]!;
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1
          ref={heading}
          tabIndex={-1}
          className={`${DISPLAY} text-4xl leading-none outline-none md:text-5xl`}
        >
          Cẩm nang
        </h1>
        <p className="text-[color:var(--bb-muted)]">Sáu cấp của võ sĩ và cách chơi.</p>
      </div>

      <section aria-labelledby="bb-forms" className="grid gap-5 md:grid-cols-[1fr_1fr]">
        <div
          ref={box}
          className="relative h-[48dvh] overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_var(--bb-line)] md:h-[64dvh]"
        >
          <canvas
            ref={canvas}
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={`Võ sĩ ở cấp ${level + 1}, dạng ${form.name}`}
          />
        </div>
        <div className="flex flex-col gap-4">
          <h2 id="bb-forms" className={`${DISPLAY} text-2xl`}>
            Sáu cấp khí
          </h2>
          <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Chọn cấp">
            {FORMS.map((f, i) => (
              <button
                key={f.name}
                type="button"
                role="tab"
                aria-selected={level === i}
                onClick={() => pick(i)}
                className={`flex min-h-14 flex-col items-start justify-center rounded-lg px-3 text-left shadow-[inset_0_0_0_1px_var(--bb-line)] ${
                  level === i ? 'bg-[#ffffff14]' : 'hover:bg-[#ffffff0a]'
                }`}
                style={level === i ? { boxShadow: `inset 0 0 0 2px ${f.aura}` } : undefined}
              >
                <span className="text-xs font-semibold text-[color:var(--bb-muted)]">
                  Cấp {i + 1}
                </span>
                <span className={`${DISPLAY} text-sm`} style={{ color: f.aura }}>
                  {f.name}
                </span>
              </button>
            ))}
          </div>
          <Glass className="flex flex-col gap-2 p-4">
            <p
              className={`${DISPLAY} text-3xl leading-none`}
              style={{ color: form.aura, textShadow: `0 0 18px ${form.aura}` }}
            >
              {form.name}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-[color:var(--bb-muted)]">Mở khi khí đạt</dt>
              <dd className="font-semibold tabular-nums">
                {level === 0 ? 'Khởi đầu' : `${THRESHOLDS[level]} khí`}
              </dd>
              <dt className="text-[color:var(--bb-muted)]">Màu tóc</dt>
              <dd className="font-semibold">{HAIR[level]}</dd>
              <dt className="text-[color:var(--bb-muted)]">Hiệu ứng</dt>
              <dd className="font-semibold">{effects(form)}</dd>
              <dt className="text-[color:var(--bb-muted)]">Nhân điểm</dt>
              <dd className="font-semibold tabular-nums">×{1 + level * 0.25}</dd>
            </dl>
          </Glass>
          <Button tone="ghost" onClick={replay} disabled={level === 0}>
            Xem cảnh lên cấp {level + 1}
          </Button>
        </div>
      </section>

      <section aria-labelledby="bb-rules" className="flex flex-col gap-4">
        <h2 id="bb-rules" className={`${DISPLAY} text-2xl`}>
          Cách chơi
        </h2>
        <Glass className="grid gap-5 p-5 md:grid-cols-2">
          <Rule title="Bàn tự trôi">
            Mảng bi trôi xuống liên tục, hàng mới trượt vào từ mép trên. Đầu ván{' '}
            {LEVELS.map((l) => `${l.name} ${l.rowSeconds} giây`).join(', ')} trôi một hàng; cứ{' '}
            {SPEEDUP_HALF_LIFE / 60} phút nhanh gấp đôi, tới mức nhanh nhất của màn. Bi nào chạm
            vạch đỏ là hết ván. Mỗi ván xáo thế bi mới.
          </Rule>
          <Rule title="Ngắm và bắn">
            Rê chuột hay kéo ngón tay để ngắm, bấm hoặc nhấc tay để bắn; bi dội được vào tường hai
            bên. Bàn phím: ← → xoay, Space bắn, X đổi bi. Chạm bi nhỏ cạnh đầu rồng để đổi bi. Bi
            đang bay thì bàn tạm ngừng trôi.
          </Rule>
          <Rule title="Nổ và rơi">
            Ba bi cùng màu trở lên chạm nhau thì nổ. Bi nào không còn bám được lên trần thì rơi
            theo. Phá sạch bàn vẫn chơi tiếp: hàng mới vẫn trôi xuống.
          </Rule>
          <Rule title="Tính điểm">
            Mỗi bi nổ 10 điểm, mỗi bi rơi theo 20 điểm, nhân theo cấp khí lúc đó (cấp 1 ×1 tới cấp 6
            ×2,25). Bảng xếp hạng giữ 10 lần điểm cao nhất của từng màn trên máy này.
          </Rule>
          <Rule title="Nạp khí">
            Bi nổ và bi rơi nạp khí cho võ sĩ; nổ liên tiếp trong vòng 4 giây là combo, nạp thêm.
            Khí tự tản theo thời gian, cấp càng cao tản càng nhanh: ngừng bắn lâu là tụt cấp.
          </Rule>
          <Rule title="Mẹo">
            Bắn vào chỗ có bi đang treo nhiều bên dưới để cả chùm rơi theo (điểm gấp đôi), và giữ
            nhịp nổ đều để võ sĩ ở cấp cao cho điểm nhân lớn.
          </Rule>
        </Glass>
      </section>

      <Button className="self-start" onClick={onBack}>
        Về màn chính
      </Button>
    </div>
  );
}

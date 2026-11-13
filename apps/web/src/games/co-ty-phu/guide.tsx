'use client';

import type { ReactNode } from 'react';
import {
  BOARD,
  GIFT,
  GO_SALARY,
  GROUPS,
  groupSquares,
  JAIL_FINE,
  LUCK,
  MAX_PLAYERS,
  money,
  STATIONS,
  TOKENS,
  UTILITIES,
} from './data';
import { DEFAULT_SETTINGS } from './engine';
import { BackIcon } from './icons';
import { Button, Coin, DeedCard, Panel, Portrait } from './kit';
import { CAST } from './roster';
import { Heading, Rule } from './screens';
import { DISPLAY } from './theme';

// Màn "Cẩm nang" của Cờ tỷ phú: luật chơi và các nhân vật. Mọi con số (lương, phạt, giá nâng cấp,
// thuế, tên ga, số thẻ) đọc thẳng từ data.ts / engine.ts để cẩm nang không lệch khi đổi luật; chữ
// giải thích viết theo đúng cách engine.ts xử lý, không theo luật cờ tỷ phú ngoài đời.

/** Dáng vẻ từng nhân vật, theo đúng mô hình dựng trong figures.ts. */
const LOOKS: Record<(typeof CAST)[number]['id'], string> = {
  sen: 'Áo dài hồng phấn, tóc dài, đội nón lá.',
  phuc: 'Bụng phệ, áo đỏ cam, cười híp mắt, phe phẩy quạt vàng.',
  do: 'Áo the xanh chàm dài, khăn xếp đen, râu bạc, cầm bút lông.',
  ti: 'Tóc chỏm, áo nâu, chân đất, thổi sáo trúc.',
  lan: 'Đội đầu lân đỏ vàng có sừng, mắt to, râu bông.',
  bien: 'Áo cánh xanh, quần xắn, nón lá, vác mái chèo trên vai.',
  hoa: 'Áo bà ba tím, khăn rằn, tóc búi, gánh hai thúng hoa.',
  tu: 'Khăn vấn, áo bà ba nâu, cười híp mắt, ôm túi vàng.',
  meo: 'Mèo cam đứng hai chân, ôm đồng xu vàng.',
  trau: 'Trâu xám đứng hai chân, sừng cong, đeo yếm đỏ.',
};

/** Ô làm ví dụ cho thẻ đất: Hồ Gươm. */
const EXAMPLE_DEED = 14;

const names = (squares: number[]) => squares.map((sq) => BOARD[sq]!.name).join(', ');
const count = (kind: string) => BOARD.filter((s) => s.kind === kind).length;
const TAXES = BOARD.flatMap((s) => (s.kind === 'tax' ? [s] : []));

function Topic({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel className="flex flex-col gap-3 p-4">
      <h3 className={`${DISPLAY} text-xl leading-tight text-[color:var(--tp-gold)]`}>{title}</h3>
      <div className="flex flex-col gap-2 leading-relaxed">{children}</div>
    </Panel>
  );
}

/** Danh sách gạch đầu dòng bằng hạt son như trên nắp hộp. */
function Points({ children }: { children: ReactNode }) {
  return (
    <ul className="flex flex-col gap-2 [&>li]:relative [&>li]:pl-5 [&>li]:before:absolute [&>li]:before:top-[0.6em] [&>li]:before:left-0.5 [&>li]:before:h-1.5 [&>li]:before:w-1.5 [&>li]:before:rotate-45 [&>li]:before:bg-[color:var(--tp-cinnabar)] [&>li]:before:shadow-[0_0_0_1px_var(--tp-gold)] [&>li]:before:content-['']">
      {children}
    </ul>
  );
}

const Key = ({ children }: { children: ReactNode }) => (
  <b className="font-bold text-[color:var(--tp-goldHi)]">{children}</b>
);

export function GuideScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Heading>Cẩm nang</Heading>
        <Rule />
        <p className="text-lg text-[color:var(--tp-ash)]">
          Luật chơi đúng như bàn cờ đang tính, và mười nhân vật bạn có thể chọn làm quân.
        </p>
        <nav aria-label="Mục lục" className="flex flex-wrap gap-2">
          {[
            ['#tp-cach-choi', 'Cách chơi'],
            ['#tp-nhan-vat', 'Nhân vật'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="flex min-h-11 items-center rounded-md px-4 text-[15px] font-bold text-[color:var(--tp-gold)] shadow-[inset_0_0_0_1px_rgb(212_167_58/0.55)] hover:bg-[color:var(--tp-lacquerHi)] focus-visible:shadow-[inset_0_0_0_2px_var(--tp-gold)] focus-visible:outline-none"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <section
        id="tp-cach-choi"
        aria-labelledby="tp-cach-choi-h"
        className="flex scroll-mt-4 flex-col gap-3"
      >
        <h2 id="tp-cach-choi-h" className={`${DISPLAY} text-2xl text-[color:var(--tp-eggshell)]`}>
          Cách chơi
        </h2>

        <Topic title="Mục tiêu">
          <p>
            Hai tới {MAX_PLAYERS} người, mỗi người vào bàn với cùng một số vốn ({money(10000)},{' '}
            {money(15000)} hoặc {money(20000)}; mặc định {money(DEFAULT_SETTINGS.startCash)}). Mua
            đất dọc hành trình từ Hà Giang tới Sài Gòn, nâng cấp nhà để tiền thuê tăng, và đừng để
            cạn tiền. Ván kết thúc theo cách chọn lúc chuẩn bị:
          </p>
          <Points>
            <li>
              <Key>Đủ vòng</Key> (10, 20 hoặc 30 vòng; mặc định {DEFAULT_SETTINGS.rounds}): hết vòng
              cuối thì dừng.
            </li>
            <li>
              <Key>Hết giờ</Key> (20, 30, 45 hoặc 60 phút): giờ tính từ lúc mở ván, F5 không dừng
              đồng hồ. Hết giờ thì ván dừng ngay khi không còn cuộc đấu giá, khoản nợ hay đề nghị
              đổi đất nào đang dở.
            </li>
            <li>
              <Key>Còn một người</Key>: đánh tới khi chỉ còn một người chưa phá sản (thường hơn một
              giờ).
            </li>
          </Points>
          <p>
            Dừng theo vòng hay theo giờ thì ai có <Key>tổng tài sản</Key> lớn nhất thắng: tiền mặt,
            cộng giá đất (đất đang cầm cố tính nửa giá), cộng tiền đã bỏ ra nâng cấp nhà. Ở mọi
            cách, chỉ còn một người chưa phá sản là người đó thắng.
          </p>
        </Topic>

        <Topic title="Một lượt đi">
          <Points>
            <li>
              Bấm <Key>Đổ xúc xắc</Key>: quân đi đúng tổng hai con xúc xắc, từng ô quanh bàn.
            </li>
            <li>
              Đi qua hoặc dừng ở <Key>Xuất phát</Key>: nhận {money(GO_SALARY)}.
            </li>
            <li>
              <Key>Đổ đôi</Key>: xong việc ở ô vừa tới thì được đổ tiếp. Đổ đôi ba lần liền thì bị
              tạm giữ ngay, không đi nữa.
            </li>
            <li>
              Trước khi đổ hoặc sau khi đi xong, bạn có thể mở <Key>Tài sản</Key> (nâng cấp, bán bớt
              nhà, cầm cố, chuộc đất) và <Key>Đổi đất</Key>. Xong thì bấm <Key>Kết thúc lượt</Key>.
            </li>
          </Points>
        </Topic>

        <Topic title="Mua đất và đấu giá">
          <Points>
            <li>
              Dừng ở đất, nhà ga hay trạm dịch vụ chưa có chủ: <Key>Mua</Key> theo giá ghi trên ô
              (cần đủ tiền mặt), hoặc <Key>Đem đấu giá</Key>.
            </li>
            <li>
              Đấu giá: mọi người còn trong ván, bắt đầu từ người vừa tới ô, lần lượt trả cao hơn giá
              đang dẫn hoặc <Key>Bỏ</Key> (bỏ là ra khỏi cuộc). Khi chỉ còn người đang trả cao nhất,
              người đó được đất với đúng giá đã trả. Không ai trả giá thì đất vẫn để trống.
            </li>
            <li>Mua xong một ô đất là trên đó có ngay một nhà tranh.</li>
          </Points>
        </Topic>

        <Topic title="Tiền thuê">
          <Points>
            <li>
              Dừng ở ô của người khác thì trả tiền thuê cho chủ. Ô đang cầm cố thì không mất gì. Chủ
              đang bị tạm giữ vẫn thu tiền thuê.
            </li>
            <li>
              <Key>Đất</Key>: mới có nhà tranh thì trả tiền thuê gốc; chủ có đủ cả nhóm (và không ô
              nào trong nhóm cầm cố) thì gấp đôi; đã nâng cấp thì theo cấp nhà trên thẻ đất.
            </li>
            <li>
              <Key>Nhà ga</Key> ({names(STATIONS)}): chủ có 1 ga thu {money(250)}; có 2, 3, 4 ga thu{' '}
              {money(500)}, {money(1000)}, {money(2000)}.
            </li>
            <li>
              <Key>Dịch vụ</Key> ({names(UTILITIES)}): 40 × tổng xúc xắc vừa đổ; chủ có cả hai trạm
              thì 100 ×.
            </li>
          </Points>
          <div className="flex flex-col items-center gap-2 pt-1">
            <DeedCard square={EXAMPLE_DEED} />
            <p className="text-center text-sm text-[color:var(--tp-ash)]">
              Thẻ đất {BOARD[EXAMPLE_DEED]!.name}. Trong ván, chạm một ô trên bàn để xem thẻ của ô
              đó.
            </p>
          </div>
        </Topic>

        <Topic title="Nâng cấp nhà">
          <Points>
            <li>
              Cần có <Key>đủ cả nhóm</Key> (các ô cùng màu vùng) và không ô nào trong nhóm đang cầm
              cố. Nâng cấp làm trong lượt của mình, qua nút Tài sản.
            </li>
            <li>
              <Key>Nâng đều</Key>: ô đang thấp nhất trong nhóm phải lên trước. Năm bậc: nhà tranh →
              nhà ngói → nhà hai tầng → nhà phố → nhà bốn tầng → khách sạn (cao nhất).
            </li>
            <li>Bán bớt một bậc được lại nửa tiền, cũng phải bán đều (ô cao nhất trước).</li>
          </Points>
          <p className="text-sm font-bold text-[color:var(--tp-ash)]">
            Tám nhóm đất và giá mỗi lần nâng cấp
          </p>
          <ul className="flex flex-col gap-1.5">
            {GROUPS.map((group, i) => (
              <li
                key={group.name}
                className="flex items-start gap-3 rounded-md bg-[color:var(--tp-lacquer)] p-2.5 shadow-[inset_0_0_0_1px_var(--tp-rule)]"
              >
                <span
                  aria-hidden
                  className="mt-0.5 h-9 w-2 shrink-0 rounded-sm shadow-[0_0_0_1px_rgb(212_167_58/0.6)]"
                  style={{ background: group.color }}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-bold">{group.name}</span>
                  <span className="text-sm text-[color:var(--tp-ash)]">
                    {names(groupSquares(i))}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-[color:var(--tp-goldHi)] tabular-nums">
                  {money(group.house)}
                </span>
              </li>
            ))}
          </ul>
        </Topic>

        <Topic title="Cầm cố và chuộc đất">
          <Points>
            <li>
              Cầm cố một ô để nhận ngay nửa giá đất. Nhóm đất có nhà đã nâng cấp thì phải bán hết
              các bậc trong nhóm trước.
            </li>
            <li>Ô đang cầm cố không thu tiền thuê, và cả nhóm mất tiền thuê gấp đôi.</li>
            <li>Chuộc lại: trả số tiền đã nhận khi cầm cố, cộng thêm 10%.</li>
          </Points>
        </Topic>

        <Topic title="Đổi đất">
          <Points>
            <li>
              Trong lượt mình, mở <Key>Đổi đất</Key>, chọn người, chọn đất và tiền mỗi bên đưa.
              Người kia đồng ý hoặc từ chối; chưa trả lời thì bạn có thể huỷ đề nghị.
            </li>
            <li>Đất thuộc nhóm đang có nhà nâng cấp thì chưa đổi được: bán các bậc nhà trước.</li>
          </Points>
        </Topic>

        <Topic title="Các ô đặc biệt">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
            <dt className="font-bold text-[color:var(--tp-goldHi)]">Xuất phát</dt>
            <dd>Đi qua hoặc dừng ở đây nhận {money(GO_SALARY)}.</dd>
            <dt className="font-bold text-[color:var(--tp-goldHi)]">Lì xì</dt>
            <dd>
              {count('gift')} ô. Rút một trong {GIFT.length} thẻ Lì xì, phần lớn là tiền vào tiền
              ra: lì xì đầu năm, hoàn thuế, viện phí, học phí, mỗi người mừng sinh nhật bạn…
            </dd>
            <dt className="font-bold text-[color:var(--tp-goldHi)]">Vận may</dt>
            <dd>
              {count('luck')} ô. Rút một trong {LUCK.length} thẻ Vận may, phần lớn là đi lại: tới
              thẳng một ô, ra ga gần nhất, lùi 3 ô… Đi tới mà qua Xuất phát vẫn nhận lương.
            </dd>
            {TAXES.map((t) => (
              <div key={t.name} className="contents">
                <dt className="font-bold text-[color:var(--tp-goldHi)]">{t.name}</dt>
                <dd>Nộp {money(t.amount)} cho ngân hàng.</dd>
              </div>
            ))}
            <dt className="font-bold text-[color:var(--tp-goldHi)]">Tạm giữ</dt>
            <dd>Chỉ ghé qua thì không sao.</dd>
            <dt className="font-bold text-[color:var(--tp-goldHi)]">Bị tạm giữ</dt>
            <dd>Bị đưa thẳng vào ô Tạm giữ, không đi qua Xuất phát nên không có lương.</dd>
            <dt className="font-bold text-[color:var(--tp-goldHi)]">Nghỉ chân</dt>
            <dd>Không có gì xảy ra.</dd>
          </dl>
          <p className="text-sm text-[color:var(--tp-ash)]">
            Cả hai bộ thẻ đều có một thẻ “ra khỏi tạm giữ”, giữ lại dùng sau.
          </p>
        </Topic>

        <Topic title="Bị tạm giữ">
          <Points>
            <li>Vào khi dừng ở ô Bị tạm giữ, rút phải thẻ tạm giữ, hoặc đổ đôi ba lần liền.</li>
            <li>
              Ra trước khi đổ: <Key>Nộp {money(JAIL_FINE)}</Key> hoặc <Key>Dùng thẻ</Key> ra khỏi
              tạm giữ, rồi đổ như thường.
            </li>
            <li>
              Hoặc <Key>Đổ tìm đôi</Key>: ra đôi thì được ra, đi theo số vừa đổ (nhưng không được đổ
              thêm); không ra đôi thì đứng yên, hết lượt. Lần thứ ba vẫn không ra đôi thì buộc nộp{' '}
              {money(JAIL_FINE)} rồi đi theo số đó.
            </li>
            <li>Trong lúc bị tạm giữ vẫn thu tiền thuê, vẫn nâng cấp và đổi đất được.</li>
          </Points>
        </Topic>

        <Topic title="Nợ và phá sản">
          <Points>
            <li>
              Tới lượt mình mà thiếu tiền trả: bán bớt nhà, cầm cố đất cho đủ rồi bấm{' '}
              <Key>Trả nợ</Key>. Không gom đủ thì <Key>Phá sản</Key>.
            </li>
            <li>
              Bị trừ tiền ngoài lượt (như thẻ mừng sinh nhật) mà thiếu thì tự động bán nhà, rồi cầm
              cố đất rẻ trước; vẫn thiếu thì phá sản.
            </li>
            <li>
              Phá sản vì nợ một người: người đó nhận hết tiền và đất (nhà bị dỡ, quy ra nửa tiền).
              Nợ ngân hàng: đất trả về ngân hàng, thành đất trống.
            </li>
          </Points>
        </Topic>

        <Topic title="Cách chơi cùng nhau">
          <Points>
            <li>
              <Key>Lập phòng online</Key>: mỗi người một máy, tối đa {MAX_PLAYERS} ghế, mời bằng
              link, mã phòng 6 ký tự hoặc mã QR. Chủ phòng giữ ván, chọn cách tính thắng và có thể
              cho máy ngồi ghế trống. Ai rớt mạng thì máy đi thay cho tới khi người đó vào lại; tải
              lại trang vẫn về đúng ghế.
            </li>
            <li>
              <Key>Chơi chung máy</Key>: chuyền một điện thoại quanh bàn, mỗi ghế chọn Người, Máy
              hoặc Trống. Giữa các lượt có màn nhắc chuyền máy cho người kế tiếp.
            </li>
            <li>
              <Key>Chơi với máy</Key>: bạn đấu một tới năm máy, mỗi máy mang tên nhân vật của mình.
            </li>
            <li>
              Ván trên một máy được lưu trong thẻ trình duyệt này: F5 là vào lại đúng ván. Bấm{' '}
              <Key>Rời ván</Key> là bỏ hẳn ván đó.
            </li>
          </Points>
        </Topic>

        <Topic title="Điều khiển">
          <Points>
            <li>Chạm một ô trên bàn để xem thẻ đất, chủ đất và cấp nhà đang có.</li>
            <li>
              Các nút chơi nằm ở dưới màn hình: Đổ xúc xắc, Mua, Đem đấu giá, Tài sản, Đổi đất, Kết
              thúc lượt.
            </li>
            <li>
              Góc trên: Rời ván ở bên trái, nút loa bật/tắt tiếng ở bên phải (máy này nhớ lựa chọn).
            </li>
          </Points>
        </Topic>

        <Topic title="Máy chơi thế nào">
          <Points>
            <li>Mua đất khi mua xong vẫn còn dư {money(2000)}, hoặc khi ô đó giúp gom đủ nhóm.</li>
            <li>
              Đấu giá tới khoảng 90% giá đất (tới 150% nếu ô giúp gom đủ nhóm), luôn chừa lại tiền
              dự phòng.
            </li>
            <li>Rủng rỉnh thì chuộc đất trước, rồi nâng cấp nhóm rẻ trước.</li>
            <li>Chỉ nhận đổi đất khi được lợi rõ (hơn ít nhất 10%).</li>
          </Points>
        </Topic>
      </section>

      <section
        id="tp-nhan-vat"
        aria-labelledby="tp-nhan-vat-h"
        className="flex scroll-mt-4 flex-col gap-3"
      >
        <h2 id="tp-nhan-vat-h" className={`${DISPLAY} text-2xl text-[color:var(--tp-eggshell)]`}>
          Nhân vật
        </h2>
        <p className="text-[color:var(--tp-ash)]">
          Mười nhân vật 3D của riêng Cờ tỷ phú. Nhân vật chỉ là quân cờ: ai cũng chơi cùng một luật.
          Chạm ảnh nhân vật ở màn chính (hoặc ở từng ghế khi chuẩn bị) để đổi; hai ghế không chọn
          trùng nhân vật.
        </p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CAST.map((c) => (
            <li key={c.id}>
              <Panel className="flex h-full flex-col gap-2 p-3">
                <Portrait
                  character={c.id}
                  className="aspect-square w-full rounded-md bg-[radial-gradient(circle_at_50%_40%,#3a2418,#120b09)] object-contain"
                />
                <h3 className={`${DISPLAY} text-lg leading-tight text-[color:var(--tp-gold)]`}>
                  {c.name}
                </h3>
                <p className="text-sm text-[color:var(--tp-ash)]">{LOOKS[c.id]}</p>
              </Panel>
            </li>
          ))}
        </ul>

        <Topic title="Màu quân theo ghế">
          <p>
            Mỗi ghế có một màu: viền quanh ảnh nhân vật, đế quân trên bàn và dải đánh dấu chủ ở mép
            ô đã có chủ.
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TOKENS.map((t, i) => (
              <li key={t.name} className="flex items-center gap-2">
                <Coin id={i} size={18} />
                <span>
                  Ghế {i + 1} · <b className="font-bold">{t.name}</b>
                </span>
              </li>
            ))}
          </ul>
        </Topic>
      </section>

      <Button tone="ghost" className="self-start" onClick={onBack}>
        <BackIcon className="h-4 w-4" />
        Về màn chính
      </Button>
    </div>
  );
}

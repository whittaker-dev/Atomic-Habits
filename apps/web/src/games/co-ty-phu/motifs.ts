// Hình minh hoạ địa danh trên từng ô đất của Cờ tỷ phú, vẽ nét bằng canvas như nét vẽ vàng trên
// tranh sơn mài: mực nâu sẫm cho nét chính, vàng và son điểm xuyết. Mỗi hình vẽ quanh tâm (0, 0),
// rộng chừng s và cao chừng 0.7·s.

type G = CanvasRenderingContext2D;
export type Ink = { line: string; gold: string; red: string; soft: string };

function path(g: G, pts: [number, number][], s: number, close = false) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
  if (close) g.closePath();
}

const MOTIFS: Record<string, (g: G, s: number, k: Ink) => void> = {
  // Hà Giang: núi đá tai mèo, đèo uốn khúc.
  peaks: (g, s, k) => {
    g.fillStyle = k.soft;
    path(
      g,
      [
        [-0.5, 0.3],
        [-0.3, -0.2],
        [-0.12, 0.05],
        [0.08, -0.32],
        [0.3, 0.02],
        [0.5, 0.3],
      ],
      s,
      true,
    );
    g.fill();
    g.stroke();
    g.strokeStyle = k.gold;
    path(
      g,
      [
        [-0.42, 0.28],
        [-0.1, 0.18],
        [0.1, 0.24],
        [0.4, 0.12],
      ],
      s,
    );
    g.stroke();
  },
  // Sa Pa: ruộng bậc thang.
  terraces: (g, s, k) => {
    for (let i = 0; i < 4; i++) {
      const y = -0.22 + i * 0.15;
      g.strokeStyle = i % 2 ? k.gold : k.line;
      g.beginPath();
      g.moveTo(-0.5 * s, (y + 0.06) * s);
      g.bezierCurveTo(-0.2 * s, (y - 0.08) * s, 0.2 * s, (y + 0.1) * s, 0.5 * s, (y - 0.04) * s);
      g.stroke();
    }
  },
  // Ninh Bình, Hạ Long: núi đá vôi trên mặt nước, thuyền nan.
  karst: (g, s, k) => {
    g.fillStyle = k.soft;
    for (const [x, w, h] of [
      [-0.28, 0.22, 0.42],
      [0.02, 0.18, 0.55],
      [0.3, 0.2, 0.36],
    ] as const) {
      g.beginPath();
      g.moveTo((x - w / 2) * s, 0.18 * s);
      g.bezierCurveTo(
        (x - w / 2) * s,
        (0.18 - h) * s,
        (x + w / 2) * s,
        (0.18 - h) * s,
        (x + w / 2) * s,
        0.18 * s,
      );
      g.fill();
      g.stroke();
    }
    g.strokeStyle = k.gold;
    path(
      g,
      [
        [-0.5, 0.26],
        [0.5, 0.26],
      ],
      s,
    );
    g.stroke();
    g.fillStyle = k.red;
    path(
      g,
      [
        [-0.12, 0.3],
        [0.12, 0.3],
        [0.08, 0.36],
        [-0.08, 0.36],
      ],
      s,
      true,
    );
    g.fill();
  },
  // Cát Bà: đảo và cánh buồm.
  sail: (g, s, k) => {
    g.fillStyle = k.red;
    path(
      g,
      [
        [0, -0.32],
        [0, 0.12],
        [0.26, 0.12],
      ],
      s,
      true,
    );
    g.fill();
    g.stroke();
    path(
      g,
      [
        [-0.04, -0.28],
        [-0.04, 0.12],
        [-0.24, 0.12],
      ],
      s,
      true,
    );
    g.stroke();
    g.fillStyle = k.line;
    path(
      g,
      [
        [-0.3, 0.16],
        [0.34, 0.16],
        [0.24, 0.26],
        [-0.22, 0.26],
      ],
      s,
      true,
    );
    g.fill();
    g.strokeStyle = k.gold;
    path(
      g,
      [
        [-0.5, 0.32],
        [0.5, 0.32],
      ],
      s,
    );
    g.stroke();
  },
  // Phố Hàng Đào: dãy nhà ống mái ngói.
  shophouse: (g, s, k) => {
    for (const [x, h] of [
      [-0.3, 0.42],
      [-0.06, 0.5],
      [0.18, 0.38],
      [0.38, 0.46],
    ] as const) {
      g.fillStyle = k.soft;
      g.fillRect((x - 0.1) * s, (0.3 - h) * s, 0.2 * s, h * s);
      g.strokeRect((x - 0.1) * s, (0.3 - h) * s, 0.2 * s, h * s);
      g.fillStyle = k.red;
      path(
        g,
        [
          [x - 0.13, 0.3 - h],
          [x, 0.3 - h - 0.1],
          [x + 0.13, 0.3 - h],
        ],
        s,
        true,
      );
      g.fill();
      g.fillStyle = k.line;
      g.fillRect((x - 0.04) * s, (0.3 - h + 0.1) * s, 0.08 * s, 0.08 * s);
    }
  },
  // Tràng Tiền: cầu vòm sáu nhịp.
  bridge: (g, s, k) => {
    path(
      g,
      [
        [-0.5, -0.04],
        [0.5, -0.04],
      ],
      s,
    );
    g.stroke();
    g.strokeStyle = k.gold;
    for (let i = 0; i < 3; i++) {
      const x = -0.34 + i * 0.34;
      g.beginPath();
      g.arc(x * s, 0.2 * s, 0.16 * s, Math.PI, 0);
      g.stroke();
    }
    g.strokeStyle = k.line;
    path(
      g,
      [
        [-0.5, 0.24],
        [0.5, 0.24],
      ],
      s,
    );
    g.stroke();
  },
  // Hồ Gươm: tháp trên gò giữa hồ.
  tower: (g, s, k) => {
    g.fillStyle = k.soft;
    g.fillRect(-0.16 * s, -0.16 * s, 0.32 * s, 0.32 * s);
    g.strokeRect(-0.16 * s, -0.16 * s, 0.32 * s, 0.32 * s);
    g.fillRect(-0.1 * s, -0.34 * s, 0.2 * s, 0.18 * s);
    g.strokeRect(-0.1 * s, -0.34 * s, 0.2 * s, 0.18 * s);
    g.fillStyle = k.line;
    for (const x of [-0.08, 0.04]) g.fillRect(x * s, 0.0, 0.05 * s, 0.1 * s);
    g.fillStyle = k.red;
    path(
      g,
      [
        [-0.14, -0.34],
        [0, -0.46],
        [0.14, -0.34],
      ],
      s,
      true,
    );
    g.fill();
    g.strokeStyle = k.gold;
    g.beginPath();
    g.ellipse(0, 0.24 * s, 0.46 * s, 0.08 * s, 0, 0, Math.PI * 2);
    g.stroke();
  },
  // Đại Nội: cổng thành, mái hai tầng.
  gate: (g, s, k) => {
    g.fillStyle = k.soft;
    g.fillRect(-0.44 * s, 0.02 * s, 0.88 * s, 0.26 * s);
    g.strokeRect(-0.44 * s, 0.02 * s, 0.88 * s, 0.26 * s);
    g.fillStyle = k.line;
    for (const x of [-0.26, 0, 0.26]) {
      g.beginPath();
      g.arc(x * s, 0.28 * s, 0.07 * s, Math.PI, 0);
      g.fill();
    }
    g.fillStyle = k.red;
    path(
      g,
      [
        [-0.32, 0.02],
        [-0.22, -0.12],
        [0.22, -0.12],
        [0.32, 0.02],
      ],
      s,
      true,
    );
    g.fill();
    g.stroke();
    path(
      g,
      [
        [-0.24, -0.12],
        [-0.16, -0.26],
        [0.16, -0.26],
        [0.24, -0.12],
      ],
      s,
      true,
    );
    g.fill();
    g.stroke();
  },
  // Lăng Cô: vịnh cát trắng, rặng dừa, sóng.
  bay: (g, s, k) => {
    g.strokeStyle = k.gold;
    g.beginPath();
    g.arc(0, 0.6 * s, 0.6 * s, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
    g.strokeStyle = k.line;
    for (const x of [-0.3, 0.3]) {
      g.beginPath();
      g.moveTo(x * s, 0.28 * s);
      g.quadraticCurveTo((x + 0.04) * s, 0, (x + 0.02) * s, -0.2 * s);
      g.stroke();
      for (const d of [-1, 1]) {
        g.beginPath();
        g.moveTo((x + 0.02) * s, -0.2 * s);
        g.quadraticCurveTo((x + d * 0.12) * s, -0.3 * s, (x + d * 0.2) * s, -0.14 * s);
        g.stroke();
      }
    }
  },
  // Phong Nha: miệng hang và thuyền.
  cave: (g, s, k) => {
    g.fillStyle = k.soft;
    path(
      g,
      [
        [-0.5, 0.3],
        [-0.42, -0.3],
        [0.42, -0.3],
        [0.5, 0.3],
      ],
      s,
      true,
    );
    g.fill();
    g.stroke();
    g.fillStyle = k.line;
    g.beginPath();
    g.moveTo(-0.24 * s, 0.3 * s);
    g.bezierCurveTo(-0.24 * s, -0.2 * s, 0.24 * s, -0.2 * s, 0.24 * s, 0.3 * s);
    g.fill();
    g.strokeStyle = k.gold;
    for (const x of [-0.1, 0.06]) {
      path(
        g,
        [
          [x, -0.12],
          [x + 0.02, -0.02],
        ],
        s,
      );
      g.stroke();
    }
  },
  // Bà Nà: cáp treo trên núi.
  cable: (g, s, k) => {
    g.fillStyle = k.soft;
    path(
      g,
      [
        [-0.5, 0.3],
        [-0.1, -0.2],
        [0.2, 0.05],
        [0.5, 0.3],
      ],
      s,
      true,
    );
    g.fill();
    g.stroke();
    path(
      g,
      [
        [-0.5, -0.36],
        [0.5, -0.04],
      ],
      s,
    );
    g.stroke();
    g.fillStyle = k.red;
    g.fillRect(-0.06 * s, -0.16 * s, 0.14 * s, 0.12 * s);
    path(
      g,
      [
        [0.01, -0.24],
        [0.01, -0.16],
      ],
      s,
    );
    g.stroke();
  },
  // Hội An: đèn lồng.
  lantern: (g, s, k) => {
    for (const [x, c] of [
      [-0.24, k.red],
      [0.04, k.gold],
      [0.3, k.red],
    ] as const) {
      path(
        g,
        [
          [x, -0.4],
          [x, -0.28],
        ],
        s,
      );
      g.stroke();
      g.fillStyle = c;
      g.beginPath();
      g.ellipse(x * s, -0.1 * s, 0.11 * s, 0.17 * s, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      path(
        g,
        [
          [x - 0.05, 0.08],
          [x + 0.05, 0.08],
        ],
        s,
      );
      g.stroke();
      path(
        g,
        [
          [x, 0.08],
          [x, 0.2],
        ],
        s,
      );
      g.stroke();
    }
  },
  // Cầu Rồng: thân rồng uốn sóng trên nhịp cầu.
  dragon: (g, s, k) => {
    path(
      g,
      [
        [-0.5, 0.22],
        [0.5, 0.22],
      ],
      s,
    );
    g.stroke();
    g.strokeStyle = k.gold;
    g.lineWidth *= 1.6;
    g.beginPath();
    g.moveTo(-0.46 * s, 0.1 * s);
    for (let i = 0; i <= 20; i++) {
      const x = -0.46 + i * 0.044;
      g.lineTo(x * s, (0.02 - Math.abs(Math.sin(i * 0.47)) * 0.28) * s);
    }
    g.stroke();
    g.lineWidth /= 1.6;
    g.fillStyle = k.red;
    g.beginPath();
    g.arc(0.44 * s, -0.1 * s, 0.07 * s, 0, Math.PI * 2);
    g.fill();
  },
  // Đà Lạt: đồi thông.
  pine: (g, s, k) => {
    for (const [x, h] of [
      [-0.28, 0.5],
      [0.02, 0.62],
      [0.3, 0.44],
    ] as const) {
      g.fillStyle = k.soft;
      path(
        g,
        [
          [x, 0.28 - h],
          [x + 0.14, 0.2],
          [x - 0.14, 0.2],
        ],
        s,
        true,
      );
      g.fill();
      g.stroke();
      path(
        g,
        [
          [x, 0.2],
          [x, 0.3],
        ],
        s,
      );
      g.stroke();
    }
  },
  // Nha Trang: tháp Chăm trên sóng.
  chamtower: (g, s, k) => {
    g.fillStyle = k.soft;
    path(
      g,
      [
        [-0.14, 0.18],
        [-0.1, -0.2],
        [0, -0.38],
        [0.1, -0.2],
        [0.14, 0.18],
      ],
      s,
      true,
    );
    g.fill();
    g.stroke();
    g.fillStyle = k.line;
    g.fillRect(-0.04 * s, 0.04 * s, 0.08 * s, 0.14 * s);
    g.strokeStyle = k.gold;
    for (const y of [0.24, 0.32]) {
      g.beginPath();
      for (let i = 0; i <= 10; i++) {
        const x = -0.5 + i * 0.1;
        g.lineTo(x * s, (y + Math.sin(i * 1.6) * 0.025) * s);
      }
      g.stroke();
    }
  },
  // Mũi Né: đồi cát.
  dunes: (g, s, k) => {
    g.fillStyle = k.soft;
    g.beginPath();
    g.moveTo(-0.5 * s, 0.28 * s);
    g.bezierCurveTo(-0.3 * s, -0.24 * s, 0.0, -0.1 * s, 0.1 * s, 0.05 * s);
    g.bezierCurveTo(0.2 * s, -0.2 * s, 0.4 * s, -0.1 * s, 0.5 * s, 0.28 * s);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = k.red;
    g.beginPath();
    g.arc(0.3 * s, -0.3 * s, 0.09 * s, 0, Math.PI * 2);
    g.fill();
  },
  // Cần Thơ: ghe chợ nổi chở trái cây.
  market: (g, s, k) => {
    g.fillStyle = k.line;
    path(
      g,
      [
        [-0.46, 0.06],
        [0.46, 0.06],
        [0.34, 0.2],
        [-0.34, 0.2],
      ],
      s,
      true,
    );
    g.fill();
    for (const [x, c] of [
      [-0.2, k.red],
      [-0.02, k.gold],
      [0.16, k.red],
    ] as const) {
      g.fillStyle = c;
      g.beginPath();
      g.arc(x * s, -0.02 * s, 0.09 * s, 0, Math.PI * 2);
      g.fill();
    }
    path(
      g,
      [
        [0.34, 0.06],
        [0.34, -0.36],
      ],
      s,
    );
    g.stroke();
    g.strokeStyle = k.gold;
    path(
      g,
      [
        [-0.5, 0.28],
        [0.5, 0.28],
      ],
      s,
    );
    g.stroke();
  },
  // Phú Quốc: cây dừa nghiêng ra biển.
  palm: (g, s, k) => {
    g.beginPath();
    g.moveTo(-0.2 * s, 0.3 * s);
    g.quadraticCurveTo(-0.16 * s, -0.04 * s, 0.08 * s, -0.24 * s);
    g.stroke();
    g.fillStyle = k.soft;
    for (const a of [-2.6, -1.9, -1.2, -0.5, 0.2]) {
      g.beginPath();
      g.moveTo(0.08 * s, -0.24 * s);
      g.quadraticCurveTo(
        (0.08 + Math.cos(a) * 0.2) * s,
        (-0.24 + Math.sin(a) * 0.24 - 0.06) * s,
        (0.08 + Math.cos(a) * 0.32) * s,
        (-0.24 + Math.sin(a) * 0.2 + 0.08) * s,
      );
      g.stroke();
    }
    g.strokeStyle = k.gold;
    path(
      g,
      [
        [-0.5, 0.3],
        [0.5, 0.3],
      ],
      s,
    );
    g.stroke();
  },
  // Côn Đảo: rùa biển.
  turtle: (g, s, k) => {
    g.fillStyle = k.soft;
    g.beginPath();
    g.ellipse(0, 0, 0.26 * s, 0.2 * s, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.arc(0.32 * s, -0.02 * s, 0.07 * s, 0, Math.PI * 2);
    g.stroke();
    for (const [x, y] of [
      [-0.16, -0.22],
      [0.16, -0.22],
      [-0.16, 0.22],
      [0.16, 0.22],
    ] as const) {
      g.beginPath();
      g.ellipse(x * s, y * s, 0.09 * s, 0.04 * s, x * y > 0 ? 0.5 : -0.5, 0, Math.PI * 2);
      g.stroke();
    }
    g.strokeStyle = k.gold;
    path(
      g,
      [
        [-0.14, -0.08],
        [0, 0.04],
        [0.14, -0.08],
      ],
      s,
    );
    g.stroke();
  },
  // Chợ Bến Thành: tháp đồng hồ.
  clock: (g, s, k) => {
    g.fillStyle = k.soft;
    g.fillRect(-0.44 * s, 0.04 * s, 0.88 * s, 0.24 * s);
    g.strokeRect(-0.44 * s, 0.04 * s, 0.88 * s, 0.24 * s);
    g.fillRect(-0.1 * s, -0.3 * s, 0.2 * s, 0.34 * s);
    g.strokeRect(-0.1 * s, -0.3 * s, 0.2 * s, 0.34 * s);
    g.fillStyle = k.red;
    path(
      g,
      [
        [-0.12, -0.3],
        [0, -0.42],
        [0.12, -0.3],
      ],
      s,
      true,
    );
    g.fill();
    g.fillStyle = k.gold;
    g.beginPath();
    g.arc(0, -0.16 * s, 0.06 * s, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  },
  // Phố Nguyễn Huệ: nhà cao tầng.
  skyline: (g, s, k) => {
    for (const [x, w, h] of [
      [-0.32, 0.18, 0.4],
      [-0.08, 0.2, 0.66],
      [0.16, 0.16, 0.5],
      [0.36, 0.14, 0.34],
    ] as const) {
      g.fillStyle = k.soft;
      g.fillRect((x - w / 2) * s, (0.3 - h) * s, w * s, h * s);
      g.strokeRect((x - w / 2) * s, (0.3 - h) * s, w * s, h * s);
    }
    g.strokeStyle = k.gold;
    path(
      g,
      [
        [-0.08, -0.36],
        [-0.08, -0.46],
      ],
      s,
    );
    g.stroke();
  },
};

/** Hình của từng ô đất (theo tên trong data.ts). */
const BY_NAME: Record<string, string> = {
  'Hà Giang': 'peaks',
  'Sa Pa': 'terraces',
  'Ninh Bình': 'karst',
  'Cát Bà': 'sail',
  'Hạ Long': 'karst',
  'Phố Hàng Đào': 'shophouse',
  'Tràng Tiền': 'bridge',
  'Hồ Gươm': 'tower',
  'Đại Nội': 'gate',
  'Lăng Cô': 'bay',
  'Phong Nha': 'cave',
  'Bà Nà': 'cable',
  'Hội An': 'lantern',
  'Cầu Rồng': 'dragon',
  'Đà Lạt': 'pine',
  'Nha Trang': 'chamtower',
  'Mũi Né': 'dunes',
  'Cần Thơ': 'market',
  'Phú Quốc': 'palm',
  'Côn Đảo': 'turtle',
  'Chợ Bến Thành': 'clock',
  'Phố Nguyễn Huệ': 'skyline',
};

export function drawMotif(g: G, name: string, s: number, ink: Ink) {
  const draw = MOTIFS[BY_NAME[name] ?? ''];
  if (!draw) return;
  g.save();
  g.strokeStyle = ink.line;
  g.lineWidth = Math.max(2, s * 0.035);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  draw(g, s, ink);
  g.restore();
}

/** Ô nào chưa có hình (để test bắt khi thêm ô mới mà quên vẽ). */
export const missingMotifs = (names: string[]) => names.filter((n) => !MOTIFS[BY_NAME[n] ?? '']);

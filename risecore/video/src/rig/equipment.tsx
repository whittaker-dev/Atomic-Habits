import React from 'react';

export const FlatBench: React.FC<{top?: number}> = ({top = 470}) => (
  <g>
    <rect x={385} y={180} width={14} height={420} rx={6} fill="#2E3650" />
    <rect x={370} y={250} width={36} height={14} rx={5} fill="#3E4766" />
    <rect x={232} y={top + 20} width={18} height={600 - top - 20} fill="#3E4766" />
    <rect x={520} y={top + 20} width={18} height={600 - top - 20} fill="#3E4766" />
    <rect x={200} y={top} width={370} height={28} rx={12} fill="#5A647F" />
    <rect x={190} y={592} width={400} height={10} rx={5} fill="#3E4766" />
  </g>
);

export const InclineBench: React.FC = () => (
  <g>
    {/* seat */}
    <rect x={440} y={508} width={180} height={26} rx={12} fill="#5A647F" />
    <rect x={520} y={530} width={18} height={70} fill="#3E4766" />
    {/* backrest: along -150deg from hinge */}
    <g transform="translate(494 514) rotate(-150)">
      <rect x={-6} y={-13} width={250} height={26} rx={12} fill="#5A647F" />
    </g>
    <line x1={360} y1={600} x2={330} y2={430} stroke="#3E4766" strokeWidth={16} strokeLinecap="round" />
    <rect x={300} y={592} width={340} height={10} rx={5} fill="#3E4766" />
  </g>
);

export const CableTowers: React.FC = () => (
  <g>
    {[40, 880].map((x) => (
      <g key={x}>
        <rect x={x - 14} y={40} width={28} height={560} rx={8} fill="#2E3650" />
        <circle cx={x} cy={250} r={20} fill="#5A647F" stroke="#C9CCD6" strokeWidth={4} />
        <rect x={x - 26} y={420} width={52} height={150} rx={6} fill="#3E4766" />
        {[0, 1, 2, 3, 4].map((k) => (
          <rect key={k} x={x - 22} y={428 + k * 28} width={44} height={22} rx={3} fill="#5A647F" />
        ))}
      </g>
    ))}
  </g>
);

export const Mat: React.FC = () => <rect x={200} y={590} width={600} height={14} rx={7} fill="#2EE6A6" opacity={0.6} />;

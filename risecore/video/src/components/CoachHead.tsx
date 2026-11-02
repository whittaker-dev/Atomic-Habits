import React from 'react';
import {FrontChar} from '../rig/FrontChar';

export const CoachHead: React.FC<{size: number; mouth?: number}> = ({size, mouth = 0}) => (
  <svg width={size} height={size} viewBox="-95 -625 190 190" style={{borderRadius: '50%', background: '#FFD23F'}}>
    <FrontChar who="coach" x={0} y={0} mouth={mouth} />
  </svg>
);

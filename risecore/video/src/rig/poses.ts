import {COACH, Look, TI} from './looks';
import {V, ik, lerp, lerpV, lower, polar, righter, upper, v} from './math';
import {SidePose} from './SideLifter';

/** Flat bench press. t: 0 = lockout, 1 = bar at chest. lift: 0..1 hips off the bench (a fault). */
export function benchPose(L: Look, t: number, lift = 0): SidePose {
  const cy = 470 - L.torsoW / 2;
  const shoulder = v(500 - L.torso, cy);
  const hip = v(500, cy - lift * 46);
  const foot = v(640, 584);
  const knee = ik(hip, foot, L.thigh, L.shin, upper).elbow;
  const target = lerpV(v(388, cy - 0.97 * (L.upper + L.fore)), v(402, cy - 56), t);
  const arm = ik(shoulder, target, L.upper, L.fore, lower);
  return {hip, shoulder, knee, foot, elbow: arm.elbow, hand: arm.hand, face: 1};
}

export function inclinePose(t: number): SidePose {
  const L = COACH;
  const hip = v(520, 470);
  const shoulder = polar(hip, (-150 * Math.PI) / 180, L.torso);
  const foot = v(650, 584);
  const knee = ik(hip, foot, L.thigh, L.shin, upper).elbow;
  const target = lerpV(v(shoulder.x + 6, shoulder.y - 163), v(shoulder.x + 30, shoulder.y - 40), t);
  const arm = ik(shoulder, target, L.upper, L.fore, lower);
  return {hip, shoulder, knee, foot, elbow: arm.elbow, hand: arm.hand, face: 1};
}

export function pushupPose(t: number): SidePose {
  const L = TI;
  const F = v(760, 588);
  const B = L.shin + L.thigh + L.torso;
  const th = (lerp(26.4, 7.5, t) * Math.PI) / 180;
  const dir = v(-Math.cos(th), -Math.sin(th));
  const at = (d: number): V => v(F.x + dir.x * d, F.y + dir.y * d);
  const knee = at(L.shin);
  const hip = at(L.shin + L.thigh);
  const shoulder = at(B);
  const handPos = v(440, 590 - L.foreW * 0.6);
  const arm = ik(shoulder, handPos, L.upper, L.fore, righter);
  return {hip, shoulder, knee, foot: F, elbow: arm.elbow, hand: arm.hand, face: -1, shoeAng: th};
}

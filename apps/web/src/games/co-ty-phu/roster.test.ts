import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { buildFigure, FIGURE_IDS } from './figures';
import { characterOf, freeCharacter, ROSTER } from './roster';

test('danh sách chọn khớp đúng các nhân vật dựng được', () => {
  assert.deepEqual([...ROSTER].sort(), [...FIGURE_IDS].sort());
  assert.ok(ROSTER.length >= 6, 'đủ nhân vật cho sáu ghế');
});

test('mỗi nhân vật là khối 3D đứng trên mặt bàn, cao chừng một đơn vị', () => {
  for (const id of ROSTER) {
    const g = buildFigure(id);
    const box = new THREE.Box3().setFromObject(g);
    const size = box.getSize(new THREE.Vector3());
    assert.ok(box.min.y > -0.05 && box.min.y < 0.05, `${id} đứng ở y = 0 (đáy ${box.min.y})`);
    assert.ok(size.y > 0.8 && size.y < 1.4, `${id} cao ${size.y}`);
    // Có bề dày thật theo chiều sâu, không phải tấm phẳng.
    assert.ok(size.z > 0.3, `${id} sâu ${size.z}`);
  }
});

test('ghế chưa có nhân vật hoặc mang nhân vật cũ vẫn có nhân vật hợp lệ', () => {
  assert.equal(characterOf({ id: 2 }), ROSTER[2]);
  assert.equal(characterOf({ id: 0, character: 'ongdo' }), ROSTER[0]);
  assert.equal(characterOf({ id: 0, character: 'meo' }), 'meo');
});

test('chọn nhân vật còn trống không trùng người khác', () => {
  assert.equal(freeCharacter([ROSTER[0], ROSTER[1]]), ROSTER[2]);
  const taken = ROSTER.slice(0, ROSTER.length - 1);
  assert.equal(freeCharacter([...taken], true), ROSTER[ROSTER.length - 1]);
});

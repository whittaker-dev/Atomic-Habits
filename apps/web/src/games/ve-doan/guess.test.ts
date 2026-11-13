import assert from 'node:assert/strict';
import { test } from 'node:test';
import { judgeGuess, letterCount } from './guess';

test('đúng khi gõ đủ dấu, không dấu, khác hoa thường hay thừa dấu cách', () => {
  for (const g of ['bánh chưng', 'banh chung', '  BÁNH   Chưng ', 'Banh Chung'])
    assert.equal(judgeGuess(g, 'bánh chưng'), 'correct');
  assert.equal(judgeGuess('dua hau', 'dưa hấu'), 'correct');
  assert.equal(judgeGuess('xe dap', 'xe đạp'), 'correct');
});

test('bỏ loại từ đứng đầu vẫn tính đúng, nhưng chỉ gõ loại từ thì không', () => {
  assert.equal(judgeGuess('mèo', 'con mèo'), 'correct');
  assert.equal(judgeGuess('cai o', 'ô'), 'correct');
  assert.equal(judgeGuess('xoài', 'quả xoài'), 'correct');
  assert.notEqual(judgeGuess('con', 'con mèo'), 'correct');
  assert.equal(judgeGuess('con chó', 'con mèo'), 'wrong');
});

test('gần đúng khi sai một hai chữ hoặc trúng một tiếng', () => {
  assert.equal(judgeGuess('banh chuung', 'bánh chưng'), 'near');
  assert.equal(judgeGuess('bánh tét', 'bánh chưng'), 'near');
});

test('sai khi khác hẳn hoặc để trống', () => {
  assert.equal(judgeGuess('nồi cơm', 'bánh chưng'), 'wrong');
  // Ví dụ câu sai trong cẩm nang (guide.tsx).
  assert.equal(judgeGuess('cái nón', 'bánh chưng'), 'wrong');
  assert.equal(judgeGuess('   ', 'bánh chưng'), 'wrong');
  // Một chữ cái lẻ trùng không tính là gần đúng.
  assert.equal(judgeGuess('a b', 'cái ô'), 'wrong');
});

test('đếm chữ cái bỏ dấu cách', () => {
  assert.equal(letterCount('bánh chưng'), 9);
});

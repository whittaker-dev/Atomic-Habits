import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterByQuery, foldText } from './format';

test('bỏ dấu để tìm không dấu vẫn khớp', () => {
  assert.equal(foldText('Giá Vàng'), 'gia vang');
  assert.equal(foldText('Đà Lạt'), 'da lat');
  assert.equal(foldText('Ðà Lạt'), 'da lat', 'chữ Ð của tiếng Iceland cũng thành d');
  assert.equal(foldText('Nhật Bản'), 'nhat ban');
});

test('lọc theo chữ gõ: tên bắt đầu bằng chữ đó đứng trước', () => {
  const names = ['Afghanistan', 'Ghana', 'Hàn Quốc', 'Thành Vatican', 'Phần Lan'];
  assert.deepEqual(
    filterByQuery(names, (n) => n, 'han'),
    ['Hàn Quốc', 'Afghanistan', 'Ghana', 'Thành Vatican', 'Phần Lan'],
  );
  assert.deepEqual(
    filterByQuery(names, (n) => n, 'lan'),
    ['Phần Lan'],
  );
  assert.deepEqual(
    filterByQuery(names, (n) => n, '  '),
    names,
    'chưa gõ gì thì giữ nguyên',
  );
});

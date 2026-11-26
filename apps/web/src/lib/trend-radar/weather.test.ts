import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeWeather } from './weather';

test('mã thời tiết WMO: đổi đúng sang chữ và nhóm biểu tượng', () => {
  assert.deepEqual(describeWeather(0), { label: 'Trời quang', kind: 'clear' });
  assert.deepEqual(describeWeather(51), { label: 'Mưa phùn nhẹ', kind: 'drizzle' });
  assert.deepEqual(describeWeather(95), { label: 'Dông', kind: 'storm' });
});

test('mã thời tiết lạ không làm vỡ giao diện', () => {
  assert.deepEqual(describeWeather(42), { label: 'Không rõ', kind: 'cloudy' });
});

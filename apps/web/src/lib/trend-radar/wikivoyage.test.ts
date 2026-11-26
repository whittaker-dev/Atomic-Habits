import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanWikiText, parseListings } from './wikivoyage';

// Mẫu rút gọn từ bài Da Nang trên Wikivoyage tiếng Anh.
const SAMPLE = `
==See==
* {{see
| name=Museum of Cham Sculpture | alt=Bảo Tàng Chăm | url= | email=
| address=#2, September 2nd Rd | lat=16.06006 | long=108.22307
| hours=07:30–11:00, 13:30–17:00 | price=60,000 dong
| lastedit=2024-08-29
| content=Founded in 1915 by the [[École française d'Extrême-Orient|École Française]], it houses '''stone''' sculptures.
}}
==Get around==
* {{listing
| name=Mai Linh | url= | price=
| content=Taxi company.
}}
==Sleep==
* {{listing | type=sleep | name=Funtastic Hostel | url=https://example.com/hostel | price={{US$|6}} dorm, [http://x.vn rooms] from 300,000 dong | lastedit=2023-05 }}
* {{eat | name= | content=No name, skipped }}
* {{do
| name=Ba Na Hills | price=750,000 dong<!-- 2024 -->
| content=Cable car {{nowrap|to the}} hill station.
`;

test('Wikivoyage: đọc mục xem, ngủ; bỏ mục không phải du lịch, mục thiếu tên, template không đóng', () => {
  const items = parseListings(SAMPLE);
  assert.deepEqual(
    items.map((i) => [i.kind, i.name]),
    [
      ['see', 'Museum of Cham Sculpture'],
      ['sleep', 'Funtastic Hostel'],
    ],
  );

  const [museum, hostel] = items;
  assert.ok(museum && hostel);
  assert.equal(museum.alt, 'Bảo Tàng Chăm');
  assert.equal(museum.price, '60,000 dong');
  assert.equal(museum.hours, '07:30–11:00, 13:30–17:00');
  assert.equal(museum.updated, '2024-08-29');
  assert.equal(museum.url, null);
  assert.equal(
    museum.description,
    'Founded in 1915 by the École Française, it houses stone sculptures.',
  );

  assert.equal(hostel.url, 'https://example.com/hostel');
  assert.equal(
    hostel.price,
    '6 dorm, rooms from 300,000 dong',
    'template trong giá giữ lại con số',
  );
  assert.equal(hostel.updated, null, 'ngày sửa không đủ dạng YYYY-MM-DD thì bỏ');
});

test('bỏ cú pháp wiki trong chữ', () => {
  assert.equal(
    cleanWikiText("[[Hội An]] and '''[[Mỹ Sơn|My Son]]'''<ref>x</ref>"),
    'Hội An and My Son',
  );
  assert.equal(cleanWikiText('{{nowrap|to the}} hill {{clear}}'), 'to the hill');
  assert.equal(cleanWikiText('  '), null);
  assert.equal(cleanWikiText(undefined), null);
});

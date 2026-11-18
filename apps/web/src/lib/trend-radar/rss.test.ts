import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseNewsRss, parseTraffic, parseTrendsRss } from './rss';

// Mẫu rút gọn từ RSS thật của VnExpress và Google Trends (17/11/2026).
const VNEXPRESS = `<?xml version="1.0" encoding="UTF-8"?><rss><channel>
<item>
  <title>Pháp &#039;bí mật triển khai lực lượng&#039; đến Ukraine</title>
  <description><![CDATA[<a href="https://vnexpress.net/a-1.html"><img src="https://img.vn/a.png?w=1200&h=0"></a></br>Binh sĩ Pháp &amp; đồng minh.]]></description>
  <pubDate>Tue, 17 Nov 2026 15:36:36 +0700</pubDate>
  <link>https://vnexpress.net/a-1.html</link>
  <enclosure type="image/jpeg" length="1200" url="https://img.vn/a.png?w=1200&amp;h=0"/>
</item>
<item>
  <title>Tin không có ảnh</title>
  <description><![CDATA[Chỉ có chữ.]]></description>
  <pubDate>Tue, 17 Nov 2026 14:00:00 +0700</pubDate>
  <link>https://vnexpress.net/b-2.html</link>
</item>
<item>
  <title>Tin thiếu ngày đăng bị bỏ qua</title>
  <link>https://vnexpress.net/c-3.html</link>
</item>
</channel></rss>`;

const TRENDS = `<rss xmlns:ht="https://trends.google.com/trending/rss"><channel>
<item>
  <title>khu đô thị mới thủ thiêm</title>
  <ht:approx_traffic>2K+</ht:approx_traffic>
  <description/>
  <pubDate>Tue, 17 Nov 2026 01:30:00 -0800</pubDate>
  <ht:picture>https://encrypted-tbn2.gstatic.com/images?q=tbn:abc</ht:picture>
  <ht:news_item>
    <ht:news_item_title>Siêu tháp 99 tầng &amp; Landmark 81</ht:news_item_title>
    <ht:news_item_snippet/>
    <ht:news_item_url>https://cafef.vn/x.chn</ht:news_item_url>
    <ht:news_item_source>CafeF</ht:news_item_source>
  </ht:news_item>
</item>
</channel></rss>`;

test('RSS VnExpress: tiêu đề, ảnh, tóm tắt, ngày đăng theo ISO', () => {
  const items = parseNewsRss(VNEXPRESS, 'VnExpress');
  assert.equal(items.length, 2, 'tin thiếu ngày đăng phải bị bỏ qua');

  const [a, b] = items;
  assert.ok(a && b);
  assert.equal(a.title, "Pháp 'bí mật triển khai lực lượng' đến Ukraine");
  assert.equal(a.url, 'https://vnexpress.net/a-1.html');
  assert.equal(a.image, 'https://img.vn/a.png?w=1200&h=0');
  assert.equal(a.summary, 'Binh sĩ Pháp & đồng minh.');
  assert.equal(a.publishedAt, '2026-11-17T08:36:36.000Z');
  assert.equal(a.source, 'VnExpress');

  assert.equal(b.image, null);
  assert.equal(b.summary, 'Chỉ có chữ.');
});

test('RSS Google News: tách tên báo khỏi tiêu đề, ngày dạng GMT+7 của GameK vẫn đọc được', () => {
  const xml = `<rss><channel>
<item><title>VALORANT Patch 13.10: Tăng sức mạnh Sentinel - Webthethao</title><link>https://news.google.com/rss/articles/abc?oc=5</link><pubDate>Sat, 14 Nov 2026 09:13:00 GMT</pubDate><description>&lt;a href="x"&gt;VALORANT Patch 13.10&lt;/a&gt;</description><source url="https://webthethao.vn">Webthethao</source></item>
<item><title><![CDATA[Naruto Mobile ra mắt nhân vật mới]]></title><link><![CDATA[https://gamek.vn/a.chn]]></link><pubDate>Tue, 17 Nov 2026 17:00:00 GMT+7</pubDate></item>
</channel></rss>`;
  const [news, gamek] = parseNewsRss(xml, 'Google News');
  assert.ok(news && gamek);
  assert.equal(news.title, 'VALORANT Patch 13.10: Tăng sức mạnh Sentinel');
  assert.equal(news.source, 'Webthethao');
  assert.equal(gamek.source, 'Google News', 'không có <source> thì giữ tên nguồn truyền vào');
  assert.equal(gamek.publishedAt, '2026-11-17T10:00:00.000Z');
});

test('RSS Google Trends: từ khoá, lượt tìm, tin liên quan', () => {
  const [t] = parseTrendsRss(TRENDS);
  assert.ok(t);
  assert.equal(t.keyword, 'khu đô thị mới thủ thiêm');
  assert.equal(t.traffic, '2K+');
  assert.equal(t.trafficValue, 2000);
  assert.equal(t.startedAt, '2026-11-17T09:30:00.000Z');
  assert.equal(t.image, 'https://encrypted-tbn2.gstatic.com/images?q=tbn:abc');
  assert.deepEqual(t.news, [
    { title: 'Siêu tháp 99 tầng & Landmark 81', url: 'https://cafef.vn/x.chn', source: 'CafeF' },
  ]);
});

test('lượt tìm: đọc được K, M và số trơn', () => {
  assert.equal(parseTraffic('200+'), 200);
  assert.equal(parseTraffic('50K+'), 50_000);
  assert.equal(parseTraffic('1M+'), 1_000_000);
  assert.equal(parseTraffic(''), 0);
});

// Đổi token ngắn hạn (Graph API Explorer) -> token dài hạn -> Page token không hết hạn.
// Chạy trên máy bạn:  node scripts/get-page-token.mjs
import {graph, loadEnv, need, writeEnv} from './lib.mjs';

loadEnv();
need('FB_APP_ID', 'FB_APP_SECRET', 'FB_SHORT_USER_TOKEN');

const {FB_APP_ID, FB_APP_SECRET, FB_SHORT_USER_TOKEN} = process.env;
const handle = (process.env.FB_PAGE_HANDLE || '').toLowerCase();

console.log('1/3 Đổi sang user token dài hạn…');
const long = await graph('GET', '/oauth/access_token', {
  grant_type: 'fb_exchange_token',
  client_id: FB_APP_ID,
  client_secret: FB_APP_SECRET,
  fb_exchange_token: FB_SHORT_USER_TOKEN,
});

console.log('2/3 Lấy danh sách Page bạn quản lý…');
const pages = await graph('GET', '/me/accounts', {
  fields: 'id,name,username,access_token,tasks',
  limit: 100,
  access_token: long.access_token,
});

if (!pages.data?.length) {
  console.error('❌ Không thấy Page nào. Kiểm tra lại: token có đủ quyền pages_show_list và bạn đã chọn Page khi cấp quyền chưa?');
  process.exit(1);
}

const page =
  pages.data.find((p) => (p.username || '').toLowerCase() === handle) ||
  pages.data.find((p) => p.name.toLowerCase().replace(/\s+/g, '') === handle) ||
  (pages.data.length === 1 ? pages.data[0] : null);

if (!page) {
  console.log('Có nhiều Page, chưa khớp FB_PAGE_HANDLE. Danh sách:');
  for (const p of pages.data) console.log(`  - ${p.name}  (id ${p.id}, username ${p.username || '—'})`);
  console.log('→ Điền FB_PAGE_ID đúng vào .env rồi chạy lại.');
  process.exit(1);
}

if (!page.tasks?.includes('CREATE_CONTENT')) {
  console.warn('⚠️ Tài khoản của bạn không có quyền CREATE_CONTENT trên Page này, có thể không đăng được Reels.');
}

console.log('3/3 Kiểm tra token…');
const dbg = await graph('GET', '/debug_token', {
  input_token: page.access_token,
  access_token: `${FB_APP_ID}|${FB_APP_SECRET}`,
});
const exp = dbg.data?.expires_at;
const scopes = dbg.data?.scopes || [];

writeEnv({FB_PAGE_ID: page.id, FB_PAGE_TOKEN: page.access_token});
console.log(`✅ Page: ${page.name} (id ${page.id})`);
console.log(`   Hết hạn: ${!exp ? 'không bao giờ' : new Date(exp * 1000).toLocaleString('vi-VN')}`);
for (const s of ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts']) {
  console.log(`   ${scopes.includes(s) ? '✓' : '✗ THIẾU'} ${s}`);
}
console.log('   Đã ghi FB_PAGE_ID và FB_PAGE_TOKEN vào .env (không in token ra màn hình).');

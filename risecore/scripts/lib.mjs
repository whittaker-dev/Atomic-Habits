import fs from 'node:fs';
import path from 'node:path';

/** Minimal .env loader (no dependencies). Real env vars win over the file. */
export function loadEnv(file = '.env') {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, raw] = m;
    const val = raw.replace(/^['"]|['"]$/g, '');
    if (process.env[k] === undefined || process.env[k] === '') process.env[k] = val;
  }
}

/** Set (or add) KEY=value lines in .env without touching the rest. */
export function writeEnv(updates, file = '.env') {
  const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [];
  for (const [k, v] of Object.entries(updates)) {
    const i = lines.findIndex((l) => l.startsWith(`${k}=`));
    if (i >= 0) lines[i] = `${k}=${v}`;
    else lines.push(`${k}=${v}`);
  }
  fs.writeFileSync(file, lines.join('\n'));
}

export function need(...keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Thiếu biến môi trường: ${missing.join(', ')} (xem .env.example)`);
    process.exit(1);
  }
}

// GRAPH_HOST / RUPLOAD_HOST chỉ dùng để test với server giả
export const GRAPH = () => `${process.env.GRAPH_HOST || 'https://graph.facebook.com'}/${process.env.GRAPH_VERSION || 'v26.0'}`;
export const RUPLOAD = () => `${process.env.RUPLOAD_HOST || 'https://rupload.facebook.com'}/video-upload/${process.env.GRAPH_VERSION || 'v26.0'}`;

/** Call the Graph API and throw a readable error on failure. Never logs tokens. */
export async function graph(method, urlPath, params = {}, {host = GRAPH(), headers = {}, body} = {}) {
  const url = new URL(urlPath.startsWith('http') ? urlPath : `${host}${urlPath}`);
  let reqBody = body;
  if (method === 'GET') {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  } else if (!body) {
    reqBody = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  }
  const res = await fetch(url, {method, headers, body: method === 'GET' ? undefined : reqBody});
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = {raw: text};
  }
  if (!res.ok || json.error) {
    const e = json.error || {};
    throw new Error(`Graph API lỗi ${res.status}${e.code ? ` (code ${e.code})` : ''}: ${e.message || text.slice(0, 300)}`);
  }
  return json;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function sidecar(videoPath, ext) {
  const p = path.parse(videoPath);
  return path.join(p.dir, `${p.name}${ext}`);
}

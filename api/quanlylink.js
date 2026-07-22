// api/quanlylink.js — Vercel Serverless: tạo / thu hồi link xem (bảng link_xem)
// Chỉ nên gọi từ trang Danh mục (canSee quan_ly/ceo đã gate ở client trước khi gọi).
// Dùng SERVICE ROLE KEY để bypass RLS — bảng link_xem chặn hoàn toàn truy cập từ anon key.

const SUPA_URL = 'https://vcrnlyvdquodiqfwaogj.supabase.co';

function randomToken() {
  // UUID v4 (36 ký tự), đủ ngẫu nhiên để không thể dò
  return (globalThis.crypto?.randomUUID?.() || require('crypto').randomUUID());
}

async function sbFetch(path, serviceKey, opts = {}) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`Supabase REST lỗi (${r.status}): ${await r.text()}`);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình trong Vercel' });

  try {
    const { action, loai, ma, ten_hien_thi, id } = req.body || {};

    if (action === 'get_or_create') {
      if (!['thau', 'laixe'].includes(loai) || !ma) return res.status(400).json({ error: 'Thiếu loai/ma' });
      const existing = await sbFetch(
        `link_xem?loai=eq.${loai}&ma=eq.${encodeURIComponent(ma)}&active=eq.true&select=id,token`,
        serviceKey
      );
      if (existing && existing[0]) return res.status(200).json({ token: existing[0].token, created: false });

      const token = randomToken();
      const inserted = await sbFetch('link_xem', serviceKey, {
        method: 'POST',
        body: JSON.stringify([{ loai, ma, ten_hien_thi: ten_hien_thi || ma, token }]),
      });
      return res.status(200).json({ token: inserted[0].token, created: true });
    }

    if (action === 'revoke') {
      if (!id) return res.status(400).json({ error: 'Thiếu id' });
      await sbFetch(`link_xem?id=eq.${id}`, serviceKey, {
        method: 'PATCH',
        body: JSON.stringify({ active: false }),
        prefer: 'return=minimal',
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'list') {
      if (!['thau', 'laixe'].includes(loai)) return res.status(400).json({ error: 'Thiếu loai' });
      const rows = await sbFetch(`link_xem?loai=eq.${loai}&active=eq.true&select=id,ma,token`, serviceKey);
      return res.status(200).json({ rows });
    }

    return res.status(400).json({ error: 'action không hợp lệ' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

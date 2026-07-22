// api/xembang.js — Vercel Serverless: trả dữ liệu bảng kê thầu phụ / bảng lương lái xe
// cho trang xem công khai (xem.html), xác thực bằng token trong bảng link_xem.
// Dùng SERVICE ROLE KEY (server-side only, KHÔNG lộ ra client) để bypass RLS đọc dữ liệu cần thiết,
// nhưng chỉ trả về đúng các cột đã whitelist — không trả nguyên bản ghi van_don.

// Import file công thức DÙNG CHUNG với web app (../js/luong-calc.js) — side-effect import: chạy file này
// để nó tự gắn chuanHoaTen()/tinhTuDiaPhuong()/tinhLuongChuyen() vào globalThis, dùng thẳng bên dưới
// KHÔNG viết lại công thức ở đây để tránh lệch số với bảng lương nội bộ (loadBangLuong() trong pages.js).
import '../js/luong-calc.js';

const SUPA_URL = 'https://vcrnlyvdquodiqfwaogj.supabase.co';

async function sbFetch(path, serviceKey) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!r.ok) throw new Error(`Supabase REST lỗi (${r.status}): ${await r.text()}`);
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình trong Vercel' });

  const token = (req.query.token || '').trim();
  if (!token) return res.status(400).json({ error: 'Thiếu token' });

  try {
    // 1) Tra token trong link_xem
    const links = await sbFetch(
      `link_xem?token=eq.${encodeURIComponent(token)}&active=eq.true&select=loai,ma,ten_hien_thi`,
      serviceKey
    );
    const link = links[0];
    if (!link) return res.status(404).json({ error: 'Link không hợp lệ hoặc đã bị thu hồi' });

    // 2) Phạm vi thời gian: 3 tháng gần nhất
    const from = new Date();
    from.setMonth(from.getMonth() - 3);
    const dateFrom = from.toISOString().slice(0, 10);

    const cols = 'id,ma_don,ngay,diem_lay,diem_tra,diem_tra_phat_sinh,loai_chuyen,loai_phan_loai_xe,' +
      'ten_lai_xe,bien_kiem_soat,ma_thau_phu,so_cont,loai_cont,locked,gia_cuoc_thau,tra_thau_doi_lenh';
    const orders = await sbFetch(
      `van_don?ngay=gte.${dateFrom}&locked=eq.true&select=${cols}&order=ngay.asc`,
      serviceKey
    );

    if (link.loai === 'thau') {
      const list = orders.filter(o => o.ma_thau_phu === link.ma);
      const chiHo = list.length
        ? await sbFetch(
            `chi_ho?van_don_id=in.(${list.map(o => o.id).join(',')})&select=van_don_id,tien_tra_thau,tien_tra_laixe`,
            serviceKey
          )
        : [];
      const chMap = {};
      chiHo.forEach(r => {
        if (!chMap[r.van_don_id]) chMap[r.van_don_id] = { traThau: 0, traLX: 0 };
        chMap[r.van_don_id].traThau += (+r.tien_tra_thau || 0);
        chMap[r.van_don_id].traLX += (+r.tien_tra_laixe || 0);
      });
      const rows = list.map(o => {
        const ch0 = chMap[o.id] || { traThau: 0, traLX: 0 };
        const traDL = +o.tra_thau_doi_lenh || 0;
        const cuocThau = +o.gia_cuoc_thau || 0;
        const traLX = o.loai_phan_loai_xe === 'thau_thue_lai' ? ch0.traLX : 0;
        const tong = cuocThau + ch0.traThau + traDL - traLX;
        return {
          ngay: o.ngay, ma_don: o.ma_don, hanh_trinh: `${o.diem_lay || ''} → ${o.diem_tra || ''}`,
          so_cont: o.so_cont, loai_cont: o.loai_cont, loai_chuyen: o.loai_chuyen, bien_kiem_soat: o.bien_kiem_soat,
          gia_cuoc_thau: cuocThau, tra_them: ch0.traThau, doi_lenh: traDL, tru_luong_lx: traLX, tong,
        };
      });
      return res.status(200).json({
        loai: 'thau', ten: link.ten_hien_thi || link.ma,
        tong: rows.reduce((s, r) => s + r.tong, 0), rows,
      });
    }

    // loai === 'laixe' — port nguyên logic loadBangLuong(): lọc theo tên chuẩn hóa,
    // chỉ tính chuyến noi_bo/thau_thue_lai, cộng chi_ho.tien_tra_laixe
    const chLuong = await sbFetch(`cau_hinh_luong?id=eq.1&select=bang_gia_tinh`, serviceKey).catch(() => []);
    const bangGia = (chLuong && chLuong[0] && chLuong[0].bang_gia_tinh) || {};

    const tenChuan = chuanHoaTen(link.ma);
    const list = orders.filter(o =>
      chuanHoaTen(o.ten_lai_xe) === tenChuan &&
      ['noi_bo', 'thau_thue_lai'].includes(o.loai_phan_loai_xe)
    );
    const chiHo = list.length
      ? await sbFetch(`chi_ho?van_don_id=in.(${list.map(o => o.id).join(',')})&select=van_don_id,tien_tra_laixe`, serviceKey)
      : [];
    const chMap = {};
    chiHo.forEach(r => { chMap[r.van_don_id] = (chMap[r.van_don_id] || 0) + (+r.tien_tra_laixe || 0); });

    // Cần bảng điểm để tra dia_phuong của điểm trả — tinhLuongChuyen() (từ luong-calc.js) tự tách tỉnh
    const diaDiem = await sbFetch(`dia_diem?select=ten_chuan,dia_phuong`, serviceKey).catch(() => []);
    const diaPhuongCuaDiem = ten => (diaDiem.find(d => d.ten_chuan === ten) || {}).dia_phuong || null;

    const rows = list.map(o => {
      const traLX = chMap[o.id] || 0;
      const { khongTrucking, luongChuyen } = tinhLuongChuyen(o, diaPhuongCuaDiem(o.diem_tra), bangGia);
      const lc = luongChuyen || 0;
      return {
        ngay: o.ngay, ma_don: o.ma_don, bien_kiem_soat: o.bien_kiem_soat,
        hanh_trinh: `${o.diem_lay || ''} → ${o.diem_tra || ''}`, loai_chuyen: o.loai_chuyen,
        khong_trucking: khongTrucking, luong_chuyen: lc, tra_lx: traLX, tong: lc + traLX,
      };
    });

    return res.status(200).json({
      loai: 'laixe', ten: link.ten_hien_thi || link.ma,
      tong: rows.reduce((s, r) => s + r.tong, 0), rows,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

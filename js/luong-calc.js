// LUONG-CALC.JS — Công thức tính lương chuyến lái xe, DÙNG CHUNG cho:
//   1) Web app (load qua <script> tag bình thường, KHÔNG dùng type="module" — gắn hàm vào window)
//   2) API /api/xembang.js (Vercel serverless, load qua require())
// ⚠️ ĐÂY LÀ NGUỒN DUY NHẤT của công thức lương chuyến — sửa công thức thì CHỈ sửa ở đây,
//    không copy/viết lại ở nơi khác, để web app và link xem cho lái xe luôn ra cùng 1 số.
// Không phụ thuộc DOM/window/Supabase — chỉ là hàm tính toán thuần (pure function).

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(); // Node / Vercel serverless (require)
  } else {
    Object.assign(root, factory()); // Browser — gắn thẳng vào window (giống các hàm global khác trong config.js)
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {

  // Chuẩn hóa tên người (lái xe...) để so khớp — y hệt bản trong config.js
  function chuanHoaTen(s) {
    return (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  // Tách tên tỉnh từ dia_phuong (phần cuối sau dấu phẩy, viết hoa chữ đầu) — y hệt config.js
  function tinhTuDiaPhuong(dp) {
    if (!dp) return null;
    const parts = dp.split(',').map(s => s.trim()).filter(Boolean);
    const raw = parts.length ? parts[parts.length - 1] : null;
    if (!raw) return null;
    return raw.toLowerCase().replace(/(^|[\s-])\p{L}/gu, c => c.toUpperCase());
  }

  // Tính lương 1 chuyến — y hệt logic trong loadBangLuong() (pages.js)
  // o: {diem_tra, diem_tra_phat_sinh, loai_chuyen}
  // ddTraDiaPhuong: giá trị dia_phuong của điểm trả (lấy từ DD.find(d=>d.ten_chuan===o.diem_tra)?.dia_phuong)
  // bangGiaTinh: CH_LUONG.bang_gia_tinh — {[tinh]:{thuong, ket_hop}}
  // Trả về: {khongTrucking, tinh, luongChuyen} — luongChuyen=null nghĩa là "chưa có giá" (khác 0đ thực)
  function tinhLuongChuyen(o, ddTraDiaPhuong, bangGiaTinh) {
    const khongTrucking = /kh[oô]ng\s*trucking/i.test((o.diem_tra || '') + ' ' + (o.diem_tra_phat_sinh || ''));
    if (khongTrucking) return { khongTrucking: true, tinh: null, luongChuyen: 0 };
    const tinh = tinhTuDiaPhuong(ddTraDiaPhuong);
    const g = tinh ? (bangGiaTinh || {})[tinh] : null;
    const laKetHop = o.loai_chuyen === 'Kết hợp' || o.loai_chuyen === 'Kẹp ghép';
    const luongChuyen = g ? (laKetHop ? (+g.ket_hop || 0) : (+g.thuong || 0)) : null;
    return { khongTrucking: false, tinh, luongChuyen };
  }

  return { chuanHoaTen, tinhTuDiaPhuong, tinhLuongChuyen };
});

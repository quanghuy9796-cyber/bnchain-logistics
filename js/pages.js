// PAGES.JS — Điều vận, Bảng kê, Báo cáo, Trả thầu, Công nợ
// Requires: config.js, orders.js
// fmtDate() được khai báo trong orders.js (load trước)

async function pgDieuVan(c){
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const isNV=CU?.vai_tro==='nhan_vien';
  const canM=canSee(['ke_toan','ceo']);

  // Query 1: đơn chưa hoàn thành (tất cả role)
  let q1=db.from('van_don').select('id,ma_don,ngay,trang_thai,ten_khach,loai_hang,so_bill,so_booking,so_cont,loai_cont,bien_kiem_soat,ten_lai_xe,hanh_trinh,ngay_yeu_cau,created_by,locked,gia_cuoc_khach')
    .in('trang_thai',['Chờ xếp xe','Đang vận chuyển','Chờ xác nhận'])
    .order('ngay_yeu_cau',{ascending:true})
    .order('ngay',{ascending:true});
  if(isNV) q1=q1.eq('created_by',CU.id);

  // Query 2: đơn đã khóa nhưng chưa nhập cước (chỉ KT/CEO)
  let q2Promise=null;
  if(canM){
    q2Promise=db.from('van_don').select('id,ma_don,ngay,ten_khach,loai_hang,so_cont,bien_kiem_soat,ten_lai_xe,hanh_trinh,gia_cuoc_khach')
      .eq('locked',true).eq('gia_cuoc_khach',0)
      .neq('diem_tra','KHÔNG TRUCKING')
      .order('ngay',{ascending:false}).limit(100);
  }

  const [{data:d1}, q2res]=await Promise.all([q1, q2Promise||Promise.resolve({data:[]})]);
  const list=d1||[];
  const chuaCuoc=(q2res?.data||[]);

  const cho=list.filter(o=>o.trang_thai==='Chờ xếp xe');
  const chay=list.filter(o=>o.trang_thai==='Đang vận chuyển'||o.trang_thai==='Chờ xác nhận');

  const colXe=`<colgroup>
    <col style="width:130px"><col style="width:70px"><col style="width:50px">
    <col style="width:100px"><col style="width:100px"><col style="width:80px">
    <col style="width:90px"><col style="width:105px"><col style="width:110px">
  </colgroup>`;

  c.innerHTML=`
  <div class="stats-row stats-${canM?'3':'2'}" style="margin-bottom:14px">
    <div class="stat-card">
      <div class="stat-icon" style="background:#fef3c7;color:var(--warning)"><i class="ti ti-clock"></i></div>
      <div class="stat-lbl">Chờ xếp xe</div>
      <div class="stat-val text-orange">${cho.length}</div>
      <div class="stat-sub">cần phân công xe</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#dbeafe;color:#2563eb"><i class="ti ti-truck"></i></div>
      <div class="stat-lbl">Đang vận chuyển</div>
      <div class="stat-val" style="color:#2563eb">${chay.length}</div>
      <div class="stat-sub">xe đang chạy</div>
    </div>
    ${canM?`<div class="stat-card">
      <div class="stat-icon" style="background:#fff3e6;color:var(--primary)"><i class="ti ti-coins"></i></div>
      <div class="stat-lbl">Chưa nhập cước</div>
      <div class="stat-val text-orange">${chuaCuoc.length}</div>
      <div class="stat-sub">đã khóa, chờ kế toán</div>
    </div>`:''}
  </div>

  ${cho.length?`
  <div style="font-size:12px;font-weight:600;color:var(--warning);margin:0 0 8px;display:flex;align-items:center;gap:5px">
    <i class="ti ti-clock"></i> CHỜ XẾP XE (${cho.length})
  </div>
  <div class="tbl-wrap" style="margin-bottom:18px"><table class="tbl">
    <colgroup>
      <col style="width:130px"><col style="width:70px"><col style="width:50px">
      <col style="width:100px"><col style="width:150px"><col style="width:110px"><col style="width:110px">
    </colgroup>
    <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Loại</th><th>Bill/Booking</th><th>Khách — Hành trình</th><th>Yêu cầu giao</th><th>Thao tác</th></tr></thead>
    <tbody>${cho.map(o=>`<tr>
      <td style="color:var(--teal);font-weight:600">${o.ma_don}</td>
      <td>${fmtDate(o.ngay)}</td>
      <td>${loaiTag(o.loai_hang)}</td>
      <td style="color:var(--primary);font-weight:500">${o.so_bill||o.so_booking||'—'}</td>
      <td><div style="font-weight:500">${o.ten_khach}</div><div style="font-size:11px;color:var(--text-muted)">${o.hanh_trinh||'—'}</div></td>
      <td>${o.ngay_yeu_cau?`<span style="color:var(--danger);font-weight:500">${fmtDate(o.ngay_yeu_cau)}</span>`:'—'}</td>
      <td><button class="btn btn-sm btn-primary" onclick="openDetail('${o.id}','xe')"><i class="ti ti-truck"></i> Xếp xe</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`:''}

  ${chay.length?`
  <div style="font-size:12px;font-weight:600;color:#2563eb;margin:0 0 8px;display:flex;align-items:center;gap:5px">
    <i class="ti ti-truck"></i> ĐANG VẬN CHUYỂN (${chay.length})
  </div>
  <div class="tbl-wrap" style="margin-bottom:18px"><table class="tbl">
    ${colXe}
    <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Loại</th><th>Cont</th><th>Khách hàng</th><th>Biển số</th><th>Lái xe</th><th>Hành trình</th><th>Thao tác</th></tr></thead>
    <tbody>${chay.map(o=>`<tr>
      <td style="color:var(--teal);font-weight:600">${o.ma_don}</td>
      <td>${fmtDate(o.ngay)}</td>
      <td>${loaiTag(o.loai_hang)}</td>
      <td style="font-family:monospace;font-size:11px">${o.so_cont||'—'}</td>
      <td>${o.ten_khach}</td>
      <td style="font-weight:600">${o.bien_kiem_soat||'—'}</td>
      <td>${o.ten_lai_xe||'—'}</td>
      <td style="font-size:11px;color:var(--text-muted)" title="${o.hanh_trinh||''}">${o.hanh_trinh||'—'}</td>
      <td><button class="btn btn-sm btn-teal" onclick="openDetail('${o.id}','xe')"><i class="ti ti-lock"></i> Hoàn thành</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`:''}

  ${canM&&chuaCuoc.length?`
  <div style="font-size:12px;font-weight:600;color:var(--primary);margin:0 0 8px;display:flex;align-items:center;gap:5px">
    <i class="ti ti-coins"></i> ĐÃ KHÓA — CHƯA NHẬP CƯỚC (${chuaCuoc.length})
  </div>
  <div class="tbl-wrap"><table class="tbl">
    ${colXe}
    <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Loại</th><th>Cont</th><th>Khách hàng</th><th>Biển số</th><th>Lái xe</th><th>Hành trình</th><th>Thao tác</th></tr></thead>
    <tbody>${chuaCuoc.map(o=>`<tr>
      <td style="color:var(--teal);font-weight:600">${o.ma_don}</td>
      <td>${fmtDate(o.ngay)}</td>
      <td>${loaiTag(o.loai_hang)}</td>
      <td style="font-family:monospace;font-size:11px">${o.so_cont||'—'}</td>
      <td>${o.ten_khach}</td>
      <td style="font-weight:600">${o.bien_kiem_soat||'—'}</td>
      <td>${o.ten_lai_xe||'—'}</td>
      <td style="font-size:11px;color:var(--text-muted)" title="${o.hanh_trinh||''}">${o.hanh_trinh||'—'}</td>
      <td><button class="btn btn-sm btn-primary" onclick="openDetail('${o.id}','cuoc')"><i class="ti ti-coins"></i> Nhập cước</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`:''}

  ${!cho.length&&!chay.length&&!chuaCuoc.length?'<div class="empty"><i class="ti ti-checks"></i>Tất cả đơn đã hoàn thành và có cước</div>':''}`;
}

// ==================== CHI HO ====================
async function pgChiHo(c){
  if(!canSee(['quan_ly','ke_toan','ceo'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền xem</div>';return;}
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const{data}=await db.from('chi_ho').select('*').eq('la_tham_chieu',false).order('ngay_chi',{ascending:false}).limit(300);
  const list=data||[];
  const total=list.reduce((s,o)=>s+(+o.so_tien||0),0);
  const hdkh=list.filter(o=>o.hoa_don_khach).reduce((s,o)=>s+(+o.so_tien||0),0);
  const khongHD=list.filter(o=>!o.hoa_don_khach).reduce((s,o)=>s+(+o.so_tien||0),0);
  c.innerHTML=`
  <div class="stats-row stats-4">
    <div class="stat-card"><div class="stat-lbl">Tổng chi hộ</div><div class="stat-val text-red">${fmt(Math.round(total/1e6))}tr</div></div>
    <div class="stat-card"><div class="stat-lbl">HĐ theo MST khách</div><div class="stat-val text-orange">${fmt(Math.round(hdkh/1e6))}tr</div></div>
    <div class="stat-card"><div class="stat-lbl">Không có HĐ</div><div class="stat-val text-blue">${fmt(Math.round(khongHD/1e6))}tr</div></div>
    <div class="stat-card"><div class="stat-lbl">Số khoản</div><div class="stat-val">${list.length}</div></div>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <colgroup><col style="width:130px"><col style="width:85px"><col style="width:140px"><col style="width:90px"><col style="width:100px"><col style="width:90px"><col style="width:70px"><col style="width:150px"></colgroup>
    <thead><tr><th>Mã đơn</th><th>Ngày chi</th><th>Loại chi</th><th>Số tiền</th><th>Người chi</th><th>Chứng từ</th><th>HĐ KH</th><th>Ghi chú</th></tr></thead>
    <tbody>
    ${list.length===0?`<tr><td colspan="8"><div class="empty"><i class="ti ti-inbox"></i>Chưa có dữ liệu</div></td></tr>`:''}
    ${list.map(o=>`<tr onclick="openDetail('${o.van_don_id}')" style="cursor:pointer">
      <td style="color:var(--teal);font-weight:500">${o.ma_don||'—'}</td>
      <td>${o.ngay_chi}</td><td>${o.loai_chi}</td>
      <td class="text-orange fw6">${fmtM(o.so_tien)}</td>
      <td>${o.nguoi_chi||'—'}</td><td>${o.chung_tu||'—'}</td>
      <td>${o.hoa_don_khach?'<span class="tag" style="background:#e0f2fe;color:#0369a1;font-size:10px">Có</span>':'—'}</td>
      <td style="font-size:11px">${o.ghi_chu||'—'}</td>
    </tr>`).join('')}
    </tbody>
  </table></div>`;
}

// ==================== CÔNG NỢ ====================
async function pgCongNo(c){
  if(!canSee(['ke_toan','ceo'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Chỉ Kế toán và CEO có quyền xem</div>';return;}
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const{data}=await db.from('van_don').select('id,ma_don,ngay,ten_khach,loai_hang,so_cont,so_bill,so_booking,gia_cuoc_khach,trang_thai,locked,hanh_trinh').eq('locked',true).order('ngay',{ascending:false}).limit(1000);
  const list=data||[];
  const chuaThu=list.filter(o=>o.thanh_toan_khach!=='Đã thu');
  const chuaTra=list.filter(o=>o.thanh_toan_thau!=='Đã trả'&&(+o.gia_cuoc_thau||0)>0);
  const tongPThu=chuaThu.reduce((s,o)=>s+(+o.gia_cuoc_khach||0),0);
  const tongPTra=chuaTra.reduce((s,o)=>s+(+o.gia_cuoc_thau||0),0);
  c.innerHTML=`
  <div class="stats-row stats-4">
    <div class="stat-card"><div class="stat-lbl">Phải thu khách</div><div class="stat-val text-blue">${fmt(Math.round(tongPThu/1e6))}tr</div><div class="stat-sub">${chuaThu.length} đơn</div></div>
    <div class="stat-card"><div class="stat-lbl">Phải trả thầu</div><div class="stat-val text-red">${fmt(Math.round(tongPTra/1e6))}tr</div><div class="stat-sub">${chuaTra.length} đơn</div></div>
    <div class="stat-card"><div class="stat-lbl">Đã thu</div><div class="stat-val text-green">${fmt(Math.round(list.filter(o=>o.thanh_toan_khach==='Đã thu').reduce((s,o)=>s+(+o.gia_cuoc_khach||0),0)/1e6))}tr</div></div>
    <div class="stat-card"><div class="stat-lbl">Đã trả thầu</div><div class="stat-val text-green">${fmt(Math.round(list.filter(o=>o.thanh_toan_thau==='Đã trả').reduce((s,o)=>s+(+o.gia_cuoc_thau||0),0)/1e6))}tr</div></div>
  </div>
  <h4 style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px">PHẢI THU TỪ KHÁCH</h4>
  <div class="tbl-wrap" style="margin-bottom:14px"><table class="tbl">
    <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Bill/Booking</th><th>Khách</th><th>Hành trình</th><th>Cước</th><th>Trạng thái</th></tr></thead>
    <tbody>${chuaThu.map(o=>`<tr onclick="openDetail('${o.id}')">
      <td style="color:var(--teal);font-weight:600">${o.ma_don}</td><td>${o.ngay}</td>
      <td style="color:var(--primary)">${o.so_bill||o.so_booking||'—'}</td>
      <td>${o.ten_khach}</td><td>${o.hanh_trinh||'—'}</td>
      <td class="text-blue fw6">${fmtM(o.gia_cuoc_khach)}</td>
      <td>${thuTag(o.thanh_toan_khach)}</td>
    </tr>`).join('')}</tbody>
  </table></div>
  <h4 style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px">PHẢI TRẢ THẦU PHỤ</h4>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Thầu phụ</th><th>Lái xe</th><th>Cước thầu</th><th>Trạng thái</th></tr></thead>
    <tbody>${chuaTra.map(o=>`<tr>
      <td style="color:var(--teal);font-weight:600">${o.ma_don}</td><td>${o.ngay}</td>
      <td>${o.ma_thau_phu||'—'}</td><td>${o.ten_lai_xe||'—'}</td>
      <td class="text-red fw6">${fmtM(o.gia_cuoc_thau)}</td>
      <td>${thuTag(o.thanh_toan_thau)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

// ==================== BẢNG KÊ ====================
async function pgBangKe(c){
  if(!canSee(['ke_toan','ceo'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
  if(!KH||!KH.length){
    const{data}=await db.from('khach_hang').select('*').eq('active',true).order('ten_cong_ty',{ascending:true});
    KH=data||[];
  }
  const now=new Date();
  const curY=now.getFullYear();
  const thOpts=Array.from({length:6},(_,i)=>{
    const d=new Date(curY,now.getMonth()-i,1);
    const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return`<option value="${v}" ${i===0?'selected':''}>Tháng ${d.getMonth()+1}/${d.getFullYear()}</option>`;
  }).join('');
  const khopts=KH.map(k=>`<option value="${k.id}|${k.ten_cong_ty}">${k.ten_cong_ty}</option>`).join('');

  c.innerHTML=`
  <div class="toolbar" style="margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <select id="bk-kh" class="filter-sel" style="min-width:200px">
      <option value="">-- Chọn khách hàng --</option>${khopts}
    </select>
    <select id="bk-thang" class="filter-sel">${thOpts}</select>
    <button class="btn btn-teal" onclick="loadBangKe()"><i class="ti ti-search"></i> Xem bảng kê</button>
    <button class="btn btn-primary" onclick="xuatExcelBangKe()" id="btn-xuat-excel" style="display:none"><i class="ti ti-file-spreadsheet"></i> Xuất Excel</button>
    <button class="btn" onclick="window.print()" id="btn-in" style="display:none"><i class="ti ti-printer"></i> In</button>
  </div>
  <div id="bk-canhbao"></div>
  <div id="bk-result" style="color:var(--text-muted);font-size:13px;padding:10px 0">
    Chọn khách hàng và tháng để xem bảng kê.
  </div>`;
}

async function loadBangKe(){
  const khVal=document.getElementById('bk-kh').value;
  const thang=document.getElementById('bk-thang').value;
  if(!khVal){toast('Vui lòng chọn khách hàng','error');return;}
  const[khId,khName]=khVal.includes('|')?khVal.split('|',2):[null,khVal];
  const[y,m]=thang.split('-');
  const res=document.getElementById('bk-result');
  const canhbao=document.getElementById('bk-canhbao');
  res.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  canhbao.innerHTML='';

  const lastDay=new Date(parseInt(y),parseInt(m),0).getDate(); // ngày cuối tháng đúng
  const dateFrom=`${y}-${m.padStart(2,'0')}-01`;
  const dateTo=`${y}-${m.padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

  // DEBUG
  const{data:debugOrders}=await db.from('van_don').select('id,ma_don,locked,trang_thai,ten_khach,ngay')
    .ilike('ten_khach',khName.trim())
    .gte('ngay',dateFrom).lte('ngay',dateTo);
  console.log(`[BK DEBUG] Tổng đơn khách "${khName}" tháng ${thang} (chưa filter locked):`, debugOrders?.length||0);
  if(debugOrders?.length) console.log('[BK DEBUG] Sample locked values:', debugOrders.slice(0,3).map(o=>({ma_don:o.ma_don,locked:o.locked,type:typeof o.locked,trang_thai:o.trang_thai})));

  // Load đơn: tất cả đơn locked=true của khách trong tháng theo ngày chạy
  const{data:orders}=await db.from('van_don').select('*')
    .ilike('ten_khach',khName.trim()).eq('locked',true)
    .gte('ngay',dateFrom).lte('ngay',dateTo)
    .order('ngay',{ascending:true}).order('so_bill',{ascending:true});
  console.log(`[BK DEBUG] Sau filter locked=true:`, orders?.length||0);

  const list=orders||[];
  if(!list.length){
    res.innerHTML='<div class="empty"><i class="ti ti-inbox"></i>Không có đơn nào trong kỳ này</div>';
    return;
  }

  // Cảnh báo chuyến chưa chốt trong tháng
  const{data:chuaChot}=await db.from('van_don').select('id,ma_don,so_cont,ngay')
    .eq('ten_khach',khName).eq('locked',true)
    .eq('trang_thai_bang_ke','chua_chot')
    .gte('ngay',dateFrom).lte('ngay',dateTo);
  if(chuaChot?.length){
    canhbao.innerHTML=`<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:var(--r);padding:8px 14px;margin-bottom:10px;font-size:12px;display:flex;align-items:center;gap:8px">
      <i class="ti ti-alert-triangle" style="color:#d97706;font-size:16px"></i>
      <span><strong style="color:#92400e">${chuaChot.length} chuyến chưa vào bảng kê</strong> trong tháng ${m}/${y} — 
      ${chuaChot.slice(0,3).map(o=>`<span style="background:#fef9c3;border-radius:3px;padding:1px 4px">${o.ma_don}</span>`).join(' ')}
      ${chuaChot.length>3?`và ${chuaChot.length-3} chuyến khác`:''}</span>
    </div>`;
  }

  // Load chi_ho
  const ids=list.map(o=>o.id);
  const{data:chiHoAll}=await db.from('chi_ho').select('*').in('van_don_id',ids).eq('la_tham_chieu',false).order('ngay_chi',{ascending:true});
  const chiHoMap={};
  (chiHoAll||[]).forEach(ch=>{
    if(!chiHoMap[ch.van_don_id])chiHoMap[ch.van_don_id]=[];
    chiHoMap[ch.van_don_id].push(ch);
  });

  // Tách P1 / P2
  const chiHoP2=(chiHoAll||[]).filter(c=>c.hoa_don_khach);
  const chiHoP1=(chiHoAll||[]).filter(c=>!c.hoa_don_khach);

  // Tách chuyến chuyển kỳ
  const chuyenChuyenKy=list.filter(o=>o.ky_goc&&o.ky_goc!==thang);
  const listChinh=list.filter(o=>!o.ky_goc||o.ky_goc===thang);

  // Tính tổng
  const tongCuoc=list.reduce((s,o)=>s+(+o.gia_cuoc_khach||0),0);
  const tongDV=list.reduce((s,o)=>s+(+o.phi_doi_lenh||0)+(+o.phi_to_khai||0),0);
  const tongP1=chiHoP1.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
  const tongP2=chiHoP2.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
  const VAT_RATE=0.08;
  const tongTruocVAT=tongCuoc+tongDV+tongP1;
  const vatP1=Math.round(tongTruocVAT*VAT_RATE);
  const tongPhaiThu=tongTruocVAT+vatP1+tongP2;
  // Flags ẩn/hiện cột động
  const coTK=list.some(o=>+o.phi_to_khai>0);
  const coLachHuyenCH=chiHoP1.some(c=>c.loai_chi?.includes('Lạch Huyện'));

  // Gom theo bill/booking
  const groups={};
  list.forEach(o=>{
    const key=o.so_bill||o.so_booking||o.ma_don;
    if(!groups[key])groups[key]=[];
    groups[key].push(o);
  });

  const loaiTag2=o=>{
    if(o.loai_hang==='Xuất') return'<span style="background:#dcfce7;color:#166534;border-radius:4px;padding:1px 6px;font-size:10px">Xuất</span>';
    if(o.loai_hang==='Nhập') return'<span style="background:#dbeafe;color:#1e40af;border-radius:4px;padding:1px 6px;font-size:10px">Nhập</span>';
    return'<span style="background:#f3f4f6;color:#374151;border-radius:4px;padding:1px 6px;font-size:10px">Chuyển kho</span>';
  };

  // PHẦN 1 — build rows
  const chiHoTypes=[...new Set(chiHoP1.map(c=>c.loai_chi))];
  let p1Rows='';
  let stt=0;
  Object.entries(groups).forEach(([bill,items])=>{
    stt++;
    items.forEach((o,i)=>{
      const ch=chiHoMap[o.id]||[];
      const chP1=ch.filter(c=>!c.hoa_don_khach);
      const phiDV=(+o.phi_doi_lenh||0)+(+o.phi_to_khai||0);
      const tongDong=(+o.gia_cuoc_khach||0)+chP1.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0)+phiDV;
      const kyGocNote=o.ky_goc&&o.ky_goc!==thang?`<span style="background:#fef3c7;color:#92400e;border-radius:3px;padding:0 4px;font-size:10px;margin-left:3px">Từ ${o.ky_goc.split('-')[1]}/${o.ky_goc.split('-')[0]}</span>`:'';
      p1Rows+=`<tr>
        <td>${stt}${items.length>1?'.'+( i+1):''}</td>
        <td style="font-size:11px">${fmtDate(o.ngay)}</td>
        <td style="color:var(--teal);font-size:11px;font-weight:600">${o.ma_don}${kyGocNote}</td>
        <td>${loaiTag2(o)}</td>
        <td style="font-weight:500;font-family:monospace;font-size:11px">${o.so_cont||'—'}</td>
        <td style="font-size:11px">${o.loai_cont||'—'}</td>
        <td style="font-size:10px" title="${o.hanh_trinh||''}">${o.diem_lay||''}${o.diem_tra?' → '+o.diem_tra:''}</td>
        <td style="font-size:11px">${o.bien_kiem_soat||'—'}</td>
        <td class="text-blue fw6">${fmt(o.gia_cuoc_khach)}</td>
        <td style="font-size:11px">${o.phi_doi_lenh>0?fmt(o.phi_doi_lenh):'—'}</td>
        ${coTK?`<td style="font-size:11px">${o.phi_to_khai>0?fmt(o.phi_to_khai):'—'}</td>`:''}
        ${chiHoTypes.map(type=>{
          const v=chP1.filter(c=>c.loai_chi===type).reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
          return`<td style="font-size:11px">${v>0?fmt(v):'—'}</td>`;
        }).join('')}
        <td style="font-weight:600;background:#f0f9f0">${fmt(tongDong)}</td>
        <td style="font-size:10px;color:var(--text-muted)">${o.ghi_chu||''}</td>
      </tr>`;
    });
    if(items.length>1){
      const subTotal=items.reduce((tot,o)=>{
        const ch=(chiHoMap[o.id]||[]).filter(c=>!c.hoa_don_khach);
        return tot+(+o.gia_cuoc_khach||0)+ch.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0)+(+o.phi_doi_lenh||0)+(+o.phi_to_khai||0);
      },0);
      const subCuoc=items.reduce((s,o)=>s+(+o.gia_cuoc_khach||0),0);
      p1Rows+=`<tr style="background:#f5f9fb;font-style:italic;font-size:11px">
        <td colspan="8" style="color:var(--text-muted)">Cộng ${items[0].loai_hang==='Nhập'?'Bill':'Booking'}: ${bill}</td>
        <td class="fw6">${fmt(subCuoc)}</td>
        <td></td><td></td>
        <td colspan="${chiHoTypes.length}"></td>
        <td style="font-weight:700;color:var(--teal)">${fmt(subTotal)}</td>
        <td></td>
      </tr>`;
    }
  });

  // PHẦN 2 — gom theo số cont, mỗi cont 1 dòng
  // Group chi hộ P2 theo van_don_id
  const p2ByCont={};
  chiHoP2.forEach(c=>{
    const o=list.find(x=>x.id===c.van_don_id);
    const key=o?.so_cont||c.ma_don||c.van_don_id;
    if(!p2ByCont[key])p2ByCont[key]={cont:key,items:[]};
    p2ByCont[key].items.push(c);
  });
  let p2Rows='';
  Object.entries(p2ByCont).forEach(([cont,{items}],i)=>{
    const csht=items.find(c=>c.loai_chi?.includes('CSHT')||c.loai_chi?.includes('Hạ tầng')||c.loai_chi?.includes('Phí CSHT'));
    // Gộp tất cả nâng/hạ cont vào 1 nhóm (cột 1 nâng/hạ)
    const nangHa=items.filter(c=>c!==csht&&(
      c.loai_chi?.includes('Nâng/hạ')||c.loai_chi?.includes('Nâng hàng')||c.loai_chi?.includes('Nâng vỏ')||
      c.loai_chi?.includes('Hạ hàng')||c.loai_chi?.includes('Hạ vỏ')||
      c.loai_chi?.includes('Nâng, hạ')||c.loai_chi?.includes('Nâng hạ')
    ));
    const khac=items.filter(c=>c!==csht&&!nangHa.includes(c));
    const tongCont=items.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
    const khacTien=khac.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
    const nangHaTien=nangHa.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
    const nangHaHD=nangHa.map(c=>c.chung_tu||'').filter(Boolean).join(', ');
    p2Rows+=`<tr>
      <td>${i+1}</td>
      <td style="font-weight:600;font-family:monospace;font-size:11px">${cont}</td>
      <td style="font-size:11px">${csht?fmt(csht.tien_thu_khach||csht.so_tien):'—'}</td>
      <td style="font-size:10px;color:var(--primary)">${csht?.chung_tu||''}</td>
      <td style="font-size:11px">${nangHaTien>0?fmt(nangHaTien):'—'}</td>
      <td style="font-size:10px;color:var(--primary)">${nangHaHD}</td>
      <td style="font-size:11px">—</td>
      <td style="font-size:10px;color:var(--primary)"></td>
      <td style="font-size:11px">${khacTien>0?fmt(khacTien):'—'}</td>
      <td style="font-size:10px;color:var(--text-muted)">${khac.map(c=>c.chung_tu||c.loai_chi).filter(Boolean).join(', ')}</td>
      <td class="text-orange fw6">${fmtM(tongCont)}</td>
    </tr>`;
  });

  // CHUYỂN KỲ — sheet phụ
  let chuyenKySection='';
  if(chuyenChuyenKy.length){
    chuyenKySection=`
    <div style="margin-top:20px">
      <div style="background:#f59e0b;color:#fff;padding:8px 12px;border-radius:var(--r) var(--r) 0 0;font-size:12px;font-weight:600">
        <i class="ti ti-arrow-right-circle"></i> CHUYẾN CHUYỂN KỲ (${chuyenChuyenKy.length})
        <span style="font-weight:400;opacity:.8;margin-left:8px">— Các chuyến từ kỳ trước chuyển sang tháng ${m}/${y}</span>
      </div>
      <div class="tbl-wrap" style="border-radius:0 0 var(--r) var(--r)">
      <table class="tbl">
        <thead><tr><th>Mã đơn</th><th>Ngày chạy</th><th>Số cont</th><th>Hành trình</th><th>Kỳ gốc</th><th>Lý do chuyển</th></tr></thead>
        <tbody>${chuyenChuyenKy.map(o=>`<tr>
          <td style="color:var(--teal);font-weight:600">${o.ma_don}</td>
          <td>${o.ngay}</td>
          <td style="font-family:monospace">${o.so_cont||'—'}</td>
          <td style="font-size:11px">${o.hanh_trinh||'—'}</td>
          <td><span style="background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 6px;font-size:11px">T${o.ky_goc?.split('-')[1]}/${o.ky_goc?.split('-')[0]}</span></td>
          <td style="font-size:11px;color:var(--text-muted)">${o.ly_do_chuyen_ky||'—'}</td>
        </tr>`).join('')}</tbody>
      </table>
      </div>
    </div>`;
  }

  // Lưu data vào window để xuất Excel
  window.BK_DATA={list,chiHoAll:chiHoAll||[],groups,chiHoTypes,chiHoP1,chiHoP2,chuyenChuyenKy,khName,thang,m,y,tongCuoc,tongDV,tongP1,tongP2,tongTruocVAT,vatP1,tongPhaiThu,coTK,coLachHuyenCH};

  // Build HTML
  const colP1=`<col style="width:28px"><col style="width:76px"><col style="width:100px"><col style="width:48px"><col style="width:90px"><col style="width:52px"><col style="width:140px"><col style="width:68px"><col style="width:78px"><col style="width:68px">${coTK?'<col style="width:68px">':''}${chiHoTypes.map(()=>'<col style="width:72px">').join('')}<col style="width:80px"><col style="width:100px">`;

  const html=`
  <div id="print-area">
  <!-- HEADER -->
  <div style="text-align:center;margin-bottom:16px">
    <div style="font-size:15px;font-weight:700;color:var(--teal)">CÔNG TY CỔ PHẦN BN CHAIN</div>
    <div style="font-size:11px;color:var(--text-muted)">215 Đường Nguyễn Phong Sắc, Phương Liễu, Bắc Ninh | MST: 2301342748</div>
    <div style="font-size:14px;font-weight:700;margin-top:8px;text-transform:uppercase">BẢNG KÊ KIÊM BIÊN BẢN XÁC NHẬN KHỐI LƯỢNG DỊCH VỤ</div>
    <div style="font-size:13px;font-weight:600">THÁNG ${m}/${y}</div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Khách hàng: <strong>${khName}</strong> | ${list.length} chuyến</div>
  </div>

  <!-- PHẦN 1 -->
  <div style="margin-bottom:16px">
    <div style="background:var(--teal);color:#fff;padding:8px 12px;border-radius:var(--r) var(--r) 0 0;font-size:12px;font-weight:600;display:flex;justify-content:space-between">
      <span><i class="ti ti-truck"></i> PHẦN 1: CƯỚC VẬN CHUYỂN & PHÍ PHÁT SINH</span>
      <span>${fmtM(tongCuoc+tongDV+tongP1)}</span>
    </div>
    <div class="tbl-wrap" style="border-radius:0 0 var(--r) var(--r)">
    <table class="tbl">
      <colgroup>${colP1}</colgroup>
      <thead>
        <tr>
          <th>STT</th><th>Ngày</th><th>Mã đơn</th><th>Loại</th>
          <th>Số cont</th><th>Loại cont</th><th>Tuyến đường</th><th>BKS</th>
          <th>Cước</th><th>Đổi lệnh</th>${coTK?'<th>Tờ khai</th>':''}
          ${chiHoTypes.map(t=>`<th style="font-size:10px">${t}</th>`).join('')}
          <th style="background:#f0f9f0">Tổng</th><th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>${p1Rows}
        <tr style="background:#e8f4f7;font-weight:700;font-size:12px">
          <td colspan="8">CỘNG PHẦN 1</td>
          <td class="text-blue">${fmt(tongCuoc)}</td>
          <td>${fmt(list.reduce((s,o)=>s+(+o.phi_doi_lenh||0),0))}</td>
          ${coTK?`<td>${fmt(list.reduce((s,o)=>s+(+o.phi_to_khai||0),0))}</td>`:''}
          ${chiHoTypes.map(type=>{
            const s=chiHoP1.filter(c=>c.loai_chi===type).reduce((a,c)=>a+(+(c.tien_thu_khach||c.so_tien)||0),0);
            return`<td>${fmt(s)}</td>`;
          }).join('')}
          <td style="color:var(--teal)">${fmtM(tongCuoc+tongDV+tongP1)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>

  <!-- PHẦN 2 — gộp vào bảng chính theo từng cont, giống file mẫu -->
  ${chiHoP2.length?`
  <div style="margin-bottom:16px">
    <div style="background:var(--primary);color:#fff;padding:8px 12px;border-radius:var(--r) var(--r) 0 0;font-size:12px;font-weight:600;display:flex;justify-content:space-between">
      <span><i class="ti ti-receipt"></i> PHẦN 2: CHI HỘ CÓ HÓA ĐƠN (Nâng / Hạ / CSHT)</span>
      <span>${fmtM(tongP2)}</span>
    </div>
    <div class="tbl-wrap" style="border-radius:0 0 var(--r) var(--r)">
    <table class="tbl">
      <colgroup>
        <col style="width:30px"><col style="width:110px"><col style="width:80px">
        <col style="width:90px"><col style="width:80px">
        <col style="width:90px"><col style="width:80px">
        <col style="width:90px"><col style="width:80px">
        <col style="width:100px">
      </colgroup>
      <thead>
        <tr>
          <th rowspan="2">STT</th>
          <th rowspan="2">Số cont</th>
          <th colspan="2" style="text-align:center;background:#fef3c7;color:#92400e">CSHT</th>
          <th colspan="2" style="text-align:center;background:#dcfce7;color:#166534">Nâng/hạ cont</th>
          <th colspan="2" style="text-align:center;background:#dbeafe;color:#1e40af">Nâng/hạ cont (2)</th>
          <th colspan="2" style="text-align:center;background:#f3f4f6">Khác</th>
          <th rowspan="2" style="background:#fff3e6">Tổng</th>
        </tr>
        <tr>
          <th style="font-size:10px;background:#fef9c3">Số tiền</th><th style="font-size:10px;background:#fef9c3">Số HĐ</th>
          <th style="font-size:10px;background:#f0fdf4">Số tiền</th><th style="font-size:10px;background:#f0fdf4">Số HĐ</th>
          <th style="font-size:10px;background:#eff6ff">Số tiền</th><th style="font-size:10px;background:#eff6ff">Số HĐ</th>
          <th style="font-size:10px">Số tiền</th><th style="font-size:10px">Số HĐ</th>
        </tr>
      </thead>
      <tbody>${p2Rows}
        <tr style="background:#fff3e6;font-weight:700;font-size:12px">
          <td colspan="10">TỔNG CHI HỘ CÓ HÓA ĐƠN</td>
          <td style="color:var(--primary)">${fmtM(tongP2)}</td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>`:''}

  <!-- TỔNG CỘNG — theo đúng form file mẫu -->
  <div style="background:var(--sidebar-bg);border-radius:var(--rl);padding:16px 20px;color:#fff;margin-bottom:16px">
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:10px">
      <div style="font-size:11px;opacity:.6">TỔNG CỘNG — ${khName} — Tháng ${m}/${y} — ${list.length} chuyến</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 200px;gap:4px;font-size:13px">
      <div style="opacity:.8">Tổng cước + phát sinh (chưa VAT)</div>
      <div style="text-align:right;font-weight:600">${fmtM(tongTruocVAT)}</div>

      <div style="opacity:.8">VAT 8% (Phần 1)</div>
      <div style="text-align:right;font-weight:600;color:#fbbf24">${fmtM(vatP1)}</div>

      ${chiHoP2.length?`
      <div style="opacity:.8">Tổng chi hộ có HĐ (Phần 2)</div>
      <div style="text-align:right;font-weight:600">${fmtM(tongP2)}</div>`:''}

      <div style="border-top:1px solid rgba(255,255,255,.2);margin-top:6px;padding-top:8px;font-size:15px;font-weight:700">TỔNG THANH TOÁN</div>
      <div style="border-top:1px solid rgba(255,255,255,.2);margin-top:6px;padding-top:8px;text-align:right;font-size:22px;font-weight:700;color:#ffd700">${fmtM(tongPhaiThu)}</div>
    </div>
  </div>

  <!-- KÝ TÊN -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:24px;text-align:center;font-size:12px">
    <div>
      <div style="font-weight:600;margin-bottom:50px">XÁC NHẬN CỦA KHÁCH HÀNG</div>
      <div style="border-top:1px solid #ccc;padding-top:6px;color:var(--text-muted)">${khName}</div>
    </div>
    <div>
      <div style="font-weight:600;margin-bottom:50px">CÔNG TY CỔ PHẦN BN CHAIN</div>
      <div style="border-top:1px solid #ccc;padding-top:6px;color:var(--text-muted)">Người lập bảng kê</div>
    </div>
  </div>

  ${chuyenKySection}
  </div>`;

  res.innerHTML=html;

  // Hiện nút Xuất Excel và In
  document.getElementById('btn-xuat-excel').style.display='';
  document.getElementById('btn-in').style.display='';

  // Đánh dấu trang_thai_bang_ke = cho_khach cho các đơn chưa chốt
  const chuaChot2=list.filter(o=>!o.trang_thai_bang_ke||o.trang_thai_bang_ke==='chua_chot');
  if(chuaChot2.length){
    await db.from('van_don').update({trang_thai_bang_ke:'cho_khach',ky_thanh_toan:thang})
      .in('id',chuaChot2.map(o=>o.id));
  }
}

async function xuatExcelBangKe(){
  if(!window.BK_DATA){toast('Vui lòng xem bảng kê trước','error');return;}
  const btn=document.getElementById('btn-xuat-excel');
  btn.innerHTML='<i class="ti ti-loader-2"></i> Đang tạo...';
  btn.disabled=true;

  if(!window.XLSX){
    await new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload=res; s.onerror=rej;
      document.head.appendChild(s);
    });
  }

  const{list,chiHoAll,chiHoTypes,chiHoP1,chiHoP2,groups,chuyenChuyenKy,
        khName,thang,m,y,tongCuoc,tongDV,tongP1,tongP2,tongTruocVAT,vatP1,tongPhaiThu,coTK}=window.BK_DATA;

  const chiHoMapLocal={};
  (chiHoAll||[]).forEach(c=>{
    if(!chiHoMapLocal[c.van_don_id])chiHoMapLocal[c.van_don_id]=[];
    chiHoMapLocal[c.van_don_id].push(c);
  });

  // ── Style helpers ──────────────────────────────────────────
  const WB=XLSX.utils.book_new();
  const fmtNum='#,##0';
  const fmtNum0='#,##0;-#,##0;"-"'; // zero = dấu gạch

  // Màu theo form mẫu
  const C_HEADER_BG='1F4E79';  // xanh đậm header chính
  const C_HEADER2_BG='2E75B6'; // xanh nhạt header phụ
  const C_P2_BG='E2EFDA';      // xanh lá nhạt phần 2
  const C_TOTAL_BG='FFF2CC';   // vàng nhạt dòng tổng
  const C_FOOTER_BG='1F4E79';  // xanh đậm footer
  const C_WHITE='FFFFFF';
  const C_DARK='081B3A';
  const C_STRIPE='EBF3FB';     // sọc xen kẽ hàng lẻ

  const border={
    top:{style:'thin',color:{rgb:'B0C4DE'}},
    bottom:{style:'thin',color:{rgb:'B0C4DE'}},
    left:{style:'thin',color:{rgb:'B0C4DE'}},
    right:{style:'thin',color:{rgb:'B0C4DE'}},
  };
  const borderBold={
    top:{style:'medium',color:{rgb:'1F4E79'}},
    bottom:{style:'medium',color:{rgb:'1F4E79'}},
    left:{style:'medium',color:{rgb:'1F4E79'}},
    right:{style:'medium',color:{rgb:'1F4E79'}},
  };

  function cs(opts={}){
    // cell style factory
    return{
      font:{name:'Arial',sz:opts.sz||9,bold:opts.bold||false,color:{rgb:opts.color||C_DARK},italic:opts.italic||false},
      fill:{patternType:'solid',fgColor:{rgb:opts.bg||C_WHITE}},
      alignment:{horizontal:opts.align||'left',vertical:'center',wrapText:opts.wrap||false},
      border:opts.borderBold?borderBold:border,
      numFmt:opts.fmt||'',
    };
  }

  // ── Build data array ────────────────────────────────────────
  const R=[];        // rows
  const S=[];        // styles tương ứng (cùng index)
  const MERGES=[];   // merge ranges

  const push=(row,styles)=>{R.push(row);S.push(styles||[]);};
  const pushEmpty=()=>push([],[]);

  // Số cột cố định: STT,Ngày,Mã đơn,Loại,Cont,LoạiCont,Tuyến,BKS,Cước,ĐổiLệnh,[TờKhai nếu có] = 10 hoặc 11
  const COL_FIXED=coTK?11:10;
  const COL_CHITYPES=chiHoTypes.length;
  const COL_TONG=COL_FIXED+COL_CHITYPES;     // cột Tổng P1
  const COL_NOTE=COL_TONG+1;                 // cột Ghi chú
  const TOTAL_COLS=COL_NOTE+1;

  // ── HEADER CÔNG TY ──────────────────────────────────────────
  // Dòng 1: tên công ty
  push(['CÔNG TY CỔ PHẦN BN CHAIN',...Array(TOTAL_COLS-1).fill('')],
    [cs({bold:true,sz:13,color:C_DARK,bg:C_WHITE,align:'center'})]);
  MERGES.push({s:{r:0,c:0},e:{r:0,c:TOTAL_COLS-1}});

  // Dòng 2: địa chỉ
  push(['215 Đường Nguyễn Phong Sắc, Phương Liễu, Bắc Ninh | MST: 2301342748',...Array(TOTAL_COLS-1).fill('')],
    [cs({sz:8,color:'595959',align:'center'})]);
  MERGES.push({s:{r:1,c:0},e:{r:1,c:TOTAL_COLS-1}});

  // Dòng 3: tiêu đề bảng kê
  push([`BẢNG KÊ KIÊM BIÊN BẢN XÁC NHẬN KHỐI LƯỢNG DỊCH VỤ HOÀN THÀNH THÁNG ${m}/${y}`,...Array(TOTAL_COLS-1).fill('')],
    [cs({bold:true,sz:12,color:C_DARK,align:'center',bg:C_WHITE})]);
  MERGES.push({s:{r:2,c:0},e:{r:2,c:TOTAL_COLS-1}});

  // Dòng 4: đính kèm HĐ
  push([`Đính kèm hóa đơn GTGT xuất theo hợp đồng`,...Array(TOTAL_COLS-1).fill('')],
    [cs({sz:9,color:'595959',align:'center',italic:true})]);
  MERGES.push({s:{r:3,c:0},e:{r:3,c:TOTAL_COLS-1}});

  pushEmpty();

  // Dòng 6: bên bán/mua
  const halfCol=Math.floor(TOTAL_COLS/2);
  push(['Bên bán hàng: CÔNG TY CỔ PHẦN BN CHAIN',...Array(halfCol-1).fill(''),
        `Bên mua hàng: ${khName}`,...Array(TOTAL_COLS-halfCol-1).fill('')],
    [cs({bold:true,sz:9}),,...Array(halfCol-1).fill(null),cs({bold:true,sz:9})]);
  MERGES.push({s:{r:5,c:0},e:{r:5,c:halfCol-1}});
  MERGES.push({s:{r:5,c:halfCol},e:{r:5,c:TOTAL_COLS-1}});

  pushEmpty();

  // ── HEADER BẢNG P1 ──────────────────────────────────────────
  // Dòng header xanh đậm — hàng 1
  const hStyle=cs({bold:true,sz:9,color:C_WHITE,bg:C_HEADER_BG,align:'center',borderBold:true});
  const hRow1=['STT','NGÀY','MÃ ĐƠN','LOẠI','SỐ CONT','LOẠI CONT','TUYẾN ĐƯỜNG','BKS',
    'CƯỚC','ĐỔI LỆNH',...(coTK?['TỜ KHAI']:[]),
    ...(chiHoTypes.length?['CHI HỘ KHÔNG HĐ']:chiHoTypes),
    'TỔNG','GHI CHÚ'];
  // Merge "CHI HỘ KHÔNG HĐ" nếu nhiều loại
  push(hRow1, Array(TOTAL_COLS).fill(hStyle));
  const headerRowIdx=R.length-1;
  if(chiHoTypes.length>1){
    MERGES.push({s:{r:headerRowIdx,c:COL_FIXED},e:{r:headerRowIdx,c:COL_FIXED+chiHoTypes.length-1}});
  }

  // Dòng header xanh nhạt — hàng 2 (sub-header chi hộ types)
  if(chiHoTypes.length>0){
    const hStyle2=cs({bold:true,sz:8,color:C_WHITE,bg:C_HEADER2_BG,align:'center'});
    const hRow2=[...Array(COL_FIXED).fill(''),...chiHoTypes,...Array(2).fill('')];
    push(hRow2,Array(TOTAL_COLS).fill(hStyle2));
    // Merge các cột fixed ở hàng 2 với hàng 1
    [...['STT','NGÀY','MÃ ĐƠN','LOẠI','SỐ CONT','LOẠI CONT','TUYẾN ĐƯỜNG','BKS','CƯỚC','ĐỔI LỆNH'],...(coTK?['TỜ KHAI']:[]),'TỔNG','GHI CHÚ'].forEach((_,ci)=>{
      const col=ci<COL_FIXED?ci:(ci===COL_FIXED?COL_TONG:COL_NOTE);
      if(ci!==COL_FIXED) MERGES.push({s:{r:headerRowIdx,c:col},e:{r:headerRowIdx+1,c:col}});
    });
  }

  // ── DATA ROWS P1 ────────────────────────────────────────────
  let stt=0;
  let dataRowStart=R.length;
  Object.entries(groups).forEach(([bill,items])=>{
    stt++;
    items.forEach((o,i)=>{
      const rowIdx=R.length-dataRowStart;
      const isStripe=rowIdx%2===1;
      const bgRow=isStripe?C_STRIPE:C_WHITE;
      const ch=(chiHoMapLocal[o.id]||[]).filter(c=>!c.hoa_don_khach);
      const phiDV=(+o.phi_doi_lenh||0)+(+o.phi_to_khai||0);
      const tongDong=(+o.gia_cuoc_khach||0)+ch.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0)+phiDV;
      const kyNote=o.ky_goc&&o.ky_goc!==thang?`[T${o.ky_goc.split('-')[1]}] `:'';
      const dStyle=cs({sz:9,bg:bgRow});
      const numStyle=cs({sz:9,bg:bgRow,align:'right',fmt:fmtNum0});
      const ctrStyle=cs({sz:9,bg:bgRow,align:'center'});
      const monoStyle=cs({sz:9,bg:bgRow,align:'center',color:'1F4E79'});

      push([
        `${stt}${items.length>1?'.'+(i+1):''}`,
        fmtDate(o.ngay),
        kyNote+(o.ma_don||''),
        o.loai_hang||'',
        o.so_cont||'',
        o.loai_cont||'',
        (o.diem_lay||'')+(o.diem_tra?' → '+o.diem_tra:''),
        o.bien_kiem_soat||'',
        +o.gia_cuoc_khach||0,
        +o.phi_doi_lenh||0,
        ...(coTK?[+o.phi_to_khai||0]:[]),
        ...chiHoTypes.map(type=>ch.filter(c=>c.loai_chi===type)
          .reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0)),
        tongDong,
        o.ghi_chu||'',
      ],[ctrStyle,ctrStyle,dStyle,ctrStyle,monoStyle,ctrStyle,dStyle,ctrStyle,
        numStyle,numStyle,...(coTK?[numStyle]:[]),
        ...chiHoTypes.map(()=>numStyle),
        cs({sz:9,bg:bgRow,align:'right',fmt:fmtNum,bold:true,color:'1F4E79'}),
        cs({sz:9,bg:bgRow,italic:true,color:'595959'}),
      ]);
    });

    // Subtotal bill nếu nhiều cont
    if(items.length>1){
      const subCuoc=items.reduce((s,o)=>s+(+o.gia_cuoc_khach||0),0);
      const subTotal=items.reduce((tot,o)=>{
        const ch=(chiHoMapLocal[o.id]||[]).filter(c=>!c.hoa_don_khach);
        return tot+(+o.gia_cuoc_khach||0)+ch.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0)+(+o.phi_doi_lenh||0)+(+o.phi_to_khai||0);
      },0);
      const subStyle=cs({sz:8,bg:'F0F7FF',italic:true,color:'595959'});
      const subNum=cs({sz:8,bg:'F0F7FF',align:'right',fmt:fmtNum,bold:true});
      const subDL=items.reduce((s,o)=>s+(+o.phi_doi_lenh||0),0);
      const subTK=items.reduce((s,o)=>s+(+o.phi_to_khai||0),0);
      push([
        `Cộng ${items[0].loai_hang==='Nhập'?'Bill':'Booking'}: ${bill}`,
        '',' ','','','','','',subCuoc,subDL,...(coTK?[subTK]:[]),
        ...chiHoTypes.map(()=>0),subTotal,''
      ],[subStyle,...Array(7).fill(subStyle),subNum,subNum,...(coTK?[subNum]:[]),
        ...chiHoTypes.map(()=>subNum),subNum,subStyle]);
      MERGES.push({s:{r:R.length-1,c:0},e:{r:R.length-1,c:7}});
    }
  });

  // Dòng tổng P1
  const totStyle=cs({bold:true,sz:9,bg:C_TOTAL_BG,align:'right',fmt:fmtNum,borderBold:true});
  const totLblStyle=cs({bold:true,sz:9,bg:C_TOTAL_BG,borderBold:true});
  const tongDL=list.reduce((s,o)=>s+(+o.phi_doi_lenh||0),0);
  const tongTK=list.reduce((s,o)=>s+(+o.phi_to_khai||0),0);
  push([
    'CỘNG PHẦN 1','','','','','','','',
    tongCuoc,tongDL,...(coTK?[tongTK]:[]),
    ...chiHoTypes.map(type=>chiHoP1.filter(c=>c.loai_chi===type)
      .reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0)),
    tongTruocVAT,'',
  ],[totLblStyle,...Array(7).fill(totLblStyle),
    totStyle,totStyle,...(coTK?[totStyle]:[]),
    ...chiHoTypes.map(()=>totStyle),
    cs({bold:true,sz:10,bg:C_TOTAL_BG,align:'right',fmt:fmtNum,color:C_HEADER_BG,borderBold:true}),
    totLblStyle]);
  MERGES.push({s:{r:R.length-1,c:0},e:{r:R.length-1,c:7}});
  pushEmpty();

  // ── PHẦN 2: CHI HỘ CÓ HĐ ───────────────────────────────────
  if(chiHoP2.length){
    // Header P2
    const h2Style=cs({bold:true,sz:9,color:C_WHITE,bg:'375623',align:'center',borderBold:true});
    push(['PHẦN 2: CHI HỘ CÓ HÓA ĐƠN (Nâng / Hạ / CSHT)',...Array(9).fill('')],
      [h2Style,...Array(9).fill(h2Style)]);
    MERGES.push({s:{r:R.length-1,c:0},e:{r:R.length-1,c:9}});

    const h2hStyle=cs({bold:true,sz:9,color:C_WHITE,bg:'548235',align:'center'});
    push(['STT','SỐ CONT',
      'CSHT','SHĐ','NÂNG/HẠ CONT','SHĐ','NÂNG/HẠ CONT (2)','SHĐ','KHÁC','TỔNG'],
      Array(10).fill(h2hStyle));

    const p2ByCont={};
    chiHoP2.forEach(c=>{
      const o=list.find(x=>x.id===c.van_don_id);
      const key=o?.so_cont||c.ma_don||c.van_don_id;
      if(!p2ByCont[key])p2ByCont[key]=[];
      p2ByCont[key].push(c);
    });

    Object.entries(p2ByCont).forEach(([cont,items],i)=>{
      const bg=i%2===0?C_WHITE:'F2F7EE';
      const csht=items.find(c=>c.loai_chi==='CSHT'||c.loai_chi?.includes('Hạ tầng')||c.loai_chi?.includes('CSHT'));
      // Gộp tất cả nâng/hạ cont vào cột 1, cột 2 để trống
      const nangHa=items.filter(c=>c!==csht&&(
        c.loai_chi?.includes('Nâng/hạ')||c.loai_chi?.startsWith('Nâng')||c.loai_chi?.startsWith('Hạ')
      ));
      const khac=items.filter(c=>c!==csht&&!nangHa.includes(c));
      const nangHaTien=nangHa.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
      const nangHaHD=nangHa.map(c=>c.chung_tu||'').filter(Boolean).join(', ');
      const tongCont=items.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
      push([
        i+1, cont,
        csht?+(csht.tien_thu_khach||csht.so_tien)||0:'',
        csht?.chung_tu||'',
        nangHaTien||'',
        nangHaHD,
        '',  // cột NÂNG/HẠ CONT (2) — để trống, chỉ giữ cấu trúc bảng
        '',
        khac.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0)||'',
        tongCont,
      ],[
        cs({sz:9,bg,align:'center'}),
        cs({sz:9,bg,align:'center',color:'1F4E79',bold:true}),
        cs({sz:9,bg,align:'right',fmt:fmtNum0}),
        cs({sz:9,bg,align:'center',color:'2E75B6',sz:8}),
        cs({sz:9,bg,align:'right',fmt:fmtNum0}),
        cs({sz:9,bg,align:'center',color:'2E75B6',sz:8}),
        cs({sz:9,bg,align:'right',fmt:fmtNum0}),
        cs({sz:9,bg,align:'center',color:'2E75B6',sz:8}),
        cs({sz:9,bg,align:'right',fmt:fmtNum0}),
        cs({sz:9,bg,align:'right',fmt:fmtNum,bold:true,color:'375623'}),
      ]);
    });

    // Tổng P2
    push(['TỔNG CHI HỘ CÓ HĐ','','','','','','','','',tongP2],
      [cs({bold:true,sz:9,bg:C_TOTAL_BG,borderBold:true}),
       ...Array(8).fill(cs({bold:true,sz:9,bg:C_TOTAL_BG,borderBold:true})),
       cs({bold:true,sz:10,bg:C_TOTAL_BG,align:'right',fmt:fmtNum,color:'375623',borderBold:true})]);
    MERGES.push({s:{r:R.length-1,c:0},e:{r:R.length-1,c:8}});
    pushEmpty();
  }

  // ── FOOTER TỔNG ─────────────────────────────────────────────
  const fLbl=cs({bold:true,sz:9,bg:'EBF3FB',color:C_DARK});
  const fNum=cs({bold:true,sz:10,bg:'EBF3FB',align:'right',fmt:fmtNum,color:C_HEADER_BG});

  push(['TỔNG CƯỚC & PHÁT SINH (chưa VAT)','','','','','','','','',tongTruocVAT],
    [...Array(9).fill(fLbl),fNum]);
  MERGES.push({s:{r:R.length-1,c:0},e:{r:R.length-1,c:8}});

  push([`VAT 8% (trên Phần 1)`,'','','','','','','','',vatP1],
    [...Array(9).fill(cs({sz:9,bg:'FFFAEB',italic:true})),
     cs({sz:10,bg:'FFFAEB',align:'right',fmt:fmtNum,color:'C55A11'})]);
  MERGES.push({s:{r:R.length-1,c:0},e:{r:R.length-1,c:8}});

  if(chiHoP2.length){
    push(['TỔNG CHI HỘ CÓ HĐ (Phần 2)','','','','','','','','',tongP2],
      [...Array(9).fill(fLbl),fNum]);
    MERGES.push({s:{r:R.length-1,c:0},e:{r:R.length-1,c:8}});
  }

  // Dòng tổng thanh toán — nổi bật
  const bigStyle=cs({bold:true,sz:12,bg:C_HEADER_BG,color:C_WHITE,borderBold:true});
  const bigNum=cs({bold:true,sz:13,bg:C_HEADER_BG,color:'FFD700',align:'right',fmt:fmtNum,borderBold:true});
  push(['TỔNG THANH TOÁN','','','','','','','','',tongPhaiThu],
    [...Array(9).fill(bigStyle),bigNum]);
  MERGES.push({s:{r:R.length-1,c:0},e:{r:R.length-1,c:8}});

  pushEmpty();pushEmpty();

  // Dòng ký tên
  const kyStyle=cs({bold:true,sz:9,align:'center'});
  push(['XÁC NHẬN CỦA KHÁCH HÀNG','','','','CÔNG TY CỔ PHẦN BN CHAIN','','','','',''],
    [kyStyle,...Array(3).fill(null),kyStyle]);
  MERGES.push({s:{r:R.length-1,c:0},e:{r:R.length-1,c:3}});
  MERGES.push({s:{r:R.length-1,c:4},e:{r:R.length-1,c:9}});

  push(['(Ký, đóng dấu)','','','','(Ký, đóng dấu)','','','','',''],
    [cs({sz:8,align:'center',italic:true,color:'888888'}),...Array(3).fill(null),
     cs({sz:8,align:'center',italic:true,color:'888888'})]);
  MERGES.push({s:{r:R.length-1,c:0},e:{r:R.length-1,c:3}});
  MERGES.push({s:{r:R.length-1,c:4},e:{r:R.length-1,c:9}});

  // ── Build worksheet ─────────────────────────────────────────
  const ws=XLSX.utils.aoa_to_sheet(R);

  // Apply styles
  R.forEach((row,ri)=>{
    row.forEach((val,ci)=>{
      const cellAddr=XLSX.utils.encode_cell({r:ri,c:ci});
      if(!ws[cellAddr]) ws[cellAddr]={v:val,t:typeof val==='number'?'n':'s'};
      const style=S[ri]&&S[ri][ci];
      if(style) ws[cellAddr].s=style;
    });
  });

  // Row heights
  ws['!rows']=R.map((_,i)=>{
    if(i===0) return{hpt:20};
    if(i===2) return{hpt:18};
    return{hpt:16};
  });

  // Column widths — theo form mẫu
  ws['!cols']=[
    {wch:6},{wch:10},{wch:14},{wch:7},{wch:14},{wch:10},
    {wch:32},{wch:10},{wch:13},{wch:8},{wch:10},
    ...chiHoTypes.map(()=>({wch:12})),
    {wch:14},{wch:22}
  ];

  ws['!merges']=MERGES;

  XLSX.utils.book_append_sheet(WB,ws,`T${m}.${y}`);

  // ── SHEET CHUYỂN KỲ ─────────────────────────────────────────
  if(chuyenChuyenKy?.length){
    const wsCK=XLSX.utils.aoa_to_sheet([
      [`CHUYẾN CHUYỂN KỲ — THÁNG ${m}/${y}`],
      ['Mã đơn','Ngày chạy','Số cont','Hành trình','Kỳ gốc','Lý do chuyển'],
      ...chuyenChuyenKy.map(o=>[o.ma_don,fmtDate(o.ngay),o.so_cont||'',
        o.hanh_trinh||'',
        o.ky_goc?`T${o.ky_goc.split('-')[1]}/${o.ky_goc.split('-')[0]}`:'',
        o.ly_do_chuyen_ky||''])
    ]);
    wsCK['!cols']=[{wch:16},{wch:12},{wch:14},{wch:35},{wch:10},{wch:30}];
    XLSX.utils.book_append_sheet(WB,wsCK,'Chuyển kỳ');
  }

  // ── Xuất file ───────────────────────────────────────────────
  const fileName=`BangKe_${khName.replace(/\s+/g,'_')}_T${m}_${y}.xlsx`;
  XLSX.writeFile(WB,fileName,{bookSST:false,cellStyles:true});

  btn.innerHTML='<i class="ti ti-file-spreadsheet"></i> Xuất Excel';
  btn.disabled=false;
  toast(`✅ Đã tải ${fileName}`);
}

// ============ AI SCAN HÓA ĐƠN ============
async function pgTraThau(c){
  if(!canSee(['ke_toan','ceo'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const{data}=await db.from('van_don').select('id,ma_don,ngay,ten_khach,hanh_trinh,ten_lai_xe,gia_cuoc_thau,thanh_toan_thau,ma_thau_phu,so_cont,locked').neq('thanh_toan_thau','Đã trả').gt('gia_cuoc_thau',0).order('ngay',{ascending:false}).limit(500);
  const list=data||[];
  // Group theo thầu phụ
  const groups={};
  list.forEach(o=>{
    const k=o.ma_thau_phu||'Khác';
    if(!groups[k])groups[k]=[];
    groups[k].push(o);
  });
  const tongAll=list.reduce((s,o)=>s+(+o.gia_cuoc_thau||0),0);
  c.innerHTML=`
  <div class="stats-row stats-3" style="margin-bottom:14px">
    <div class="stat-card"><div class="stat-lbl">Tổng phải trả thầu</div><div class="stat-val text-red">${fmt(Math.round(tongAll/1e6))}tr</div></div>
    <div class="stat-card"><div class="stat-lbl">Số đơn chưa trả</div><div class="stat-val">${list.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">Số nhà thầu</div><div class="stat-val">${Object.keys(groups).length}</div></div>
  </div>
  ${Object.entries(groups).map(([tp,items])=>{
    const tong=items.reduce((s,o)=>s+(+o.gia_cuoc_thau||0),0);
    return`<div class="bk-group">
    <div class="bk-group-header">
      <div class="bk-group-title">${tp}</div>
      <div style="font-size:15px;font-weight:700;color:var(--danger)">${fmtM(tong)}</div>
    </div>
    <table class="tbl">
      <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Khách hàng</th><th>Hành trình</th><th>Lái xe</th><th>Cước thầu</th><th>Trạng thái</th></tr></thead>
      <tbody>${items.map(o=>`<tr>
        <td style="color:var(--teal);font-weight:600">${o.ma_don}</td><td>${o.ngay}</td>
        <td>${o.ten_khach}</td><td>${o.hanh_trinh||'—'}</td><td>${o.ten_lai_xe||'—'}</td>
        <td class="text-red fw6">${fmtM(o.gia_cuoc_thau)}</td>
        <td>${thuTag(o.thanh_toan_thau)}</td>
      </tr>`).join('')}</tbody>
    </table>
    <div class="bk-total-row"><span>Tổng trả ${tp}</span><span style="color:var(--danger)">${fmtM(tong)}</span></div>
    </div>`;
  }).join('')}`;
}

// ==================== BÁO CÁO ====================
async function pgBaoCao(c){
  if(!canSee(['ke_toan','ceo'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
  const now=new Date();
  const curM=String(now.getMonth()+1).padStart(2,'0');
  const curY=now.getFullYear();
  const thOpts=Array.from({length:12},(_,i)=>{
    const d=new Date(curY,now.getMonth()-i,1);
    const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return`<option value="${v}">Tháng ${d.getMonth()+1}/${d.getFullYear()}</option>`;
  }).join('');
  const lastDay=new Date(curY,now.getMonth()+1,0).getDate();
  c.innerHTML=`
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">
    <select class="filter-sel" id="bc-thang" style="min-width:140px">${thOpts}</select>
    <span style="font-size:12px;color:var(--text-muted)">hoặc từ</span>
    <input type="date" id="bc-from" style="width:auto" value="${curY}-${curM}-01">
    <span style="font-size:12px;color:var(--text-muted)">đến</span>
    <input type="date" id="bc-to" style="width:auto" value="${curY}-${curM}-${String(lastDay).padStart(2,'0')}">
    <button class="btn btn-primary" onclick="loadBaoCao()"><i class="ti ti-chart-bar"></i> Xem báo cáo</button>
  </div>
  <div id="bc-content"><div class="empty"><i class="ti ti-chart-bar"></i>Chọn thời gian và bấm Xem báo cáo</div></div>`;
  document.getElementById('bc-thang').onchange=function(){
    const[y,m]=this.value.split('-');
    const ld=new Date(+y,+m,0).getDate();
    document.getElementById('bc-from').value=`${y}-${m}-01`;
    document.getElementById('bc-to').value=`${y}-${m}-${String(ld).padStart(2,'0')}`;
  };
  loadBaoCao();
}

async function loadBaoCao(){
  const from=document.getElementById('bc-from')?.value;
  const to=document.getElementById('bc-to')?.value;
  const bc=document.getElementById('bc-content');
  if(!bc||!from||!to)return;
  bc.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải dữ liệu...</div>';

  const[{data:orders},{data:chiHoAll}]=await Promise.all([
    db.from('van_don').select('*').gte('ngay',from).lte('ngay',to).eq('locked',true).order('ngay',{ascending:true}),
    db.from('chi_ho').select('*').gte('ngay_chi',from).lte('ngay_chi',to),
  ]);
  const list=orders||[];
  const chiHo=chiHoAll||[];
  if(!list.length){bc.innerHTML='<div class="empty"><i class="ti ti-inbox"></i>Không có dữ liệu hoàn thành trong khoảng thời gian này<br><span style="font-size:12px;color:var(--text-muted)">Chỉ tính đơn đã Hoàn thành & Khóa</span></div>';return;}

  // ── TÍNH TOÁN ──
  const tongCuocKH=list.reduce((s,o)=>s+(+o.gia_cuoc_khach||0),0);
  const tongCuocThau=list.reduce((s,o)=>s+(+o.gia_cuoc_thau||0),0);
  const tongCH=chiHo.filter(c=>!c.hoa_don_khach).reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
  const tongCHTraThau=chiHo.filter(c=>!c.hoa_don_khach).reduce((s,c)=>s+(+c.tien_tra_thau||0),0);
  const tongTraDoiLenhThau=list.reduce((s,o)=>s+(+o.tra_thau_doi_lenh||0),0);
  const tongTraThauThuc=tongCuocThau+tongCHTraThau+tongTraDoiLenhThau;
  const tongDV=list.reduce((s,o)=>s+(+o.phi_doi_lenh||0)+(+o.phi_to_khai||0),0);
  const tongThu=tongCuocKH+tongCH+tongDV;
  const loiNhuan=tongThu-tongTraThauThuc;
  const tongKH=list.filter(o=>o.loai_chuyen==='Kết hợp'||o.loai_chuyen==='Kẹp ghép').length;
  const tiLeKH=list.length?Math.round(tongKH/list.length*100):0;

  // Group khách hàng
  const khMap={};
  list.forEach(o=>{
    if(!khMap[o.ten_khach])khMap[o.ten_khach]={cuoc:0,so:0};
    khMap[o.ten_khach].cuoc+=+o.gia_cuoc_khach||0;
    khMap[o.ten_khach].so++;
  });
  const khArr=Object.entries(khMap).sort((a,b)=>b[1].cuoc-a[1].cuoc);

  // Group đầu xe — chỉ tính xe có trong danh mục "Phương tiện & Lái xe"
  const xeBienSet=new Set((XE||[]).map(x=>x.bien_so));
  const xeMap={};
  list.forEach(o=>{
    const k=o.bien_kiem_soat||'Không có biển';
    if(!xeBienSet.has(k))return; // bỏ qua biển số không có trong danh mục
    if(!xeMap[k])xeMap[k]={cuoc:0,cuocKH:0,so:0,kh:0,thuong:0,thau:o.ma_thau_phu||''};
    xeMap[k].cuoc+=+o.gia_cuoc_thau||0;
    xeMap[k].cuocKH+=+o.gia_cuoc_khach||0;
    xeMap[k].so++;
    if(o.loai_chuyen==='Kết hợp'||o.loai_chuyen==='Kẹp ghép')xeMap[k].kh++;
    else xeMap[k].thuong++;
  });
  const xeArr=Object.entries(xeMap).sort((a,b)=>b[1].cuoc-a[1].cuoc);

  // ── BIỂU ĐỒ CỘT (SVG thuần) ──
  function barChart(items, colorFn, valFn, labelFn, unit='tr'){
    const maxVal=Math.max(...items.map(valFn),1);
    const W=460,H=180,pad={t:10,b:40,l:10,r:10};
    const chartW=W-pad.l-pad.r;
    const chartH=H-pad.t-pad.b;
    const bw=Math.min(50,Math.floor(chartW/items.length)-8);
    const gap=(chartW-bw*items.length)/(items.length+1);
    let bars='',labels='',vals='';
    items.forEach((item,i)=>{
      const v=valFn(item);
      const bh=Math.max(2,Math.round(v/maxVal*chartH));
      const x=pad.l+gap+(bw+gap)*i;
      const y=pad.t+chartH-bh;
      bars+=`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="4" fill="${colorFn(item,i)}"/>`;
      // value label
      const vLabel=v>=1e6?Math.round(v/1e6)+'tr':fmt(v);
      vals+=`<text x="${x+bw/2}" y="${y-4}" text-anchor="middle" font-size="10" fill="var(--text-muted)" font-family="Segoe UI,sans-serif">${vLabel}</text>`;
      // x label
      const lbl=labelFn(item);
      const short=lbl.length>8?lbl.slice(0,8)+'…':lbl;
      labels+=`<text x="${x+bw/2}" y="${H-pad.b+14}" text-anchor="middle" font-size="10" fill="var(--text)" font-family="Segoe UI,sans-serif">${short}</text>`;
    });
    // baseline
    const base=`<line x1="${pad.l}" y1="${pad.t+chartH}" x2="${W-pad.r}" y2="${pad.t+chartH}" stroke="var(--border)" stroke-width="1"/>`;
    return`<svg viewBox="0 0 ${W} ${H}" width="100%" style="overflow:visible">${base}${bars}${vals}${labels}</svg>`;
  }

  // Biểu đồ tỉ lệ kết hợp theo xe (stacked bar)
  function khBarChart(items){
    const W=460,H=180,pad={t:10,b:40,l:10,r:10};
    const chartW=W-pad.l-pad.r;
    const chartH=H-pad.t-pad.b;
    const bw=Math.min(50,Math.floor(chartW/items.length)-8);
    const gap=(chartW-bw*items.length)/(items.length+1);
    let bars='',labels='',tileLabels='';
    items.forEach(([bien,v],i)=>{
      const x=pad.l+gap+(bw+gap)*i;
      const tiLe=v.so>0?Math.round(v.kh/v.so*100):0;
      const khH=Math.round(tiLe/100*chartH);
      const thuongH=chartH-khH;
      // stacked: thường (bottom, gray), kết hợp (top, green)
      if(thuongH>0)bars+=`<rect x="${x}" y="${pad.t+khH}" width="${bw}" height="${thuongH}" rx="0" fill="#e2e8f0"/>`;
      if(khH>0)bars+=`<rect x="${x}" y="${pad.t}" width="${bw}" height="${khH}" rx="4" fill="var(--success)" opacity=".85"/>`;
      // top: rounded corners for full bar
      if(khH===0)bars+=`<rect x="${x}" y="${pad.t}" width="${bw}" height="${chartH}" rx="4" fill="#e2e8f0"/>`;
      if(khH===chartH)bars+=`<rect x="${x}" y="${pad.t}" width="${bw}" height="${chartH}" rx="4" fill="var(--success)" opacity=".85"/>`;
      // % label
      const mau=tiLe>=50?'var(--success)':tiLe>=30?'var(--warning)':'var(--danger)';
      tileLabels+=`<text x="${x+bw/2}" y="${pad.t-2}" text-anchor="middle" font-size="10" fill="${mau}" font-weight="600" font-family="Segoe UI,sans-serif">${tiLe}%</text>`;
      const short=bien.length>8?bien.slice(0,8)+'…':bien;
      labels+=`<text x="${x+bw/2}" y="${H-pad.b+14}" text-anchor="middle" font-size="10" fill="var(--text)" font-family="Segoe UI,sans-serif">${short}</text>`;
    });
    const base=`<line x1="${pad.l}" y1="${pad.t+chartH}" x2="${W-pad.r}" y2="${pad.t+chartH}" stroke="var(--border)" stroke-width="1"/>`;
    return`<svg viewBox="0 0 ${W} ${H}" width="100%" style="overflow:visible">${base}${bars}${tileLabels}${labels}</svg>`;
  }

  bc.innerHTML=`
  <!-- KPI ROW -->
  <div class="stats-row stats-4" style="margin-bottom:18px">
    <div class="stat-card">
      <div class="stat-lbl">Tổng thu khách</div>
      <div class="stat-val text-blue">${fmt(Math.round(tongThu/1e6))}tr</div>
      <div class="stat-sub">Cước ${fmt(Math.round(tongCuocKH/1e6))}tr + Chi hộ ${fmt(Math.round(tongCH/1e6))}tr + DV ${fmt(Math.round(tongDV/1e6))}tr</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Tổng trả thầu</div>
      <div class="stat-val text-red">${fmt(Math.round(tongTraThauThuc/1e6))}tr</div>
      <div class="stat-sub">Cước thầu ${fmt(Math.round(tongCuocThau/1e6))}tr + Chi hộ ${fmt(Math.round(tongCHTraThau/1e6))}tr + DV ${fmt(Math.round(tongTraDoiLenhThau/1e6))}tr</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Lợi nhuận gộp</div>
      <div class="stat-val ${loiNhuan>=0?'text-green':'text-red'}">${fmt(Math.round(loiNhuan/1e6))}tr</div>
      <div class="stat-sub">Biên <strong>${tongThu>0?Math.round(loiNhuan/tongThu*100):0}%</strong></div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Tỉ lệ kết hợp / kẹp ghép</div>
      <div class="stat-val" style="color:${tiLeKH>=50?'var(--success)':tiLeKH>=30?'var(--warning)':'var(--danger)'}">${tiLeKH}%</div>
      <div class="stat-sub">${tongKH} KH/KG · ${list.length-tongKH} thường · ${list.length} tổng</div>
    </div>
  </div>

  <!-- 3 BIỂU ĐỒ -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px">

    <!-- Cước khách theo KH -->
    <div class="tbl-wrap" style="padding:14px 16px">
      <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Cước khách theo KH</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Tổng: <strong class="text-blue">${fmt(Math.round(tongCuocKH/1e6))}tr</strong></div>
      ${barChart(khArr,(item,i)=>['var(--teal)','var(--primary)','#8b5cf6','#0891b2','#16a34a'][i%5],([,v])=>v.cuoc,([k])=>k)}
      <div style="margin-top:8px">
        ${khArr.map(([k,v],i)=>`<div style="display:flex;justify-content:space-between;font-size:11.5px;padding:3px 0;border-bottom:1px solid var(--border)">
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${['var(--teal)','var(--primary)','#8b5cf6','#0891b2','#16a34a'][i%5]};margin-right:5px"></span>${k}</span>
          <span class="fw6">${fmt(Math.round(v.cuoc/1e6))}tr · ${v.so} chuyến</span>
        </div>`).join('')}
      </div>
    </div>

    <!-- Cước thầu theo đầu xe -->
    <div class="tbl-wrap" style="padding:14px 16px">
      <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Cước thầu theo đầu xe</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Tổng: <strong class="text-red">${fmt(Math.round(tongCuocThau/1e6))}tr</strong></div>
      ${barChart(xeArr,()=>'var(--danger)',([,v])=>v.cuoc,([k])=>k)}
      <div style="margin-top:8px">
        ${xeArr.map(([k,v])=>`<div style="display:flex;justify-content:space-between;font-size:11.5px;padding:3px 0;border-bottom:1px solid var(--border)">
          <span class="text-blue">${k}</span>
          <span class="fw6 text-red">${fmt(Math.round(v.cuoc/1e6))}tr · ${v.so}ch</span>
        </div>`).join('')}
      </div>
    </div>

    <!-- Tỉ lệ kết hợp theo xe -->
    <div class="tbl-wrap" style="padding:14px 16px">
      <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Tỉ lệ kết hợp / kẹp ghép</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Toàn công ty: <strong style="color:${tiLeKH>=50?'var(--success)':tiLeKH>=30?'var(--warning)':'var(--danger)'}">${tiLeKH}%</strong></div>
      ${khBarChart(xeArr)}
      <div style="margin-top:8px">
        ${xeArr.map(([k,v])=>{
          const tl=v.so>0?Math.round(v.kh/v.so*100):0;
          const mau=tl>=50?'var(--success)':tl>=30?'var(--warning)':'var(--danger)';
          return`<div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;padding:3px 0;border-bottom:1px solid var(--border)">
            <span class="text-blue">${k}</span>
            <span style="display:flex;gap:6px;align-items:center">
              <span style="font-size:10px;color:var(--text-muted)">${v.kh}KH/${v.so}ch</span>
              <span style="font-weight:700;color:${mau}">${tl}%</span>
            </span>
          </div>`;
        }).join('')}
        <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:var(--text-muted)">
          <span><span style="display:inline-block;width:8px;height:8px;background:var(--success);border-radius:2px;opacity:.85;margin-right:3px"></span>Kết hợp / Kẹp ghép</span>
          <span><span style="display:inline-block;width:8px;height:8px;background:#e2e8f0;border-radius:2px;margin-right:3px"></span>Thường</span>
        </div>
      </div>
    </div>
  </div>

  <!-- BẢNG CHI TIẾT -->
  <div class="tbl-wrap">
    <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">
      Chi tiết theo đầu xe
    </div>
    <table class="tbl">
      <colgroup><col style="width:110px"><col style="width:130px"><col style="width:60px"><col style="width:100px"><col style="width:100px"><col style="width:100px"><col style="width:70px"><col style="width:70px"><col style="width:80px"></colgroup>
      <thead><tr><th>Biển số</th><th>Thầu phụ</th><th>Chuyến</th><th>Cước khách</th><th>Cước thầu</th><th>TB/chuyến</th><th>Thường</th><th>KH/KG</th><th>Tỉ lệ KH</th></tr></thead>
      <tbody>
      ${xeArr.map(([k,v])=>{
        const tl=v.so>0?Math.round(v.kh/v.so*100):0;
        const mau=tl>=50?'var(--success)':tl>=30?'var(--warning)':'var(--danger)';
        const tb=v.so>0?Math.round(v.cuoc/v.so):0;
        return`<tr>
          <td class="text-blue fw6">${k}</td>
          <td style="font-size:11px">${v.thau||'—'}</td>
          <td class="fw6">${v.so}</td>
          <td class="text-blue fw6">${fmt(Math.round(v.cuocKH/1e6))}tr</td>
          <td class="text-red fw6">${fmt(Math.round(v.cuoc/1e6))}tr</td>
          <td>${fmt(Math.round(tb/1e3))}k</td>
          <td>${v.thuong}</td>
          <td style="color:var(--success);font-weight:600">${v.kh}</td>
          <td><span style="font-weight:700;color:${mau}">${tl}%</span></td>
        </tr>`;
      }).join('')}
      ${(()=>{
        const tongSo=xeArr.reduce((s,[,v])=>s+v.so,0);
        const tongCuocKHXe=xeArr.reduce((s,[,v])=>s+v.cuocKH,0);
        const tongCuocThauXe=xeArr.reduce((s,[,v])=>s+v.cuoc,0);
        const tongThuongXe=xeArr.reduce((s,[,v])=>s+v.thuong,0);
        const tongKHXe=xeArr.reduce((s,[,v])=>s+v.kh,0);
        const tiLeKHXe=tongSo>0?Math.round(tongKHXe/tongSo*100):0;
        return`<tr style="background:#f5f9fb;font-weight:600">
        <td colspan="2">Tổng cộng</td>
        <td>${tongSo}</td>
        <td class="text-blue">${fmt(Math.round(tongCuocKHXe/1e6))}tr</td>
        <td class="text-red">${fmt(Math.round(tongCuocThauXe/1e6))}tr</td>
        <td>${tongSo>0?fmt(Math.round(tongCuocThauXe/tongSo/1e3)):0}k</td>
        <td>${tongThuongXe}</td>
        <td style="color:var(--success)">${tongKHXe}</td>
        <td style="color:${tiLeKHXe>=50?'var(--success)':tiLeKHXe>=30?'var(--warning)':'var(--danger)'};font-weight:700">${tiLeKHXe}%</td>
      </tr>`;
      })()}
      </tbody>
    </table>
  </div>`;
}


// ==================== UPLOAD HÓA ĐƠN ====================
const PROXY_URL='/api/gemini'; // Gemini 2.0 Flash

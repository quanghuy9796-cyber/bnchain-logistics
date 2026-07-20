// PAGES.JS — Điều vận, Bảng kê, Báo cáo, Trả thầu, Công nợ
// Requires: config.js, orders.js
// fmtDate() được khai báo trong orders.js (load trước)

async function pgDieuVan(c){
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const isNV=CU?.vai_tro==='nhan_vien';
  const canM=canSee(['ke_toan','ceo','thu_quy']);

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
  if(!canSee(['quan_ly','ke_toan','ceo','thu_quy'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền xem</div>';return;}
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
  if(!canSee(['ke_toan','ceo','thu_quy'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Chỉ Kế toán, Thủ quỹ và CEO có quyền xem</div>';return;}
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
  if(!canSee(['ke_toan','ceo','thu_quy'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
  const now=new Date();
  const curY=now.getFullYear();
  const thOpts=Array.from({length:6},(_,i)=>{
    const d=new Date(curY,now.getMonth()-i,1);
    const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return`<option value="${v}" ${i===0?'selected':''}>Tháng ${d.getMonth()+1}/${d.getFullYear()}</option>`;
  }).join('');

  c.innerHTML=`
  <div class="toolbar" style="margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <select id="bk-kh" class="filter-sel" style="min-width:200px"><option value="">-- Đang tải khách hàng... --</option></select>
    <select id="bk-thang" class="filter-sel" onchange="reloadKhDropdown()">${thOpts}</select>
    <button class="btn btn-teal" onclick="loadBangKe()"><i class="ti ti-search"></i> Xem bảng kê</button>
    <button class="btn btn-primary" onclick="xuatExcelBangKe()" id="btn-xuat-excel" style="display:none"><i class="ti ti-file-spreadsheet"></i> Xuất Excel</button>
    <button class="btn" onclick="window.print()" id="btn-in" style="display:none"><i class="ti ti-printer"></i> In</button>
  </div>
  <div id="bk-canhbao"></div>
  <div id="bk-result" style="color:var(--text-muted);font-size:13px;padding:10px 0">
    Chọn khách hàng và tháng để xem bảng kê.
  </div>`;
  await reloadKhDropdown();
}

// Nạp lại dropdown khách hàng — liệt kê khách có chuyến locked tính đến cuối tháng đang chọn,
// kèm số đếm "(X chưa chốt)" để kế toán biết ngay khách nào còn việc cần xử lý ở Bảng kê.
async function reloadKhDropdown(){
  const sel=document.getElementById('bk-kh');
  const thang=document.getElementById('bk-thang')?.value;
  if(!sel||!thang)return;
  const[y,m]=thang.split('-');
  const lastDay=new Date(+y,+m,0).getDate();
  const dateTo=`${y}-${m.padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  const dangChon=sel.value;
  sel.innerHTML='<option value="">-- Đang tải... --</option>';
  const{data}=await db.from('van_don').select('id,ten_khach,trang_thai_bang_ke,trang_thai_p2').eq('locked',true)
    .lte('ngay',dateTo)
    .not('ten_khach','is',null).neq('ten_khach','');
  const allOrders=data||[];
  const allIds=allOrders.map(o=>o.id);
  // Phải biết đơn nào THỰC SỰ có chi hộ Phần 2 (có HĐ) — đơn không có thì P2 là "không áp dụng",
  // không được tính là chưa chốt (cùng gốc bug với loadBangKe — xem ghi chú ở đó)
  let idsWithP2=new Set();
  if(allIds.length){
    const{data:chP2}=await db.from('chi_ho').select('van_don_id').in('van_don_id',allIds).eq('hoa_don_khach',true).eq('la_tham_chieu',false);
    idsWithP2=new Set((chP2||[]).map(c=>c.van_don_id));
  }
  const map={};
  allOrders.forEach(o=>{
    const raw=(o.ten_khach||'').trim();
    if(!raw)return;
    const norm=raw.toLowerCase();
    if(!map[norm])map[norm]={name:raw,chuaChot:0};
    const p1Open=o.trang_thai_bang_ke!=='da_chot';
    const p2Open=idsWithP2.has(o.id)&&o.trang_thai_p2!=='da_chot';
    if(p1Open||p2Open)map[norm].chuaChot++;
  });
  const khList=Object.values(map).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
  sel.innerHTML=`<option value="">-- Chọn khách hàng (${khList.length} khách có chuyến kỳ này) --</option>`
    +khList.map(k=>`<option value="${k.name}">${k.name}${k.chuaChot>0?` (${k.chuaChot} chưa chốt)`:''}</option>`).join('');
  if(khList.some(k=>k.name.toLowerCase()===dangChon.toLowerCase()))sel.value=dangChon;
}

// Khung checkbox "Hiện cả đã chốt" — DÙNG CHUNG ở mọi nơi cần hiện (tránh viết lặp 2 bản khác nhau dễ lệch UI)
function renderHienDaChotBar(hienDaChot,m,y,label='Hiện cả chuyến/cont đã chốt',inputId='bk-hien-da-chot',onchangeFn='loadBangKe()'){
  return `<div style="display:inline-flex;align-items:center;gap:8px;background:#f5f7f8;border:1px solid var(--border);border-radius:var(--r);padding:7px 12px;margin:0 0 12px 0">
    <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--text-muted);margin:0;white-space:nowrap">
      <input type="checkbox" id="${inputId}" ${hienDaChot?'checked':''} onchange="${onchangeFn}" style="margin:0">
      <span>${label} (kỳ T${m}/${y})</span>
    </label>
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
  // QUAN TRỌNG: đọc checkbox "Hiện cả đã chốt" TRƯỚC khi xóa res.innerHTML — checkbox này nằm
  // bên trong #bk-result nên nếu xóa trước sẽ luôn đọc ra null/false (bug v2.8 đã gặp khi test)
  const hienDaChot=document.getElementById('bk-hien-da-chot')?.checked||false;
  res.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  canhbao.innerHTML='';

  const canChot=canSee(['ke_toan','ceo']);
  const lastDay=new Date(parseInt(y),parseInt(m),0).getDate(); // ngày cuối tháng đúng
  const dateTo=`${y}-${m.padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

  // Load TẤT CẢ đơn locked=true của khách tính đến cuối tháng đang xem (KHÔNG chặn đầu tháng nữa)
  // — chuyến chưa chốt cước (P1) hoặc chưa chốt chi hộ có HĐ (P2) từ kỳ trước sẽ tự kéo dồn vào đây (v2.8)
  const{data:orders}=await db.from('van_don').select('*')
    .ilike('ten_khach',khName.trim()).eq('locked',true)
    .lte('ngay',dateTo)
    .order('ngay',{ascending:true}).order('so_bill',{ascending:true});

  const allOrders=orders||[];
  if(!allOrders.length){
    res.innerHTML='<div class="empty"><i class="ti ti-inbox"></i>Không có đơn nào trong kỳ này</div>';
    return;
  }

  // Lấy TRƯỚC chi_ho của TOÀN BỘ allOrders (chưa lọc) — để biết đúng đơn nào THỰC SỰ có
  // chi hộ Phần 2 (có HĐ). Đơn không hề có chi hộ HĐ thì Phần 2 là "không áp dụng", KHÔNG được
  // coi là "còn chưa chốt" — nếu không sẽ bị kẹt vĩnh viễn vì trang_thai_p2 mặc định là chua_chot
  // và không có dòng nào ở Phần 2 để mà tick chốt (bug đã gặp khi CEO test C P WORLD).
  const allIds=allOrders.map(o=>o.id);
  const{data:chiHoBroad}=await db.from('chi_ho').select('*').in('van_don_id',allIds).eq('la_tham_chieu',false).order('ngay_chi',{ascending:true});
  const idsWithP2=new Set((chiHoBroad||[]).filter(c=>c.hoa_don_khach).map(c=>c.van_don_id));

  // Giữ lại: (1) còn việc chưa chốt ở P1 hoặc P2 (P2 chỉ tính khi đơn thực có chi hộ HĐ); (2) đã chốt nhưng ĐÚNG kỳ đang xem + đang bật "Hiện cả đã chốt"
  const list=allOrders.filter(o=>{
    const p1Open=o.trang_thai_bang_ke!=='da_chot';
    const p2Open=idsWithP2.has(o.id)&&o.trang_thai_p2!=='da_chot';
    if(p1Open||p2Open)return true;
    return hienDaChot&&(o.ky_chot_cuoc===thang||o.ky_chot_p2===thang);
  });
  if(!list.length){
    res.innerHTML=renderHienDaChotBar(hienDaChot,m,y)+`<div class="empty"><i class="ti ti-inbox"></i>Tất cả ${allOrders.length} chuyến/cont của khách trong kỳ này đã chốt xong — tick "Hiện cả đã chốt" ở trên để xem lại</div>`;
    return;
  }
  // Tách riêng theo từng phần — 1 chuyến có thể chỉ còn việc ở P1 hoặc chỉ còn ở P2, độc lập nhau
  const listP1=list.filter(o=>o.trang_thai_bang_ke!=='da_chot'||(hienDaChot&&o.ky_chot_cuoc===thang));
  const hasOpenP1=listP1.some(o=>o.trang_thai_bang_ke!=='da_chot'); // còn dòng chưa chốt thật thì mới cần hiện nút Chốt
  const idsP2Open=new Set(list.filter(o=>(idsWithP2.has(o.id)&&o.trang_thai_p2!=='da_chot')||(hienDaChot&&o.ky_chot_p2===thang)).map(o=>o.id));

  // Lọc chi_ho từ tập đã fetch sẵn (chiHoBroad) theo đúng các đơn còn hiện trong list — KHÔNG fetch lại DB
  const idsSet=new Set(list.map(o=>o.id));
  const chiHoAll=(chiHoBroad||[]).filter(c=>idsSet.has(c.van_don_id));
  const chiHoMap={};
  (chiHoAll||[]).forEach(ch=>{
    if(!chiHoMap[ch.van_don_id])chiHoMap[ch.van_don_id]=[];
    chiHoMap[ch.van_don_id].push(ch);
  });

  // Tách P1 / P2 — CHỈ giữ chi hộ thuộc đúng tập đang hiện ở mỗi phần (P1/P2 độc lập trạng thái)
  const idsP1=new Set(listP1.map(o=>o.id));
  const chiHoP2=(chiHoAll||[]).filter(c=>c.hoa_don_khach&&idsP2Open.has(c.van_don_id));
  const chiHoP1=(chiHoAll||[]).filter(c=>!c.hoa_don_khach&&idsP1.has(c.van_don_id));

  // Chuyến "chuyển kỳ" (để tái dùng sheet Excel đã có sẵn) — tính trực tiếp từ ngày chạy thực tế
  const chuyenChuyenKy=listP1.filter(o=>(o.ngay||'').slice(0,7)!==thang);

  // Tính tổng — dựa trên đúng tập đang hiện của Phần 1
  const tongCuoc=listP1.reduce((s,o)=>s+(+o.gia_cuoc_khach||0),0);
  const tongDV=listP1.reduce((s,o)=>s+(+o.phi_doi_lenh||0)+(+o.phi_to_khai||0),0);
  const tongP1=chiHoP1.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
  const tongP2=chiHoP2.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
  const VAT_RATE=0.08;
  const tongTruocVAT=tongCuoc+tongDV+tongP1;
  const vatP1=Math.round(tongTruocVAT*VAT_RATE);
  const tongPhaiThu=tongTruocVAT+vatP1+tongP2;
  // Flags ẩn/hiện cột động
  const coTK=listP1.some(o=>+o.phi_to_khai>0);
  const coLachHuyenCH=chiHoP1.some(c=>c.loai_chi?.includes('Lạch Huyện'));

  // Gom theo bill/booking — chỉ các chuyến Phần 1 còn hiện
  const groups={};
  listP1.forEach(o=>{
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
      const kyGocThuc=(o.ngay||'').slice(0,7);
      const kyGocNote=kyGocThuc&&kyGocThuc!==thang?`<span style="background:#fef3c7;color:#92400e;border-radius:3px;padding:0 4px;font-size:10px;margin-left:3px">Từ T${kyGocThuc.split('-')[1]}/${kyGocThuc.split('-')[0]}</span>`:'';
      const daChotP1=o.trang_thai_bang_ke==='da_chot';
      const ctrlP1=!canChot?'':daChotP1
        ?`<button class="btn-xs" onclick="huyChotP1('${o.id}')" title="Hủy chốt cước"><i class="ti ti-arrow-back-up"></i></button>`
        :`<input type="checkbox" class="bk-p1-chk" value="${o.id}" checked>`;
      p1Rows+=`<tr${daChotP1?' style="opacity:.6"':''}>
        ${canChot?`<td>${ctrlP1}</td>`:''}
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
        <td colspan="${canChot?9:8}" style="color:var(--text-muted)">Cộng ${items[0].loai_hang==='Nhập'?'Bill':'Booking'}: ${bill}</td>
        <td class="fw6">${fmt(subCuoc)}</td>
        <td></td><td></td>
        <td colspan="${chiHoTypes.length}"></td>
        <td style="font-weight:700;color:var(--teal)">${fmt(subTotal)}</td>
        <td></td>
      </tr>`;
    }
  });

  // PHẦN 2 — gom theo số cont, mỗi cont 1 dòng (trạng thái chốt độc lập với Phần 1)
  const p2ByCont={};
  chiHoP2.forEach(c=>{
    const o=list.find(x=>x.id===c.van_don_id);
    const key=o?.so_cont||c.ma_don||c.van_don_id;
    if(!p2ByCont[key])p2ByCont[key]={cont:key,items:[],order:o};
    p2ByCont[key].items.push(c);
  });
  let p2Rows='';
  Object.entries(p2ByCont).forEach(([cont,{items,order}],i)=>{
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
    const daChotP2=order?.trang_thai_p2==='da_chot';
    const ctrlP2=!canChot?'':daChotP2
      ?`<button class="btn-xs" onclick="huyChotP2('${order.id}')" title="Hủy chốt chi hộ"><i class="ti ti-arrow-back-up"></i></button>`
      :`<input type="checkbox" class="bk-p2-chk" value="${order?.id||''}" checked>`;
    p2Rows+=`<tr${daChotP2?' style="opacity:.6"':''}>
      ${canChot?`<td>${ctrlP2}</td>`:''}
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
  const hasOpenP2=Object.values(p2ByCont).some(({order})=>order?.trang_thai_p2!=='da_chot'); // còn cont chưa chốt thật thì mới cần hiện nút Chốt

  // Lưu data vào window để xuất Excel
  window.BK_DATA={list,listAll:list,listP1,chiHoAll:chiHoAll||[],groups,chiHoTypes,chiHoP1,chiHoP2,chuyenChuyenKy,khName,thang,m,y,tongCuoc,tongDV,tongP1,tongP2,tongTruocVAT,vatP1,tongPhaiThu,coTK,coLachHuyenCH};

  // Build HTML
  const colP1=`${canChot?'<col style="width:26px">':''}<col style="width:28px"><col style="width:76px"><col style="width:100px"><col style="width:48px"><col style="width:90px"><col style="width:52px"><col style="width:140px"><col style="width:68px"><col style="width:78px"><col style="width:68px">${coTK?'<col style="width:68px">':''}${chiHoTypes.map(()=>'<col style="width:72px">').join('')}<col style="width:80px"><col style="width:100px">`;

  const toolbarChot=renderHienDaChotBar(hienDaChot,m,y);

  const html=`
  ${toolbarChot}
  <div id="print-area">
  <!-- HEADER -->
  <div style="text-align:center;margin-bottom:16px">
    <div style="font-size:15px;font-weight:700;color:var(--teal)">CÔNG TY CỔ PHẦN BN CHAIN</div>
    <div style="font-size:11px;color:var(--text-muted)">215 Đường Nguyễn Phong Sắc, Phương Liễu, Bắc Ninh | MST: 2301342748</div>
    <div style="font-size:14px;font-weight:700;margin-top:8px;text-transform:uppercase">BẢNG KÊ KIÊM BIÊN BẢN XÁC NHẬN KHỐI LƯỢNG DỊCH VỤ</div>
    <div style="font-size:13px;font-weight:600">THÁNG ${m}/${y}</div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Khách hàng: <strong>${khName}</strong> | ${listP1.length} chuyến (P1) · ${Object.keys(p2ByCont).length} cont (P2)</div>
  </div>

  <!-- PHẦN 1 -->
  <div style="margin-bottom:16px">
    <div style="background:var(--teal);color:#fff;padding:8px 12px;border-radius:var(--r) var(--r) 0 0;font-size:12px;font-weight:600;display:flex;justify-content:space-between">
      <span><i class="ti ti-truck"></i> PHẦN 1: CƯỚC VẬN CHUYỂN & PHÍ PHÁT SINH</span>
      <span>${fmtM(tongCuoc+tongDV+tongP1)}</span>
    </div>
    <div class="tbl-wrap" style="${(canChot&&hasOpenP1)?'border-radius:0':'border-radius:0 0 var(--r) var(--r)'}">
    <table class="tbl">
      <colgroup>${colP1}</colgroup>
      <thead>
        <tr>
          ${canChot?'<th></th>':''}
          <th>STT</th><th>Ngày</th><th>Mã đơn</th><th>Loại</th>
          <th>Số cont</th><th>Loại cont</th><th>Tuyến đường</th><th>BKS</th>
          <th>Cước</th><th>Đổi lệnh</th>${coTK?'<th>Tờ khai</th>':''}
          ${chiHoTypes.map(t=>`<th style="font-size:10px">${t}</th>`).join('')}
          <th style="background:#f0f9f0">Tổng</th><th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>${p1Rows}
        <tr style="background:#e8f4f7;font-weight:700;font-size:12px">
          <td colspan="${canChot?9:8}">CỘNG PHẦN 1</td>
          <td class="text-blue">${fmt(tongCuoc)}</td>
          <td>${fmt(listP1.reduce((s,o)=>s+(+o.phi_doi_lenh||0),0))}</td>
          ${coTK?`<td>${fmt(listP1.reduce((s,o)=>s+(+o.phi_to_khai||0),0))}</td>`:''}
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
    ${(canChot&&hasOpenP1)?`<div style="background:#eaf4f4;border-radius:0 0 var(--r) var(--r);padding:8px 12px;display:flex;justify-content:flex-end;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--text-muted)">Mặc định tick hết — bỏ tick chuyến nào khách còn dispute trước khi chốt</span>
      <button class="btn btn-teal btn-sm" onclick="chotBangKeP1()"><i class="ti ti-checkbox"></i> Chốt cước đã chọn (Phần 1)</button>
    </div>`:''}
  </div>

  <!-- PHẦN 2 — gộp vào bảng chính theo từng cont, giống file mẫu -->
  ${chiHoP2.length?`
  <div style="margin-bottom:16px">
    <div style="background:var(--primary);color:#fff;padding:8px 12px;border-radius:var(--r) var(--r) 0 0;font-size:12px;font-weight:600;display:flex;justify-content:space-between">
      <span><i class="ti ti-receipt"></i> PHẦN 2: CHI HỘ CÓ HÓA ĐƠN (Nâng / Hạ / CSHT)</span>
      <span>${fmtM(tongP2)}</span>
    </div>
    <div class="tbl-wrap" style="${(canChot&&hasOpenP2)?'border-radius:0':'border-radius:0 0 var(--r) var(--r)'}">
    <table class="tbl">
      <colgroup>
        ${canChot?'<col style="width:26px">':''}
        <col style="width:30px"><col style="width:110px"><col style="width:80px">
        <col style="width:90px"><col style="width:80px">
        <col style="width:90px"><col style="width:80px">
        <col style="width:90px"><col style="width:80px">
        <col style="width:100px">
      </colgroup>
      <thead>
        <tr>
          ${canChot?'<th rowspan="2"></th>':''}
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
          <td colspan="${canChot?11:10}">TỔNG CHI HỘ CÓ HÓA ĐƠN</td>
          <td style="color:var(--primary)">${fmtM(tongP2)}</td>
        </tr>
      </tbody>
    </table>
    </div>
    ${(canChot&&hasOpenP2)?`<div style="background:#eef3ea;border-radius:0 0 var(--r) var(--r);padding:8px 12px;display:flex;justify-content:flex-end;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--text-muted)">Cont nào chưa đủ hóa đơn cứ để chưa chốt — tự trôi sang kỳ sau</span>
      <button class="btn btn-teal btn-sm" onclick="chotBangKeP2()"><i class="ti ti-checkbox"></i> Chốt chi hộ đã chọn (Phần 2)</button>
    </div>`:''}
  </div>`:''}

  <!-- TỔNG CỘNG — theo đúng form file mẫu -->
  <div style="background:var(--sidebar-bg);border-radius:var(--rl);padding:16px 20px;color:#fff;margin-bottom:16px">
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:10px">
      <div style="font-size:11px;opacity:.6">TỔNG CỘNG — ${khName} — Tháng ${m}/${y} — ${listP1.length} chuyến</div>
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
  </div>`;

  res.innerHTML=html;

  // Hiện nút Xuất Excel và In
  document.getElementById('btn-xuat-excel').style.display='';
  document.getElementById('btn-in').style.display='';

  // Đánh dấu trang_thai_bang_ke = cho_khach cho các đơn Phần 1 chưa chốt
  const chuaChot2=listP1.filter(o=>!o.trang_thai_bang_ke||o.trang_thai_bang_ke==='chua_chot');
  if(chuaChot2.length){
    await db.from('van_don').update({trang_thai_bang_ke:'cho_khach',ky_thanh_toan:thang})
      .in('id',chuaChot2.map(o=>o.id));
  }
}

// ===== CHỐT / HỦY CHỐT BẢNG KÊ KHÁCH (v2.8) =====
// Phần 1 (Cước + phí phát sinh không HĐ) — chốt theo TỪNG CHUYẾN, tick sẵn mặc định, bỏ tick chuyến dispute
async function chotBangKeP1(){
  const checked=[...document.querySelectorAll('.bk-p1-chk:checked')].map(c=>c.value);
  if(!checked.length){toast('Chưa chọn chuyến nào để chốt','error');return;}
  const thang=document.getElementById('bk-thang').value;
  if(!confirm(`Xác nhận khách đã chốt CƯỚC cho ${checked.length} chuyến đã chọn?`))return;
  const{error}=await db.from('van_don').update({
    trang_thai_bang_ke:'da_chot',ky_chot_cuoc:thang,ngay_chot_cuoc:new Date().toISOString()
  }).in('id',checked);
  if(error){toast('Lỗi chốt bảng kê: '+error.message,'error');return;}
  toast(`✅ Đã chốt cước ${checked.length} chuyến`,'success');
  await reloadKhDropdown();
  await loadBangKe();
}
async function huyChotP1(id){
  if(!confirm('Hủy chốt cước chuyến này? Chuyến sẽ quay lại danh sách chưa chốt.'))return;
  const{error}=await db.from('van_don').update({
    trang_thai_bang_ke:'chua_chot',ky_chot_cuoc:null,ngay_chot_cuoc:null
  }).eq('id',id);
  if(error){toast('Lỗi hủy chốt: '+error.message,'error');return;}
  toast('Đã hủy chốt cước','success');
  await reloadKhDropdown();
  await loadBangKe();
}
// Phần 2 (Chi hộ có HĐ — Nâng/hạ, CSHT) — chốt theo TỪNG CONT, độc lập hoàn toàn với Phần 1
async function chotBangKeP2(){
  const checked=[...document.querySelectorAll('.bk-p2-chk:checked')].map(c=>c.value).filter(Boolean);
  if(!checked.length){toast('Chưa chọn cont nào để chốt','error');return;}
  const thang=document.getElementById('bk-thang').value;
  if(!confirm(`Xác nhận chốt CHI HỘ CÓ HĐ (Phần 2) cho ${checked.length} cont đã chọn?`))return;
  const{error}=await db.from('van_don').update({
    trang_thai_p2:'da_chot',ky_chot_p2:thang,ngay_chot_p2:new Date().toISOString()
  }).in('id',checked);
  if(error){toast('Lỗi chốt Phần 2: '+error.message,'error');return;}
  toast(`✅ Đã chốt chi hộ ${checked.length} cont`,'success');
  await reloadKhDropdown();
  await loadBangKe();
}
async function huyChotP2(id){
  if(!confirm('Hủy chốt chi hộ (Phần 2) cho cont này? Cont sẽ quay lại danh sách chưa chốt.'))return;
  const{error}=await db.from('van_don').update({
    trang_thai_p2:'chua_chot',ky_chot_p2:null,ngay_chot_p2:null
  }).eq('id',id);
  if(error){toast('Lỗi hủy chốt: '+error.message,'error');return;}
  toast('Đã hủy chốt chi hộ','success');
  await reloadKhDropdown();
  await loadBangKe();
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

  const{list,listAll,chiHoAll,chiHoTypes,chiHoP1,chiHoP2,groups,chuyenChuyenKy,
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
      const kyGocThucExcel=(o.ngay||'').slice(0,7);
      const kyNote=kyGocThucExcel&&kyGocThucExcel!==thang?`[T${kyGocThucExcel.split('-')[1]}] `:'';
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
      const o=(listAll||list).find(x=>x.id===c.van_don_id);
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
      ...chuyenChuyenKy.map(o=>{
        const kg=(o.ngay||'').slice(0,7);
        return[o.ma_don,fmtDate(o.ngay),o.so_cont||'',
        o.hanh_trinh||'',
        kg?`T${kg.split('-')[1]}/${kg.split('-')[0]}`:'',
        '']; // lý do chuyển: chưa thu thập, để trống
      })
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

// ============ BẢNG KÊ TRẢ THẦU PHỤ (chọn thầu + tháng, giống Bảng kê thu khách) ============
async function pgTraThau(c){
  if(!canSee(['ke_toan','ceo','thu_quy'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
  const now=new Date();
  const curY=now.getFullYear();
  const thOpts=Array.from({length:6},(_,i)=>{
    const d=new Date(curY,now.getMonth()-i,1);
    const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return`<option value="${v}" ${i===0?'selected':''}>Tháng ${d.getMonth()+1}/${d.getFullYear()}</option>`;
  }).join('');

  c.innerHTML=`
  <div class="toolbar" style="margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <select id="tt-thau" class="filter-sel" style="min-width:220px"><option value="">-- Đang tải thầu phụ... --</option></select>
    <select id="tt-thang" class="filter-sel" onchange="reloadThauDropdown()">${thOpts}</select>
    <button class="btn btn-teal" onclick="loadBangKeThau()"><i class="ti ti-search"></i> Xem bảng kê</button>
    <button class="btn" onclick="window.print()" id="tt-btn-in" style="display:none"><i class="ti ti-printer"></i> In</button>
  </div>
  <div id="tt-canhbao"></div>
  <div id="tt-result" style="color:var(--text-muted);font-size:13px;padding:10px 0">
    Chọn thầu phụ và tháng để xem bảng kê trả thầu.
  </div>`;
  await reloadThauDropdown();
}

// Nạp lại dropdown thầu phụ — kéo dồn đến cuối tháng đang chọn (giống bảng kê khách), kèm đếm
// "(X chưa chốt)" cạnh tên thầu dựa trên trang_thai_chot_thau (chốt trả thầu — ĐỘC LẬP với chốt khách)
async function reloadThauDropdown(){
  const sel=document.getElementById('tt-thau');
  const thang=document.getElementById('tt-thang')?.value;
  if(!sel||!thang)return;
  const[y,m]=thang.split('-');
  const lastDay=new Date(+y,+m,0).getDate();
  const dateTo=`${y}-${m.padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  const dangChon=sel.value;
  sel.innerHTML='<option value="">-- Đang tải... --</option>';
  const{data}=await db.from('van_don').select('ma_thau_phu,trang_thai_chot_thau').eq('locked',true)
    .lte('ngay',dateTo)
    .not('ma_thau_phu','is',null).neq('ma_thau_phu','');
  const map={};
  (data||[]).forEach(o=>{
    const raw=(o.ma_thau_phu||'').trim();
    if(!raw)return;
    const norm=raw.toLowerCase();
    if(!map[norm])map[norm]={name:raw,chuaChot:0};
    if(o.trang_thai_chot_thau!=='da_chot')map[norm].chuaChot++;
  });
  const thauList=Object.values(map).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
  sel.innerHTML=`<option value="">-- Chọn thầu phụ (${thauList.length} thầu có chuyến kỳ này) --</option>`
    +thauList.map(t=>`<option value="${t.name}">${t.name}${t.chuaChot>0?` (${t.chuaChot} chưa chốt)`:''}</option>`).join('');
  if(thauList.some(t=>t.name.toLowerCase()===dangChon.toLowerCase()))sel.value=dangChon;
}

async function loadBangKeThau(){
  const tpVal=document.getElementById('tt-thau').value;
  const thang=document.getElementById('tt-thang').value;
  if(!tpVal){toast('Vui lòng chọn thầu phụ','error');return;}
  const maThau=tpVal,tenThau=tpVal;
  const[y,m]=thang.split('-');
  const res=document.getElementById('tt-result');
  const canhbao=document.getElementById('tt-canhbao');
  const btnIn=document.getElementById('tt-btn-in');
  // QUAN TRỌNG: đọc checkbox "Hiện cả đã chốt" TRƯỚC khi xóa res.innerHTML (cùng bug đã gặp ở bảng kê khách)
  const hienDaChotThau=document.getElementById('tt-hien-da-chot')?.checked||false;
  const canChot=canSee(['ke_toan','ceo']);
  res.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  canhbao.innerHTML='';
  btnIn.style.display='none';

  const lastDay=new Date(parseInt(y),parseInt(m),0).getDate();
  const dateFrom=`${y}-${m.padStart(2,'0')}-01`;
  const dateTo=`${y}-${m.padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

  // DEBUG — toàn bộ đơn của thầu TRONG ĐÚNG THÁNG đang chọn (kể cả chưa khóa/chưa cước)
  // — dùng để phát hiện đơn "thiếu" dữ liệu, KHÔNG liên quan đến việc đã chốt trả thầu hay chưa
  const{data:debugAll}=await db.from('van_don').select('id,ma_don,locked,gia_cuoc_thau,thanh_toan_thau,ngay')
    .ilike('ma_thau_phu',maThau.trim()).gte('ngay',dateFrom).lte('ngay',dateTo);
  console.log(`[BK Thầu DEBUG] Tổng đơn "${tenThau}" tháng ${thang} (chưa filter locked/cước):`,debugAll?.length||0);

  // Bảng kê chính — KÉO DỒN giống bảng kê khách: lấy mọi chuyến đã khóa của thầu tính đến cuối
  // tháng đang xem; chuyến nào CHƯA chốt trả thầu (cước thầu + phát sinh) sẽ tự trôi sang kỳ sau
  const{data:orders}=await db.from('van_don').select('id,ma_don,ngay,ten_khach,hanh_trinh,ten_lai_xe,gia_cuoc_thau,thanh_toan_thau,ma_thau_phu,so_cont,loai_cont,loai_hang,loai_chuyen,bien_kiem_soat,locked,loai_phan_loai_xe,tra_thau_doi_lenh,trang_thai_chot_thau,ky_chot_thau,trang_thai_bang_ke,ky_chot_cuoc')
    .ilike('ma_thau_phu',maThau.trim()).eq('locked',true)
    .lte('ngay',dateTo)
    .order('ngay',{ascending:true});
  const allOrders=orders||[];

  // Giữ lại: còn chưa chốt trả thầu (mọi kỳ cũ); hoặc đã chốt nhưng ĐÚNG kỳ đang xem + đang bật "Hiện cả đã chốt"
  const list=allOrders.filter(o=>{
    if(o.trang_thai_chot_thau!=='da_chot')return true;
    return hienDaChotThau&&o.ky_chot_thau===thang;
  });
  const hasOpenThau=list.some(o=>o.trang_thai_chot_thau!=='da_chot'); // còn dòng chưa chốt thật thì mới cần hiện nút Chốt

  let canhbaoHtml='';

  // Cảnh báo 0 (MỚI, đặt đầu tiên — nổi bật nhất) — tổng hợp chuyến khách CHƯA chốt cước trong bảng kê này.
  // Chỉ là note tham khảo cho kế toán cân nhắc, KHÔNG chặn việc chốt trả thầu.
  const chuaChotKhach=list.filter(o=>o.trang_thai_bang_ke!=='da_chot');
  if(chuaChotKhach.length){
    canhbaoHtml+=`<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:var(--r);padding:8px 14px;margin-bottom:8px;font-size:12px;display:flex;align-items:center;gap:8px">
      <i class="ti ti-alert-triangle" style="color:#dc2626;font-size:18px"></i>
      <span><strong style="color:#991b1b">${chuaChotKhach.length}/${list.length} chuyến trong bảng kê này — KHÁCH CHƯA CHỐT CƯỚC</strong> — cân nhắc trước khi trả thầu:
      ${chuaChotKhach.slice(0,6).map(o=>`<span style="background:#fef2f2;border-radius:3px;padding:1px 5px;font-weight:600">${o.ma_don}</span>`).join(' ')}
      ${chuaChotKhach.length>6?` và ${chuaChotKhach.length-6} chuyến khác`:''}</span>
    </div>`;
  }

  // Cảnh báo 1: chuyến của thầu TRONG ĐÚNG THÁNG nhưng chưa khóa/chưa nhập cước — đối chiếu với
  // allOrders (chưa lọc theo chốt) để KHÔNG báo nhầm các chuyến đã chốt trả thầu kỳ trước (đúng ý, không phải thiếu)
  const thieu=(debugAll||[]).filter(o=>!allOrders.some(x=>x.id===o.id));
  if(thieu.length){
    canhbaoHtml+=`<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:var(--r);padding:8px 14px;margin-bottom:8px;font-size:12px;display:flex;align-items:center;gap:8px">
      <i class="ti ti-alert-triangle" style="color:#d97706;font-size:16px"></i>
      <span><strong style="color:#92400e">${thieu.length} chuyến của "${tenThau}" trong tháng ${m}/${y} chưa vào bảng kê</strong> —
      ${thieu.slice(0,5).map(o=>`<span style="background:#fef9c3;border-radius:3px;padding:1px 4px">${o.ma_don}${!o.locked?' (chưa khóa)':(+o.gia_cuoc_thau||0)<=0?' (chưa có cước)':''}</span>`).join(' ')}
      ${thieu.length>5?` và ${thieu.length-5} chuyến khác`:''}</span>
    </div>`;
  }

  // Cảnh báo 2 — đối chiếu lái xe để bắt lỗi gõ sai mã thầu, dựa trên allOrders (mọi kỳ, không chỉ tháng này)
  const taiXeSet=[...new Set(allOrders.map(o=>o.ten_lai_xe).filter(Boolean))];
  let leak=[];
  if(taiXeSet.length){
    const{data:leakData}=await db.from('van_don').select('id,ma_don,ngay,ten_lai_xe,ma_thau_phu,gia_cuoc_thau')
      .in('ten_lai_xe',taiXeSet).eq('locked',true)
      .gte('ngay',dateFrom).lte('ngay',dateTo);
    const maThauNorm=maThau.trim().toLowerCase();
    leak=(leakData||[]).filter(o=>(o.ma_thau_phu||'').trim().toLowerCase()!==maThauNorm);
  }
  if(leak.length){
    canhbaoHtml+=`<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:var(--r);padding:8px 14px;margin-bottom:8px;font-size:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <i class="ti ti-alert-octagon" style="color:var(--danger);font-size:16px"></i>
        <strong style="color:#991b1b">Phát hiện ${leak.length} chuyến CÙNG lái xe (${taiXeSet.join(', ')}) nhưng đang gắn mã thầu phụ khác/trống — rất có thể đây là phần bị "thiếu" anh đang thấy:</strong>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
      ${leak.slice(0,10).map(o=>`<span style="background:#fef2f2;border-radius:3px;padding:1px 5px">${o.ma_don} (${o.ma_thau_phu?'mã: "'+o.ma_thau_phu+'"':'chưa có mã thầu'})</span>`).join('')}
      ${leak.length>10?`<span>và ${leak.length-10} chuyến khác</span>`:''}
      </div>
      <div style="margin-top:4px;color:#7f1d1d">→ Vào từng đơn này, mở tab "Xe & Lái xe", sửa lại đúng mã thầu phụ <strong>${maThau}</strong> rồi khóa đơn lại để vào đúng bảng kê.</div>
    </div>`;
  }

  canhbao.innerHTML=canhbaoHtml;

  const toggleBar=renderHienDaChotBar(hienDaChotThau,m,y,'Hiện cả chuyến đã chốt trả thầu','tt-hien-da-chot','loadBangKeThau()');

  if(!allOrders.length){
    res.innerHTML='<div class="empty"><i class="ti ti-inbox"></i>Không có đơn đã khóa của thầu này trong kỳ này</div>';
    return;
  }
  if(!list.length){
    res.innerHTML=toggleBar+`<div class="empty"><i class="ti ti-inbox"></i>Tất cả ${allOrders.length} chuyến của thầu này đã chốt trả thầu xong — tick "Hiện cả đã chốt trả thầu" ở trên để xem lại</div>`;
    return;
  }

  // Chi hộ trả thầu phát sinh (join theo van_don_id, không snapshot)
  let chiHoMap={};
  const{data:chiHoRows}=await db.from('chi_ho').select('van_don_id,tien_tra_thau,tien_tra_laixe').in('van_don_id',list.map(o=>o.id));
  (chiHoRows||[]).forEach(r=>{
    if(!chiHoMap[r.van_don_id])chiHoMap[r.van_don_id]={traThau:0,traLX:0};
    chiHoMap[r.van_don_id].traThau+=(+r.tien_tra_thau||0);
    chiHoMap[r.van_don_id].traLX+=(+r.tien_tra_laixe||0);
  });
  list.forEach(o=>{
    const ch0=chiHoMap[o.id]||{traThau:0,traLX:0};
    o._traThauThem=ch0.traThau;
    o._traLX=ch0.traLX;
    o._traDL=+o.tra_thau_doi_lenh||0;
    o._thucTra=(+o.gia_cuoc_thau||0)+o._traThauThem+o._traDL-(o.loai_phan_loai_xe==='thau_thue_lai'?o._traLX:0);
  });

  // Chi hộ chưa thu hồi (Dầu, Sửa xe, Trả nợ thầu...) — module Chi phí, riêng cho thầu này
  let chThau={tong:0,items:[]};
  try{
    const[r1,r2]=await Promise.all([
      db.from('chi_phi').select('id,loai_chi_phi,so_tien,ngay').eq('ma_thau_phu',maThau).eq('can_kiem_soat',true).eq('trang_thai_thu_hoi','chua_thu_hoi'),
      db.from('dau_xuat').select('id,so_lit,thanh_tien,ngay_do').eq('ma_thau_phu',maThau).eq('trang_thai_thu_hoi','chua_thu_hoi'),
    ]);
    (r1.data||[]).forEach(o=>{chThau.tong+=+o.so_tien||0;chThau.items.push({id:o.id,nguon:'chi_phi',label:o.loai_chi_phi,tien:+o.so_tien||0,ngay:o.ngay});});
    (r2.data||[]).forEach(o=>{chThau.tong+=+o.thanh_tien||0;chThau.items.push({id:o.id,nguon:'dau_xuat',label:`Dầu ${o.so_lit} lít`,tien:+o.thanh_tien||0,ngay:o.ngay_do});});
  }catch(err){console.warn('[loadBangKeThau] chưa có bảng chi_phi/dau_xuat — chạy migration trước:',err.message);}

  const tong=list.reduce((s,o)=>s+o._thucTra,0);
  const conPhaiTra=tong-chThau.tong;
  const soDaTra=list.filter(o=>o.thanh_toan_thau==='Đã trả').length;
  const coThauThueLai=list.some(o=>o.loai_phan_loai_xe==='thau_thue_lai');

  res.innerHTML=`
  ${toggleBar}
  <div class="stats-row stats-3" style="margin-bottom:14px">
    <div class="stat-card"><div class="stat-lbl">Tổng trả thầu kỳ này</div><div class="stat-val text-red">${fmtM(tong)}</div></div>
    <div class="stat-card"><div class="stat-lbl">Số chuyến</div><div class="stat-val">${list.length}</div><div class="stat-sub">${soDaTra} đã trả · ${list.length-soDaTra} chưa trả</div></div>
    <div class="stat-card"><div class="stat-lbl">Còn phải trả (đã trừ chi hộ)</div><div class="stat-val text-red">${fmtM(conPhaiTra)}</div></div>
  </div>
  <div class="bk-group">
    <div class="bk-group-header">
      <div class="bk-group-title">${tenThau} — Tháng ${m}/${y}</div>
      <div style="font-size:15px;font-weight:700;color:var(--danger)">${fmtM(tong)}</div>
    </div>
    <table class="tbl">
      <thead><tr>
        ${canChot?'<th></th>':''}
        <th>Ngày</th><th>Mã đơn</th><th>Loại</th><th>Tuyến đường</th><th>Số cont</th><th>Loại cont</th><th>Loại chuyến</th><th>BKS</th>
        <th>Cước thầu</th><th>Chi hộ trả thầu</th><th>Đổi lệnh</th>${coThauThueLai?'<th>Trừ lương LX</th>':''}<th>Tổng phải trả</th><th>Khách đã chốt?</th>
      </tr></thead>
      <tbody>${list.map(o=>{
        const traLX=(o.loai_phan_loai_xe==='thau_thue_lai'&&o._traLX>0)?o._traLX:0;
        const daChotThau=o.trang_thai_chot_thau==='da_chot';
        const ctrl=!canChot?'':daChotThau
          ?`<button class="btn-xs" onclick="huyChotTraThau('${o.id}')" title="Hủy chốt trả thầu"><i class="ti ti-arrow-back-up"></i></button>`
          :`<input type="checkbox" class="tt-chk" value="${o.id}" checked>`;
        const daChotKhach=o.trang_thai_bang_ke==='da_chot';
        // Tag "Khách" làm nổi bật hơn — đậm, có icon, đổi sang đỏ (đúng tông cảnh báo tiền) khi chưa chốt
        const khachTag=daChotKhach
          ?`<span style="background:#dcfce7;color:#166534;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:700;white-space:nowrap;display:inline-flex;align-items:center;gap:4px"><i class="ti ti-check" style="font-size:13px"></i>Đã chốt${o.ky_chot_cuoc?' T'+o.ky_chot_cuoc.split('-')[1]:''}</span>`
          :`<span style="background:#fee2e2;color:#991b1b;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:700;white-space:nowrap;display:inline-flex;align-items:center;gap:4px"><i class="ti ti-alert-triangle" style="font-size:13px"></i>CHƯA CHỐT</span>`;
        // Dòng nào khách chưa chốt → viền trái đỏ + nền hồng nhạt để nổi bật ngay cả khi không nhìn vào cột Khách
        const trStyle=`${daChotThau?'opacity:.6;':''}${!daChotKhach?'background:#fffafa;border-left:3px solid #ef4444;':''}`;
        return`<tr${trStyle?` style="${trStyle}"`:''}>
        ${canChot?`<td>${ctrl}</td>`:''}
        <td>${o.ngay}</td>
        <td style="color:var(--teal);font-weight:600">${o.ma_don}</td>
        <td>${loaiTag(o.loai_hang)}</td>
        <td>${o.hanh_trinh||'—'}</td>
        <td>${o.so_cont||'—'}</td>
        <td>${o.loai_cont||'—'}</td>
        <td>${o.loai_chuyen||'—'}</td>
        <td style="font-weight:600">${o.bien_kiem_soat||'—'}</td>
        <td>${fmtM(o.gia_cuoc_thau)}</td>
        <td>${o._traThauThem>0?fmtM(o._traThauThem):'—'}</td>
        <td>${o._traDL>0?fmtM(o._traDL):'—'}</td>
        ${coThauThueLai?`<td>${traLX>0?'−'+fmtM(traLX):'—'}</td>`:''}
        <td class="text-red fw6">${fmtM(o._thucTra)}</td>
        <td>${khachTag}</td>
      </tr>`;
      }).join('')}</tbody>
    </table>
    ${(canChot&&hasOpenThau)?`<div style="background:#fdecea;border-radius:0 0 var(--r) var(--r);padding:8px 12px;display:flex;justify-content:flex-end;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--text-muted)">Mặc định tick hết — bỏ tick chuyến nào còn cần xem lại trước khi chốt trả thầu</span>
      <button class="btn btn-teal btn-sm" onclick="chotTraThau()"><i class="ti ti-checkbox"></i> Chốt trả thầu đã chọn</button>
    </div>`:''}
    ${chThau.items.length?`<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--r);padding:10px 12px;margin-top:8px">
      <div style="font-size:11px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px"><i class="ti ti-receipt-2"></i> Chi hộ chưa thu hồi (Dầu / Sửa xe / Trả nợ — module Chi phí)</div>
      ${chThau.items.map(it=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0">
        <span>${it.label} · ${it.ngay||'—'}</span><span class="text-orange fw6">${fmtM(it.tien)}</span>
      </div>`).join('')}
      <div style="display:flex;justify-content:space-between;border-top:1px dashed #fde68a;margin-top:6px;padding-top:6px;font-size:12px;font-weight:700">
        <span>Tổng chi hộ chưa thu hồi</span><span class="text-orange">${fmtM(chThau.tong)}</span>
      </div>
      ${canSee(['ke_toan','ceo'])?`<button class="btn btn-xs btn-teal" style="margin-top:8px" onclick='xacNhanThuHoiThau(${JSON.stringify(tenThau)},${JSON.stringify(chThau.items)})'><i class="ti ti-check"></i> Đánh dấu đã thu hồi</button>`:''}
    </div>`:''}
    <div class="bk-total-row"><span>Còn phải trả (đã trừ chi hộ) ${tenThau}</span><span style="color:var(--danger)">${fmtM(conPhaiTra)}</span></div>
  </div>`;
  btnIn.style.display='inline-flex';
}

// ===== CHỐT / HỦY CHỐT TRẢ THẦU PHỤ (v2.8) — cước thầu + phát sinh (chi hộ trả thầu, đổi lệnh, trừ lương LX)
// ĐỘC LẬP hoàn toàn với trạng thái chốt khách (trang_thai_bang_ke) — chốt khách chỉ là note tham khảo ở đây
async function chotTraThau(){
  const checked=[...document.querySelectorAll('.tt-chk:checked')].map(c=>c.value);
  if(!checked.length){toast('Chưa chọn chuyến nào để chốt','error');return;}
  const thang=document.getElementById('tt-thang').value;
  if(!confirm(`Xác nhận chốt TRẢ THẦU (cước + phát sinh) cho ${checked.length} chuyến đã chọn?`))return;
  const{error}=await db.from('van_don').update({
    trang_thai_chot_thau:'da_chot',ky_chot_thau:thang,ngay_chot_thau:new Date().toISOString()
  }).in('id',checked);
  if(error){toast('Lỗi chốt trả thầu: '+error.message,'error');return;}
  toast(`✅ Đã chốt trả thầu ${checked.length} chuyến`,'success');
  await reloadThauDropdown();
  await loadBangKeThau();
}
async function huyChotTraThau(id){
  if(!confirm('Hủy chốt trả thầu cho chuyến này? Chuyến sẽ quay lại danh sách chưa chốt.'))return;
  const{error}=await db.from('van_don').update({
    trang_thai_chot_thau:'chua_chot',ky_chot_thau:null,ngay_chot_thau:null
  }).eq('id',id);
  if(error){toast('Lỗi hủy chốt: '+error.message,'error');return;}
  toast('Đã hủy chốt trả thầu','success');
  await reloadThauDropdown();
  await loadBangKeThau();
}

// Đánh dấu các khoản chi hộ (chi_phi + dau_xuat) của 1 thầu phụ là đã thu hồi (đã trừ vào kỳ trả thầu này)
async function xacNhanThuHoiThau(tenThau,items){
  if(!canSee(['ke_toan','ceo'])){toast('Không có quyền thực hiện','error');return;}
  if(!confirm(`Xác nhận đã trừ ${items.length} khoản chi hộ vào kỳ trả thầu "${tenThau}"?`))return;
  const ky=today().slice(0,7);
  const idsChiPhi=items.filter(i=>i.nguon==='chi_phi').map(i=>i.id);
  const idsDauXuat=items.filter(i=>i.nguon==='dau_xuat').map(i=>i.id);
  try{
    if(idsChiPhi.length)await db.from('chi_phi').update({trang_thai_thu_hoi:'da_thu_hoi',thu_hoi_ky:ky}).in('id',idsChiPhi);
    if(idsDauXuat.length)await db.from('dau_xuat').update({trang_thai_thu_hoi:'da_thu_hoi',thu_hoi_ky:ky}).in('id',idsDauXuat);
    toast('Đã đánh dấu thu hồi');
    loadBangKeThau();
  }catch(err){toast('Lỗi: '+err.message,'error');}
}

// ==================== BẢNG LƯƠNG (Lái xe / Nhân viên — Điều động & Quản lý) ====================
// Không đánh dấu đã trả/chưa trả, không trừ tạm ứng (kế toán tự theo dõi riêng) — chỉ xem số, kéo dồn theo tháng.
let BL_TAB='laixe';

function monthSelectOpts(){
  const now=new Date();const curY=now.getFullYear();
  return Array.from({length:6},(_,i)=>{
    const d=new Date(curY,now.getMonth()-i,1);
    const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return`<option value="${v}" ${i===0?'selected':''}>Tháng ${d.getMonth()+1}/${d.getFullYear()}</option>`;
  }).join('');
}

async function pgBangLuong(c){
  if(!canSee(['ke_toan','ceo','quan_ly'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
  const chiXemLaiXe=!canSee(['ke_toan','ceo']); // Quản lý: chỉ xem Lương lái xe, không xem Lương nhân viên
  if(chiXemLaiXe)BL_TAB='laixe';
  c.innerHTML=`
  <div style="display:flex;gap:8px;margin-bottom:14px;border-bottom:1px solid var(--border)">
    <button class="btn ${BL_TAB==='laixe'?'btn-primary':''}" style="border-radius:var(--r) var(--r) 0 0" onclick="switchBLTab('laixe')"><i class="ti ti-steering-wheel"></i> Lương lái xe</button>
    ${chiXemLaiXe?'':`<button class="btn ${BL_TAB==='nv'?'btn-primary':''}" style="border-radius:var(--r) var(--r) 0 0" onclick="switchBLTab('nv')"><i class="ti ti-user-star"></i> Lương nhân viên</button>`}
  </div>
  <div id="bl-body"></div>`;
  renderBLBody();
}

function switchBLTab(tab){
  if(tab==='nv'&&!canSee(['ke_toan','ceo'])){toast('Không có quyền xem Lương nhân viên','error');return;}
  BL_TAB=tab;pgBangLuong(document.getElementById('content'));
}

function renderBLBody(){
  const body=document.getElementById('bl-body');
  if(!body)return;
  if(BL_TAB==='laixe'){
    body.innerHTML=`
    <div class="toolbar" style="margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <select id="bl-ten" class="filter-sel" style="min-width:220px"><option value="">-- Đang tải... --</option></select>
      <select id="bl-thang" class="filter-sel" onchange="reloadLaiXeDropdown()">${monthSelectOpts()}</select>
      <button class="btn btn-teal" onclick="loadBangLuong()"><i class="ti ti-search"></i> Xem</button>
    </div>
    <div id="bl-result" style="color:var(--text-muted);font-size:13px">Chọn lái xe và tháng để xem lương.</div>`;
    reloadLaiXeDropdown();
  }else{
    const nvList=NV.filter(n=>['nhan_vien','quan_ly'].includes(n.vai_tro));
    const rMap={nhan_vien:'Điều động',quan_ly:'Quản lý'};
    const opts=nvList.map(n=>`<option value="${n.id}">${n.ho_ten} (${rMap[n.vai_tro]||n.vai_tro})</option>`).join('');
    body.innerHTML=`
    <div class="toolbar" style="margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <select id="bl-nv" class="filter-sel" style="min-width:220px"><option value="">-- Chọn nhân viên --</option>${opts}</select>
      <select id="bl-thang" class="filter-sel">${monthSelectOpts()}</select>
      <button class="btn btn-teal" onclick="loadBangLuongNV()"><i class="ti ti-search"></i> Xem</button>
    </div>
    <div id="bl-result" style="color:var(--text-muted);font-size:13px">Chọn nhân viên và tháng để xem lương.</div>`;
  }
}

// Nạp dropdown lái xe — lấy distinct ten_lai_xe trực tiếp từ vận đơn đã khóa (KHÔNG lấy từ danh mục
// lai_xe vì đó chỉ là gợi ý khai báo Xe, tên lái xe thực tế nhập tự do trên từng vận đơn)
async function reloadLaiXeDropdown(){
  const sel=document.getElementById('bl-ten');
  const thang=document.getElementById('bl-thang')?.value;
  if(!sel||!thang)return;
  const[y,m]=thang.split('-');
  const lastDay=new Date(+y,+m,0).getDate();
  const dateFrom=`${y}-${m.padStart(2,'0')}-01`;
  const dateTo=`${y}-${m.padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  const dangChon=sel.value;
  sel.innerHTML='<option value="">-- Đang tải... --</option>';
  const{data}=await db.from('van_don').select('ten_lai_xe').eq('locked',true)
    .gte('ngay',dateFrom).lte('ngay',dateTo)
    .in('loai_phan_loai_xe',['noi_bo','thau_thue_lai'])
    .not('ten_lai_xe','is',null).neq('ten_lai_xe','');
  // Gộp tên trùng nhau nhưng khác hoa/thường (vd "Trần Trung Dũng" vs "TRẦN TRUNG DŨNG") — giữ lại
  // bản viết hoa chữ cái đầu để hiển thị, nhưng khi lọc sẽ dùng ilike nên không lo khớp sai ở bước sau.
  const seen={};
  (data||[]).forEach(o=>{
    const raw=(o.ten_lai_xe||'').trim();
    if(!raw)return;
    const key=chuanHoaTen(raw);
    if(!seen[key])seen[key]=raw;
  });
  const names=Object.values(seen).sort((a,b)=>a.localeCompare(b,'vi'));
  sel.innerHTML=`<option value="">-- Chọn lái xe (${names.length} người có chuyến tháng này) --</option>`
    +names.map(n=>`<option value="${n}">${n}</option>`).join('');
  if(names.includes(dangChon))sel.value=dangChon;
}

// ---- Lương lái xe: tra theo (tỉnh đến, loại chuyến) trong bảng giá gộp + cộng chi_ho.tien_tra_laixe ----
async function loadBangLuong(){
  const ten=document.getElementById('bl-ten').value;
  const thang=document.getElementById('bl-thang').value;
  const res=document.getElementById('bl-result');
  if(!ten){toast('Vui lòng chọn lái xe','error');return;}
  res.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const[y,m]=thang.split('-');
  const lastDay=new Date(+y,+m,0).getDate();
  const dateFrom=`${y}-${m.padStart(2,'0')}-01`;
  const dateTo=`${y}-${m.padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

  // Lấy TOÀN BỘ đơn trong tháng (không lọc theo tên ở tầng SQL) rồi tự so khớp tên bằng chuanHoaTen()
  // ở phía code — tránh phụ thuộc ilike/eq của SQL vốn nhạy với khoảng trắng thừa/kép mà ô nhập tự do
  // ten_lai_xe rất dễ dính (mắt thường không thấy nhưng khiến so khớp chuỗi chính xác bị trượt).
  const{data:monthOrders}=await db.from('van_don').select('id,ma_don,ngay,diem_lay,diem_tra,diem_tra_phat_sinh,loai_chuyen,loai_phan_loai_xe,ten_lai_xe,bien_kiem_soat,ma_thau_phu,so_cont,loai_cont,locked')
    .gte('ngay',dateFrom).lte('ngay',dateTo).order('ngay',{ascending:true});
  const tenChuan=chuanHoaTen(ten);
  const debugAll=(monthOrders||[]).filter(o=>chuanHoaTen(o.ten_lai_xe)===tenChuan);
  const list=debugAll.filter(o=>o.locked&&['noi_bo','thau_thue_lai'].includes(o.loai_phan_loai_xe));

  let canhbaoThieu='';
  const thieu=debugAll.filter(o=>!list.some(x=>x.id===o.id));
  if(thieu.length){
    const chuaKhoa=thieu.filter(o=>!o.locked);
    const saiLoaiXe=thieu.filter(o=>o.locked&&!['noi_bo','thau_thue_lai'].includes(o.loai_phan_loai_xe));
    canhbaoThieu=`<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:var(--r);padding:8px 14px;margin-bottom:10px;font-size:12px">
      <i class="ti ti-alert-triangle" style="color:#d97706"></i>
      <strong style="color:#92400e">${thieu.length} đơn của "${ten}" trong tháng KHÔNG có trong bảng dưới đây:</strong>
      ${chuaKhoa.length?`<div style="margin-top:3px">— ${chuaKhoa.length} đơn <strong>chưa khóa</strong>: ${chuaKhoa.slice(0,8).map(o=>`<span style="background:#fef9c3;border-radius:3px;padding:1px 5px;margin-left:3px">${o.ma_don}</span>`).join('')}${chuaKhoa.length>8?' và '+(chuaKhoa.length-8)+' đơn khác':''}</div>`:''}
      ${saiLoaiXe.length?`<div style="margin-top:3px">— ${saiLoaiXe.length} đơn đang gắn loại xe <strong>Thầu tự lái</strong> (không tính lương): ${saiLoaiXe.slice(0,8).map(o=>`<span style="background:#fef9c3;border-radius:3px;padding:1px 5px;margin-left:3px">${o.ma_don}</span>`).join('')}</div>`:''}
    </div>`;
  }

  if(!list.length){res.innerHTML=canhbaoThieu+'<div class="empty"><i class="ti ti-inbox"></i>Không có chuyến đã khóa của lái xe này trong tháng</div>';return;}

  const{data:chiHoRows}=await db.from('chi_ho').select('van_don_id,tien_tra_laixe').in('van_don_id',list.map(o=>o.id));
  const chMap={};
  (chiHoRows||[]).forEach(r=>{chMap[r.van_don_id]=(chMap[r.van_don_id]||0)+(+r.tien_tra_laixe||0);});

  let thieuGia=[];
  const gia=CH_LUONG.bang_gia_tinh||{};
  const rows=list.map(o=>{
    // Chuyến KHÔNG TRUCKING — không có xe chạy thật, không tính lương chuyến cho lái xe (chỉ giữ
    // lại phần chi_ho.tien_tra_laixe nếu có phát sinh thực tế khác được nhập tay).
    const khongTrucking=/kh[oô]ng\s*trucking/i.test((o.diem_tra||'')+' '+(o.diem_tra_phat_sinh||''));
    const traLX=chMap[o.id]||0;
    if(khongTrucking)return{...o,tinh:null,luongChuyen:0,khongTrucking,traLX,tong:traLX};
    const ddTra=DD.find(d=>d.ten_chuan===o.diem_tra);
    const tinh=ddTra?tinhTuDiaPhuong(ddTra.dia_phuong):null;
    const g=tinh?gia[tinh]:null;
    const laKetHop=o.loai_chuyen==='Kết hợp'||o.loai_chuyen==='Kẹp ghép';
    const luongChuyen=g?(laKetHop?(+g.ket_hop||0):(+g.thuong||0)):null;
    if(luongChuyen===null)thieuGia.push(o.ma_don);
    return{...o,tinh,luongChuyen:luongChuyen||0,khongTrucking,traLX,tong:(luongChuyen||0)+traLX};
  });
  const tongLuongChuyen=rows.reduce((s,r)=>s+r.luongChuyen,0);
  const tongTraLX=rows.reduce((s,r)=>s+r.traLX,0);
  const tongCong=tongLuongChuyen+tongTraLX;

  const canhbao=thieuGia.length?`<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:var(--r);padding:8px 14px;margin-bottom:10px;font-size:12px">
    <i class="ti ti-alert-triangle" style="color:#d97706"></i>
    <strong style="color:#92400e">${thieuGia.length} chuyến chưa có giá lương (chưa khai báo tỉnh trong Điểm & Cung đường):</strong>
    ${thieuGia.slice(0,8).map(m=>`<span style="background:#fef9c3;border-radius:3px;padding:1px 5px;margin-left:3px">${m}</span>`).join('')}
  </div>`:'';

  res.innerHTML=canhbaoThieu+canhbao+`
  <div style="margin-bottom:10px">
    <button class="btn btn-teal" onclick="xuatExcelBangLuong('laixe')"><i class="ti ti-file-spreadsheet"></i> Xuất Excel</button>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Ngày</th><th>Mã đơn</th><th>Biển số</th><th>Thầu</th><th>Tuyến</th><th>Số cont</th><th>Loại cont</th><th>Loại chuyến</th><th style="text-align:right">Lương chuyến</th><th style="text-align:right">Chi hộ trả LX</th><th style="text-align:right">Tổng</th></tr></thead>
    <tbody>
    ${rows.map(r=>`<tr>
      <td>${fmtDate(r.ngay)}</td><td class="text-blue fw6">${r.ma_don}</td>
      <td style="font-size:12px">${r.bien_kiem_soat||'—'}</td>
      <td style="font-size:12px">${r.loai_phan_loai_xe==='noi_bo'?'<span style="color:#7c3aed">Nội bộ</span>':(r.ma_thau_phu||'—')}</td>
      <td style="font-size:12px">${r.diem_lay||'—'} → ${r.diem_tra||'—'}</td>
      <td style="font-size:12px">${r.so_cont||'—'}</td>
      <td style="font-size:12px">${r.loai_cont||'—'}</td>
      <td><span class="tag">${r.loai_chuyen||'—'}</span></td>
      <td style="text-align:right">${r.khongTrucking?'<span style="font-size:10px;color:#0891b2;font-weight:600">KHÔNG TRUCKING</span>':(r.luongChuyen?fmt(r.luongChuyen):'<span style="color:var(--text-muted);font-style:italic">chưa có giá</span>')}</td>
      <td style="text-align:right">${fmt(r.traLX)}</td>
      <td style="text-align:right;font-weight:600">${fmt(r.tong)}</td>
    </tr>`).join('')}
    </tbody>
    <tfoot><tr style="font-weight:700;background:var(--bg)">
      <td colspan="8">Tổng cộng (${rows.length} chuyến)</td>
      <td style="text-align:right">${fmt(tongLuongChuyen)}</td>
      <td style="text-align:right">${fmt(tongTraLX)}</td>
      <td style="text-align:right">${fmt(tongCong)}</td>
    </tr></tfoot>
  </table></div>`;
  window._BL_LAIXE={ten,thang,rows,tongLuongChuyen,tongTraLX,tongCong};
}

// ---- Lương nhân viên: Điều động (theo created_by) hoặc Quản lý (toàn bộ đơn trong tháng — hiện chỉ 1 quản lý) ----
async function loadBangLuongNV(){
  if(!canSee(['ke_toan','ceo'])){toast('Không có quyền xem Lương nhân viên','error');return;}
  const nvId=document.getElementById('bl-nv').value;
  const thang=document.getElementById('bl-thang').value;
  const res=document.getElementById('bl-result');
  if(!nvId){toast('Vui lòng chọn nhân viên','error');return;}
  const nv=NV.find(n=>n.id===nvId);
  if(!nv)return;
  const isQL=nv.vai_tro==='quan_ly';
  res.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const[y,m]=thang.split('-');
  const lastDay=new Date(+y,+m,0).getDate();
  const dateFrom=`${y}-${m.padStart(2,'0')}-01`;
  const dateTo=`${y}-${m.padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

  let q=db.from('van_don').select('id,ma_don,ngay,ten_khach,loai_chuyen,co_doi_lenh,created_by,loai_phan_loai_xe,bien_kiem_soat,ma_thau_phu,diem_tra,diem_tra_phat_sinh,so_cont,loai_cont')
    .eq('locked',true).gte('ngay',dateFrom).lte('ngay',dateTo).order('ngay',{ascending:true});
  if(!isQL)q=q.eq('created_by',nvId); // Quản lý: hiện chỉ 1 người, tính toàn bộ đơn đã khóa trong tháng
  const{data:orders}=await q;
  const list=orders||[];
  if(!list.length){res.innerHTML='<div class="empty"><i class="ti ti-inbox"></i>Không có chuyến đã khóa trong tháng này</div>';return;}

  const rows=list.map(o=>{
    // Chuyến "KHÔNG TRUCKING" — chỉ là dịch vụ đổi lệnh, không có xe chạy thật. Ghi chú tự do trong
    // diem_tra hoặc diem_tra_phat_sinh (chưa có field cấu trúc riêng) — dò chuỗi "KHÔNG TRUCKING".
    const khongTrucking=/kh[oô]ng\s*trucking/i.test((o.diem_tra||'')+' '+(o.diem_tra_phat_sinh||''));
    if(khongTrucking){
      const tong=o.co_doi_lenh?LUONG_DOI_LENH:0; // chỉ tính phí đổi lệnh, không cộng phần Thường/Kết hợp
      return{...o,thuong:0,doiLenh:tong,ketHop:0,khongTrucking,trongDanhMucXe:false,tong};
    }
    const kh=KH.find(k=>k.ten_cong_ty===o.ten_khach);
    const thuong=+((kh?.luong_thuong)??10000);
    const doiLenh=o.co_doi_lenh?LUONG_DOI_LENH:0;
    // Kết hợp/Kẹp ghép chỉ được 30k nếu BIỂN SỐ có trong danh mục Phương tiện (bảng xe) — không phụ
    // thuộc loai_phan_loai_xe ghi trên đơn, vì danh mục Phương tiện có thể chứa cả xe thầu đã đăng ký.
    // Biển số KHÔNG có trong danh mục (xe thầu vãng lai, chưa đăng ký) → tính như chuyến thường.
    const trongDanhMucXe=!!o.bien_kiem_soat&&XE.some(x=>x.bien_so===o.bien_kiem_soat);
    const laKetHop=o.loai_chuyen==='Kết hợp'||o.loai_chuyen==='Kẹp ghép';
    const ketHop=isQL&&laKetHop&&trongDanhMucXe?LUONG_KETHOP_QL:0;
    return{...o,thuong,doiLenh,ketHop,khongTrucking,trongDanhMucXe,tong:thuong+doiLenh+ketHop};
  });
  const tongThuong=rows.reduce((s,r)=>s+r.thuong,0);
  const tongDoiLenh=rows.reduce((s,r)=>s+r.doiLenh,0);
  const tongKetHop=rows.reduce((s,r)=>s+r.ketHop,0);
  const tongCong=tongThuong+tongDoiLenh+tongKetHop;

  res.innerHTML=`
  <div style="margin-bottom:10px">
    <button class="btn btn-teal" onclick="xuatExcelBangLuong('nv')"><i class="ti ti-file-spreadsheet"></i> Xuất Excel</button>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Ngày</th><th>Mã đơn</th><th>Biển số</th><th>Thầu</th><th>Khách</th><th>Số cont</th><th>Loại cont</th><th>Loại chuyến</th><th>Đổi lệnh</th><th style="text-align:right">Thành tiền</th></tr></thead>
    <tbody>
    ${rows.map(r=>`<tr ${r.khongTrucking?'style="background:#f8fafc"':''}>
      <td>${fmtDate(r.ngay)}</td><td class="text-blue fw6">${r.ma_don}</td>
      <td style="font-size:12px">${r.bien_kiem_soat?(r.trongDanhMucXe?`<span style="color:#7c3aed">${r.bien_kiem_soat}</span>`:r.bien_kiem_soat):'—'}</td>
      <td style="font-size:12px">${r.ma_thau_phu||(r.loai_phan_loai_xe==='noi_bo'?'Nội bộ':'—')}</td>
      <td style="font-size:12px">${r.ten_khach||'—'}</td>
      <td style="font-size:12px">${r.so_cont||'—'}</td>
      <td style="font-size:12px">${r.loai_cont||'—'}</td>
      <td><span class="tag">${r.loai_chuyen||'—'}</span>${r.khongTrucking?' <span style="font-size:10px;color:#0891b2;font-weight:600">(KHÔNG TRUCKING — chỉ tính đổi lệnh)</span>':(isQL&&(r.loai_chuyen==='Kết hợp'||r.loai_chuyen==='Kẹp ghép')&&!r.trongDanhMucXe?' <span style="font-size:10px;color:var(--text-muted)">(biển số ngoài danh mục — tính như thường)</span>':'')}</td>
      <td>${r.co_doi_lenh?'<span style="color:var(--warning)">Có</span>':'—'}</td>
      <td style="text-align:right;font-weight:600">${fmt(r.tong)}</td>
    </tr>`).join('')}
    </tbody>
    <tfoot><tr style="font-weight:700;background:var(--bg)">
      <td colspan="9">Tổng cộng (${rows.length} chuyến) — Thường ${fmt(tongThuong)} + Đổi lệnh ${fmt(tongDoiLenh)}${isQL?` + Kết hợp ${fmt(tongKetHop)}`:''}</td>
      <td style="text-align:right">${fmt(tongCong)}</td>
    </tr></tfoot>
  </table></div>`;
  window._BL_NV={ten:nv.ho_ten,vaiTro:isQL?'Quản lý':'Điều động',thang,rows,tongThuong,tongDoiLenh,tongKetHop,tongCong,isQL};
}

// ---- Xuất Excel Bảng lương (dùng chung cho cả 2 tab) ----
async function xuatExcelBangLuong(loai){
  const D=loai==='laixe'?window._BL_LAIXE:window._BL_NV;
  if(!D){toast('Vui lòng xem bảng lương trước','error');return;}
  if(!window.XLSX){
    await new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload=res; s.onerror=rej;
      document.head.appendChild(s);
    });
  }
  const[y,m]=D.thang.split('-');
  let header,rows,R;
  if(loai==='laixe'){
    header=['Ngày','Mã đơn','Biển số','Thầu','Điểm lấy','Điểm trả','Số cont','Loại cont','Loại chuyến','Lương chuyến','Chi hộ trả LX','Tổng'];
    rows=D.rows.map(r=>[fmtDate(r.ngay),r.ma_don,r.bien_kiem_soat||'',r.loai_phan_loai_xe==='noi_bo'?'Nội bộ':(r.ma_thau_phu||''),r.diem_lay||'',r.diem_tra||'',r.so_cont||'',r.loai_cont||'',r.khongTrucking?'KHÔNG TRUCKING':(r.loai_chuyen||''),r.khongTrucking?0:r.luongChuyen,r.traLX,r.tong]);
    R=[[`BẢNG LƯƠNG LÁI XE — ${D.ten} — Tháng ${+m}/${y}`],[],header,...rows,[],['','','','','','','','','Tổng cộng',D.tongLuongChuyen,D.tongTraLX,D.tongCong]];
  }else{
    header=['Ngày','Mã đơn','Biển số','Thầu','Khách','Số cont','Loại cont','Loại chuyến','Đổi lệnh','Thành tiền'];
    rows=D.rows.map(r=>[fmtDate(r.ngay),r.ma_don,r.bien_kiem_soat||'',r.loai_phan_loai_xe==='noi_bo'?'Nội bộ':(r.ma_thau_phu||''),r.ten_khach||'',r.so_cont||'',r.loai_cont||'',r.loai_chuyen||'',r.co_doi_lenh?'Có':'',r.tong]);
    R=[[`BẢNG LƯƠNG ${D.vaiTro.toUpperCase()} — ${D.ten} — Tháng ${+m}/${y}`],[],header,...rows,[],['','','','','','','','Tổng cộng',D.tongCong]];
  }
  const ws=XLSX.utils.aoa_to_sheet(R);
  ws['!cols']=header.map(()=>({wch:16}));
  const WB=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(WB,ws,`T${+m}.${y}`);
  const stamp=`T${+m}_${y}`;
  XLSX.writeFile(WB,`BangLuong_${loai==='laixe'?'LaiXe':'NhanVien'}_${D.ten.replace(/\s+/g,'')}_${stamp}.xlsx`);
  toast('Đã xuất file Excel');
}

// ==================== BÁO CÁO ====================
async function pgBaoCao(c){
  if(!canSee(['ke_toan','ceo','thu_quy'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
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
  const tongThuong=list.length-tongKH;const tiLeKH=tongThuong>0?Math.round(tongKH/tongThuong*100):0;

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

  // Biểu đồ KH/KG: thanh=Thường, xanh=KH, xám=Thường−KH
  function khBarChart(items){
    const W=460,H=200,pad={t:28,b:40,l:10,r:10};
    const chartW=W-pad.l-pad.r;
    const chartH=H-pad.t-pad.b;
    const bw=Math.min(50,Math.floor(chartW/items.length)-8);
    const gap=(chartW-bw*items.length)/(items.length+1);
    const maxThuong=Math.max(...items.map(([,v])=>v.thuong),1);
    let bars='',labels='',tileLabels='';
    items.forEach(([bien,v],i)=>{
      const x=pad.l+gap+(bw+gap)*i;
      const tiLe=v.thuong>0?Math.round(v.kh/v.thuong*100):0;
      const totalBarH=Math.max(8,Math.round(v.thuong/maxThuong*chartH));
      const barTop=pad.t+chartH-totalBarH;
      const khH=Math.min(v.thuong>0?Math.round(v.kh/v.thuong*totalBarH):0,totalBarH);
      const remH=totalBarH-khH;
      bars+=`<rect x="${x}" y="${barTop}" width="${bw}" height="${totalBarH}" rx="4" fill="#e2e8f0"/>`;
      if(khH>0){
        bars+=`<rect x="${x}" y="${barTop}" width="${bw}" height="${khH}" rx="4" fill="var(--success)" opacity=".85"/>`;
        if(remH>0&&khH>4)bars+=`<rect x="${x}" y="${barTop+4}" width="${bw}" height="${Math.max(khH-4,1)}" rx="0" fill="var(--success)" opacity=".85"/>`;
      }
      if(khH>20)bars+=`<text x="${x+bw/2}" y="${barTop+khH/2+4}" text-anchor="middle" font-size="10" fill="white" font-weight="700" font-family="Segoe UI,sans-serif">${v.kh}</text>`;
      if(remH>20&&v.thuong-v.kh>0)bars+=`<text x="${x+bw/2}" y="${barTop+khH+remH/2+4}" text-anchor="middle" font-size="10" fill="#94a3b8" font-family="Segoe UI,sans-serif">${v.thuong-v.kh}</text>`;
      const mau=tiLe>=50?'var(--success)':tiLe>=30?'var(--warning)':'var(--danger)';
      tileLabels+=`<text x="${x+bw/2}" y="${barTop-5}" text-anchor="middle" font-size="10" fill="${mau}" font-weight="600" font-family="Segoe UI,sans-serif">${tiLe}%</text>`;
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
          const tl=v.thuong>0?Math.round(v.kh/v.thuong*100):0;
          const mau=tl>=50?'var(--success)':tl>=30?'var(--warning)':'var(--danger)';
          return`<div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;padding:3px 0;border-bottom:1px solid var(--border)">
            <span class="text-blue">${k}</span>
            <span style="display:flex;gap:6px;align-items:center">
              <span style="font-size:10px;color:var(--text-muted)">${v.kh}KH/${v.thuong}ch</span>
              <span style="font-weight:700;color:${mau}">${tl}%</span>
            </span>
          </div>`;
        }).join('')}
        <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:var(--text-muted)">
          <span><span style="display:inline-block;width:8px;height:8px;background:var(--success);border-radius:2px;opacity:.85;margin-right:3px"></span>KH/KG</span>
          <span><span style="display:inline-block;width:8px;height:8px;background:#e2e8f0;border-radius:2px;margin-right:3px"></span>Thường còn lại</span>
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
        const tl=v.thuong>0?Math.round(v.kh/v.thuong*100):0;
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
        const tiLeKHXe=tongThuongXe>0?Math.round(tongKHXe/tongThuongXe*100):0;
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

// ==================== NHẬT KÝ HÀNH TRÌNH (lương khoán km) ====================
let NKHT_XE='', NKHT_THANG=new Date().toISOString().slice(0,7), NKHT_DATA=null, NKHT_KC=[];
let NKHT_ADDING=null, NKHT_ADDING_MODE=null; // idx đoạn đang mở ô "Qua bãi xe"/"Thêm điểm khác", và mode tương ứng

async function pgNhatKyHanhTrinh(c){
  if(!canSee(['quan_ly','ceo','ke_toan'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
  const xeApDung=XE.filter(x=>x.loai_phan_loai==='noi_bo'||x.loai_phan_loai==='thau_thue_lai');
  if(!xeApDung.length){c.innerHTML='<div class="empty"><i class="ti ti-info-circle"></i>Chưa có xe Nội bộ/Thầu thuê lái nào trong danh mục</div>';return;}
  if(!NKHT_XE || !xeApDung.some(x=>x.bien_so===NKHT_XE)) NKHT_XE=xeApDung[0].bien_so;
  const{data:kc}=await db.from('khoang_cach').select('*');
  NKHT_KC=kc||[];
  c.innerHTML=`
  <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
    <select id="nkht-xe" onchange="NKHT_XE=this.value;pgNhatKyHanhTrinh(document.getElementById('content'))" style="width:180px">
      ${xeApDung.map(x=>`<option value="${x.bien_so}" ${NKHT_XE===x.bien_so?'selected':''}>${x.bien_so} (${x.loai_phan_loai==='noi_bo'?'Nội bộ':'Thầu thuê lái'})</option>`).join('')}
    </select>
    <input type="month" id="nkht-thang" value="${NKHT_THANG}" onchange="NKHT_THANG=this.value;pgNhatKyHanhTrinh(document.getElementById('content'))" style="width:150px">
    <button class="btn" onclick="taoNhapNKHT()"><i class="ti ti-refresh"></i> Tạo/cập nhật nháp</button>
    <span id="nkht-trangthai" style="margin-left:auto;font-size:12px;color:var(--text-muted)"></span>
  </div>
  <div id="nkht-body" style="background:var(--card);border-radius:var(--r);padding:1rem 1.25rem"></div>`;
  await loadNKHT();
}

async function loadNKHT(){
  const{data}=await db.from('nhat_ky_hanh_trinh').select('*').eq('bien_so',NKHT_XE).eq('thang',NKHT_THANG).maybeSingle();
  NKHT_DATA=data||{bien_so:NKHT_XE,thang:NKHT_THANG,trang_thai:'nhap',doan_duong:[],tong_km:0};
  renderNKHT();
}

async function taoNhapNKHT(){
  const[y,m]=NKHT_THANG.split('-');
  const dauThang=`${y}-${m}-01`;
  const cuoiThang=new Date(+y,+m,0).getDate();
  const cuoiThangStr=`${y}-${m}-${String(cuoiThang).padStart(2,'0')}`;
  const{data:vd,error}=await db.from('van_don').select('id,ma_don,ngay,diem_lay,diem_tra,loai_chuyen,so_cont,ten_lai_xe,created_at,thu_tu_trong_ngay')
    .eq('bien_kiem_soat',NKHT_XE).gte('ngay',dauThang).lte('ngay',cuoiThangStr).order('thu_tu_trong_ngay',{ascending:true,nullsFirst:false}).order('created_at');
  if(error){toast('Lỗi tải vận đơn: '+error.message,'error');return;}
  const donCu=(NKHT_DATA.doan_duong||[]).filter(d=>d.nguon==='thu_cong');
  const moi=[];
  (vd||[]).forEach((o,i)=>{
    const kmCoHang=tracuuKm(o.diem_lay,o.diem_tra);
    moi.push({thu_tu:moi.length+1,ngay:o.ngay,diem_a:o.diem_lay,diem_b:o.diem_tra,km:kmCoHang,loai_doan:'co_hang',van_don_id:o.id,ma_don:o.ma_don,so_cont:o.so_cont,lai_xe:o.ten_lai_xe,loai_chuyen:o.loai_chuyen,can_xac_nhan:kmCoHang==null,nguon:'tu_dong'});
    const next=vd[i+1];
    if(next && o.diem_tra!==next.diem_lay){
      const km=tracuuKm(o.diem_tra,next.diem_lay);
      // Chỉ tự động điền (không hỏi lại) khi đơn kế tiếp là Kết hợp VÀ đã có sẵn km chuẩn.
      // Mọi trường hợp khác (Thường nối tiếp, hoặc Kết hợp nhưng chưa có km) đều phải xác nhận tay —
      // vì không có gì đảm bảo xe đi thẳng, có thể đã quay về bãi giữa 2 chuyến.
      const tuDong=next.loai_chuyen==='Kết hợp'&&km!=null;
      moi.push({thu_tu:moi.length+1,ngay:o.ngay,diem_a:o.diem_tra,diem_b:next.diem_lay,km,loai_doan:'rong',van_don_id:null,lai_xe:o.ten_lai_xe,can_xac_nhan:!tuDong,nguon:tuDong?'tu_dong':'tu_dong'});
    }
  });
  moi.forEach(d=>{ if(d.loai_chuyen==='Kẹp ghép') d.canh_bao_kep=true; });
  NKHT_DATA.doan_duong=[...moi,...donCu].sort((a,b)=>(a.ngay||'').localeCompare(b.ngay||''));
  renderNKHT();
  toast('Đã tạo/cập nhật bản nháp — nhớ bấm Lưu');
}

function tracuuKm(a,b){
  const hit=NKHT_KC.find(k=>(k.diem_a===a&&k.diem_b===b)||(k.diem_a===b&&k.diem_b===a));
  return hit?Number(hit.km):null;
}

function renderNKHT(){
  const wrap=document.getElementById('nkht-body');
  if(!wrap)return;
  const locked=NKHT_DATA.trang_thai==='da_duyet';
  document.getElementById('nkht-trangthai').innerHTML=locked?'<span style="color:var(--success);font-weight:600"><i class="ti ti-lock"></i> Đã duyệt</span>':'<span style="color:var(--warning);font-weight:600">Nháp</span>';
  const doan=NKHT_DATA.doan_duong||[];
  const tongKm=doan.reduce((s,d)=>s+(Number(d.km)||0),0);
  const conThieu=doan.filter(d=>d.can_xac_nhan).length;
  let ngayHT='';
  let html='';
  doan.forEach((d,idx)=>{
    if(d.ngay!==ngayHT){
      ngayHT=d.ngay;
      const kep=doan.some(x=>x.ngay===ngayHT&&x.canh_bao_kep);
      html+=`<div style="font-size:12px;color:var(--text-muted);margin:14px 0 8px;border-bottom:1px solid var(--border);padding-bottom:6px;display:flex;gap:6px;align-items:center">${fmtDate(ngayHT)}${kep?'<span style="width:6px;height:6px;border-radius:50%;background:var(--danger)" title="Có Kẹp/ghép trong ngày — kiểm tra lộ trình"></span>':''}</div>`;
    }
    if(d.loai_doan==='co_hang'&&!d.can_xac_nhan){
      html+=`<div style="display:flex;gap:12px;align-items:center;padding:8px 0">
        <i class="ti ti-truck" style="color:var(--teal)"></i>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:500">${d.diem_a} → ${d.diem_b}</div>
          <div style="font-size:12px;color:var(--text-muted)">${d.loai_chuyen||''} · Cont ${d.so_cont||'—'} · ${d.ma_don||''} · ${d.lai_xe||''}</div>
        </div>
        <div style="font-size:14px;font-weight:500">${fmt(d.km||0)} km</div>
      </div>`;
    }else if(d.loai_doan==='co_hang'&&d.can_xac_nhan){
      html+=`<div style="display:flex;gap:12px;align-items:center;padding:8px 0;background:#fef3c7;border-radius:8px;padding-left:12px">
        <i class="ti ti-alert-triangle" style="color:#92400e"></i>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:500">${d.diem_a} → ${d.diem_b}</div>
          <div style="font-size:12px;color:#92400e">${d.loai_chuyen||''} · Cont ${d.so_cont||'—'} · ${d.ma_don||''} — chưa có km chuẩn trong Khoảng cách, nhập tay:</div>
        </div>
        <input type="number" placeholder="km" style="width:90px" onchange="suaKmCoHangNKHT(${idx},this.value)">
      </div>`;
    }else if(d.can_xac_nhan){
      const dangThem=NKHT_ADDING===idx;
      html+=`<div style="margin-left:27px;border-left:2px dashed var(--warning);padding:8px 0 8px 17px;background:#fef3c7;border-radius:8px">
        <div style="font-size:12px;color:#92400e;font-weight:500;margin-bottom:6px"><i class="ti ti-alert-triangle"></i> Đoạn nối chưa xác nhận: ${d.diem_a} → ${d.diem_b}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:${dangThem?'8':'0'}px">
          <button class="btn btn-xs" onclick="xacNhanDoanNKHT(${idx},'${(d.diem_a||'').replace(/'/g,"\\'")}','${(d.diem_b||'').replace(/'/g,"\\'")}')">Đi thẳng</button>
          <button class="btn btn-xs ${dangThem&&NKHT_ADDING_MODE==='bai'?'btn-primary':''}" onclick="moThemDiemNKHT(${idx},'bai')">Qua bãi xe (qua nhà)</button>
          <button class="btn btn-xs ${dangThem&&NKHT_ADDING_MODE==='khac'?'btn-primary':''}" onclick="moThemDiemNKHT(${idx},'khac')">Thêm điểm khác</button>
          <input type="number" placeholder="hoặc nhập km tay" style="width:120px" onchange="suaKmNKHT(${idx},this.value)">
        </div>
        ${dangThem?`<div style="position:relative;width:260px">
          <input type="text" id="nkht-diem-input-${idx}" placeholder="${NKHT_ADDING_MODE==='bai'?'Gõ tên bãi xe...':'Gõ tên điểm...'}" autocomplete="off" style="width:100%"
            oninput="nkhtDiemOnInput(this,'nkht-diem-drop-${idx}')" onkeydown="if(event.key==='Enter')xacNhanThemDiemNKHT(${idx})">
          <div id="nkht-diem-drop-${idx}" data-input-id="nkht-diem-input-${idx}" style="display:none;position:absolute;z-index:999;left:0;right:0;top:100%;background:#fff;border:1px solid var(--border);border-radius:var(--r);box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:220px;overflow-y:auto"></div>
          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="btn btn-xs btn-primary" onclick="xacNhanThemDiemNKHT(${idx})">Xác nhận</button>
            <button class="btn btn-xs" onclick="NKHT_ADDING=null;renderNKHT()">Hủy</button>
          </div>
        </div>`:''}
      </div>`;
    }else{
      html+=`<div style="display:flex;gap:12px;align-items:center;padding:6px 0;opacity:0.75">
        <i class="ti ti-arrow-right" style="color:var(--text-muted)"></i>
        <div style="flex:1;font-size:13px">${d.diem_a} → ${d.diem_b} <span style="font-size:11px;color:var(--text-muted)">(rỗng)</span></div>
        <input type="number" value="${d.km||0}" style="width:90px" onchange="suaKmNKHT(${idx},this.value)">
        <i class="ti ti-trash" style="cursor:pointer;color:var(--danger)" onclick="xoaDoanNKHT(${idx})"></i>
      </div>`;
    }
  });
  wrap.innerHTML=(html||'<div class="empty">Chưa có dữ liệu — bấm "Tạo/cập nhật nháp"</div>')+
  `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
    <div style="font-size:13px;color:var(--text-muted)">Tổng km: <strong style="color:var(--text-primary)">${fmt(tongKm)}</strong>${conThieu?` · Còn ${conThieu} đoạn chưa xác nhận`:''}</div>
    <div style="display:flex;gap:8px">
      <button class="btn" onclick="luuNKHT()">Lưu</button>
      ${locked?`<button class="btn" onclick="moKhoaNKHT()">Mở khóa</button>`:`<button class="btn btn-primary" ${conThieu?'disabled title="Còn đoạn chưa xác nhận"':''} onclick="duyetNKHT()">Duyệt tháng</button>`}
    </div>
  </div>`;
}

function xacNhanDoanNKHT(idx,a,b){
  const d=NKHT_DATA.doan_duong[idx];
  d.can_xac_nhan=false; d.nguon='thu_cong';
  if(d.km==null) d.km=tracuuKm(a,b)||0;
  renderNKHT();
}
function suaKmCoHangNKHT(idx,v){
  NKHT_DATA.doan_duong[idx].km=Number(v)||0;
  NKHT_DATA.doan_duong[idx].can_xac_nhan=false;
  NKHT_DATA.doan_duong[idx].nguon='thu_cong';
  renderNKHT();
}
function suaKmNKHT(idx,v){NKHT_DATA.doan_duong[idx].km=Number(v)||0;NKHT_DATA.doan_duong[idx].nguon='thu_cong';renderNKHT();}
function xoaDoanNKHT(idx){NKHT_DATA.doan_duong.splice(idx,1);renderNKHT();}

function moThemDiemNKHT(idx,mode){
  NKHT_ADDING=idx; NKHT_ADDING_MODE=mode;
  renderNKHT();
  setTimeout(()=>{
    const el=document.getElementById('nkht-diem-input-'+idx);
    if(el){
      if(mode==='bai'){
        // Mặc định đúng tên đã có trong danh mục Điểm — nếu tên chuẩn thay đổi, sửa lại 1 chỗ này
        const bai=(DD||[]).find(d=>removeAccents(d.ten_chuan).includes('bai xe'));
        el.value=bai?bai.ten_chuan:'BÃI XE BN CHAIN, BẮC NINH';
      }
      el.focus();
    }
  },50);
}
// Dropdown gợi ý điểm cho Nhật ký hành trình — cùng logic bỏ dấu + viết tắt như ô Khoảng cách/vận đơn
function nkhtDiemOnInput(el,dropId){
  const q=removeAccents(el.value.trim());
  const drop=document.getElementById(dropId);
  if(!drop)return;
  if(!q){drop.style.display='none';return;}
  const matches=(DD||[]).filter(d=>{
    const haystack=removeAccents((d.ten_chuan||'')+' '+(d.viet_tat||'')+' '+(d.dia_phuong||''));
    return haystack.includes(q);
  }).slice(0,8);
  if(!matches.length){drop.style.display='none';return;}
  drop.innerHTML=matches.map(d=>{
    const safe=d.ten_chuan.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return '<div onclick="nkhtPickDiem(\''+dropId+'\',\''+safe+'\')"'
      +' style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13px"'
      +' onmouseover="this.style.background=\'var(--teal-light)\'" onmouseout="this.style.background=\'\'">'
      +'<span style="font-weight:600;color:var(--sidebar-bg)">'+d.ten_chuan+'</span>'
      +(d.dia_phuong?'<span style="color:var(--text-muted);margin-left:6px;font-size:11px">'+d.dia_phuong+'</span>':'')
      +'</div>';
  }).join('');
  drop.style.display='block';
}
function nkhtPickDiem(dropId,tenChuan){
  const drop=document.getElementById(dropId);
  if(!drop)return;
  const inputId=drop.dataset.inputId;
  const input=inputId?document.getElementById(inputId):null;
  if(input)input.value=tenChuan;
  setTimeout(()=>{if(drop)drop.style.display='none';},80);
}
function xacNhanThemDiemNKHT(idx){
  const diem=(document.getElementById('nkht-diem-input-'+idx)?.value||'').trim();
  if(!diem){toast('Chọn/gõ tên điểm trước','error');return;}
  const d=NKHT_DATA.doan_duong[idx];
  const km1=tracuuKm(d.diem_a,diem), km2=tracuuKm(diem,d.diem_b);
  NKHT_DATA.doan_duong.splice(idx,1,
    {...d,diem_b:diem,km:km1||0,can_xac_nhan:km1==null,nguon:'thu_cong'},
    {diem_a:diem,diem_b:d.diem_b,km:km2||0,loai_doan:'rong',ngay:d.ngay,can_xac_nhan:km2==null,nguon:'thu_cong'}
  );
  NKHT_ADDING=null;NKHT_ADDING_MODE=null;
  renderNKHT();
}

async function luuNKHT(){
  const tongKm=(NKHT_DATA.doan_duong||[]).reduce((s,d)=>s+(Number(d.km)||0),0);
  const{error}=await db.from('nhat_ky_hanh_trinh').upsert({
    bien_so:NKHT_XE,thang:NKHT_THANG,trang_thai:NKHT_DATA.trang_thai||'nhap',
    doan_duong:NKHT_DATA.doan_duong,tong_km:tongKm,updated_at:new Date().toISOString()
  },{onConflict:'bien_so,thang'});
  if(error){toast('Lỗi lưu: '+error.message,'error');return;}
  toast('Đã lưu nhật ký hành trình');
}

async function duyetNKHT(){
  const conThieu=(NKHT_DATA.doan_duong||[]).some(d=>d.can_xac_nhan);
  if(conThieu){toast('Còn đoạn chưa xác nhận, không thể duyệt','error');return;}
  const xeInfo=XE.find(x=>x.bien_so===NKHT_XE);
  const tongKm=(NKHT_DATA.doan_duong||[]).reduce((s,d)=>s+(Number(d.km)||0),0);
  const{error}=await db.from('nhat_ky_hanh_trinh').upsert({
    bien_so:NKHT_XE,thang:NKHT_THANG,trang_thai:'da_duyet',
    doan_duong:NKHT_DATA.doan_duong,tong_km:tongKm,
    dinh_muc_ap_dung:xeInfo?.dinh_muc_khoan||0,
    nguoi_duyet:CU?.ho_ten,ngay_duyet:new Date().toISOString(),updated_at:new Date().toISOString()
  },{onConflict:'bien_so,thang'});
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã duyệt tháng');
  await loadNKHT();
}

async function moKhoaNKHT(){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền mở khóa','error');return;}
  if(!confirm('Mở khóa nhật ký tháng này để sửa lại?'))return;
  const{error}=await db.from('nhat_ky_hanh_trinh').update({trang_thai:'nhap'}).eq('bien_so',NKHT_XE).eq('thang',NKHT_THANG);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  await loadNKHT();
}

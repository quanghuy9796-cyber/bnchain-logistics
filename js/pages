// PAGES.JS — Điều vận, Bảng kê, Báo cáo, Trả thầu, Công nợ
// Requires: config.js, orders.js

async function pgDieuVan(c){
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const{data}=await db.from('van_don').select('*').in('trang_thai',['Chờ xếp xe','Đang vận chuyển','Chờ xác nhận']).order('ngay_yeu_cau',{ascending:true,nullsFirst:false}).order('ngay',{ascending:true});
  const list=data||[];
  const cho=list.filter(o=>o.trang_thai==='Chờ xếp xe');
  const chay=list.filter(o=>o.trang_thai==='Đang vận chuyển');
  const xn=list.filter(o=>o.trang_thai==='Chờ xác nhận');

  c.innerHTML=`
  <div class="stats-row stats-3" style="margin-bottom:14px">
    <div class="stat-card"><div class="stat-icon" style="background:#fef3c7;color:var(--warning)"><i class="ti ti-clock"></i></div><div class="stat-lbl">Chờ xếp xe</div><div class="stat-val text-orange">${cho.length}</div><div class="stat-sub">cần sắp xếp</div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#dbeafe;color:#2563eb"><i class="ti ti-truck"></i></div><div class="stat-lbl">Đang vận chuyển</div><div class="stat-val" style="color:#2563eb">${chay.length}</div><div class="stat-sub">xe đang chạy</div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#dcfce7;color:var(--success)"><i class="ti ti-check"></i></div><div class="stat-lbl">Chờ xác nhận</div><div class="stat-val text-green">${xn.length}</div><div class="stat-sub">chờ kế toán chốt</div></div>
  </div>
  ${cho.length?`
  <div style="font-size:12px;font-weight:600;color:var(--warning);margin-bottom:8px;display:flex;align-items:center;gap:5px"><i class="ti ti-clock"></i>CHỜ XẾP XE (${cho.length})</div>
  <div class="tbl-wrap" style="margin-bottom:14px"><table class="tbl">
    <colgroup><col style="width:130px"><col style="width:70px"><col style="width:55px"><col style="width:110px"><col style="width:120px"><col style="width:160px"><col style="width:100px"><col style="width:100px"></colgroup>
    <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Loại</th><th>Bill/Booking</th><th>Khách</th><th>Hành trình</th><th>Yêu cầu giao</th><th>Thao tác</th></tr></thead>
    <tbody>${cho.map(o=>`<tr>
      <td style="color:var(--teal);font-weight:600">${o.ma_don}</td><td>${o.ngay}</td>
      <td>${loaiTag(o.loai_hang)}</td>
      <td style="color:var(--primary);font-weight:500">${o.so_bill||o.so_booking||'—'}</td>
      <td>${o.ten_khach}</td><td title="${o.hanh_trinh||''}">${o.hanh_trinh||'—'}</td>
      <td>${o.ngay_yeu_cau||'—'}</td>
      <td><button class="btn btn-sm btn-primary" onclick="openDetail('${o.id}')"><i class="ti ti-truck"></i> Xếp xe</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`:''}
  ${chay.length?`
  <div style="font-size:12px;font-weight:600;color:#2563eb;margin-bottom:8px;display:flex;align-items:center;gap:5px"><i class="ti ti-truck"></i>ĐANG VẬN CHUYỂN (${chay.length})</div>
  <div class="tbl-wrap" style="margin-bottom:14px"><table class="tbl">
    <colgroup><col style="width:130px"><col style="width:70px"><col style="width:55px"><col style="width:110px"><col style="width:100px"><col style="width:95px"><col style="width:90px"><col style="width:100px"><col style="width:100px"></colgroup>
    <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Loại</th><th>Bill/Booking</th><th>Khách</th><th>Số cont</th><th>Biển số</th><th>Lái xe</th><th>Thao tác</th></tr></thead>
    <tbody>${chay.map(o=>`<tr>
      <td style="color:var(--teal);font-weight:600">${o.ma_don}</td><td>${o.ngay}</td>
      <td>${loaiTag(o.loai_hang)}</td>
      <td style="color:var(--primary);font-weight:500">${o.so_bill||o.so_booking||'—'}</td>
      <td>${o.ten_khach}</td><td>${o.so_cont||'—'}</td><td>${o.bien_kiem_soat||'—'}</td><td>${o.ten_lai_xe||'—'}</td>
      <td><button class="btn btn-sm" onclick="openDetail('${o.id}')"><i class="ti ti-receipt"></i> Chi phí</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`:''}
  ${xn.length?`
  <div style="font-size:12px;font-weight:600;color:var(--success);margin-bottom:8px;display:flex;align-items:center;gap:5px"><i class="ti ti-check"></i>CHỜ XÁC NHẬN / CHỐT (${xn.length})</div>
  <div class="tbl-wrap"><table class="tbl">
    <colgroup><col style="width:130px"><col style="width:70px"><col style="width:55px"><col style="width:110px"><col style="width:100px"><col style="width:95px"><col style="width:90px"><col style="width:100px"><col style="width:100px"></colgroup>
    <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Loại</th><th>Bill/Booking</th><th>Khách</th><th>Số cont</th><th>Biển số</th><th>Lái xe</th><th>Thao tác</th></tr></thead>
    <tbody>${xn.map(o=>`<tr>
      <td style="color:var(--teal);font-weight:600">${o.ma_don}</td><td>${o.ngay}</td>
      <td>${loaiTag(o.loai_hang)}</td>
      <td style="color:var(--primary);font-weight:500">${o.so_bill||o.so_booking||'—'}</td>
      <td>${o.ten_khach}</td><td>${o.so_cont||'—'}</td><td>${o.bien_kiem_soat||'—'}</td><td>${o.ten_lai_xe||'—'}</td>
      <td><button class="btn btn-sm btn-success" onclick="openDetail('${o.id}')"><i class="ti ti-coins"></i> Chốt</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`:''}
  ${!list.length?'<div class="empty"><i class="ti ti-checks"></i>Không có đơn nào đang xử lý</div>':''}`;
}

// ==================== CHI HO ====================
async function pgChiHo(c){
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const{data}=await db.from('chi_ho').select('*').order('ngay_chi',{ascending:false}).limit(300);
  const list=data||[];
  const total=list.reduce((s,o)=>s+(+o.so_tien||0),0);
  const dathu=list.filter(o=>o.da_thu_lai).reduce((s,o)=>s+(+o.so_tien||0),0);
  const hdkh=list.filter(o=>o.hoa_don_khach).reduce((s,o)=>s+(+o.so_tien||0),0);
  c.innerHTML=`
  <div class="stats-row stats-4">
    <div class="stat-card"><div class="stat-lbl">Tổng chi hộ</div><div class="stat-val text-red">${fmt(Math.round(total/1e6))}tr</div></div>
    <div class="stat-card"><div class="stat-lbl">HĐ theo MST khách</div><div class="stat-val text-orange">${fmt(Math.round(hdkh/1e6))}tr</div></div>
    <div class="stat-card"><div class="stat-lbl">Đã thu lại</div><div class="stat-val text-green">${fmt(Math.round(dathu/1e6))}tr</div></div>
    <div class="stat-card"><div class="stat-lbl">Chưa thu lại</div><div class="stat-val" style="color:var(--danger)">${fmt(Math.round((total-dathu)/1e6))}tr</div></div>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <colgroup><col style="width:130px"><col style="width:85px"><col style="width:140px"><col style="width:90px"><col style="width:100px"><col style="width:90px"><col style="width:80px"><col style="width:80px"><col style="width:120px"></colgroup>
    <thead><tr><th>Mã đơn</th><th>Ngày chi</th><th>Loại chi</th><th>Số tiền</th><th>Người chi</th><th>Chứng từ</th><th>HĐ KH</th><th>Thu lại</th><th>Ghi chú</th></tr></thead>
    <tbody>
    ${list.length===0?`<tr><td colspan="9"><div class="empty"><i class="ti ti-inbox"></i>Chưa có dữ liệu</div></td></tr>`:''}
    ${list.map(o=>`<tr>
      <td style="color:var(--teal);font-weight:500">${o.ma_don||'—'}</td>
      <td>${o.ngay_chi}</td><td>${o.loai_chi}</td>
      <td class="text-orange fw6">${fmtM(o.so_tien)}</td>
      <td>${o.nguoi_chi||'—'}</td><td>${o.chung_tu||'—'}</td>
      <td>${o.hoa_don_khach?'<span class="tag" style="background:#e0f2fe;color:#0369a1;font-size:10px">Có</span>':'—'}</td>
      <td><span class="tag ${o.da_thu_lai?'tag-dathu':'tag-chuathu'}" style="font-size:10px">${o.da_thu_lai?'Đã thu':'Chưa'}</span></td>
      <td>${o.ghi_chu||'—'}</td>
    </tr>`).join('')}
    </tbody>
  </table></div>`;
}

// ==================== CÔNG NỢ ====================
async function pgCongNo(c){
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const{data}=await db.from('van_don').select('*').order('ngay',{ascending:false});
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
  const now=new Date();
  const curM=String(now.getMonth()+1).padStart(2,'0');
  const curY=now.getFullYear();
  const thOpts=Array.from({length:6},(_,i)=>{
    const d=new Date(curY,now.getMonth()-i,1);
    const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return`<option value="${v}">Tháng ${d.getMonth()+1}/${d.getFullYear()}</option>`;
  }).join('');
  const khopts=KH.map(k=>`<option value="${k.ten_cong_ty}">${k.ten_cong_ty}</option>`).join('');

  c.innerHTML=`
  <div class="toolbar" style="margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <select id="bk-kh" class="filter-sel" style="min-width:180px">
      <option value="">-- Chọn khách hàng --</option>${khopts}
    </select>
    <select id="bk-thang" class="filter-sel">${thOpts}</select>
    <button class="btn btn-teal" onclick="loadBangKe()"><i class="ti ti-search"></i> Xem bảng kê</button>
    <button class="btn" onclick="window.print()"><i class="ti ti-printer"></i> In</button>
  </div>

  <!-- AI SCAN HÓA ĐƠN -->
  <div style="background:linear-gradient(135deg,var(--teal),var(--teal-dark));border-radius:var(--rl);padding:14px 16px;margin-bottom:14px;color:#fff;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
    <div>
      <div style="font-size:13px;font-weight:600;margin-bottom:3px"><i class="ti ti-scan"></i> AI Đọc Hóa Đơn</div>
      <div style="font-size:11px;opacity:.8">Chụp ảnh HĐ → AI tự nhận dạng số cont, loại phí, số tiền → Điền vào chi hộ</div>
    </div>
    <button class="btn" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);color:#fff" onclick="openScanHD()">
      <i class="ti ti-camera"></i> Scan hóa đơn
    </button>
  </div>

  <div id="bk-result" style="color:var(--text-muted);font-size:13px;padding:10px 0">
    Chọn khách hàng và tháng để xem bảng kê.
  </div>`;
}

async function loadBangKe(){
  const kh=document.getElementById('bk-kh').value;
  const thang=document.getElementById('bk-thang').value;
  if(!kh){toast('Vui lòng chọn khách hàng','error');return;}
  const[y,m]=thang.split('-');
  const res=document.getElementById('bk-result');
  res.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';

  // Load orders + chi ho
  const{data:orders}=await db.from('van_don').select('*')
    .eq('ten_khach',kh)
    .gte('ngay',`${y}-${m}-01`).lte('ngay',`${y}-${m}-31`)
    .order('ngay').order('so_bill');
  const list=orders||[];
  if(!list.length){res.innerHTML='<div class="empty"><i class="ti ti-inbox"></i>Không có đơn nào trong tháng này</div>';return;}

  const ids=list.map(o=>o.id);
  const{data:chiHoAll}=await db.from('chi_ho').select('*').in('van_don_id',ids).order('ngay_chi');
  const chiHoMap={};
  (chiHoAll||[]).forEach(c=>{
    if(!chiHoMap[c.van_don_id])chiHoMap[c.van_don_id]=[];
    chiHoMap[c.van_don_id].push(c);
  });

  // Tách 2 phần
  const chiHoP1=[]; // Không HĐ — lưu ca, bốc xếp, cao tốc
  const chiHoP2=[]; // Có HĐ — nâng hạ, phí cảng, cơ sở hạ tầng
  (chiHoAll||[]).forEach(c=>{
    if(c.hoa_don_khach) chiHoP2.push(c);
    else chiHoP1.push(c);
  });

  // Group theo bill/booking
  const groups={};
  list.forEach(o=>{
    const key=o.so_bill||o.so_booking||o.ma_don;
    if(!groups[key])groups[key]=[];
    groups[key].push(o);
  });

  // Tính tổng
  const tongCuoc=list.reduce((s,o)=>s+(+o.gia_cuoc_khach||0),0);
  const tongDV=list.reduce((s,o)=>s+(+o.phi_doi_lenh||0)+(+o.phi_to_khai||0),0);
  const tongP1=chiHoP1.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
  const tongP2=chiHoP2.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
  const tongPhaiThu=tongCuoc+tongDV+tongP1+tongP2;

  // Build HTML bảng kê
  let html=`
  <div id="print-area">
  <!-- HEADER -->
  <div style="text-align:center;margin-bottom:16px">
    <div style="font-size:16px;font-weight:700;color:var(--teal)">BN CHAIN LOGISTICS</div>
    <div style="font-size:11px;color:var(--text-muted)">Your Logistics & Solutions Chain</div>
    <div style="font-size:15px;font-weight:700;margin-top:8px;text-transform:uppercase">BẢNG KÊ CƯỚC VẬN CHUYỂN</div>
    <div style="font-size:12px;color:var(--text-muted)">Khách hàng: <strong>${kh}</strong> | Tháng ${m}/${y} | ${list.length} chuyến</div>
  </div>

  <!-- PHẦN 1: CƯỚC + PHÍ PHÁT SINH -->
  <div style="margin-bottom:16px">
    <div style="background:var(--teal);color:#fff;padding:8px 12px;border-radius:var(--r) var(--r) 0 0;font-size:12px;font-weight:600;display:flex;justify-content:space-between">
      <span><i class="ti ti-truck"></i> PHẦN 1: CƯỚC VẬN CHUYỂN & PHÍ PHÁT SINH</span>
      <span>${fmtM(tongCuoc+tongDV+tongP1)}</span>
    </div>
    <div class="tbl-wrap" style="border-radius:0 0 var(--r) var(--r)">
    <table class="tbl">
      <colgroup>
        <col style="width:30px"><col style="width:130px"><col style="width:75px">
        <col style="width:85px"><col style="width:165px">
        <col style="width:90px">
        ${chiHoP1.length?'<col style="width:80px">'.repeat(Math.min(3,[...new Set(chiHoP1.map(c=>c.loai_chi))].length)):''}
      </colgroup>
      <thead>
        <tr>
          <th>STT</th><th>Mã đơn</th><th>Ngày</th><th>Số cont</th><th>Hành trình</th>
          <th>Cước vận chuyển</th>
          ${[...new Set(chiHoP1.map(c=>c.loai_chi))].map(l=>`<th>${l}</th>`).join('')}
          ${tongDV>0?'<th>Phí DV</th>':''}
          <th style="background:#f0f9f0">Tổng</th>
        </tr>
      </thead>
      <tbody>
      ${Object.entries(groups).map(([bill,items],gi)=>{
        const chiHoTypes=[...new Set(chiHoP1.map(c=>c.loai_chi))];
        let rowsHtml='';
        items.forEach((o,i)=>{
          const ch=chiHoMap[o.id]||[];
          const chP1=ch.filter(c=>!c.hoa_don_khach);
          const phiDV=(+o.phi_doi_lenh||0)+(+o.phi_to_khai||0);
          const tongDong=(+o.gia_cuoc_khach||0)+chP1.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0)+phiDV;
          rowsHtml+=`<tr>
            <td>${gi+1}.${i+1}</td>
            <td style="color:var(--teal);font-size:11px">${o.ma_don}</td>
            <td>${o.ngay}</td>
            <td style="font-weight:500">${o.so_cont||'—'}</td>
            <td style="font-size:11px" title="${o.hanh_trinh||''}">${o.diem_lay||''}${o.diem_tra?' → '+o.diem_tra:''}</td>
            <td class="text-blue fw6">${fmt(o.gia_cuoc_khach)}</td>
            ${chiHoTypes.map(type=>{
              const kh=chP1.filter(c=>c.loai_chi===type).reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
              return`<td>${kh>0?fmt(kh):'—'}</td>`;
            }).join('')}
            ${tongDV>0?`<td class="text-orange">${phiDV>0?fmt(phiDV):'—'}</td>`:''}
            <td style="font-weight:600;background:#f0f9f0">${fmt(tongDong)}</td>
          </tr>`;
        });
        // Bill subtotal if multiple items
        if(items.length>1){
          const subCuoc=items.reduce((s,o)=>s+(+o.gia_cuoc_khach||0),0);
          const chTypes=[...new Set(chiHoP1.map(c=>c.loai_chi))];
          const subDV=items.reduce((s,o)=>s+(+o.phi_doi_lenh||0)+(+o.phi_to_khai||0),0);
          const subTotal=items.reduce((o_,o)=>{
            const ch=(chiHoMap[o.id]||[]).filter(c=>!c.hoa_don_khach);
            return o_+(+o.gia_cuoc_khach||0)+ch.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0)+(+o.phi_doi_lenh||0)+(+o.phi_to_khai||0);
          },0);
          rowsHtml+=`<tr style="background:#f5f9fb;font-style:italic">
            <td colspan="5" style="font-size:11px;color:var(--text-muted)">Cộng ${list[0].loai_hang==='Nhập'?'Bill':'Booking'}: ${bill}</td>
            <td class="fw6">${fmt(subCuoc)}</td>
            ${chTypes.map(()=>'<td></td>').join('')}
            ${tongDV>0?`<td class="fw6">${subDV>0?fmt(subDV):'—'}</td>`:''}
            <td style="font-weight:700;color:var(--teal)">${fmt(subTotal)}</td>
          </tr>`;
        }
        return rowsHtml;
      }).join('')}
      <!-- TỔNG P1 -->
      <tr style="background:#e8f4f7;font-weight:700;font-size:13px">
        <td colspan="5">CỘNG PHẦN 1</td>
        <td class="text-blue">${fmt(tongCuoc)}</td>
        ${[...new Set(chiHoP1.map(c=>c.loai_chi))].map(type=>{
          const s=chiHoP1.filter(c=>c.loai_chi===type).reduce((a,c)=>a+(+(c.tien_thu_khach||c.so_tien)||0),0);
          return`<td>${fmt(s)}</td>`;
        }).join('')}
        ${tongDV>0?`<td>${fmt(tongDV)}</td>`:''}
        <td style="color:var(--teal)">${fmt(tongCuoc+tongDV+tongP1)}</td>
      </tr>
      </tbody>
    </table>
    </div>
  </div>

  <!-- PHẦN 2: CHI HỘ CÓ HĐ -->
  ${chiHoP2.length?`
  <div style="margin-bottom:16px">
    <div style="background:var(--primary);color:#fff;padding:8px 12px;border-radius:var(--r) var(--r) 0 0;font-size:12px;font-weight:600;display:flex;justify-content:space-between">
      <span><i class="ti ti-receipt"></i> PHẦN 2: CHI HỘ CƠ SỞ HẠ TẦNG (Hóa đơn theo MST khách)</span>
      <span>${fmtM(tongP2)}</span>
    </div>
    <div class="tbl-wrap" style="border-radius:0 0 var(--r) var(--r)">
    <table class="tbl">
      <colgroup><col style="width:30px"><col style="width:80px"><col style="width:110px"><col style="width:200px"><col style="width:100px"><col style="width:100px"><col style="width:100px"></colgroup>
      <thead><tr><th>STT</th><th>Ngày</th><th>Số cont</th><th>Nội dung</th><th>Số HĐ/CT</th><th>Người nộp</th><th>Số tiền</th></tr></thead>
      <tbody>
      ${chiHoP2.map((c,i)=>{
        // Find cont from van_don
        const o=list.find(x=>x.id===c.van_don_id);
        return`<tr>
          <td>${i+1}</td>
          <td>${c.ngay_chi}</td>
          <td style="font-weight:500">${o?.so_cont||c.ma_don||'—'}</td>
          <td>${c.loai_chi}${c.ghi_chu?' — '+c.ghi_chu:''}</td>
          <td style="font-size:11px">${c.chung_tu||'—'}</td>
          <td style="font-size:11px">${c.nguoi_chi||'—'}</td>
          <td class="text-orange fw6">${fmtM(c.tien_thu_khach||c.so_tien)}</td>
        </tr>`;
      }).join('')}
      <tr style="background:#fff3e6;font-weight:700;font-size:13px">
        <td colspan="6">CỘNG PHẦN 2</td>
        <td style="color:var(--primary)">${fmtM(tongP2)}</td>
      </tr>
      </tbody>
    </table>
    </div>
  </div>`:''}

  <!-- TỔNG CỘNG -->
  <div style="background:var(--sidebar-bg);border-radius:var(--rl);padding:16px 20px;color:#fff;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:11px;opacity:.6;margin-bottom:4px">TỔNG CỘNG PHẢI THU</div>
      <div style="font-size:11px;opacity:.5">${kh} | Tháng ${m}/${y} | ${list.length} chuyến</div>
      <div style="font-size:11px;opacity:.5;margin-top:4px">
        P1 (Cước + Phát sinh): ${fmtM(tongCuoc+tongDV+tongP1)}
        ${chiHoP2.length?` | P2 (Chi hộ HĐ): ${fmtM(tongP2)}`:''}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:24px;font-weight:700;color:#ffd700">${fmtM(tongPhaiThu)}</div>
    </div>
  </div>
  </div>`;

  res.innerHTML=html;
}

// ============ AI SCAN HÓA ĐƠN ============
function openScanHD(){
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  const vdopts=ORDERS.filter(o=>!o.locked).slice(0,100).map(o=>`<option value="${o.id}" data-cont="${o.so_cont||''}" data-ma="${o.ma_don}">${o.ma_don} — ${o.ten_khach} — ${o.so_cont||'chưa có cont'}</option>`).join('');
  bg.innerHTML=`<div class="modal" style="width:540px">
  <div class="modal-head">
    <h3><i class="ti ti-scan" style="color:var(--teal)"></i> AI Đọc Hóa Đơn</h3>
    <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
  </div>
  <div class="modal-body" style="display:block">
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
      Upload ảnh hóa đơn — AI sẽ tự động nhận dạng và điền vào form chi hộ
    </div>

    <!-- Upload area -->
    <div id="scan-upload-area" style="border:2px dashed var(--border);border-radius:var(--rl);padding:24px;text-align:center;cursor:pointer;transition:all .2s;margin-bottom:12px"
      onclick="document.getElementById('scan-file').click()"
      ondragover="event.preventDefault();this.style.borderColor='var(--teal)'"
      ondrop="handleScanDrop(event)">
      <i class="ti ti-photo-up" style="font-size:32px;color:var(--text-muted);display:block;margin-bottom:8px"></i>
      <div style="font-size:13px;font-weight:500">Nhấn để chọn ảnh hoặc kéo thả vào đây</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">JPG, PNG — Ảnh chụp hóa đơn rõ nét</div>
      <input type="file" id="scan-file" accept="image/*" style="display:none" onchange="handleScanFile(this)">
    </div>

    <div id="scan-preview" style="display:none;margin-bottom:12px">
      <img id="scan-img" style="max-width:100%;max-height:200px;border-radius:var(--r);object-fit:contain;border:1px solid var(--border)">
    </div>

    <div id="scan-loading" style="display:none;text-align:center;padding:20px;color:var(--teal)">
      <i class="ti ti-loader-2" style="font-size:24px;animation:spin 1s linear infinite;display:block;margin-bottom:8px"></i>
      <div style="font-size:12px">AI đang đọc hóa đơn...</div>
    </div>

    <div id="scan-result" style="display:none">
      <div style="font-size:11px;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
        <i class="ti ti-check-circle"></i> Kết quả nhận dạng — kiểm tra lại trước khi lưu
      </div>
      <div class="form-grid">
        <div class="form-group full">
          <label>Vận đơn *</label>
          <select id="scan-vd">
            <option value="">-- Chọn vận đơn --</option>${vdopts}
          </select>
        </div>
        <div class="form-group">
          <label>Loại chi</label>
          <input type="text" id="scan-loai" placeholder="AI điền tự động">
        </div>
        <div class="form-group">
          <label>Số tiền (VNĐ)</label>
          <input type="text" id="scan-tien" placeholder="0" oninput="this.value=fmtInput(this.value)">
        </div>
        <div class="form-group">
          <label>Số HĐ / Chứng từ</label>
          <input type="text" id="scan-ct" placeholder="AI điền tự động">
        </div>
        <div class="form-group">
          <label>Ngày</label>
          <input type="date" id="scan-ngay" value="${today()}">
        </div>
        <div class="form-group full">
          <label>Ghi chú thêm từ AI</label>
          <textarea id="scan-ghichu" rows="2" placeholder="AI điền tự động"></textarea>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-foot">
    <button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" id="scan-save-btn" style="display:none" onclick="saveScanResult()">
      <i class="ti ti-device-floppy"></i> Lưu chi hộ
    </button>
  </div>
  </div>`;
  document.body.appendChild(bg);
}

function handleScanDrop(e){
  e.preventDefault();
  const file=e.dataTransfer.files[0];
  if(file&&file.type.startsWith('image/'))processImageFile(file);
}
function handleScanFile(input){
  const file=input.files[0];
  if(file)processImageFile(file);
}

async function processImageFile(file){
  // Show preview
  const reader=new FileReader();
  reader.onload=async(e)=>{
    document.getElementById('scan-preview').style.display='block';
    document.getElementById('scan-img').src=e.target.result;
    document.getElementById('scan-upload-area').style.display='none';
    document.getElementById('scan-loading').style.display='block';
    document.getElementById('scan-result').style.display='none';

    // Call Claude API
    try{
      const base64=e.target.result.split(',')[1];
      const mediaType=file.type;
      const response=await fetch('https://vcrnlyvdquodiqfwaogj.supabase.co/functions/v1/quick-task',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-haiku-4-5-20251001',
          max_tokens:1000,
          messages:[{
            role:'user',
            content:[
              {type:'image',source:{type:'base64',media_type:mediaType,data:base64}},
              {type:'text',text:`Đây là hóa đơn/phiếu thu của dịch vụ logistics tại Hải Phòng, Việt Nam.
Hãy đọc và trích xuất thông tin, trả về JSON với format sau (chỉ JSON, không giải thích):
{
  "loai_chi": "tên loại dịch vụ (vd: Nâng hạ cont, Phí lưu cont, Giám sát hải quan, Phí cảng...)",
  "so_tien": số tiền (chỉ số, không dấu chấm phẩy),
  "so_cont": "số cont nếu có (11 ký tự, vd: FFAU7443981) hoặc null",
  "so_hd": "số hóa đơn hoặc số chứng từ nếu có",
  "ngay": "ngày trên HĐ format YYYY-MM-DD nếu có",
  "ghi_chu": "thông tin thêm quan trọng"
}`}
            ]
          }]
        })
      });
      const data=await response.json();
      const text=data.content?.[0]?.text||'{}';
      const clean=text.replace(/```json|```/g,'').trim();
      const result=JSON.parse(clean);

      // Fill form
      document.getElementById('scan-loading').style.display='none';
      document.getElementById('scan-result').style.display='block';
      document.getElementById('scan-save-btn').style.display='flex';

      if(result.loai_chi)document.getElementById('scan-loai').value=result.loai_chi;
      if(result.so_tien)document.getElementById('scan-tien').value=fmtInput(result.so_tien);
      if(result.so_hd)document.getElementById('scan-ct').value=result.so_hd;
      if(result.ngay)document.getElementById('scan-ngay').value=result.ngay;
      if(result.ghi_chu)document.getElementById('scan-ghichu').value=result.ghi_chu;

      // Auto-match cont to van don
      if(result.so_cont){
        const vdSel=document.getElementById('scan-vd');
        for(let opt of vdSel.options){
          if(opt.getAttribute('data-cont')===result.so_cont){
            vdSel.value=opt.value;
            break;
          }
        }
      }

      toast('AI đọc xong! Kiểm tra lại trước khi lưu','success');
    }catch(err){
      console.error('AI Error:', err);
      document.getElementById('scan-loading').style.display='none';
      document.getElementById('scan-result').style.display='block';
      document.getElementById('scan-save-btn').style.display='flex';
      toast('Lỗi AI: '+err.message+' — Điền thủ công','error');
    }
  };
  reader.readAsDataURL(file);
}

async function saveScanResult(){
  const vdSel=document.getElementById('scan-vd');
  const vdId=vdSel.value;
  const maDon=vdSel.options[vdSel.selectedIndex]?.getAttribute('data-ma')||'';
  if(!vdId){toast('Vui lòng chọn vận đơn','error');return;}
  const tien=parseNum(document.getElementById('scan-tien').value);
  if(!tien){toast('Vui lòng nhập số tiền','error');return;}
  const data={
    van_don_id:vdId, ma_don:maDon,
    loai_chi:document.getElementById('scan-loai').value||'Chi hộ HĐ',
    ngay_chi:document.getElementById('scan-ngay').value||today(),
    so_tien:tien, tien_thu_khach:tien,
    tien_tra_thau:0, tien_tra_laixe:0,
    nguoi_chi:CU?.ho_ten||'',
    chung_tu:document.getElementById('scan-ct').value,
    hoa_don_khach:true,
    da_thu_lai:false,
    ghi_chu:document.getElementById('scan-ghichu').value,
  };
  const{error}=await db.from('chi_ho').insert(data);
  if(error){toast('Lỗi lưu: '+error.message,'error');return;}
  toast('Đã lưu chi hộ từ hóa đơn!');
  closeModal();
}


async function pgTraThau(c){
  if(!canSee(['ke_toan','ceo'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const{data}=await db.from('van_don').select('*').neq('thanh_toan_thau','Đã trả').gt('gia_cuoc_thau',0).order('ngay',{ascending:false});
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
    db.from('van_don').select('*').gte('ngay',from).lte('ngay',to).eq('locked',true).order('ngay'),
    db.from('chi_ho').select('*').gte('ngay_chi',from).lte('ngay_chi',to),
  ]);
  const list=orders||[];
  const chiHo=chiHoAll||[];
  if(!list.length){bc.innerHTML='<div class="empty"><i class="ti ti-inbox"></i>Không có dữ liệu hoàn thành trong khoảng thời gian này<br><span style="font-size:12px;color:var(--text-muted)">Chỉ tính đơn đã Hoàn thành & Khóa</span></div>';return;}

  // ── TÍNH TOÁN ──
  const tongCuocKH=list.reduce((s,o)=>s+(+o.gia_cuoc_khach||0),0);
  const tongCuocThau=list.reduce((s,o)=>s+(+o.gia_cuoc_thau||0),0);
  const tongCH=chiHo.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
  const tongDV=list.reduce((s,o)=>s+(+o.phi_doi_lenh||0)+(+o.phi_to_khai||0),0);
  const tongThu=tongCuocKH+tongCH+tongDV;
  const loiNhuan=tongThu-tongCuocThau;
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

  // Group đầu xe
  const xeMap={};
  list.forEach(o=>{
    const k=o.bien_kiem_soat||'Không có biển';
    if(!xeMap[k])xeMap[k]={cuoc:0,so:0,kh:0,thuong:0,thau:o.ma_thau_phu||''};
    xeMap[k].cuoc+=+o.gia_cuoc_thau||0;
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
      <div class="stat-val text-red">${fmt(Math.round(tongCuocThau/1e6))}tr</div>
      <div class="stat-sub">${xeArr.length} đầu xe · ${list.length} chuyến</div>
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
      <colgroup><col style="width:110px"><col style="width:130px"><col style="width:60px"><col style="width:110px"><col style="width:110px"><col style="width:70px"><col style="width:70px"><col style="width:80px"></colgroup>
      <thead><tr><th>Biển số</th><th>Thầu phụ</th><th>Chuyến</th><th>Cước thầu</th><th>TB/chuyến</th><th>Thường</th><th>KH/KG</th><th>Tỉ lệ KH</th></tr></thead>
      <tbody>
      ${xeArr.map(([k,v])=>{
        const tl=v.so>0?Math.round(v.kh/v.so*100):0;
        const mau=tl>=50?'var(--success)':tl>=30?'var(--warning)':'var(--danger)';
        const tb=v.so>0?Math.round(v.cuoc/v.so):0;
        return`<tr>
          <td class="text-blue fw6">${k}</td>
          <td style="font-size:11px">${v.thau||'—'}</td>
          <td class="fw6">${v.so}</td>
          <td class="text-red fw6">${fmt(Math.round(v.cuoc/1e6))}tr</td>
          <td>${fmt(Math.round(tb/1e3))}k</td>
          <td>${v.thuong}</td>
          <td style="color:var(--success);font-weight:600">${v.kh}</td>
          <td><span style="font-weight:700;color:${mau}">${tl}%</span></td>
        </tr>`;
      }).join('')}
      <tr style="background:#f5f9fb;font-weight:600">
        <td colspan="2">Tổng cộng</td>
        <td>${list.length}</td>
        <td class="text-red">${fmt(Math.round(tongCuocThau/1e6))}tr</td>
        <td>${fmt(Math.round(tongCuocThau/list.length/1e3))}k</td>
        <td>${list.length-tongKH}</td>
        <td style="color:var(--success)">${tongKH}</td>
        <td style="color:${tiLeKH>=50?'var(--success)':tiLeKH>=30?'var(--warning)':'var(--danger)'};font-weight:700">${tiLeKH}%</td>
      </tr>
      </tbody>
    </table>
  </div>`;
}


// ==================== UPLOAD HÓA ĐƠN ====================
const PROXY_URL='https://claude-proxy.quanghuy9796.workers.dev';

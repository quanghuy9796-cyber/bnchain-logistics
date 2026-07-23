// ORDERS.JS — Quản lý vận đơn
// fmtDate: yyyy-mm-dd → dd/mm/yyyy (dùng chung toàn app)
function fmtDate(d){
  if(!d) return '—';
  if(typeof d==='string'&&d.includes('-')&&d.length===10){
    const[y,m,day]=d.split('-');
    return`${day}/${m}/${y}`;
  }
  return d;
}
// Chi hộ, Detail Panel — Requires: config.js
let ORDER_PAGE=1;
const ORDER_PAGE_SIZE=25;
let _filteredOrders=[];
let _canM=false;

async function _fetchOrdersData(){
  const COLS='id,ma_don,ngay,trang_thai,ten_khach,so_bill,so_booking,loai_hang,so_cont,loai_cont,loai_xe_hang,loai_chuyen,bien_kiem_soat,ten_lai_xe,hanh_trinh,diem_lay,diem_tra,locked,ky_thanh_toan,trang_thai_bang_ke,gia_cuoc_khach,gia_cuoc_thau,thanh_toan_khach,thanh_toan_thau,phi_doi_lenh,phi_to_khai,co_doi_lenh,co_to_khai,ngay_yeu_cau,created_at,ma_thau_phu,loai_phan_loai_xe,la_xe_noi_bo,ghi_chu,ghi_chu_xe,diem_tra_phat_sinh,created_by,tra_thau_doi_lenh,don_vi_doi_lenh';
  let q=db.from('van_don').select(COLS).order('ngay',{ascending:false}).order('created_at',{ascending:false});
  if(CU?.vai_tro==='nhan_vien') q=q.eq('created_by',CU.id);
  if(ORDER_THANG){const[y,m]=ORDER_THANG.split('-');const lastDay=new Date(+y,+m,0).getDate();q=q.gte('ngay',`${y}-${m}-01`).lte('ngay',`${y}-${m}-${String(lastDay).padStart(2,'0')}`);}
  else{const d3m=new Date();d3m.setMonth(d3m.getMonth()-3);const cutoff=`${d3m.getFullYear()}-${String(d3m.getMonth()+1).padStart(2,'0')}-01`;q=q.gte('ngay',cutoff);}
  const{data}=await q.limit(500);
  ORDERS=data||[];
  _canM=canSee(['ke_toan','ceo','thu_quy']);
}

async function pgOrders(c){
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  await _fetchOrdersData();
  _renderOrdersUI(c);
}

function _renderOrdersUI(c){
  const counts={all:ORDERS.length,'Chờ xếp xe':0,'Đang vận chuyển':0,'Chờ xác nhận':0,'Hoàn thành':0};
  ORDERS.forEach(o=>counts[o.trang_thai]=(counts[o.trang_thai]||0)+1);
  const sq=ORDER_SEARCH.trim().toLowerCase();
  _filteredOrders=ORDERS.filter(o=>{
    const mq=!sq||(o.ma_don?.toLowerCase().includes(sq)||o.ten_khach?.toLowerCase().includes(sq)||o.so_bill?.toLowerCase().includes(sq)||o.so_booking?.toLowerCase().includes(sq)||o.so_cont?.toLowerCase().includes(sq)||o.bien_kiem_soat?.toLowerCase().includes(sq)||o.ma_thau_phu?.toLowerCase().includes(sq));
    if(!mq||(ORDER_LOAI&&o.loai_hang!==ORDER_LOAI)||(ORDER_FILTER!=='all'&&o.trang_thai!==ORDER_FILTER))return false;
    // Bộ lọc nâng cao (v2.9)
    if(ORDER_KH&&o.ten_khach!==ORDER_KH)return false;
    if(ORDER_THAU&&o.ma_thau_phu!==ORDER_THAU)return false;
    if(ORDER_PHANLOAI&&o.loai_phan_loai_xe!==ORDER_PHANLOAI)return false;
    if(ORDER_TT_KHACH&&(o.thanh_toan_khach||'Chưa thu')!==ORDER_TT_KHACH)return false;
    if(ORDER_TT_THAU&&(o.thanh_toan_thau||'Chưa thu')!==ORDER_TT_THAU)return false;
    if(ORDER_TU_NGAY&&(!o.ngay||o.ngay<ORDER_TU_NGAY))return false;
    if(ORDER_DEN_NGAY&&(!o.ngay||o.ngay>ORDER_DEN_NGAY))return false;
    if(ORDER_BIEN_SO&&o.bien_kiem_soat!==ORDER_BIEN_SO)return false;
    if(ORDER_LOAI_CHUYEN&&o.loai_chuyen!==ORDER_LOAI_CHUYEN)return false;
    return true;
  });
  const totalPages=Math.max(1,Math.ceil(_filteredOrders.length/ORDER_PAGE_SIZE));
  if(ORDER_PAGE>totalPages)ORDER_PAGE=totalPages;if(ORDER_PAGE<1)ORDER_PAGE=1;
  const ps=(ORDER_PAGE-1)*ORDER_PAGE_SIZE;
  const pageList=_filteredOrders.slice(ps,ps+ORDER_PAGE_SIZE);
  const now=new Date();
  const thOpts=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-i,1);const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;return`<option value="${v}" ${ORDER_THANG===v?'selected':''}>T${d.getMonth()+1}/${d.getFullYear()}</option>`;}).join('');
  c.innerHTML=`
  <div class="status-bar">
    <div class="status-btn ${ORDER_FILTER==='all'?'active':''}" onclick="ORDER_FILTER='all';ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))"><i class="ti ti-list"></i>Tất cả <span class="cnt">${counts.all}</span></div>
    <div class="status-btn s-cho ${ORDER_FILTER==='Chờ xếp xe'?'active':''}" onclick="ORDER_FILTER='Chờ xếp xe';ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))"><i class="ti ti-clock"></i>Chờ xếp xe <span class="cnt">${counts['Chờ xếp xe']||0}</span></div>
    <div class="status-btn s-chay ${ORDER_FILTER==='Đang vận chuyển'?'active':''}" onclick="ORDER_FILTER='Đang vận chuyển';ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))"><i class="ti ti-truck"></i>Đang chạy <span class="cnt">${counts['Đang vận chuyển']||0}</span></div>
    <div class="status-btn s-xong ${ORDER_FILTER==='Hoàn thành'?'active':''}" onclick="ORDER_FILTER='Hoàn thành';ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))"><i class="ti ti-lock"></i>Hoàn thành <span class="cnt">${counts['Hoàn thành']||0}</span></div>
  </div>
  <div class="toolbar">
    ${canSee(['nhan_vien','quan_ly','ke_toan','ceo'])?`<button class="btn btn-primary" onclick="openForm()"><i class="ti ti-plus"></i> Thêm vận đơn</button>`:''}
    <input class="search-inp" placeholder="Tìm mã đơn, bill, booking, cont, biển số, thầu..." value="${ORDER_SEARCH}" oninput="clearTimeout(window._searchT);window._searchT=setTimeout(()=>{ORDER_SEARCH=this.value;ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))},600)">
    <select class="filter-sel" onchange="ORDER_LOAI=this.value;ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))">
      <option value="">Tất cả loại</option>
      <option value="Xuất" ${ORDER_LOAI==='Xuất'?'selected':''}>Xuất</option>
      <option value="Nhập" ${ORDER_LOAI==='Nhập'?'selected':''}>Nhập</option>
      <option value="CK" ${ORDER_LOAI==='CK'?'selected':''}>CK</option>
    </select>
    <select class="filter-sel" onchange="ORDER_THANG=this.value;ORDER_PAGE=1;pgOrders(document.getElementById('content'))">
      <option value="">Tất cả tháng</option>${thOpts}
    </select>
    <button class="btn btn-sm" onclick="ORDER_ADV_OPEN=!ORDER_ADV_OPEN;_renderOrdersUI(document.getElementById('content'))"><i class="ti ti-filter"></i> Lọc nâng cao${_advCount()?` (${_advCount()})`:''}</button>
    <button class="btn btn-sm" onclick="xuatExcelOrders(this)"><i class="ti ti-file-spreadsheet"></i> Xuất Excel</button>
    <span class="ml-auto" style="font-size:11.5px;color:var(--text-muted)">${_filteredOrders.length} vận đơn</span>
  </div>
  ${ORDER_ADV_OPEN?_buildAdvFilterBar():''}
  <div class="tbl-wrap"><table class="tbl">
    <colgroup>
      <col style="width:105px"><col style="width:70px"><col style="width:110px"><col style="width:90px">
      <col style="width:50px"><col style="width:100px"><col style="width:90px"><col style="width:60px">
      <col style="width:85px"><col style="width:95px"><col style="width:90px">${_canM?'<col style="width:90px"><col style="width:85px">':''}
      <col style="width:105px">
    </colgroup>
    <thead><tr>
      <th>Mã đơn</th><th>Ngày</th><th>Khách hàng</th><th>Bill / Booking</th>
      <th>Loại</th><th>Hành trình</th><th>Số Cont</th><th>Loại C.</th>
      <th>Loại chuyến</th><th>Biển số</th><th>Thầu phụ</th>${_canM?'<th>Cước KH</th><th>Cước thầu</th>':''}
      <th>Trạng thái</th>
    </tr></thead>
    <tbody id="orders-tbody">${_buildRows(pageList)}</tbody>
  </table></div>
  ${totalPages>1?`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px 2px;flex-wrap:wrap;gap:6px">
    <span style="font-size:11.5px;color:var(--text-muted)">Hiển thị ${ps+1}–${Math.min(ps+ORDER_PAGE_SIZE,_filteredOrders.length)} / ${_filteredOrders.length} đơn</span>
    <div id="pag-btns" style="display:flex;gap:4px">${_buildPagBtns(ORDER_PAGE,totalPages)}</div>
  </div>`:''}`;
  if(SEL){
    const selTr=document.querySelector(`#orders-tbody tr[onclick*="${SEL}"]`);
    if(selTr)selTr.classList.add('selected');
  }
}
function _advCount(){
  return[ORDER_KH,ORDER_THAU,ORDER_PHANLOAI,ORDER_TT_KHACH,ORDER_TT_THAU,ORDER_TU_NGAY,ORDER_DEN_NGAY,ORDER_BIEN_SO,ORDER_LOAI_CHUYEN].filter(Boolean).length;
}
function _buildAdvFilterBar(){
  const khOpts=[...new Set(ORDERS.map(o=>o.ten_khach).filter(Boolean))].sort().map(k=>`<option value="${k}" ${ORDER_KH===k?'selected':''}>${k}</option>`).join('');
  // Thầu phụ: lấy TRỰC TIẾP từ mã đang có trên vận đơn (không chỉ Danh mục Thầu phụ) —
  // vì có thầu ngoài/gõ tay chưa từng thêm vào Danh mục (VD: DV-THUTUC). Ghép tên nếu tìm thấy trong TP, không thì hiện mã.
  const tpNameMap={};(TP||[]).forEach(t=>tpNameMap[t.ma_thau]=t.ten_cong_ty);
  const maThauSet=[...new Set(ORDERS.map(o=>o.ma_thau_phu).filter(Boolean))].sort();
  const thauOpts=maThauSet.map(ma=>`<option value="${ma}" ${ORDER_THAU===ma?'selected':''}>${ma}${tpNameMap[ma]?' — '+tpNameMap[ma]:''}</option>`).join('');
  const plLabel={'noi_bo':'🚗 Nội bộ','thau_tu_lai':'🚛 Thầu tự lái','thau_thue_lai':'🔄 Thầu thuê lái'};
  const plOpts=Object.entries(plLabel).map(([v,l])=>`<option value="${v}" ${ORDER_PHANLOAI===v?'selected':''}>${l}</option>`).join('');
  const ttOpts=['Đã thu','Chưa thu','Đã thu một phần'].map(v=>`<option value="${v}">${v}</option>`).join('');
  const bienSoOpts=[...new Set(ORDERS.map(o=>o.bien_kiem_soat).filter(Boolean))].sort().map(b=>`<option value="${b}" ${ORDER_BIEN_SO===b?'selected':''}>${b}</option>`).join('');
  const lcOpts=['Thường','Kết hợp','Kẹp ghép'].map(v=>`<option value="${v}" ${ORDER_LOAI_CHUYEN===v?'selected':''}>${v}</option>`).join('');
  return`<div class="toolbar" style="margin-top:-6px;margin-bottom:10px;flex-wrap:wrap;gap:8px;background:var(--bg-alt,#f8fafc);border-radius:8px;padding:10px">
    <select class="filter-sel" onchange="ORDER_KH=this.value;ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))">
      <option value="">-- Khách hàng --</option>${khOpts}
    </select>
    <select class="filter-sel" onchange="ORDER_THAU=this.value;ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))">
      <option value="">-- Thầu phụ --</option>${thauOpts}
    </select>
    <select class="filter-sel" onchange="ORDER_BIEN_SO=this.value;ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))">
      <option value="">-- Biển số xe --</option>${bienSoOpts}
    </select>
    <select class="filter-sel" onchange="ORDER_LOAI_CHUYEN=this.value;ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))">
      <option value="">-- Loại chuyến --</option>${lcOpts}
    </select>
    <select class="filter-sel" onchange="ORDER_PHANLOAI=this.value;ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))">
      <option value="">-- Phân loại xe --</option>${plOpts}
    </select>
    ${_canM?`<select class="filter-sel" onchange="ORDER_TT_KHACH=this.value;ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))">
      <option value="">-- TT thu khách --</option>${ttOpts.replace(`value="${ORDER_TT_KHACH}"`,`value="${ORDER_TT_KHACH}" selected`)}
    </select>
    <select class="filter-sel" onchange="ORDER_TT_THAU=this.value;ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))">
      <option value="">-- TT trả thầu --</option>${ttOpts.replace(`value="${ORDER_TT_THAU}"`,`value="${ORDER_TT_THAU}" selected`)}
    </select>`:''}
    <input type="date" class="filter-sel" value="${ORDER_TU_NGAY}" title="Từ ngày" onchange="ORDER_TU_NGAY=this.value;ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))">
    <input type="date" class="filter-sel" value="${ORDER_DEN_NGAY}" title="Đến ngày" onchange="ORDER_DEN_NGAY=this.value;ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))">
    <button class="btn btn-sm" onclick="ORDER_KH='';ORDER_THAU='';ORDER_PHANLOAI='';ORDER_TT_KHACH='';ORDER_TT_THAU='';ORDER_TU_NGAY='';ORDER_DEN_NGAY='';ORDER_BIEN_SO='';ORDER_LOAI_CHUYEN='';ORDER_PAGE=1;_renderOrdersUI(document.getElementById('content'))"><i class="ti ti-x"></i> Xóa lọc nâng cao</button>
  </div>`;
}

// ==================== XUẤT EXCEL ====================
async function xuatExcelOrders(btn){
  if(!_filteredOrders.length){toast('Không có vận đơn nào để xuất','error');return;}
  if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2"></i> Đang tạo...';}
  try{
    if(!window.XLSX){
      await new Promise((res,rej)=>{
        const s=document.createElement('script');
        s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload=res; s.onerror=rej;
        document.head.appendChild(s);
      });
    }
    const plLabel={'noi_bo':'Nội bộ','thau_tu_lai':'Thầu tự lái','thau_thue_lai':'Thầu thuê lái'};
    const header=['Mã đơn','Ngày','Khách hàng','Bill','Booking','Loại hàng','Hành trình','Số cont','Loại cont','Loại chuyến','Biển số','Thầu phụ','Phân loại xe'];
    if(_canM)header.push('Cước KH','Cước thầu','TT thu khách','TT trả thầu');
    header.push('Trạng thái');
    const rows=_filteredOrders.map(o=>{
      const r=[o.ma_don,fmtDate(o.ngay),o.ten_khach,o.so_bill||'',o.so_booking||'',o.loai_hang||'',o.hanh_trinh||'',o.so_cont||'',o.loai_cont||o.loai_xe_hang||'',o.loai_chuyen||'',o.bien_kiem_soat||'',o.ma_thau_phu||'',plLabel[o.loai_phan_loai_xe]||''];
      if(_canM)r.push(+o.gia_cuoc_khach||0,+o.gia_cuoc_thau||0,o.thanh_toan_khach||'Chưa thu',o.thanh_toan_thau||'Chưa thu');
      r.push(o.trang_thai||'');
      return r;
    });
    const ws=XLSX.utils.aoa_to_sheet([header,...rows]);
    ws['!cols']=header.map(h=>({wch:h==='Hành trình'?32:h==='Khách hàng'?26:14}));
    const WB=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(WB,ws,'Vận đơn');
    const stamp=new Date().toISOString().slice(0,10);
    XLSX.writeFile(WB,`VanDon_${stamp}.xlsx`);
    toast(`✅ Đã xuất ${_filteredOrders.length} vận đơn`);
  }catch(err){
    console.error('[xuatExcelOrders]',err);
    toast('Lỗi xuất Excel: '+err.message,'error');
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-file-spreadsheet"></i> Xuất Excel';}
  }
}

function _buildRows(list){
  if(!list||list.length===0)return'<tr><td colspan="20"><div class="empty"><i class="ti ti-inbox"></i>Chưa có dữ liệu</div></td></tr>';
  const lcTag=lc=>!lc?'—':({'Thường':'<span class="tag" style="background:#f0fdf4;color:#166534">Thường</span>','Kết hợp':'<span class="tag" style="background:#eff6ff;color:#1d4ed8">Kết hợp</span>','Kẹp ghép':'<span class="tag" style="background:#fef9c3;color:#854d0e">Kẹp ghép</span>'}[lc]||lc);
  return list.map(o=>`<tr onclick="openDetail('${o.id}')" class="${SEL===o.id?'selected':''} ${o.locked?'locked':''}">
    <td><span style="color:var(--teal);font-weight:600">${o.ma_don}</span>${o.locked?'<i class="ti ti-lock" style="color:var(--success);font-size:10px;margin-left:3px"></i>':''}</td>
    <td>${fmtDate(o.ngay)}</td>
    <td title="${o.ten_khach}">${o.ten_khach}</td>
    <td style="color:var(--primary);font-weight:500" title="${o.so_bill||o.so_booking||''}">${o.so_bill||o.so_booking||'—'}</td>
    <td>${loaiTag(o.loai_hang)}</td>
    <td title="${o.hanh_trinh||''}">${o.hanh_trinh||'—'}</td>
    <td title="${o.so_cont||''}">${o.so_cont||'—'}</td>
    <td style="font-size:11px">${o.loai_cont||o.loai_xe_hang||'—'}</td>
    <td>${lcTag(o.loai_chuyen)}</td>
    <td>${o.bien_kiem_soat||'—'}</td>
    <td style="font-size:11px;color:var(--text-muted)">${o.ma_thau_phu||'—'}</td>
    ${_canM?`<td class="text-blue fw6">${o.gia_cuoc_khach>0?fmt(o.gia_cuoc_khach):'—'}</td><td class="text-red">${o.gia_cuoc_thau>0?fmt(o.gia_cuoc_thau):'—'}</td>`:''}
    <td>${ttTag(o.trang_thai)}</td>
  </tr>`).join('');
}
function _buildPagBtns(cur,total){
  let b=`<button class="btn btn-sm" style="min-width:32px" onclick="ORDER_PAGE--;_goPage()" ${cur===1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
  const s=Math.max(1,Math.min(cur-2,total-4)),e=Math.min(total,s+4);
  for(let i=s;i<=e;i++) b+=`<button class="btn btn-sm${i===cur?' btn-primary':''}" style="min-width:32px" onclick="ORDER_PAGE=${i};_goPage()">${i}</button>`;
  return b+`<button class="btn btn-sm" style="min-width:32px" onclick="ORDER_PAGE++;_goPage()" ${cur===total?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
}
function _goPage(){
  const total=Math.max(1,Math.ceil(_filteredOrders.length/ORDER_PAGE_SIZE));
  if(ORDER_PAGE<1)ORDER_PAGE=1;if(ORDER_PAGE>total)ORDER_PAGE=total;
  const s=(ORDER_PAGE-1)*ORDER_PAGE_SIZE;
  const tb=document.getElementById('orders-tbody');if(tb)tb.innerHTML=_buildRows(_filteredOrders.slice(s,s+ORDER_PAGE_SIZE));
  const pb=document.getElementById('pag-btns');if(pb)pb.innerHTML=_buildPagBtns(ORDER_PAGE,total);
}

// ==================== DETAIL PANEL ====================
async function openDetail(id, tab='info'){
  // Bỏ selected cũ bằng id cụ thể thay vì querySelectorAll toàn bộ
  if(SEL&&SEL!==id){
    const old=document.querySelector(`#orders-tbody tr[onclick*="${SEL}"]`);
    if(old)old.classList.remove('selected');
  }
  SEL=id;
  const o=ORDERS.find(x=>x.id===id);
  if(!o)return;
  const newTr=document.querySelector(`#orders-tbody tr[onclick*="${id}"]`);
  if(newTr)newTr.classList.add('selected');
  const dp=document.getElementById('dp');
  dp.style.display='flex';dp.style.flexDirection='column';
  DP_TAB=tab;
  await renderDP(o);
}

async function renderDP(o){
  const dp=document.getElementById('dp');
  const canM=canSee(['ke_toan','ceo']);
  const canViewCuoc=canSee(['ke_toan','ceo','thu_quy']); // thủ quỹ chỉ xem Tab Cước để đối chiếu, không sửa
  const isOpsHP=CU?.vai_tro==='ops_hp';
  const editable=isOpsHP?false:canEdit(o)&&(CU?.vai_tro!=='nhan_vien'||o.created_by===CU?.id);
  const editableCuoc=canM&&!editable?true:editable; // thu_quy không nằm trong canM -> luôn false nếu chưa editable
  // Luôn fetch chi_ho đầy đủ — badge và nội dung tab cần chính xác ngay từ đầu
  const{data:chiHoData}=await db.from('chi_ho').select('*').eq('van_don_id',o.id).order('ngay_chi');
  const chiHoList=chiHoData||[];
  const chiHoCount=chiHoList.length;
  const totalCH=chiHoList.reduce((s,c)=>s+(+c.so_tien||0),0);
  const loi=(+o.gia_cuoc_khach||0)-(+o.gia_cuoc_thau||0)-totalCH;

  const canUnlockHdr=canSee(['quan_ly','ceo']);
  const lockBtnHdr=!o.locked&&editable
    ?`<button class="btn btn-success btn-sm" onclick="lockOrder('${o.id}')"><i class="ti ti-lock"></i> Hoàn thành & Khóa</button>`
    :(o.locked&&canUnlockHdr?`<button class="btn btn-danger btn-sm" onclick="unlockOrder('${o.id}')"><i class="ti ti-lock-open"></i> Mở khóa</button>`:'');
  dp.innerHTML=`
  <div class="dp-header">
    <span class="dp-code">${o.ma_don}</span>
    <div style="display:flex;align-items:center;gap:6px">
      ${o.locked?'<span class="dp-locked"><i class="ti ti-lock"></i>Đã khóa</span>':''}
      ${lockBtnHdr}
      <button class="btn btn-sm" onclick="closeDp()"><i class="ti ti-x"></i></button>
    </div>
  </div>
  <div class="tabs">
    <div class="tab ${DP_TAB==='info'?'active':''}" onclick="switchTab('info','${o.id}')"><i class="ti ti-info-circle"></i> Thông tin</div>
    <div class="tab ${DP_TAB==='xe'?'active':''}" onclick="switchTab('xe','${o.id}')"><i class="ti ti-truck"></i> Xe & Cont</div>
    <div class="tab ${DP_TAB==='chiho'?'active':''}" onclick="switchTab('chiho','${o.id}')"><i class="ti ti-receipt"></i> Chi hộ ${chiHoCount?`<span style="background:var(--warning);color:#fff;border-radius:10px;padding:0 5px;font-size:10px;margin-left:2px">${chiHoCount}</span>`:''}</div>
    ${canViewCuoc?`<div class="tab ${DP_TAB==='cuoc'?'active':''}" onclick="switchTab('cuoc','${o.id}')"><i class="ti ti-coins"></i> Cước & Chốt</div>`:''}
  </div>
  <div class="tab-content" id="tab-body">
  ${DP_TAB==='info'?renderTabInfo(o,editable):''}
  ${DP_TAB==='xe'?renderTabXe(o,editable):''}
  ${DP_TAB==='chiho'?renderTabChiHo(o,chiHoList||[],editable,isOpsHP):''}
  ${DP_TAB==='cuoc'&&canViewCuoc?renderTabCuoc(o,chiHoList||[],editableCuoc,loi):''}
  </div>`;
}

function renderTabInfo(o,editable){
  const dis=!editable?'disabled':'';
  const isNhap=o.loai_hang==='Nhập';
  const canDelete=canSee(['quan_ly','ceo']);
  return`
  ${o.locked?`<div class="lock-notice"><span><i class="ti ti-lock"></i> Đã khóa — chỉ xem.</span></div>`:''}
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-file-description"></i>Thông tin cơ bản</div>
    <div class="form-grid">
      <div class="form-group"><label>Ngày *</label>
        <input type="date" id="fi-ngay" value="${o.ngay||today()}" ${dis}></div>
      <div class="form-group"><label>Khách hàng *</label>
        <select id="fi-khach" ${dis}>
          <option value="">-- Chọn --</option>
          ${KH.map(k=>`<option value="${k.ten_cong_ty}" ${o.ten_khach===k.ten_cong_ty?'selected':''}>${k.ten_cong_ty}</option>`).join('')}
          ${!KH.find(k=>k.ten_cong_ty===o.ten_khach)&&o.ten_khach?`<option value="${o.ten_khach}" selected>${o.ten_khach}</option>`:''}
        </select></div>
      <div class="form-group"><label>Loại hàng *</label>
        <select id="fi-loai" onchange="toggleBillBooking()" ${dis}>
          <option ${o.loai_hang==='Nhập'?'selected':''}>Nhập</option>
          <option ${o.loai_hang==='Xuất'?'selected':''}>Xuất</option>
          <option ${o.loai_hang==='Chuyển kho'?'selected':''}>Chuyển kho</option>
        </select></div>
      <div class="form-group" id="grp-bill" ${!isNhap?'style="display:none"':''}>
        <label>Số Bill</label>
        <input type="text" id="fi-bill" value="${o.so_bill||''}" placeholder="Số bill hàng nhập" ${dis}></div>
      <div class="form-group" id="grp-booking" ${isNhap?'style="display:none"':''}>
        <label>Số Booking</label>
        <input type="text" id="fi-booking" value="${o.so_booking||''}" placeholder="Số booking hàng xuất" ${dis}></div>
      <div class="form-group" style="position:relative"><label>Điểm lấy hàng *</label>
        <input type="text" id="fi-lay" value="${o.diem_lay||''}" placeholder="Gõ tên / viết tắt để tìm..." autocomplete="off" ${dis}
          oninput="if(!this.disabled)onDiemInput(this,'fi-lay-drop')" onblur="closeDiemDrop('fi-lay-drop')">
        <div id="fi-lay-drop" data-input-id="fi-lay" style="display:none;position:absolute;z-index:999;left:0;right:0;top:100%;background:#fff;border:1px solid var(--border);border-radius:var(--r);box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:240px;overflow-y:auto"></div>
      </div>
      <div class="form-group" style="position:relative"><label>Điểm trả hàng *</label>
        <input type="text" id="fi-tra" value="${o.diem_tra||''}" placeholder="Gõ tên / viết tắt để tìm..." autocomplete="off" ${dis}
          oninput="if(!this.disabled)onDiemInput(this,'fi-tra-drop')" onblur="closeDiemDrop('fi-tra-drop')">
        <div id="fi-tra-drop" data-input-id="fi-tra" style="display:none;position:absolute;z-index:999;left:0;right:0;top:100%;background:#fff;border:1px solid var(--border);border-radius:var(--r);box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:240px;overflow-y:auto"></div>
      </div>
      <div class="form-group full"><label>Điểm trả phát sinh thêm</label>
        <input type="text" id="fi-traphat" value="${o.diem_tra_phat_sinh||''}" placeholder="Nếu có thêm điểm trả..." ${dis}></div>
      <div class="form-group"><label>Ngày yêu cầu giao</label>
        <input type="date" id="fi-ycgiao" value="${o.ngay_yeu_cau||''}" ${dis}></div>
    </div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-currency-dong"></i>Dịch vụ cộng thêm</div>
    <div class="form-grid">
      <div class="form-group">
        <label><input type="checkbox" id="fi-doilenh" ${o.co_doi_lenh?'checked':''} ${dis} style="width:auto;margin-right:5px"
          onchange="document.getElementById('grp-phidl').style.display=this.checked?'block':'none'">Đổi lệnh</label>
        <div id="grp-phidl" style="display:${o.co_doi_lenh?'block':'none'}">
          <input type="text" id="fi-phidl" value="${o.phi_doi_lenh>0?fmtInput(o.phi_doi_lenh):''}" placeholder="Phí / cont (VNĐ)" ${dis}
            oninput="fmtOnInput(this)">
          <span style="font-size:10px;color:var(--text-muted)">thu theo số cont</span>
        </div>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="fi-tokhai" ${o.co_to_khai?'checked':''} ${dis} style="width:auto;margin-right:5px"
          onchange="document.getElementById('grp-phitk').style.display=this.checked?'block':'none'">Mở tờ khai</label>
        <div id="grp-phitk" style="display:${o.co_to_khai?'block':'none'}">
          <input type="text" id="fi-phitk" value="${o.phi_to_khai>0?fmtInput(o.phi_to_khai):''}" placeholder="Phí / lô (VNĐ)" ${dis}
            oninput="fmtOnInput(this)">
          <span style="font-size:10px;color:var(--text-muted)">thu theo lô</span>
        </div>
      </div>
    </div>
  </div>
  <div class="form-group" style="margin-bottom:10px"><label>Ghi chú</label>
    <textarea id="fi-ghichu" ${dis}>${o.ghi_chu||''}</textarea></div>
  ${editable?`
  <div style="display:flex;gap:8px">
    <button class="btn btn-teal" style="flex:1;justify-content:center" onclick="saveInfo('`+o.id+`')"><i class="ti ti-device-floppy"></i> Lưu thông tin</button>
    ${canDelete?`<button class="btn btn-danger btn-sm" onclick="deleteOrder('`+o.id+`')"><i class="ti ti-trash"></i> Xóa đơn</button>`:''}
  </div>`:''}`;
}

function renderTabXe(o,editable){
  const dis=!editable?'disabled':'';
  const _lxVal=o.loai_cont||o.loai_xe_hang||'';
  const lockBar=o.locked?'<div class="lock-notice" style="margin-bottom:8px"><span><i class="ti ti-lock"></i> Đã khóa — chỉ xem.</span></div>':'';
  const lxOpts=LX.map(l=>`<option value="${l.ho_ten}">`).join('');
  const tpOpts=TP.map(t=>`<option value="${t.ma_thau}">${t.ten_cong_ty}</option>`).join('');
  const bienOpts=(XE||[]).map(x=>`<option value="${x.bien_so}">${x.bien_so}${x.ma_thau_phu?' — '+x.ma_thau_phu:''}</option>`).join('');
  const loaiXeList=['20 nhẹ','20 nặng','Cont 40','Cont 45','Xe tải 1.25T','Xe tải 2.5T','Xe tải 3.5T','Xe tải 5T','Xe tải 8T','Xe tải 10T','Mooc sàn','Mooc rào','Fooc'];
  const loaiXeOpts=loaiXeList.map(v=>`<option value="${v}">`).join('');
  const loaiChuyenOpts='<option value="" disabled '+(o.loai_chuyen?'':'selected')+'>-- Chọn loại chuyến --</option>'+['Thường','Kết hợp','Kẹp ghép'].map(s=>`<option ${o.loai_chuyen===s?'selected':''}>${s}</option>`).join('');
  const ttOpts=['Chờ xếp xe','Đang vận chuyển'].map(s=>`<option ${o.trang_thai===s?'selected':''}>${s}</option>`).join('')+(o.trang_thai==='Chờ xác nhận'?'<option selected>Chờ xác nhận</option>':'')+(o.trang_thai==='Hoàn thành'?'<option selected>Hoàn thành</option>':'');
  return`${lockBar}
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-truck"></i>Phân công xe & lái xe</div>
    <div class="form-grid">
      <div class="form-group" style="position:relative"><label>Biển kiểm soát</label>
        <input type="text" id="fx-bien" value="${o.bien_kiem_soat||''}" placeholder="Nhập biển kiểm soát..."
          ${dis} oninput="onBienInput(this)"
          onblur="validateBienInput(this)"
          autocomplete="off">
        <div id="fx-bien-drop" style="display:none;position:absolute;z-index:999;left:0;right:0;top:100%;background:#fff;border:1px solid var(--border);border-radius:var(--r);box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:220px;overflow-y:auto"></div>
        <span id="fx-bien-err" style="font-size:10px;color:var(--danger);display:none">Định dạng: 99H-06375</span>
        <span style="font-size:10px;color:var(--text-muted)">Thầu phụ tự động theo biển số</span>
      </div>
      <div class="form-group" id="fx-laixe-group" style="${o.loai_phan_loai_xe==='__never__'?'display:none':''}">
        <label>Lái xe <span style="font-size:10px;color:var(--teal)">(điền tự do)</span></label>
        <input type="text" id="fx-laixe" value="${o.ten_lai_xe||''}" placeholder="Nhập tên lái xe..." list="laixe-dl" ${dis}>
        <datalist id="laixe-dl">${lxOpts}</datalist>
        <span style="font-size:10px;color:var(--text-muted)">
          ${o.loai_phan_loai_xe==='noi_bo'?'🚗 Xe nội bộ':o.loai_phan_loai_xe==='thau_thue_lai'?'🚛 Thầu thuê lái (BN Chain tính lương)':''}
        </span>
      </div>
      <input type="hidden" id="fx-phanloai" value="${o.loai_phan_loai_xe||''}">
      <input type="hidden" id="fx-noibo" value="${o.la_xe_noi_bo?'true':'false'}">
      <div class="form-group" id="fx-thauphu-group" style="${o.loai_phan_loai_xe==='noi_bo'?'display:none':''}">
        <label>Thầu phụ <span style="font-size:10px;color:var(--teal)">(tự động / tự điền)</span></label>
        <input type="text" id="fx-thauphu" value="${o.ma_thau_phu||''}" placeholder="Tự điền nếu chưa có..." list="tp-dl" ${dis}>
        <datalist id="tp-dl">${tpOpts}</datalist>
      </div>
      <div class="form-group"><label>Loại chuyến</label>
        <select id="fx-lchuyen" ${dis}>${loaiChuyenOpts}</select>
      </div>
    </div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-box"></i>Thông tin Cont / Xe hàng</div>
    <div class="form-grid">
      <div class="form-group"><label>Số cont ${o.loai_hang==='Xuất'?'<span style="font-size:10px;color:var(--warning)">(điền sau khi lấy cont)</span>':''}</label>
        <input type="text" id="fx-cont" value="${o.so_cont||''}"
          placeholder="${o.loai_hang==='Xuất'?'Điền khi lấy cont rỗng...':'AAAU1234567 (11 ký tự)'}"
          maxlength="11" ${dis}
          oninput="this.value=formatCont(this.value);onContInput(this)"
          onblur="if(this.value&&this.value.length!==11)this.style.borderColor='var(--danger)';else this.style.borderColor=''">
        <span style="font-size:10px;color:var(--text-muted)" id="cont-len">${o.so_cont?o.so_cont.length+'/11 ký tự':''}</span>
      </div>
      <div class="form-group"><label>Loại xe / cont</label>
        <select id="fx-loaixe" ${dis}>
          <option value="">-- Chọn loại --</option>
          ${loaiXeList.map(v=>`<option value="${v}" ${_lxVal===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full"><label>Ghi chú xe / chuyến</label>
        <textarea id="fx-ghichuXe" ${dis}>${o.ghi_chu_xe||''}</textarea>
      </div>
    </div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-flag"></i>Trạng thái <span style="font-size:10px;color:var(--teal)">(tự chuyển khi nhập biển số)</span></div>
    <div class="form-group">
      <select id="fx-tt" ${dis}>${ttOpts}</select>
    </div>
  </div>
  ${editable?`
  <button class="btn btn-teal" style="width:100%;justify-content:center" onclick="saveXe('`+o.id+`')"><i class="ti ti-device-floppy"></i> Lưu xe & cont</button>
  ${!o.locked?`<p style="font-size:10.5px;color:var(--text-muted);text-align:center;margin-top:5px">⚠️ Xe đã giao hàng xong? Bấm "Hoàn thành & Khóa" ở góc trên</p>`:''}
  `:''}`;
}

function renderTabChiHo(o,list,editable,isOpsHP=false){
  const listThat=list.filter(c=>!c.la_tham_chieu);
  const listThamChieu=list.filter(c=>c.la_tham_chieu);
  const total=listThat.reduce((s,c)=>s+(+c.so_tien||0),0);
  const coHD=list.some(c=>c.hoa_don_id);
  const lockBar=o.locked?'<div class="lock-notice" style="margin-bottom:8px"><span><i class="ti ti-lock"></i> Đã khóa — chỉ xem.</span></div>':'';
  // ops_hp chỉ xem, không thêm/sửa/xóa chi hộ
  const canEditCH=editable&&!isOpsHP;
  return`${lockBar}
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <div><div style="font-size:11px;color:var(--text-muted)">Tổng chi hộ</div>
      <div style="font-size:16px;font-weight:700;color:var(--warning)">${fmtM(total)}</div></div>
    ${coHD?`<button class="btn btn-xs btn-teal" onclick="taiTatCaHD('${o.id}')"><i class="ti ti-download"></i> Tải HĐ</button>`:''}
  </div>
  ${listThat.map(c=>`
  <div class="chi-ho-item">
    <div class="chi-ho-left">
      <div class="chi-ho-type">${c.loai_chi}</div>
      <div class="chi-ho-meta">${c.nguoi_chi||'—'} ${c.chung_tu?'· CT: '+c.chung_tu:''}</div>
      ${c.ghi_chu?`<div class="chi-ho-meta" style="font-style:italic">${c.ghi_chu}</div>`:''}
      <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">
        <span style="font-size:10px;background:var(--teal-light);color:var(--teal);padding:1px 6px;border-radius:8px">Thu KH: ${fmt(c.tien_thu_khach||c.so_tien)}</span>
        ${(c.tien_tra_thau||0)>0?`<span style="font-size:10px;background:#fef3c7;color:var(--warning);padding:1px 6px;border-radius:8px">Trả thầu: ${fmt(c.tien_tra_thau)}</span>`:''}
        ${(c.tien_tra_laixe||0)>0?`<span style="font-size:10px;background:#ede9fe;color:#7c3aed;padding:1px 6px;border-radius:8px">Trả LX: ${fmt(c.tien_tra_laixe)}</span>`:''}
        ${c.hoa_don_khach?'<span style="font-size:10px;background:#e0f2fe;color:#0369a1;padding:1px 6px;border-radius:8px">HĐ KH</span>':''}
        ${c.hoa_don_id?`<button class="btn btn-xs" style="font-size:10px;padding:1px 7px;height:auto;line-height:1.6" onclick="xemHoaDon('${c.hoa_don_id}',null)"><i class="ti ti-eye" style="font-size:11px"></i> Xem HĐ</button>`:''}
      </div>
    </div>
    <div class="chi-ho-right">
      <div class="chi-ho-amount">${fmtM(c.tien_thu_khach||c.so_tien)}</div>
      ${canEditCH?`<div style="display:flex;gap:4px;justify-content:flex-end;margin-top:4px">
        <button class="btn btn-xs btn-teal" onclick="editChiHo('${c.id}','`+`${c.van_don_id}','${c.ma_don}')"><i class="ti ti-edit"></i></button>
        <button class="btn btn-xs btn-danger" onclick="deleteChiHo('${c.id}','${c.van_don_id}')"><i class="ti ti-trash"></i></button>
      </div>`:''}
    </div>
  </div>`).join('')}
  ${listThat.length===0?'<div class="empty" style="padding:20px 0"><i class="ti ti-inbox"></i>Chưa có chi phí phát sinh</div>':''}
  ${canEditCH?`<button class="add-chi-ho-btn" onclick="openAddChiHo('`+o.id+`','`+o.ma_don+`')"><i class="ti ti-plus"></i> Thêm chi phí phát sinh</button>`:''}
  ${listThamChieu.length?`
  <div style="margin-top:12px;border-top:1px dashed var(--border);padding-top:10px">
    <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">
      <i class="ti ti-link"></i> Chi phí chung với cont khác (${listThamChieu.length})
    </div>
    ${listThamChieu.map(c=>`
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--r);padding:8px 10px;margin-bottom:6px;font-size:12px;box-sizing:border-box;width:100%;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;min-width:0">
          <span style="background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:600;white-space:nowrap">Tham chiếu</span>
          <strong style="white-space:nowrap">${c.loai_chi}</strong>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="font-size:11px;color:var(--text-muted);white-space:nowrap">
            Tổng HĐ: <strong class="text-orange">${fmtM(c.so_tien_hd_goc||0)}</strong>
          </div>
          ${canEditCH?`<button class="btn btn-xs btn-danger" onclick="deleteChiHo('${c.id}','${c.van_don_id}')" title="Gỡ tham chiếu này"><i class="ti ti-trash"></i></button>`:''}
        </div>
      </div>
      <div style="color:var(--text-muted);margin-top:4px;font-size:11px">
        HĐ: <strong>${c.chung_tu||'—'}</strong> · Ngày: ${fmtDate(c.ngay_chi)}
      </div>
      <div style="color:#92400e;margin-top:2px;font-size:11px;word-break:break-all;white-space:normal;line-height:1.5;overflow-wrap:break-word">${(c.ghi_chu||'').replace(/\[Tham chiếu\][^|]*\|/,'').trim()}</div>
    </div>`).join('')}
  </div>`:''}`;
}

// Gợi ý điền cước — tra ORDERS[] (RAM, không query DB thêm), chỉ lấy đơn locked=true, loại trừ chính đơn đang xem
// loai: 'khach' → key ten_khach+diem_lay+diem_tra+loai_chuyen | 'thau' → key ten_khach+ma_thau_phu+diem_lay+diem_tra+loai_chuyen
function _timGiaGanNhat(o,loai){
  if(!o.diem_lay||!o.diem_tra)return null;
  if(loai==='thau'&&!o.ma_thau_phu)return null;
  const match=(x,coLoaiChuyen)=>{
    if(x.id===o.id||!x.locked)return false;
    if(x.diem_lay!==o.diem_lay||x.diem_tra!==o.diem_tra)return false;
    if(x.ten_khach!==o.ten_khach)return false;
    if(x.loai_cont!==o.loai_cont)return false;
    if(loai==='thau'&&x.ma_thau_phu!==o.ma_thau_phu)return false;
    if(loai==='khach'&&(+x.gia_cuoc_khach||0)<=0)return false;
    if(loai==='thau'&&(+x.gia_cuoc_thau||0)<=0)return false;
    if(coLoaiChuyen&&x.loai_chuyen!==o.loai_chuyen)return false;
    return true;
  };
  let list=ORDERS.filter(x=>match(x,true));
  if(!list.length)list=ORDERS.filter(x=>match(x,false));
  if(!list.length)return null;
  list.sort((a,b)=>(b.ngay||'').localeCompare(a.ngay||''));
  const best=list[0];
  return{gia:loai==='thau'?best.gia_cuoc_thau:best.gia_cuoc_khach,ma_don:best.ma_don,ngay:best.ngay};
}
function _renderGoiYCuoc(o,loai,inputId){
  const g=_timGiaGanNhat(o,loai);
  if(!g)return'';
  return`<div style="font-size:11px;color:var(--teal,#0d9488);margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
    <span>💡 Gợi ý: <b>${fmtM(g.gia)}</b> (đơn #${g.ma_don}, ${fmtDate(g.ngay)})</span>
    <button type="button" class="btn btn-xs" style="padding:1px 8px" onclick="applyGoiYCuoc('${inputId}',${+g.gia})">Dùng giá này</button>
  </div>`;
}
function applyGoiYCuoc(inputId,gia){
  const el=document.getElementById(inputId);
  if(!el)return;
  el.value=String(gia);
  fmtOnInputCalc(el);
}
function renderTabCuoc(o,chiHoList,editable,loi){
  // ke_toan/ceo: khi locked vẫn nhập cước được — chỉ hiện banner nhắc nhở
  // Nút "Mở khóa" chỉ hiện cho quan_ly/ceo (đúng quyền thật của unlockOrder()) — ke_toan thấy banner nhưng không có nút vì bấm sẽ báo lỗi không có quyền
  const lockBar=o.locked&&canSee(['ke_toan','ceo','quan_ly'])
    ?`<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--r);padding:8px 12px;margin-bottom:10px;font-size:12px;color:#1d4ed8;display:flex;align-items:center;gap:6px">
        <i class="ti ti-lock" style="font-size:14px"></i>
        Điều vận đã hoàn thành chuyến. Nhập cước & lưu để chốt sổ.
      </div>`
    :(o.locked?'<div class="lock-notice" style="margin-bottom:8px"><span><i class="ti ti-lock"></i> Đã khóa — chỉ xem.</span></div>':'');
  const totalCH=chiHoList.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
  const totalTraThau=chiHoList.reduce((s,c)=>s+(+c.tien_tra_thau||0),0);
  const totalTraLX=chiHoList.reduce((s,c)=>s+(+c.tien_tra_laixe||0),0);
  const phiDL=o.co_doi_lenh?(+o.phi_doi_lenh||0):0;
  const phiTK=o.co_to_khai?(+o.phi_to_khai||0):0;
  const tongThuKH=(+o.gia_cuoc_khach||0)+phiDL+phiTK+totalCH;
  const isThauThueLai=o.loai_phan_loai_xe==='thau_thue_lai';
  const traThauDL=(+o.tra_thau_doi_lenh||0);
  const thucTraThau=(+o.gia_cuoc_thau||0)+totalTraThau+traThauDL-(isThauThueLai?totalTraLX:0);
  const coThau=!!o.ma_thau_phu;
  const lcBg2={'Thường':'#f0fdf4','Kết hợp':'#eff6ff','Kẹp ghép':'#fef9c3'};
  const lcColor2={'Thường':'#166534','Kết hợp':'#1d4ed8','Kẹp ghép':'#854d0e'};
  return`${lockBar}
  <div style="background:linear-gradient(135deg,#1a2f38 0%,#2d4a55 100%);border-radius:var(--r);padding:12px 14px;margin-bottom:12px;color:#fff">
    <div style="font-size:10px;font-weight:600;opacity:.5;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Thông tin chuyến</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px">
      <div><div style="font-size:10px;opacity:.55">Khách hàng</div><div style="font-size:12.5px;font-weight:600;margin-top:2px">${o.ten_khach||'—'}</div></div>
      <div><div style="font-size:10px;opacity:.55">Bill / Booking</div><div style="font-size:12.5px;font-weight:600;color:var(--primary);margin-top:2px">${o.so_bill||o.so_booking||'—'}</div></div>
      <div style="grid-column:span 2"><div style="font-size:10px;opacity:.55">Hành trình</div><div style="font-size:12.5px;font-weight:600;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span>${o.diem_lay||'—'}</span><i class="ti ti-arrow-right" style="font-size:12px;opacity:.5"></i><span>${o.diem_tra||'—'}</span></div></div>
      <div><div style="font-size:10px;opacity:.55">Số Cont</div><div style="font-size:12.5px;font-weight:600;margin-top:2px">${o.so_cont||'—'}</div></div>
      <div><div style="font-size:10px;opacity:.55">Loại Cont / Xe</div><div style="font-size:12.5px;font-weight:600;margin-top:2px">${o.loai_cont||o.loai_xe_hang||'—'}</div></div>
      <div><div style="font-size:10px;opacity:.55">Loại chuyến</div><div style="margin-top:4px">${o.loai_chuyen?`<span style="background:${lcBg2[o.loai_chuyen]||'rgba(255,255,255,.15)'};color:${lcColor2[o.loai_chuyen]||'#fff'};border-radius:4px;padding:2px 9px;font-size:11px;font-weight:600">${o.loai_chuyen}</span>`:'<span style="opacity:.4;font-size:12px">—</span>'}</div></div>
      <div><div style="font-size:10px;opacity:.55">Biển số xe</div><div style="font-size:12.5px;font-weight:600;margin-top:2px">${o.bien_kiem_soat||'—'}</div></div>
      ${o.ma_thau_phu?`<div style="grid-column:span 2;border-top:1px solid rgba(255,255,255,.1);padding-top:6px;margin-top:2px"><div style="font-size:10px;opacity:.55">Thầu phụ</div><div style="font-size:12.5px;font-weight:600;color:#fbbf24;margin-top:2px">${o.ma_thau_phu}</div></div>`:''}
    </div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-coins"></i>Cước & Thu khách</div>
    <div class="form-grid">
      <div class="form-group"><label>Cước vận chuyển (VNĐ)</label>
        <input type="text" id="fc-cuockh" value="${o.gia_cuoc_khach>0?fmtInput(o.gia_cuoc_khach):''}"
          placeholder="0" ${!editable?'disabled':''} oninput="fmtOnInputCalc(this)">
        ${editable?_renderGoiYCuoc(o,'khach','fc-cuockh'):''}</div>
      <div class="form-group"><label>Trạng thái thu</label>
        <select id="fc-thukh" ${!editable?'disabled':''}>
          ${['Chưa thu','Đã thu một phần','Đã thu'].map(s=>`<option ${o.thanh_toan_khach===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
    </div>
  </div>
  ${(o.co_doi_lenh||o.co_to_khai)?`
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-plus"></i>Dịch vụ cộng thêm
      <span style="font-size:10px;color:var(--text-muted);font-weight:400;margin-left:4px">(điền phí nếu chưa có)</span>
    </div>
    <div class="form-grid">
      ${o.co_doi_lenh?`<div class="form-group">
        <label>Phí đổi lệnh (VNĐ) <span style="color:var(--danger)">*</span></label>
        <input type="text" id="fc-phidl" value="${o.phi_doi_lenh>0?fmtInput(o.phi_doi_lenh):''}"
          placeholder="Bắt buộc điền" ${!editable?'disabled':''}
          oninput="fmtOnInputCalc(this)"
          style="${o.phi_doi_lenh>0?'':'border-color:var(--warning)'}">
        ${o.phi_doi_lenh>0?'':`<span style="font-size:10px;color:var(--warning)">⚠️ Chưa có phí — cần điền trước khi lưu</span>`}
      </div>`:`<input type="hidden" id="fc-phidl" value="${fmtInput(o.phi_doi_lenh||0)}">`}
      ${o.co_to_khai?`<div class="form-group">
        <label>Phí mở tờ khai (VNĐ) <span style="color:var(--danger)">*</span></label>
        <input type="text" id="fc-phitk" value="${o.phi_to_khai>0?fmtInput(o.phi_to_khai):''}"
          placeholder="Bắt buộc điền" ${!editable?'disabled':''}
          oninput="fmtOnInputCalc(this)"
          style="${o.phi_to_khai>0?'':'border-color:var(--warning)'}">
        ${o.phi_to_khai>0?'':`<span style="font-size:10px;color:var(--warning)">⚠️ Chưa có phí — cần điền trước khi lưu</span>`}
      </div>`:`<input type="hidden" id="fc-phitk" value="${fmtInput(o.phi_to_khai||0)}">`}
    </div>
  </div>`:`<input type="hidden" id="fc-phidl" value="0"><input type="hidden" id="fc-phitk" value="0">`}
  ${totalCH>0?`
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-receipt"></i>Chi hộ phát sinh</div>
    <div style="background:var(--bg);border-radius:var(--r);padding:10px 12px;font-size:12px">
      <div style="display:flex;justify-content:space-between;padding:3px 0">
        <span>Chi hộ (${chiHoList.filter(c=>!c.la_tham_chieu).length} khoản)</span>
        <span class="text-orange fw6">${fmtM(totalCH)}</span>
      </div>
    </div>
  </div>`:''}
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-arrow-left"></i>Trả thầu phụ</div>
    ${coThau?`
    <div class="form-grid">
      <div class="form-group"><label>Cước thầu (VNĐ)</label>
        <input type="text" id="fc-cuocthau" value="${o.gia_cuoc_thau>0?fmtInput(o.gia_cuoc_thau):''}"
          placeholder="0" ${!editable?'disabled':''} oninput="fmtOnInputCalc(this)">
        ${editable?_renderGoiYCuoc(o,'thau','fc-cuocthau'):''}</div>
      <div class="form-group"><label>Trạng thái trả thầu</label>
        <select id="fc-trathau" ${!editable?'disabled':''}>
          ${['Chưa trả','Đã trả một phần','Đã trả'].map(s=>`<option ${o.thanh_toan_thau===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
    </div>
    <div class="form-grid" style="margin-top:6px">
      <div class="form-group"><label>Trả thầu đổi lệnh (VNĐ)</label>
        <input type="text" id="fc-tradl" value="${o.tra_thau_doi_lenh>0?fmtInput(o.tra_thau_doi_lenh):''}"
          placeholder="0 — để trống nếu không có"
          ${!editable?'disabled':''} oninput="fmtOnInputCalc(this)"></div>
      <div class="form-group"><label>Đơn vị đổi lệnh</label>
        <input type="text" id="fc-dvdl" value="${o.don_vi_doi_lenh||''}"
          placeholder="Tên đơn vị làm đổi lệnh"
          ${!editable?'disabled':''}></div>
    </div>
    ${totalTraThau>0?`
    <div style="background:var(--bg);border-radius:var(--r);padding:10px 12px;font-size:12px;margin-top:8px">
      <div style="display:flex;justify-content:space-between;padding:3px 0">
        <span>Chi hộ phát sinh trả thầu (${chiHoList.filter(c=>!c.la_tham_chieu&&(+c.tien_tra_thau||0)>0).length} khoản)</span>
        <span class="text-orange fw6">${fmtM(totalTraThau)}</span>
      </div>
    </div>`:''}`:`
    <div style="background:var(--teal-light);border-radius:var(--r);padding:8px 12px;font-size:12px;color:var(--teal)">
      <i class="ti ti-info-circle"></i> 
      ${o.la_xe_noi_bo?'Xe nội bộ — tính lương theo chuyến (xây dựng sau)':'Chưa có thầu phụ — điền biển số ở Tab Xe & Cont để tự động nhận diện'}
    </div>
    <input type="hidden" id="fc-cuocthau" value="0">
    <input type="hidden" id="fc-trathau" value="${o.thanh_toan_thau||'Chưa trả'}">
    `}
  </div>
  <div style="background:var(--sidebar-bg);border-radius:var(--r);padding:12px 14px;color:#fff;margin-bottom:10px">
    <div style="font-size:10px;opacity:.6;margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">Tổng kết đơn này</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
      <div><div style="opacity:.6">Tổng thu khách</div><div id="tong-thu" style="font-size:15px;font-weight:700;color:#ffd700">${fmtM(tongThuKH)}</div></div>
      ${coThau?`<div>
        <div style="opacity:.6">Thực trả thầu</div>
        <div style="font-size:13px;font-weight:700;color:#fca5a5">${fmtM(thucTraThau)}</div>
        ${(totalTraThau>0||traThauDL>0)?`<div style="font-size:10px;opacity:.6">Cước ${fmtM(o.gia_cuoc_thau||0)}${totalTraThau>0?' + Chi hộ '+fmtM(totalTraThau):''}${traThauDL>0?' + Đổi lệnh '+fmtM(traThauDL):''}</div>`:''}
        ${totalTraLX>0?`<div style="font-size:10px;color:#c4b5fd;margin-top:2px">${isThauThueLai?'− Lương LX (trừ vào thầu)':'Trả lái xe'}: ${fmtM(totalTraLX)}</div>`:''}
      </div>`:''}
    </div>
    <div style="border-top:1px solid rgba(255,255,255,.1);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between">
      <span style="opacity:.6">Lợi nhuận gộp</span>
      <span style="font-weight:700;color:${(tongThuKH-thucTraThau)>=0?'#86efac':'#fca5a5'}">${fmtM(tongThuKH-thucTraThau)}</span>
    </div>
  </div>
  ${editable?`
  <button class="btn btn-teal" style="width:100%;justify-content:center;margin-bottom:8px" onclick="saveCuoc('`+o.id+`','`+o.co_doi_lenh+`','`+o.co_to_khai+`')">
    <i class="ti ti-device-floppy"></i> Lưu cước & thanh toán
  </button>
  `:''}`;
}

async function switchTab(tab,id){
  DP_TAB=tab;
  const o=ORDERS.find(x=>x.id===id);
  if(o)await renderDP(o);
}
function closeDp(){SEL=null;document.getElementById('dp').style.display='none';}

// SAVE FUNCTIONS
async function saveInfo(id){
  // Guard phân quyền server-side
  if(CU?.vai_tro==='ops_hp'){toast('Không có quyền sửa vận đơn','error');return;}
  const o=ORDERS.find(x=>x.id===id);
  if(CU?.vai_tro==='nhan_vien'&&o?.created_by!==CU?.id){toast('Chỉ được sửa đơn do mình tạo','error');return;}
  const loai=document.getElementById('fi-loai').value;
  const data={
    ngay:document.getElementById('fi-ngay').value,
    ten_khach:document.getElementById('fi-khach').value,
    loai_hang:loai,
    so_bill:loai==='Nhập'?(document.getElementById('fi-bill')?.value||null):null,
    so_booking:loai!=='Nhập'?(document.getElementById('fi-booking')?.value||null):null,
    diem_lay:document.getElementById('fi-lay').value,
    diem_tra:document.getElementById('fi-tra').value,
    // BUG FIX (23/06/2026): trước đây chỉ lưu diem_lay/diem_tra mà KHÔNG tính lại hanh_trinh,
    // nên cột "Hành trình" ngoài danh sách vẫn hiện giá trị cũ dù đã sửa điểm lấy/trả hàng.
    hanh_trinh:(document.getElementById('fi-lay').value||'')+(document.getElementById('fi-tra').value?' - '+document.getElementById('fi-tra').value:''),
    diem_tra_phat_sinh:document.getElementById('fi-traphat')?.value||null,
    ngay_yeu_cau:document.getElementById('fi-ycgiao')?.value||null,
    co_doi_lenh:document.getElementById('fi-doilenh').checked,
    phi_doi_lenh:parseNum(document.getElementById('fi-phidl')?.value||'0'),
    co_to_khai:document.getElementById('fi-tokhai').checked,
    phi_to_khai:parseNum(document.getElementById('fi-phitk')?.value||'0'),
    ghi_chu:document.getElementById('fi-ghichu')?.value||null,
    updated_at:new Date().toISOString(),
  };
  const{error,data:saved}=await db.from('van_don').update(data).eq('id',id).select();
  if(error){toast('Lỗi DB: '+error.message,'error');return;}
  if(!saved||saved.length===0){toast('Không lưu được — kiểm tra quyền Supabase (RLS)','error');return;}
  toast('Đã lưu thông tin');
  await refreshOrder(id);
}

function onBienInput(el){
  const raw=el.value.trim();
  const q=removeAccents(raw).replace(/-/g,'');
  document.getElementById('fx-tt').value='Đang vận chuyển';
  // Custom dropdown lọc full-text + không dấu
  const drop=document.getElementById('fx-bien-drop');
  if(!drop)return;
  if(!q){drop.style.display='none';return;}
  const matches=(XE||[]).filter(x=>removeAccents(x.bien_so).replace(/-/g,'').includes(q));
  if(!matches.length){drop.style.display='none';}
  else{
    drop.innerHTML=matches.map(x=>`
      <div onmousedown="event.preventDefault();pickBien('${x.bien_so}')"
        style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13px"
        onmouseover="this.style.background='var(--teal-light)'"
        onmouseout="this.style.background=''">
        <span style="font-weight:600;color:var(--sidebar-bg)">${x.bien_so}</span>
        ${x.ma_thau_phu?`<span style="color:var(--text-muted);margin-left:6px">— ${x.ma_thau_phu}</span>`:''}
      </div>`).join('');
    drop.style.display='block';
  }
  // Debounce lookup DB khi biển số đủ dài
  clearTimeout(window._bienT);
  // Chỉ debounce khi không có dropdown hiện (tức là gõ tự do, không chọn từ list)
  window._bienT=setTimeout(()=>{
    const d=document.getElementById('fx-bien-drop');
    if(d&&d.style.display==='block')return; // đang hiện dropdown → chờ pickBien
    onBienChange(el.value);
  },500);
}
function pickBien(bien){
  clearTimeout(window._bienT); // hủy debounce đang chờ, tránh double-call
  const el=document.getElementById('fx-bien');
  if(el){
    el.value=bien;
    // Xóa border đỏ validate nếu có
    el.style.borderColor='';
    const err=document.getElementById('fx-bien-err');
    if(err)err.style.display='none';
  }
  const drop=document.getElementById('fx-bien-drop');
  if(drop)drop.style.display='none';
  // Gọi thẳng với giá trị chuẩn — el.value đã được set ở trên
  onBienChange(bien);
}

// DROPDOWN DIA DIEM (dung chung cho moi o diem_lay / diem_tra)
function onDiemInput(el,dropId){
  const q=removeAccents(el.value.trim());
  const drop=document.getElementById(dropId);
  if(!drop)return;
  if(!q){drop.style.display='none';return;}
  const matches=(DD||[]).filter(d=>{
    const haystack=removeAccents((d.ten_chuan||'')+' '+(d.viet_tat||'')+' '+(d.dia_phuong||''));
    return haystack.includes(q);
  }).slice(0,8);
  if(!matches.length){drop.style.display='none';return;}
  const loaiIcon={'Cang':'\u{1F6A2}','KCN':'\u{1F3ED}','Kho':'\u{1F4E6}','Depot':'\u{1F532}','Cua khau':'\u{1F6C3}','Khac':'\u{1F4CD}'};
  drop.innerHTML=matches.map(d=>{
    const loaiKey=removeAccents(d.loai||'');
    const icon=Object.entries(loaiIcon).find(([k])=>loaiKey.includes(k));
    const ico=icon?icon[1]:'\u{1F4CD}';
    const safe=d.ten_chuan.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return '<div onclick="pickDiem(\''+dropId+'\',\''+safe+'\')"'
      +' style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13px"'
      +' onmouseover="this.style.background=\'var(--teal-light)\'"'
      +' onmouseout="this.style.background=\'\'">'
      +'<span style="margin-right:6px">'+ico+'</span>'
      +'<span style="font-weight:600;color:var(--sidebar-bg)">'+d.ten_chuan+'</span>'
      +(d.dia_phuong?'<span style="color:var(--text-muted);margin-left:6px;font-size:11px">'+d.dia_phuong+'</span>':'')
      +(d.viet_tat?'<span style="color:var(--teal);margin-left:6px;font-size:11px">'+d.viet_tat+'</span>':'')
      +'</div>';
  }).join('');
  drop.style.display='block';
}
function pickDiem(dropId,tenChuan){
  const drop=document.getElementById(dropId);
  if(!drop)return;
  const inputId=drop.dataset.inputId;
  const input=inputId?document.getElementById(inputId):null;
  if(input)input.value=tenChuan;
  setTimeout(()=>{if(drop)drop.style.display='none';},80);
}
function closeDiemDrop(dropId){
  setTimeout(()=>{const d=document.getElementById(dropId);if(d)d.style.display='none';},200);
}
// DROPDOWN KHACH HANG
function onKhachInput(el,dropId){
  const q=removeAccents(el.value.trim());
  const drop=document.getElementById(dropId);
  if(!drop)return;
  if(!q){drop.style.display='none';return;}
  const matches=(KH||[]).filter(k=>removeAccents(k.ten_cong_ty).includes(q)).slice(0,8);
  if(!matches.length){drop.style.display='none';return;}
  drop.innerHTML=matches.map((k,i)=>`
    <div onclick="pickKhach('${dropId}',this.dataset.ten)" data-ten="${k.ten_cong_ty.replace(/"/g,'&quot;')}" data-idx="${i}"
      style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13px"
      onmouseover="this.style.background='var(--teal-light)'"
      onmouseout="this.style.background=''">
      <i class="ti ti-building" style="color:var(--teal);margin-right:6px;font-size:12px"></i>
      <span style="font-weight:600;color:var(--sidebar-bg)">${k.ten_cong_ty}</span>
    </div>`).join('');
  drop.dataset.focused='-1';
  drop.style.display='block';
}
function pickKhach(dropId,tenKhach){
  const drop=document.getElementById(dropId);
  const inputId=drop?.dataset.inputId;
  const input=inputId?document.getElementById(inputId):null;
  // tenKhach có thể từ dataset.ten (đã decode &quot;) hoặc truyền thẳng
  const val=tenKhach||'';
  if(input)input.value=val.replace(/&quot;/g,'"');
  setTimeout(()=>{if(drop)drop.style.display='none';},80);
}
function closeKhachDrop(dropId,inputId){
  setTimeout(()=>{
    const drop=document.getElementById(dropId);
    if(drop)drop.style.display='none';
    const input=document.getElementById(inputId||'nf-khach');
    if(!input)return;
    const val=input.value.trim();
    if(!val)return;
    const ok=(KH||[]).some(k=>k.ten_cong_ty===val);
    if(!ok){
      input.value='';
      input.style.borderColor='var(--danger)';
      setTimeout(()=>{if(input)input.style.borderColor='';},1500);
      toast('Khách hàng không có trong danh mục — vui lòng chọn từ gợi ý','error');
    }
  },220);
}
function onKhachKeydown(e,dropId,inputId){
  const drop=document.getElementById(dropId);
  if(!drop||drop.style.display==='none')return;
  const items=[...drop.querySelectorAll('div[data-idx]')];
  let idx=parseInt(drop.dataset.focused||'-1');
  if(e.key==='ArrowDown'){
    e.preventDefault();
    idx=Math.min(idx+1,items.length-1);
    drop.dataset.focused=String(idx);
    items.forEach((el,i)=>el.style.background=i===idx?'var(--teal-light)':'');
    items[idx]?.scrollIntoView({block:'nearest'});
  } else if(e.key==='ArrowUp'){
    e.preventDefault();
    idx=Math.max(idx-1,0);
    drop.dataset.focused=String(idx);
    items.forEach((el,i)=>el.style.background=i===idx?'var(--teal-light)':'');
    items[idx]?.scrollIntoView({block:'nearest'});
  } else if(e.key==='Enter'){
    e.preventDefault();
    const target=idx>=0?items[idx]:(items.length===1?items[0]:null);
    if(target)target.click();
  } else if(e.key==='Escape'){
    drop.style.display='none';
  }
}

// Số cont thay đổi → xóa loại cont để điều vận chọn lại
function onContInput(el){
  const loaixeEl=document.getElementById('fx-loaixe');
  if(loaixeEl)loaixeEl.value='';
  const lenEl=document.getElementById('cont-len');
  if(lenEl)lenEl.textContent=el.value?el.value.length+'/11 ký tự':'';
}

function validateBienInput(el){
  // Đóng dropdown khi rời ô (dùng setTimeout để pickBien kịp chạy trước)
  setTimeout(()=>{
    const drop=document.getElementById('fx-bien-drop');
    if(drop)drop.style.display='none';
  },200);
  // Format + validate
  el.value=formatBienSo(el.value);
  const err=document.getElementById('fx-bien-err');
  if(el.value&&!validateBienSo(el.value)){
    el.style.borderColor='var(--danger)';
    if(err)err.style.display='block';
  } else {
    el.style.borderColor='';
    if(err)err.style.display='none';
  }
}
async function onBienChange(bien){
  if(!bien||bien.length<4)return;
  const ttEl=document.getElementById('fx-tt');
  if(ttEl)ttEl.value='Đang vận chuyển';
  const{data:xe}=await db.from('xe').select('*').ilike('bien_so',bien.trim()).maybeSingle();
  // Xe không có trong danh mục: xóa trắng thầu phụ, lái xe, loại chuyến để điều vận tự nhập
  const tpEl=document.getElementById('fx-thauphu');
  const lxEl=document.getElementById('fx-laixe');
  const plEl=document.getElementById('fx-phanloai');
  const lxhEl=document.getElementById('fx-loaixe');
  const lxGroup=document.getElementById('fx-laixe-group');
  const nbEl=document.getElementById('fx-noibo');
  const lchuyenEl=document.getElementById('fx-lchuyen');
  if(!xe){
    // Xe mới tinh chưa có trong danh mục: xóa trắng thầu phụ + loại chuyến để điều vận chọn lại,
    // NHƯNG ô Lái xe PHẢI GIỮ HIỆN để OPS tự gõ tay tên lái xe (v2.9 fix — trước đây ẩn luôn ô này
    // khiến ten_lai_xe vĩnh viễn rỗng, hỏng mọi báo cáo/lọc/xuất Excel theo tên lái xe)
    if(tpEl)tpEl.value='';
    if(lxEl)lxEl.value='';
    if(plEl)plEl.value='thau_tu_lai';
    if(lxGroup)lxGroup.style.display='';
    if(nbEl)nbEl.value='false';
    // Bắt buộc chọn lại loại chuyến
    if(lchuyenEl){lchuyenEl.value='';if(!lchuyenEl.querySelector('option[value=""]'))lchuyenEl.insertAdjacentHTML('afterbegin','<option value="" disabled>-- Chọn loại chuyến --</option>');lchuyenEl.options[0].selected=true;}
    return;
  }
  // Xe có trong danh mục: luôn ghi đè toàn bộ (không giữ giá trị cũ)
  if(tpEl)tpEl.value=xe.ma_thau_phu||'';
  if(lxEl)lxEl.value=xe.ten_lai_xe_mac_dinh||'';
  if(plEl)plEl.value=xe.loai_phan_loai||'thau_tu_lai';
  // Xe nội bộ: ẩn thầu phụ, disable lái xe
  const tpGroup=document.getElementById('fx-thauphu-group');
  if(xe.loai_phan_loai==='noi_bo'){
    if(tpGroup)tpGroup.style.display='none';
    if(tpEl)tpEl.value='';
    if(lxEl){lxEl.setAttribute('disabled','');lxEl.title='Xe nội bộ — lái xe cố định theo danh mục xe';}
    if(lxGroup)lxGroup.style.display=''; // nội bộ có lái xe
  } else {
    if(tpGroup)tpGroup.style.display='';
    if(lxEl){lxEl.removeAttribute('disabled');lxEl.title='';}
    // Ẩn/hiện ô lái xe theo loại phân loại — luôn hiện
    if(lxGroup) lxGroup.style.display='';
  }
  if(nbEl)nbEl.value=xe.loai_phan_loai==='noi_bo'?'true':'false';
  // Bắt buộc chọn lại loại chuyến khi đổi xe
  if(lchuyenEl){lchuyenEl.value='';if(!lchuyenEl.querySelector('option[value=""]'))lchuyenEl.insertAdjacentHTML('afterbegin','<option value="" disabled>-- Chọn loại chuyến --</option>');lchuyenEl.options[0].selected=true;}
}

async function saveXe(id){
  try{
    // Guard phân quyền
    if(CU?.vai_tro==='ops_hp'){toast('Không có quyền sửa vận đơn','error');return;}
    const o=ORDERS.find(x=>x.id===id);
    if(CU?.vai_tro==='nhan_vien'&&o?.created_by!==CU?.id){toast('Chỉ được sửa đơn do mình tạo','error');return;}
    const bien=document.getElementById('fx-bien')?.value.trim().toUpperCase()||'';
    const loaiChuyen=document.getElementById('fx-lchuyen')?.value||'';
    const loaiCont=document.getElementById('fx-loaixe')?.value||'';
    // Validate bắt buộc
    if(!loaiChuyen){
      document.getElementById('fx-lchuyen').style.borderColor='var(--danger)';
      toast('Vui lòng chọn Loại chuyến (Thường / Kết hợp / Kẹp ghép)','error');return;
    }
    if(!loaiCont){
      document.getElementById('fx-loaixe').style.borderColor='var(--danger)';
      toast('Vui lòng chọn Loại xe / Cont','error');return;
    }
    const plVal=document.getElementById('fx-phanloai')?.value||'';
    const data={
      bien_kiem_soat:bien,
      ten_lai_xe:document.getElementById('fx-laixe')?.value||'',
      ma_thau_phu:document.getElementById('fx-thauphu')?.value||'',
      loai_chuyen:loaiChuyen,
      so_cont:document.getElementById('fx-cont')?.value||'',
      loai_cont:loaiCont,
      loai_xe_hang:loaiCont,
      ghi_chu_xe:document.getElementById('fx-ghichuXe')?.value||'',
      trang_thai:document.getElementById('fx-tt')?.value||'Đang vận chuyển',
      loai_phan_loai_xe:plVal,
      la_xe_noi_bo:plVal==='noi_bo',
      updated_at:new Date().toISOString(),
    };
    const{error,data:saved}=await db.from('van_don').update(data).eq('id',id).select();
    if(error){toast('Lỗi DB: '+error.message,'error');return;}
    if(!saved||saved.length===0){toast('Không lưu được — kiểm tra quyền Supabase (RLS)','error');return;}
    toast('Đã lưu xe & cont');
    await refreshOrder(id);
  }catch(e){console.error('[saveXe]',e);toast('Lỗi: '+e.message,'error');}
}

async function saveCuoc(id, coDL, coTK){
  // Validate phí dịch vụ bắt buộc
  const phiDL=parseNum(document.getElementById('fc-phidl')?.value||'0');
  const phiTK=parseNum(document.getElementById('fc-phitk')?.value||'0');
  if(coDL==='true'&&phiDL<=0){
    document.getElementById('fc-phidl').style.borderColor='var(--danger)';
    toast('Phí đổi lệnh bắt buộc phải điền','error');return;
  }
  if(coTK==='true'&&phiTK<=0){
    document.getElementById('fc-phitk').style.borderColor='var(--danger)';
    toast('Phí mở tờ khai bắt buộc phải điền','error');return;
  }
  const data={
    gia_cuoc_khach:parseNum(document.getElementById('fc-cuockh').value),
    gia_cuoc_thau:parseNum(document.getElementById('fc-cuocthau')?.value||'0'),
    thanh_toan_khach:document.getElementById('fc-thukh').value,
    thanh_toan_thau:document.getElementById('fc-trathau')?.value||'Chưa trả',
    tra_thau_doi_lenh:parseNum(document.getElementById('fc-tradl')?.value||'0')||null,
    don_vi_doi_lenh:document.getElementById('fc-dvdl')?.value?.trim()||null,
    updated_at:new Date().toISOString(),
  };
  // Lưu lại phí dịch vụ nếu kế toán đã điền
  if(coDL==='true') data.phi_doi_lenh=phiDL;
  if(coTK==='true') data.phi_to_khai=phiTK;
  const{error,data:saved}=await db.from('van_don').update(data).eq('id',id).select();
  if(error){toast('Lỗi DB: '+error.message,'error');return;}
  if(!saved||saved.length===0){toast('Không lưu được — kiểm tra quyền Supabase (RLS)','error');return;}
  toast('Đã lưu cước & thanh toán');
  await refreshOrder(id);
}

async function deleteOrder(id){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền xóa','error');return;}
  const o=ORDERS.find(x=>x.id===id);
  if(o?.locked&&!canSee(['quan_ly','ceo'])){toast('Đơn đã khóa, không thể xóa','error');return;}
  if(!confirm(`Xóa vận đơn ${o?.ma_don}?\nThao tác này không thể hoàn tác!`))return;
  await db.from('chi_ho').delete().eq('van_don_id',id);
  const{error}=await db.from('van_don').delete().eq('id',id);
  if(error){toast('Lỗi xóa: '+error.message,'error');return;}
  toast('Đã xóa vận đơn');
  closeModal?.();
  closeDp();
  pgOrders(document.getElementById('content'));
}

async function unlockOrder(id){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền','error');return;}
  if(!confirm('Mở khóa vận đơn này để chỉnh sửa?\nTrạng thái sẽ chuyển về "Đang vận chuyển"'))return;
  const{error}=await db.from('van_don').update({
    locked:false, locked_at:null, locked_by:null,
    trang_thai:'Đang vận chuyển',
    updated_at:new Date().toISOString()
  }).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã mở khóa — có thể chỉnh sửa');
  await refreshOrder(id);
}

async function lockOrder(id){
  const o=ORDERS.find(x=>x.id===id);
  const{data:chiHo}=await db.from('chi_ho').select('id,loai_chi').eq('van_don_id',id).eq('la_tham_chieu',false);
  const list=chiHo||[];
  const coChiHo=list.length>0;
  const soChiHo=list.length;
  // Kiểm tra có lưu ca hoặc bốc xếp chưa
  const coLuuCa=list.some(c=>c.loai_chi?.includes('Lưu ca')||c.loai_chi?.includes('Công nhân bốc xếp'));
  const coLachHuyen=list.some(c=>c.loai_chi?.includes('Lạch Huyện'));
  showLockConfirm(id, coChiHo, soChiHo, o, coLuuCa, coLachHuyen);
}

function showLockConfirm(id, coChiHo, soChiHo, o, coLuuCa=false, coLachHuyen=false){
  document.getElementById('lock-confirm-modal')?.remove();

  const chuaDL=!o?.co_doi_lenh;
  const chuaLuuCa=!coLuuCa;
  const chuaLachHuyen=!coLachHuyen;
  const coWarnDV=chuaDL||chuaLuuCa||chuaLachHuyen;

  const wrap=document.createElement('div');
  wrap.id='lock-confirm-modal';
  wrap.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.45)';
  wrap.innerHTML=`
  <div style="background:#fff;border-radius:12px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;animation:fadeInUp .18s ease">

    ${coWarnDV?`
    <div style="background:#fffbeb;padding:14px 20px;border-bottom:1px solid #fde68a;display:flex;align-items:center;gap:10px">
      <i class="ti ti-alert-triangle" style="color:#d97706;font-size:20px;flex-shrink:0"></i>
      <div style="font-weight:700;font-size:13px;color:#92400e">Kiểm tra dịch vụ trước khi khóa</div>
    </div>
    <div style="padding:14px 20px 0">
      <p style="font-size:12px;color:#6b7280;margin:0 0 10px">Chuyến này chưa tick các dịch vụ sau — xác nhận thực sự không có:</p>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:4px">
        ${chuaDL?`<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:8px 10px;border:1px solid var(--border);border-radius:8px">
          <input type="checkbox" id="lc-dl" style="width:16px;height:16px;cursor:pointer">
          <span>Không có <strong>Đổi lệnh</strong> trong chuyến này</span>
        </label>`:''}
        ${chuaLuuCa?`<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:8px 10px;border:1px solid var(--border);border-radius:8px">
          <input type="checkbox" id="lc-luuca" style="width:16px;height:16px;cursor:pointer">
          <span>Không phát sinh <strong>Lưu ca / Công nhân bốc xếp</strong></span>
        </label>`:''}
        ${chuaLachHuyen?`<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:8px 10px;border:1px solid var(--border);border-radius:8px">
          <input type="checkbox" id="lc-lach" style="width:16px;height:16px;cursor:pointer">
          <span>Không phát sinh <strong>Đi cảng xa (Lạch Huyện)</strong></span>
        </label>`:''}
      </div>
    </div>`:''}

    ${!coWarnDV?`
    <div style="padding:20px 20px 0;display:flex;align-items:flex-start;gap:12px">
      <div style="width:40px;height:40px;border-radius:10px;background:#d1fae5;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="ti ti-lock" style="color:#059669;font-size:20px"></i>
      </div>
      <div>
        <div style="font-weight:700;font-size:15px;color:#111;margin-bottom:4px">Hoàn thành & Khóa vận đơn</div>
        <div style="font-size:13px;color:#6b7280;line-height:1.5">
          ${coChiHo?`Đã ghi nhận <strong style="color:#059669">${soChiHo} chi phí</strong> phát sinh.`:'⚠️ Chưa có chi phí phát sinh nào.'}
          <br>Kế toán sẽ nhập cước sau khi khóa.
        </div>
      </div>
    </div>`:''}

    ${!coChiHo?`
    <div style="padding:${coWarnDV?'10px':'10px'} 20px 0">
      <div style="background:#fef3c7;border-radius:8px;padding:10px 12px;font-size:12px;color:#92400e">
        ⚠️ Chưa có chi phí phát sinh (lưu ca, cao tốc, bốc xếp...) — kiểm tra kỹ trước khi khóa.<br>
        <span style="opacity:.8">Bỏ sót → kế toán phải mở lại → mất thời gian 2 bên.</span>
      </div>
    </div>`:''}

    <div style="padding:16px 20px;display:flex;gap:8px;justify-content:flex-end">
      <button onclick="document.getElementById('lock-confirm-modal').remove()"
        style="padding:8px 16px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;font-size:13px;font-weight:500;cursor:pointer;color:#374151">
        ${coWarnDV?'Quay lại':'Hủy'}
      </button>
      <button onclick="_confirmLock('${id}',${chuaDL},${chuaLuuCa},${chuaLachHuyen})"
        style="padding:8px 18px;border-radius:8px;border:none;background:${coChiHo?'#059669':'#d97706'};color:#fff;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px">
        <i class="ti ti-lock"></i> ${coWarnDV?'Xác nhận & Khóa':'Xác nhận khóa'}
      </button>
    </div>
  </div>`;
  wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove();});
  document.body.appendChild(wrap);
}

function _confirmLock(id, chuaDL, chuaLuuCa, chuaLachHuyen){
  if(chuaDL&&document.getElementById('lc-dl')&&!document.getElementById('lc-dl').checked){
    document.getElementById('lc-dl').closest('label').style.borderColor='var(--danger)';
    toast('Xác nhận không có Đổi lệnh trước khi khóa','error');return;
  }
  if(chuaLuuCa&&document.getElementById('lc-luuca')&&!document.getElementById('lc-luuca').checked){
    document.getElementById('lc-luuca').closest('label').style.borderColor='var(--danger)';
    toast('Xác nhận không có lưu ca / bốc xếp trước khi khóa','error');return;
  }
  if(chuaLachHuyen&&document.getElementById('lc-lach')&&!document.getElementById('lc-lach').checked){
    document.getElementById('lc-lach').closest('label').style.borderColor='var(--danger)';
    toast('Xác nhận không có phí Lạch Huyện trước khi khóa','error');return;
  }
  doLockOrder(id);
}

async function doLockOrder(id){
  document.getElementById('lock-confirm-modal')?.remove();
  const{error}=await db.from('van_don').update({trang_thai:'Hoàn thành',locked:true,locked_at:new Date().toISOString(),locked_by:CU.id,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã hoàn thành và khóa vận đơn');
  await refreshOrder(id);
}

async function refreshOrder(id){
  // 1. Fetch full data trước
  const{data}=await db.from('van_don').select('*').eq('id',id).single();
  // 2. Refresh cache ORDERS NGẦM (không đụng DOM) — bắt buộc, không thì race condition overwrite ORDERS
  await _fetchOrdersData();
  // 3. Patch ORDERS bằng full data
  if(data){
    const idx=ORDERS.findIndex(x=>x.id===id);
    if(idx>=0)ORDERS[idx]=data; else ORDERS.unshift(data);
  }
  // 4. Vẽ lại ĐÚNG trang đang đứng (Bảng điều vận / Quản lý vận đơn / ...) — không ép về trang Quản lý vận đơn (v2.9 fix)
  renderPage();
  // 5. Panel chi tiết bên phải nằm ngoài #content — refresh riêng để giữ nguyên đang mở
  if(data&&SEL===id) await renderDP(data);
}

// OPEN FORM (thêm mới)
function openForm(){
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  const khopts=KH.map(k=>`<option value="${k.ten_cong_ty}">${k.ten_cong_ty}</option>`).join('');
  bg.innerHTML=`<div class="modal">
  <div class="modal-head"><h3><i class="ti ti-plus" style="color:var(--primary)"></i>Thêm vận đơn mới</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body">
    <div class="form-section-title" style="font-size:10px;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px"><i class="ti ti-file-description"></i> Thông tin cơ bản</div>
    <div class="form-grid">
      <div class="form-group"><label>Ngày *</label><input type="date" id="nf-ngay" value="${today()}"></div>
      <div class="form-group" style="position:relative"><label>Khách hàng *</label>
        <input type="text" id="nf-khach" placeholder="Gõ tên để tìm khách..." autocomplete="off"
          oninput="onKhachInput(this,'nf-kh-drop')"
          onblur="closeKhachDrop('nf-kh-drop','nf-khach')"
          onkeydown="onKhachKeydown(event,'nf-kh-drop','nf-khach')">
        <div id="nf-kh-drop" data-input-id="nf-khach" style="display:none;position:absolute;z-index:999;left:0;right:0;top:100%;background:#fff;border:1px solid var(--border);border-radius:var(--r);box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:240px;overflow-y:auto"></div>
        <span style="font-size:10px;color:var(--text-muted)">Chỉ chọn khách trong danh mục</span>
      </div>
      <div class="form-group"><label>Loại hàng *</label><select id="nf-loai" onchange="toggleNFBill()">
        <option>Nhập</option><option>Xuất</option><option>Chuyển kho</option>
      </select></div>
      <div class="form-group" id="nfgrp-bill"><label>Số Bill / Booking</label><input type="text" id="nf-bill" placeholder="Số bill hàng nhập..."></div>
      <div class="form-group" id="nfgrp-cont"><label>Số Cont <span style="font-size:10px;color:var(--teal)">(tự sang Tab Xe & Cont)</span></label>
        <input type="text" id="nf-cont" placeholder="AAAU1234567 (11 ký tự)" maxlength="11"
          oninput="this.value=formatCont(this.value)">
        <span style="font-size:10px;color:var(--text-muted)" id="nf-cont-len"></span>
      </div>
      <div class="form-group"><label>Loại xe / Cont <span style="font-size:10px;color:var(--teal)">(tự sang Tab Xe & Cont)</span></label>
        <input type="text" id="nf-loaixe" placeholder="Gõ để tìm loại cont..." list="nf-loaixe-dl" autocomplete="off">
        <datalist id="nf-loaixe-dl">
          <option value="20 nhẹ"><option value="20 nặng"><option value="Cont 40"><option value="Cont 45">
          <option value="Xe tải 1.25T"><option value="Xe tải 2.5T"><option value="Xe tải 3.5T">
          <option value="Xe tải 5T"><option value="Xe tải 8T"><option value="Xe tải 10T">
          <option value="Mooc sàn"><option value="Mooc rào"><option value="Fooc">
        </datalist>
      </div>
      <div class="form-group" style="position:relative"><label>Điểm lấy hàng *</label>
        <input type="text" id="nf-lay" placeholder="Gõ tên / viết tắt để tìm..." autocomplete="off"
          oninput="onDiemInput(this,'nf-lay-drop')" onblur="closeDiemDrop('nf-lay-drop')">
        <div id="nf-lay-drop" data-input-id="nf-lay" style="display:none;position:absolute;z-index:999;left:0;right:0;top:100%;background:#fff;border:1px solid var(--border);border-radius:var(--r);box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:240px;overflow-y:auto"></div>
      </div>
      <div class="form-group" style="position:relative"><label>Điểm trả hàng *</label>
        <input type="text" id="nf-tra" placeholder="Gõ tên / viết tắt để tìm..." autocomplete="off"
          oninput="onDiemInput(this,'nf-tra-drop')" onblur="closeDiemDrop('nf-tra-drop')">
        <div id="nf-tra-drop" data-input-id="nf-tra" style="display:none;position:absolute;z-index:999;left:0;right:0;top:100%;background:#fff;border:1px solid var(--border);border-radius:var(--r);box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:240px;overflow-y:auto"></div>
      </div>
      <div class="form-group full"><label>Ghi chú</label><textarea id="nf-ghichu" rows="2"></textarea></div>
    </div>
    <div class="form-section-title" style="font-size:10px;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 8px"><i class="ti ti-currency-dong"></i> Dịch vụ kèm theo</div>
    <div class="form-grid">
      <div class="form-group">
        <label><input type="checkbox" id="nf-doilenh" style="width:auto;margin-right:5px">Đổi lệnh</label>
        <input type="text" id="nf-phidl" placeholder="Phí / cont (VNĐ)" oninput="fmtOnInput(this)">
        <span style="font-size:10px;color:var(--text-muted)">thu theo số cont</span>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="nf-tokhai" style="width:auto;margin-right:5px">Mở tờ khai</label>
        <input type="text" id="nf-phitk" placeholder="Phí / lô (VNĐ)" oninput="fmtOnInput(this)">
        <span style="font-size:10px;color:var(--text-muted)">thu theo lô</span>
      </div>
    </div>
  </div>
  <div class="modal-foot"><button class="btn" onclick="closeModal()">Hủy</button><button class="btn btn-primary" onclick="saveNew()"><i class="ti ti-device-floppy"></i> Tạo vận đơn</button></div>
  </div>`;
  document.body.appendChild(bg);
  // Gắn sự kiện đếm ký tự cont sau khi DOM được tạo
  const contEl=document.getElementById('nf-cont');
  if(contEl)contEl.addEventListener('input',function(){
    const lenEl=document.getElementById('nf-cont-len');
    if(lenEl)lenEl.textContent=this.value?this.value.length+'/11 ký tự':'';
  });
}

function toggleNFBill(){
  const loai=document.getElementById('nf-loai')?.value;
  const billEl=document.getElementById('nf-bill');
  const contGrp=document.getElementById('nfgrp-cont');
  if(billEl){
    if(loai==='Nhập'){billEl.placeholder='Số bill hàng nhập...';}
    else if(loai==='Xuất'){billEl.placeholder='Số booking hàng xuất...';}
    else{billEl.placeholder='Số bill / booking...';}
  }
  // Ô số cont luôn hiện — cả Nhập lẫn Xuất đều có thể biết cont trước
}

async function saveNew(){
  const khach=document.getElementById('nf-khach').value.trim();
  const lay=document.getElementById('nf-lay').value;
  const tra=document.getElementById('nf-tra').value;
  if(!khach){toast('Vui lòng nhập khách hàng','error');return;}
  if(!lay){toast('Vui lòng nhập điểm lấy hàng','error');return;}
  if(!tra){toast('Vui lòng nhập điểm trả hàng','error');return;}
  const loai=document.getElementById('nf-loai').value;
  const billVal=document.getElementById('nf-bill')?.value||null;
  const contVal=document.getElementById('nf-cont')?.value||null;
  const loaiXeVal=document.getElementById('nf-loaixe')?.value||null;
  const data={
    ma_don:genMa(),
    ngay:document.getElementById('nf-ngay').value,
    ten_khach:khach,
    loai_hang:loai,
    so_bill:loai==='Nhập'?billVal:null,
    so_booking:loai!=='Nhập'?billVal:null,
    so_cont:contVal,
    loai_cont:loaiXeVal,
    loai_xe_hang:loaiXeVal,
    diem_lay:document.getElementById('nf-lay').value,
    diem_tra:document.getElementById('nf-tra').value,
    hanh_trinh:(document.getElementById('nf-lay').value||'')+(document.getElementById('nf-tra').value?' - '+document.getElementById('nf-tra').value:''),
    co_doi_lenh:document.getElementById('nf-doilenh').checked,
    phi_doi_lenh:parseNum(document.getElementById('nf-phidl')?.value||'0'),
    co_to_khai:document.getElementById('nf-tokhai').checked,
    phi_to_khai:parseNum(document.getElementById('nf-phitk')?.value||'0'),
    ghi_chu:document.getElementById('nf-ghichu').value,
    trang_thai:'Chờ xếp xe',
    thanh_toan_khach:'Chưa thu',
    thanh_toan_thau:'Chưa trả',
    locked:false,
    created_by:CU.id,
  };
  const{error}=await db.from('van_don').insert(data);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã tạo vận đơn: '+data.ma_don);
  closeModal();
  pgOrders(document.getElementById('content'));
}
function closeModal(){document.getElementById('modal-bg')?.remove();}

// CHI HO MODAL
function openAddChiHo(vdId,maDon){
  const o=ORDERS.find(x=>x.id===vdId)||{};
  const plXe=o.loai_phan_loai_xe||'';
  const isNoiBo=plXe==='noi_bo';
  const isThauThueLai=plXe==='thau_thue_lai';
  const coThau=!isNoiBo;
  const coLaiXe=isNoiBo||isThauThueLai||!plXe;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:460px">
  <div class="modal-head"><h3><i class="ti ti-receipt" style="color:var(--warning)"></i>Thêm chi phí phát sinh</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body">
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;background:var(--bg);padding:7px 10px;border-radius:var(--r)">Vận đơn: <strong>${maDon}</strong></div>
    <div class="form-grid">
      <div class="form-group full"><label>Loại chi *</label><select id="ch-loai">
        <option>Đi cảng xa (Lạch Huyện)</option>
        <option>Lưu ca</option>
        <option>Công nhân bốc xếp</option>
        <option>Cao tốc / Vé đường</option>
        <option>Nâng/hạ cont</option>
        <option>Phí CSHT</option>
        <option>Phí cảng, bãi</option>
        <option>Phí local charge</option>
        <option>Chi phí khác</option>
      </select></div>

      <div style="grid-column:1/-1;border-radius:var(--r);padding:10px 12px;border:1px solid var(--border);background:var(--bg)">
        <div style="font-size:10px;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
          <i class="ti ti-coins"></i> Số tiền
          ${isNoiBo?'<span style="background:#ede9fe;color:#7c3aed;border-radius:8px;padding:1px 8px;margin-left:6px;font-size:10px;text-transform:none">🚗 Xe nội bộ — '+o.bien_kiem_soat+'</span>':o.ma_thau_phu?'<span style="background:#fef3c7;color:var(--warning);border-radius:8px;padding:1px 8px;margin-left:6px;font-size:10px;text-transform:none">🚛 Xe thầu — '+o.ma_thau_phu+'</span>':'<span style="background:#f1f5f9;color:var(--text-muted);border-radius:8px;padding:1px 8px;margin-left:6px;font-size:10px;text-transform:none">Chưa xếp xe</span>'}
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Thu khách (VNĐ) *</label>
            <input type="text" id="ch-thukh" placeholder="0"
              oninput="fmtOnInput(this)"
              style="border-color:var(--teal)">
            <span style="font-size:10px;color:var(--teal)">Vào bảng kê thu khách</span>
          </div>
          ${coThau?`
          <div class="form-group">
            <label>Trả thầu (VNĐ) <span style="font-size:10px;color:var(--warning)">${o.ma_thau_phu?'· '+o.ma_thau_phu:'· chưa rõ thầu phụ'}</span></label>
            <input type="text" id="ch-trathau" placeholder="0"
              oninput="fmtOnInput(this)"
              style="border-color:var(--warning)">
            <span style="font-size:10px;color:var(--warning)">BN Chain trả thầu khoản này</span>
          </div>`:`<input type="hidden" id="ch-trathau" value="0">`}
          ${coLaiXe?`
          <div class="form-group">
            <label>Trả lái xe (VNĐ) <span style="font-size:10px;color:#8b5cf6">· ${o.ten_lai_xe||''}</span></label>
            <input type="text" id="ch-tralaixe" placeholder="0"
              oninput="fmtOnInput(this)"
              style="border-color:#8b5cf6">
            <span style="font-size:10px;color:#8b5cf6">${isThauThueLai?'Lương BN Chain trả hộ — trừ vào cước thầu khi quyết toán':isNoiBo?'BN Chain trả lái xe chuyến này':'Chưa rõ loại xe — điền nếu phát sinh'}</span>
          </div>`:`<input type="hidden" id="ch-tralaixe" value="0">`}
          <div class="form-group">
            <label>Người chi</label>
            <input type="text" id="ch-nguoi" value="${CU?.ho_ten||''}">
          </div>
        </div>
      </div>

      <div class="form-group"><label>Số chứng từ / HĐ</label><input type="text" id="ch-ct"></div>
      <div class="form-group"><label>HĐ theo MST khách</label>
        <select id="ch-hdkh">
          <option value="false">Không</option>
          <option value="true">Có — HĐ theo MST khách</option>
        </select>
      </div>
      <div class="form-group full"><label>Ghi chú</label><textarea id="ch-ghichu" rows="2"></textarea></div>
    </div>
  </div>
  <div class="modal-foot">
    <button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="saveChiHo('${vdId}','${maDon}')"><i class="ti ti-device-floppy"></i> Lưu</button>
  </div>
  </div>`;
  document.body.appendChild(bg);
}





async function editChiHo(chiHoId, vdId, maDon){
  const{data}=await db.from('chi_ho').select('*').eq('id',chiHoId).single();
  if(!data)return;
  const o=ORDERS.find(x=>x.id===vdId)||{};
  const plXe=o.loai_phan_loai_xe||'';
  const isNoiBo=plXe==='noi_bo';
  const isThauThueLai=plXe==='thau_thue_lai';
  const coThau=!isNoiBo;
  const coLaiXe=isNoiBo||isThauThueLai||!plXe;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:460px">
  <div class="modal-head"><h3><i class="ti ti-edit" style="color:var(--teal)"></i> Sửa chi phí phát sinh</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body">
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;background:var(--bg);padding:7px 10px;border-radius:var(--r)">Vận đơn: <strong>${maDon}</strong></div>
    <div class="form-grid">
      <div class="form-group full"><label>Loại chi *</label><select id="ch-loai">
        <option ${data.loai_chi==='Đi cảng xa (Lạch Huyện)'?'selected':''}>Đi cảng xa (Lạch Huyện)</option>
        <option ${data.loai_chi==='Lưu ca'?'selected':''}>Lưu ca</option>
        <option ${data.loai_chi==='Công nhân bốc xếp'?'selected':''}>Công nhân bốc xếp</option>
        <option ${data.loai_chi==='Cao tốc / Vé đường'?'selected':''}>Cao tốc / Vé đường</option>
        <option ${data.loai_chi?.startsWith('Nâng/hạ')||data.loai_chi==='Nâng/hạ cont'?'selected':''}>Nâng/hạ cont</option>
        <option ${(data.loai_chi?.startsWith('Nâng hàng')||data.loai_chi==='Nâng hàng')&&!data.loai_chi?.startsWith('Nâng/hạ')?'selected':''}>Nâng hàng</option>
        <option ${(data.loai_chi?.startsWith('Nâng vỏ')||data.loai_chi==='Nâng vỏ')&&!data.loai_chi?.startsWith('Nâng/hạ')?'selected':''}>Nâng vỏ</option>
        <option ${(data.loai_chi?.startsWith('Hạ hàng')||data.loai_chi==='Hạ hàng')&&!data.loai_chi?.startsWith('Nâng/hạ')?'selected':''}>Hạ hàng</option>
        <option ${(data.loai_chi?.startsWith('Hạ vỏ')||data.loai_chi==='Hạ vỏ')&&!data.loai_chi?.startsWith('Nâng/hạ')?'selected':''}>Hạ vỏ</option>
        <option ${data.loai_chi==='Phí CSHT'||data.loai_chi==='CSHT'||data.loai_chi?.startsWith('CSHT')?'selected':''}>Phí CSHT</option>
        <option ${['Phí cảng, bãi','Phí cảng','Lưu bãi / Lưu cont'].includes(data.loai_chi)||data.loai_chi?.startsWith('Phí cảng')?'selected':''}>Phí cảng, bãi</option>
        <option ${data.loai_chi==='Phí local charge'||data.loai_chi?.startsWith('Phí local')?'selected':''}>Phí local charge</option>
        <option ${['Chi phí khác','Giám sát hải quan','Chi hải quan'].includes(data.loai_chi)||(!['Đi cảng xa (Lạch Huyện)','Lưu ca','Công nhân bốc xếp','Cao tốc / Vé đường','Nâng/hạ cont','Nâng hàng','Nâng vỏ','Hạ hàng','Hạ vỏ','Phí CSHT','Phí cảng, bãi','Phí local charge'].some(x=>data.loai_chi?.startsWith(x)))?'selected':''}>Chi phí khác</option>
      </select></div>
      <div style="grid-column:1/-1;background:var(--bg);border-radius:var(--r);padding:10px 12px;border:1px solid var(--border)">
        <div style="font-size:10px;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px"><i class="ti ti-coins"></i> Số tiền</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Thu khách (VNĐ) *</label>
            <input type="text" id="ch-thukh" value="${fmtInput(data.tien_thu_khach||data.so_tien||0)}"
              oninput="fmtOnInput(this)" style="border-color:var(--teal)">
          </div>
          ${coThau?`<div class="form-group">
            <label>Trả thầu (VNĐ)</label>
            <input type="text" id="ch-trathau" value="${fmtInput(data.tien_tra_thau||0)}"
              oninput="fmtOnInput(this)" style="border-color:var(--warning)">
            <span style="font-size:10px;color:var(--warning)">BN Chain trả thầu khoản này</span>
          </div>`:`<input type="hidden" id="ch-trathau" value="0">`}
          ${coLaiXe?`<div class="form-group">
            <label>Trả lái xe (VNĐ)</label>
            <input type="text" id="ch-tralaixe" value="${fmtInput(data.tien_tra_laixe||0)}"
              oninput="fmtOnInput(this)" style="border-color:#8b5cf6">
          </div>`:`<input type="hidden" id="ch-tralaixe" value="0">`}
          <div class="form-group">
            <label>Người chi</label>
            <input type="text" id="ch-nguoi" value="${data.nguoi_chi||''}">
          </div>
        </div>
      </div>
      <div class="form-group"><label>Số chứng từ / HĐ</label><input type="text" id="ch-ct" value="${data.chung_tu||''}"></div>
      <div class="form-group"><label>HĐ theo MST khách</label>
        <select id="ch-hdkh">
          <option value="false" ${!data.hoa_don_khach?'selected':''}>Không</option>
          <option value="true" ${data.hoa_don_khach?'selected':''}>Có — HĐ theo MST khách</option>
        </select>
      </div>
      <div class="form-group full"><label>Ghi chú</label><textarea id="ch-ghichu" rows="2">${data.ghi_chu||''}</textarea></div>
    </div>
  </div>
  <div class="modal-foot">
    <button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="updateChiHo('${chiHoId}','${vdId}')"><i class="ti ti-device-floppy"></i> Cập nhật</button>
  </div>
  </div>`;
  document.body.appendChild(bg);
}

async function updateChiHo(chiHoId, vdId){
  if(CU?.vai_tro==='ops_hp'){toast('Không có quyền sửa chi phí','error');return;}
  const thuKH=parseNum(document.getElementById('ch-thukh').value);
  const traThau=parseNum(document.getElementById('ch-trathau')?.value||'0');
  const traLX=parseNum(document.getElementById('ch-tralaixe')?.value||'0');
  if(!thuKH){toast('Vui lòng nhập số tiền thu khách','error');return;}
  const data={
    loai_chi:document.getElementById('ch-loai').value,
    so_tien:thuKH,
    tien_thu_khach:thuKH,
    tien_tra_thau:traThau,
    tien_tra_laixe:traLX,
    nguoi_chi:document.getElementById('ch-nguoi').value,
    chung_tu:document.getElementById('ch-ct').value,
    hoa_don_khach:document.getElementById('ch-hdkh').value==='true',
    ghi_chu:document.getElementById('ch-ghichu').value,
  };
  const{error}=await db.from('chi_ho').update(data).eq('id',chiHoId);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã cập nhật chi phí');
  closeModal();
  const o=ORDERS.find(x=>x.id===vdId);
  if(o){DP_TAB='chiho';await renderDP(o);}
}

async function deleteChiHo(chiHoId,vdId){
  if(CU?.vai_tro==='ops_hp'){toast('Không có quyền xóa chi phí','error');return;}
  if(!confirm('Xóa khoản chi phí này?'))return;

  // Lấy thông tin chi_ho trước khi xóa
  const{data:ch}=await db.from('chi_ho').select('hoa_don_id,la_tham_chieu,van_don_id').eq('id',chiHoId).single();

  const{error}=await db.from('chi_ho').delete().eq('id',chiHoId);
  if(error){toast('Lỗi: '+error.message,'error');return;}

  if(ch?.hoa_don_id){
    if(ch.la_tham_chieu){
      // Xóa tham chiếu: gỡ liên kết hoa_don_van_don của vận đơn này
      await db.from('hoa_don_van_don')
        .delete()
        .eq('hoa_don_id',ch.hoa_don_id)
        .eq('van_don_id',ch.van_don_id||vdId);
    }
    // Dù là tham chiếu hay chính: sau khi xóa chi_ho, kiểm tra HĐ còn được dùng không
    const{data:conLai}=await db.from('chi_ho').select('id').eq('hoa_don_id',ch.hoa_don_id);
    if(!conLai?.length){
      // Không còn chi_ho nào → dọn file Storage + hoa_don_van_don còn lại + record hoa_don
      const{data:hd}=await db.from('hoa_don').select('storage_path').eq('id',ch.hoa_don_id).single();
      if(hd?.storage_path){
        await db.storage.from('hoa-don').remove([hd.storage_path]);
      }
      await db.from('hoa_don_van_don').delete().eq('hoa_don_id',ch.hoa_don_id);
      await db.from('hoa_don').delete().eq('id',ch.hoa_don_id);
    }
  }

  toast('Đã xóa chi phí');
  const o=ORDERS.find(x=>x.id===vdId);
  if(o){DP_TAB='chiho';await renderDP(o);}
}


async function saveChiHo(vdId,maDon){
  if(CU?.vai_tro==='ops_hp'){toast('Không có quyền thêm chi phí','error');return;}
  const thuKH=parseNum(document.getElementById('ch-thukh').value);
  const traThau=parseNum(document.getElementById('ch-trathau').value);
  const traLX=parseNum(document.getElementById('ch-tralaixe').value);
  if(!thuKH){toast('Vui lòng nhập số tiền thu khách','error');return;}
  const data={
    van_don_id:vdId,
    ma_don:maDon,
    loai_chi:document.getElementById('ch-loai').value,
    ngay_chi:new Date().toISOString().split('T')[0],
    so_tien:thuKH,
    tien_thu_khach:thuKH,
    tien_tra_thau:traThau,
    tien_tra_laixe:traLX,
    nguoi_chi:document.getElementById('ch-nguoi').value,
    chung_tu:document.getElementById('ch-ct').value,
    hoa_don_khach:document.getElementById('ch-hdkh').value==='true',
    da_thu_lai:false,
    ghi_chu:document.getElementById('ch-ghichu').value,
  };
  const{error}=await db.from('chi_ho').insert(data);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã thêm chi phí');closeModal();
  const o=ORDERS.find(x=>x.id===vdId);
  if(o){DP_TAB='chiho';await renderDP(o);}
}

async function taiTatCaHD(vanDonId){
  const{data:chiHoList}=await db.from('chi_ho')
    .select('hoa_don_id').eq('van_don_id',vanDonId)
    .not('hoa_don_id','is',null).eq('la_tham_chieu',false);
  if(!chiHoList?.length){toast('Không có HĐ nào để tải','error');return;}

  const hdIds=[...new Set(chiHoList.map(c=>c.hoa_don_id))];
  const{data:hdList}=await db.from('hoa_don')
    .select('id,storage_path,file_name,so_hd').in('id',hdIds);
  const coFile=(hdList||[]).filter(h=>h.storage_path);
  if(!coFile.length){toast('Chưa có file đính kèm','error');return;}

  toast(`Đang tải ${coFile.length} file...`);
  let ok=0;
  for(const hd of coFile){
    try{
      const{data:su}=await db.storage.from('hoa-don').createSignedUrl(hd.storage_path,300);
      if(!su?.signedUrl) continue;
      // Dùng fetch + Blob để download thẳng, không mở tab mới
      const res=await fetch(su.signedUrl);
      const blob=await res.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=hd.file_name||`hoadon_${hd.so_hd||ok+1}.pdf`;
      document.body.appendChild(a);a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      ok++;
      // Delay nhỏ giữa các file để browser xử lý kịp
      await new Promise(r=>setTimeout(r,500));
    }catch(e){console.warn('Lỗi tải file',hd.file_name,e);}
  }
  toast(`✅ Đã tải ${ok}/${coFile.length} hóa đơn`);
}

// ==================== BẢNG ĐIỀU VẬN ====================

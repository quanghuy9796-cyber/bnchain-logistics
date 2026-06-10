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

async function pgOrders(c){
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  // Chỉ select cột cần thiết cho danh sách — giảm data transfer đáng kể
  const COLS='id,ma_don,ngay,trang_thai,ten_khach,so_bill,so_booking,loai_hang,so_cont,loai_cont,bien_kiem_soat,ten_lai_xe,hanh_trinh,diem_lay,diem_tra,locked,ky_thanh_toan,trang_thai_bang_ke,gia_cuoc_khach,gia_cuoc_thau,phi_doi_lenh,phi_to_khai,ngay_yeu_cau,created_at,ma_thau_phu,ghi_chu';
  let q=db.from('van_don').select(COLS).order('ngay',{ascending:false}).order('created_at',{ascending:false});
  if(ORDER_THANG){
    const[y,m]=ORDER_THANG.split('-');
    q=q.gte('ngay',`${y}-${m}-01`).lte('ngay',`${y}-${m}-31`);
    // Khi lọc theo tháng: không cần limit vì đã filter hẹp
  } else {
    // Không lọc tháng: chỉ lấy 3 tháng gần nhất để tránh load quá nhiều
    const d3m=new Date();d3m.setMonth(d3m.getMonth()-3);
    const cutoff=`${d3m.getFullYear()}-${String(d3m.getMonth()+1).padStart(2,'0')}-01`;
    q=q.gte('ngay',cutoff);
  }
  const{data}=await q.limit(300);
  ORDERS=data||[];

  const counts={all:ORDERS.length,'Chờ xếp xe':0,'Đang vận chuyển':0,'Chờ xác nhận':0,'Hoàn thành':0};
  ORDERS.forEach(o=>counts[o.trang_thai]=(counts[o.trang_thai]||0)+1);

  let list=ORDERS.filter(o=>{
    const q=ORDER_SEARCH.trim().toLowerCase();
    const mq=!q||(o.ma_don?.toLowerCase().includes(q)||o.ten_khach?.toLowerCase().includes(q)||o.so_bill?.toLowerCase().includes(q)||o.so_booking?.toLowerCase().includes(q)||o.so_cont?.toLowerCase().includes(q)||o.bien_kiem_soat?.toLowerCase().includes(q));
    const ml=!ORDER_LOAI||o.loai_hang===ORDER_LOAI;
    const mf=ORDER_FILTER==='all'||o.trang_thai===ORDER_FILTER;
    return mq&&ml&&mf;
  });

  const canM=canSee(['ke_toan','ceo']);
  const now=new Date();
  const thOpts=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-i,1);const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;return`<option value="${v}" ${ORDER_THANG===v?'selected':''}>T${d.getMonth()+1}/${d.getFullYear()}</option>`;}).join('');

  c.innerHTML=`
  <div class="status-bar">
    <div class="status-btn ${ORDER_FILTER==='all'?'active':''}" onclick="ORDER_FILTER='all';pgOrders(document.getElementById('content'))"><i class="ti ti-list"></i>Tất cả <span class="cnt">${counts.all}</span></div>
    <div class="status-btn s-cho ${ORDER_FILTER==='Chờ xếp xe'?'active':''}" onclick="ORDER_FILTER='Chờ xếp xe';pgOrders(document.getElementById('content'))"><i class="ti ti-clock"></i>Chờ xếp xe <span class="cnt">${counts['Chờ xếp xe']||0}</span></div>
    <div class="status-btn s-chay ${ORDER_FILTER==='Đang vận chuyển'?'active':''}" onclick="ORDER_FILTER='Đang vận chuyển';pgOrders(document.getElementById('content'))"><i class="ti ti-truck"></i>Đang chạy <span class="cnt">${counts['Đang vận chuyển']||0}</span></div>
    <div class="status-btn s-xn ${ORDER_FILTER==='Chờ xác nhận'?'active':''}" onclick="ORDER_FILTER='Chờ xác nhận';pgOrders(document.getElementById('content'))"><i class="ti ti-check"></i>Chờ xác nhận <span class="cnt">${counts['Chờ xác nhận']||0}</span></div>
    <div class="status-btn s-xong ${ORDER_FILTER==='Hoàn thành'?'active':''}" onclick="ORDER_FILTER='Hoàn thành';pgOrders(document.getElementById('content'))"><i class="ti ti-lock"></i>Hoàn thành <span class="cnt">${counts['Hoàn thành']||0}</span></div>
  </div>
  <div class="toolbar">
    <button class="btn btn-primary" onclick="openForm()"><i class="ti ti-plus"></i> Thêm vận đơn</button>
    <input class="search-inp" placeholder="Tìm mã đơn, bill, booking, cont, biển số..." value="${ORDER_SEARCH}" oninput="clearTimeout(window._searchT);window._searchT=setTimeout(()=>{ORDER_SEARCH=this.value;pgOrders(document.getElementById('content'))},400)">
    <select class="filter-sel" onchange="ORDER_LOAI=this.value;pgOrders(document.getElementById('content'))">
      <option value="">Tất cả loại</option>
      <option value="Xuất" ${ORDER_LOAI==='Xuất'?'selected':''}>Xuất</option>
      <option value="Nhập" ${ORDER_LOAI==='Nhập'?'selected':''}>Nhập</option>
      <option value="CK" ${ORDER_LOAI==='CK'?'selected':''}>CK</option>
    </select>
    <select class="filter-sel" onchange="ORDER_THANG=this.value;pgOrders(document.getElementById('content'))">
      <option value="">Tất cả tháng</option>${thOpts}
    </select>
    <span class="ml-auto" style="font-size:11.5px;color:var(--text-muted)">${list.length} vận đơn</span>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <colgroup>
      <col style="width:140px"><col style="width:75px"><col style="width:55px"><col style="width:110px">
      <col style="width:115px"><col style="width:95px"><col style="width:70px"><col style="width:100px">
      <col style="width:95px">${canM?'<col style="width:100px"><col style="width:95px">':''}
      <col style="width:115px"><col style="width:95px">
    </colgroup>
    <thead><tr>
      <th>Mã đơn</th><th>Ngày</th><th>Loại</th><th>Bill / Booking</th>
      <th>Khách hàng</th><th>Hành trình</th><th>Cont</th><th>Biển số</th>
      <th>Lái xe</th>${canM?'<th>Cước KH</th><th>Cước thầu</th>':''}
      <th>Trạng thái</th><th>Thu khách</th>
    </tr></thead>
    <tbody>
    ${list.length===0?`<tr><td colspan="20"><div class="empty"><i class="ti ti-inbox"></i>Chưa có dữ liệu</div></td></tr>`:''}
    ${list.map(o=>`<tr onclick="openDetail('${o.id}')" class="${SEL===o.id?'selected':''} ${o.locked?'locked':''}">
      <td><span style="color:var(--teal);font-weight:600">${o.ma_don}</span>${o.locked?'<i class="ti ti-lock" style="color:var(--success);font-size:10px;margin-left:3px"></i>':''}</td>
      <td>${fmtDate(o.ngay)}</td>
      <td>${loaiTag(o.loai_hang)}</td>
      <td style="color:var(--primary);font-weight:500" title="${o.so_bill||o.so_booking||''}">${o.so_bill||o.so_booking||'-'}</td>
      <td>${o.ten_khach}</td>
      <td title="${o.hanh_trinh||''}">${o.hanh_trinh||'-'}</td>
      <td>${o.so_cont||'—'}</td>
      <td>${o.bien_kiem_soat||'—'}</td>
      <td>${o.ten_lai_xe||'—'}</td>
      ${canM?`<td class="text-blue fw6">${o.gia_cuoc_khach>0?fmt(o.gia_cuoc_khach):'—'}</td><td class="text-red">${o.gia_cuoc_thau>0?fmt(o.gia_cuoc_thau):'—'}</td>`:''}
      <td>${ttTag(o.trang_thai)}</td>
      <td>${thuTag(o.thanh_toan_khach)}</td>
    </tr>`).join('')}
    </tbody>
  </table></div>`;
}

// ==================== DETAIL PANEL ====================
async function openDetail(id){
  SEL=id;
  const o=ORDERS.find(x=>x.id===id);
  if(!o)return;
  const dp=document.getElementById('dp');
  dp.style.display='flex';dp.style.flexDirection='column';
  DP_TAB='info';
  await renderDP(o);
  document.querySelectorAll('.tbl tr').forEach(tr=>{
    if(tr.getAttribute('onclick')?.includes(id))tr.classList.add('selected');
    else tr.classList.remove('selected');
  });
}

async function renderDP(o){
  const dp=document.getElementById('dp');
  const canM=canSee(['ke_toan','ceo']);
  const editable=canEdit(o);
  const{data:chiHoList}=await db.from('chi_ho').select('*').eq('van_don_id',o.id).order('ngay_chi');
  const totalCH=(chiHoList||[]).reduce((s,c)=>s+(+c.so_tien||0),0);
  const loi=(+o.gia_cuoc_khach||0)-(+o.gia_cuoc_thau||0)-totalCH;

  dp.innerHTML=`
  <div class="dp-header">
    <span class="dp-code">${o.ma_don}</span>
    <div style="display:flex;align-items:center;gap:6px">
      ${o.locked?'<span class="dp-locked"><i class="ti ti-lock"></i>Đã khóa</span>':''}
      <button class="btn btn-sm" onclick="closeDp()"><i class="ti ti-x"></i></button>
    </div>
  </div>
  <div class="tabs">
    <div class="tab ${DP_TAB==='info'?'active':''}" onclick="switchTab('info','${o.id}')"><i class="ti ti-info-circle"></i> Thông tin</div>
    <div class="tab ${DP_TAB==='xe'?'active':''}" onclick="switchTab('xe','${o.id}')"><i class="ti ti-truck"></i> Xe & Cont</div>
    <div class="tab ${DP_TAB==='chiho'?'active':''}" onclick="switchTab('chiho','${o.id}')"><i class="ti ti-receipt"></i> Chi hộ ${chiHoList?.length?`<span style="background:var(--warning);color:#fff;border-radius:10px;padding:0 5px;font-size:10px;margin-left:2px">${chiHoList.length}</span>`:''}</div>
    ${canM?`<div class="tab ${DP_TAB==='cuoc'?'active':''}" onclick="switchTab('cuoc','${o.id}')"><i class="ti ti-coins"></i> Cước & Chốt</div>`:''}
  </div>
  <div class="tab-content" id="tab-body">
  ${DP_TAB==='info'?renderTabInfo(o,editable):''}
  ${DP_TAB==='xe'?renderTabXe(o,editable):''}
  ${DP_TAB==='chiho'?renderTabChiHo(o,chiHoList||[],editable):''}
  ${DP_TAB==='cuoc'&&canM?renderTabCuoc(o,chiHoList||[],editable,loi):''}
  </div>`;
}

function renderTabInfo(o,editable){
  const dis=!editable?'disabled':'';
  const isNhap=o.loai_hang==='Nhập';
  const canDelete=canSee(['quan_ly','ceo']);
  return`
  ${o.locked?`<div class="lock-notice" style="display:flex;justify-content:space-between;align-items:center"><span><i class="ti ti-lock"></i> Vận đơn đã hoàn thành và khóa lại.</span>${canSee(['quan_ly','ceo'])?`<button class="btn btn-xs btn-danger" onclick="unlockOrder('${o.id}')"><i class="ti ti-lock-open"></i> Mở khóa</button>`:''}</div>`:''}
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
      <div class="form-group"><label>Điểm lấy hàng *</label>
        <input type="text" id="fi-lay" value="${o.diem_lay||''}" placeholder="Kho / KCN / Cảng..." ${dis}></div>
      <div class="form-group"><label>Điểm trả hàng *</label>
        <input type="text" id="fi-tra" value="${o.diem_tra||''}" placeholder="Kho / KCN / Cảng..." ${dis}></div>
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
        <label><input type="checkbox" id="fi-doilenh" ${o.co_doi_lenh?'checked':''} ${dis} style="width:auto;margin-right:5px">Đổi lệnh</label>
        <input type="text" id="fi-phidl" value="${o.phi_doi_lenh>0?fmtInput(o.phi_doi_lenh):''}" placeholder="Phí / cont (VNĐ)" ${dis}
          oninput="this.value=fmtInput(this.value)">
        <span style="font-size:10px;color:var(--text-muted)">thu theo số cont</span>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="fi-tokhai" ${o.co_to_khai?'checked':''} ${dis} style="width:auto;margin-right:5px">Mở tờ khai</label>
        <input type="text" id="fi-phitk" value="${o.phi_to_khai>0?fmtInput(o.phi_to_khai):''}" placeholder="Phí / lô (VNĐ)" ${dis}
          oninput="this.value=fmtInput(this.value)">
        <span style="font-size:10px;color:var(--text-muted)">thu theo lô</span>
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
  const lxOpts=LX.map(l=>`<option value="${l.ho_ten}">`).join('');
  const tpOpts=TP.map(t=>`<option value="${t.ma_thau}">${t.ten_cong_ty}</option>`).join('');
  const loaiXeOpts=['20 nhẹ','20 nặng','Cont 40','Cont 45','Xe tải 1.25T','Xe tải 2.5T','Xe tải 3.5T','Xe tải 5T','Xe tải 8T','Xe tải 10T','Mooc sàn','Mooc rào','Fooc'].map(v=>`<option ${o.loai_xe_hang===v?'selected':''}>${v}</option>`).join('');
  const loaiChuyenOpts=['Thường','Kết hợp','Kẹp ghép'].map(s=>`<option ${o.loai_chuyen===s?'selected':''}>${s}</option>`).join('');
  const ttOpts=['Chờ xếp xe','Đang vận chuyển','Chờ xác nhận'].map(s=>`<option ${o.trang_thai===s?'selected':''}>${s}</option>`).join('');
  return`
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-truck"></i>Phân công xe & lái xe</div>
    <div class="form-grid">
      <div class="form-group"><label>Biển kiểm soát</label>
        <input type="text" id="fx-bien" value="${o.bien_kiem_soat||''}" placeholder="99H-06375"
          ${dis} oninput="onBienInput(this)"
          onblur="validateBienInput(this)">
        <span id="fx-bien-err" style="font-size:10px;color:var(--danger);display:none">Định dạng: 99H-06375</span>
        <span style="font-size:10px;color:var(--text-muted)">Thầu phụ tự động theo biển số</span>
      </div>
      <div class="form-group" id="fx-laixe-group">
        <label>Lái xe <span style="font-size:10px;color:var(--teal)">(điền tự do)</span></label>
        <input type="text" id="fx-laixe" value="${o.ten_lai_xe||''}" placeholder="Nhập tên lái xe..." list="laixe-dl" ${dis}>
        <datalist id="laixe-dl">${lxOpts}</datalist>
        <span style="font-size:10px;color:var(--text-muted)">
          ${o.loai_phan_loai_xe==='noi_bo'?'🚗 Xe nội bộ':o.loai_phan_loai_xe==='thau_thue_lai'?'🚛 Thầu thuê lái (BN Chain tính lương)':''}
        </span>
      </div>
      <input type="hidden" id="fx-phanloai" value="${o.loai_phan_loai_xe||''}">
      <input type="hidden" id="fx-noibo" value="${o.la_xe_noi_bo?'true':'false'}">
      <div class="form-group"><label>Thầu phụ <span style="font-size:10px;color:var(--teal)">(tự động / tự điền)</span></label>
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
          oninput="this.value=formatCont(this.value)"
          onblur="if(this.value&&this.value.length!==11)this.style.borderColor='var(--danger)';else this.style.borderColor=''">
        <span style="font-size:10px;color:var(--text-muted)" id="cont-len">${o.so_cont?o.so_cont.length+'/11 ký tự':''}</span>
      </div>
      <div class="form-group"><label>Loại xe / cont</label>
        <select id="fx-loaixe" ${dis}>
          <option value="">-- Chọn --</option>${loaiXeOpts}
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
  ${editable?`<button class="btn btn-teal" style="width:100%;justify-content:center" onclick="saveXe('`+o.id+`')"><i class="ti ti-device-floppy"></i> Lưu xe & cont</button>`:''}`;
}

function renderTabChiHo(o,list,editable){
  const listThat=list.filter(c=>!c.la_tham_chieu);
  const listThamChieu=list.filter(c=>c.la_tham_chieu);
  const total=listThat.reduce((s,c)=>s+(+c.so_tien||0),0);
  const coHD=list.some(c=>c.hoa_don_id);
  return`
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
      ${editable?`<div style="display:flex;gap:4px;justify-content:flex-end;margin-top:4px">
        <button class="btn btn-xs btn-teal" onclick="editChiHo('${c.id}','`+`${c.van_don_id}','${c.ma_don}')"><i class="ti ti-edit"></i></button>
        <button class="btn btn-xs btn-danger" onclick="deleteChiHo('${c.id}','${c.van_don_id}')"><i class="ti ti-trash"></i></button>
      </div>`:''}
    </div>
  </div>`).join('')}
  ${listThat.length===0?'<div class="empty" style="padding:20px 0"><i class="ti ti-inbox"></i>Chưa có chi phí phát sinh</div>':''}
  ${editable?`<button class="add-chi-ho-btn" onclick="openAddChiHo('`+o.id+`','`+o.ma_don+`')"><i class="ti ti-plus"></i> Thêm chi phí phát sinh</button>`:''}
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
        <div style="font-size:11px;color:var(--text-muted);white-space:nowrap">
          Tổng HĐ: <strong class="text-orange">${fmtM(c.so_tien_hd_goc||0)}</strong>
        </div>
      </div>
      <div style="color:var(--text-muted);margin-top:4px;font-size:11px">
        HĐ: <strong>${c.chung_tu||'—'}</strong> · Ngày: ${fmtDate(c.ngay_chi)}
      </div>
      <div style="color:#92400e;margin-top:2px;font-size:11px;word-break:break-all;white-space:normal;line-height:1.5;overflow-wrap:break-word">${(c.ghi_chu||'').replace(/\[Tham chiếu\][^|]*\|/,'').trim()}</div>
    </div>`).join('')}
  </div>`:''}`;
}

function renderTabCuoc(o,chiHoList,editable,loi){
  const totalCH=chiHoList.reduce((s,c)=>s+(+(c.tien_thu_khach||c.so_tien)||0),0);
  const totalTraThau=chiHoList.reduce((s,c)=>s+(+c.tien_tra_thau||0),0);
  const totalTraLX=chiHoList.reduce((s,c)=>s+(+c.tien_tra_laixe||0),0);
  const phiDL=o.co_doi_lenh?(+o.phi_doi_lenh||0):0;
  const phiTK=o.co_to_khai?(+o.phi_to_khai||0):0;
  const tongThuKH=(+o.gia_cuoc_khach||0)+phiDL+phiTK+totalCH;
  const isThauThueLai=o.loai_phan_loai_xe==='thau_thue_lai';
  const thucTraThau=(+o.gia_cuoc_thau||0)+totalTraThau-(isThauThueLai?totalTraLX:0);
  const coThau=!!o.ma_thau_phu;
  return`
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-coins"></i>Cước & Thu khách</div>
    <div class="form-grid">
      <div class="form-group"><label>Cước vận chuyển (VNĐ)</label>
        <input type="text" id="fc-cuockh" value="${o.gia_cuoc_khach>0?fmtInput(o.gia_cuoc_khach):''}"
          placeholder="0" ${!editable?'disabled':''} oninput="this.value=fmtInput(this.value);calcTong()"></div>
      <div class="form-group"><label>Trạng thái thu</label>
        <select id="fc-thukh" ${!editable?'disabled':''}>
          ${['Chưa thu','Đã thu một phần','Đã thu'].map(s=>`<option ${o.thanh_toan_khach===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
    </div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-receipt"></i>Dịch vụ cộng thêm (tự động từ Tab Thông tin)</div>
    <div style="background:var(--bg);border-radius:var(--r);padding:10px 12px;font-size:12px">
      ${phiDL>0?`<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)"><span>Phí đổi lệnh</span><span class="text-orange fw6">${fmtM(phiDL)}</span></div>`:''}
      ${phiTK>0?`<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)"><span>Phí mở tờ khai</span><span class="text-orange fw6">${fmtM(phiTK)}</span></div>`:''}
      ${totalCH>0?`<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Chi hộ phát sinh (${chiHoList.length} khoản)</span><span class="text-orange fw6">${fmtM(totalCH)}</span></div>`:''}
      ${!phiDL&&!phiTK&&!totalCH?'<div style="color:var(--text-muted)">Chưa có dịch vụ cộng thêm</div>':''}
    </div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><i class="ti ti-arrow-left"></i>Trả thầu phụ</div>
    ${coThau?`
    <div class="form-grid">
      <div class="form-group"><label>Cước thầu (VNĐ)</label>
        <input type="text" id="fc-cuocthau" value="${o.gia_cuoc_thau>0?fmtInput(o.gia_cuoc_thau):''}"
          placeholder="0" ${!editable?'disabled':''} oninput="this.value=fmtInput(this.value);calcTong()"></div>
      <div class="form-group"><label>Trạng thái trả thầu</label>
        <select id="fc-trathau" ${!editable?'disabled':''}>
          ${['Chưa trả','Đã trả một phần','Đã trả'].map(s=>`<option ${o.thanh_toan_thau===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
    </div>`:`
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
        ${totalTraThau>0?`<div style="font-size:10px;opacity:.6">Cước ${fmtM(o.gia_cuoc_thau||0)} + Chi hộ ${fmtM(totalTraThau)}</div>`:''}
        ${totalTraLX>0?`<div style="font-size:10px;color:#c4b5fd;margin-top:2px">${isThauThueLai?'− Lương LX (trừ vào thầu)':'Trả lái xe'}: ${fmtM(totalTraLX)}</div>`:''}
      </div>`:''}
    </div>
    <div style="border-top:1px solid rgba(255,255,255,.1);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between">
      <span style="opacity:.6">Lợi nhuận gộp</span>
      <span style="font-weight:700;color:${(tongThuKH-thucTraThau)>=0?'#86efac':'#fca5a5'}">${fmtM(tongThuKH-thucTraThau)}</span>
    </div>
  </div>
  ${editable?`
  <button class="btn btn-teal" style="width:100%;justify-content:center;margin-bottom:8px" onclick="saveCuoc('`+o.id+`')">
    <i class="ti ti-device-floppy"></i> Lưu cước & thanh toán
  </button>
  <button class="btn btn-success" style="width:100%;justify-content:center" onclick="lockOrder('`+o.id+`')">
    <i class="ti ti-lock"></i> Hoàn thành & Khóa vận đơn
  </button>
  <p style="font-size:10.5px;color:var(--text-muted);text-align:center;margin-top:5px">⚠️ Sau khi khóa sẽ không thể chỉnh sửa</p>`:''}
  ${o.locked&&canSee(['quan_ly','ceo'])?`
  <button class="btn btn-danger" style="width:100%;justify-content:center;margin-top:6px" onclick="unlockOrder('`+o.id+`')">
    <i class="ti ti-lock-open"></i> Mở khóa để chỉnh sửa
  </button>`:''}`;
}

function calcTong(){
  // live update tổng khi nhập cước
}

async function switchTab(tab,id){
  DP_TAB=tab;
  const o=ORDERS.find(x=>x.id===id);
  if(o)await renderDP(o);
}
function closeDp(){SEL=null;document.getElementById('dp').style.display='none';}

// SAVE FUNCTIONS
async function saveInfo(id){
  const loai=document.getElementById('fi-loai').value;
  const data={
    ngay:document.getElementById('fi-ngay').value,
    ten_khach:document.getElementById('fi-khach').value,
    loai_hang:loai,
    so_bill:loai==='Nhập'?(document.getElementById('fi-bill')?.value||null):null,
    so_booking:loai!=='Nhập'?(document.getElementById('fi-booking')?.value||null):null,
    diem_lay:document.getElementById('fi-lay').value,
    diem_tra:document.getElementById('fi-tra').value,
    diem_tra_phat_sinh:document.getElementById('fi-traphat')?.value||null,
    ngay_yeu_cau:document.getElementById('fi-ycgiao')?.value||null,
    co_doi_lenh:document.getElementById('fi-doilenh').checked,
    phi_doi_lenh:parseNum(document.getElementById('fi-phidl')?.value||'0'),
    co_to_khai:document.getElementById('fi-tokhai').checked,
    phi_to_khai:parseNum(document.getElementById('fi-phitk')?.value||'0'),
    ghi_chu:document.getElementById('fi-ghichu')?.value||null,
    updated_at:new Date().toISOString(),
  };
  const{error}=await db.from('van_don').update(data).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã lưu thông tin');
  await refreshOrder(id);
}

function onBienInput(el){
  el.value=formatBienSo(el.value);
  document.getElementById('fx-tt').value='Đang vận chuyển';
  onBienChange(el.value);
}
function validateBienInput(el){
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
  // Set trang thai
  const ttEl=document.getElementById('fx-tt');
  if(ttEl)ttEl.value='Đang vận chuyển';
  // Lookup xe table
  const{data:xe}=await db.from('xe').select('*').ilike('bien_so',bien.trim()).maybeSingle();
  if(!xe)return;
  // Auto fill thau phu
  const tpEl=document.getElementById('fx-thauphu');
  if(tpEl&&!tpEl.value&&xe.ma_thau_phu)tpEl.value=xe.ma_thau_phu;
  // Auto fill lai xe
  const lxEl=document.getElementById('fx-laixe');
  if(lxEl&&!lxEl.value){
    if(xe.loai_phan_loai==='thau_tu_lai')lxEl.value=xe.ten_thau_phu||xe.ten_lai_xe_mac_dinh||'';
    else if(xe.ten_lai_xe_mac_dinh)lxEl.value=xe.ten_lai_xe_mac_dinh;
  }
  // Store loai phan loai on hidden field
  const plEl=document.getElementById('fx-phanloai');
  if(plEl)plEl.value=xe.loai_phan_loai||'thau_tu_lai';
  // Auto fill loai xe hang
  const lxhEl=document.getElementById('fx-loaixe');
  if(lxhEl&&!lxhEl.value&&xe.loai_xe)lxhEl.value=xe.loai_xe;
  // Show/hide lai xe field based on type
  const lxGroup=document.getElementById('fx-laixe-group');
  if(lxGroup){
    const show=xe.loai_phan_loai!=='thau_tu_lai';
    lxGroup.style.display=show?'':'none';
  }
  // Set la_xe_noi_bo
  const nbEl=document.getElementById('fx-noibo');
  if(nbEl)nbEl.value=xe.loai_phan_loai==='noi_bo'?'true':'false';
}


async function saveXe(id){
  const bien=document.getElementById('fx-bien').value.trim().toUpperCase();
  const plVal=document.getElementById('fx-phanloai')?.value||'';
  const data={
    bien_kiem_soat:bien,
    ten_lai_xe:document.getElementById('fx-laixe')?.value||'',
    ma_thau_phu:document.getElementById('fx-thauphu').value,
    loai_chuyen:document.getElementById('fx-lchuyen').value,
    so_cont:document.getElementById('fx-cont').value,
    loai_xe_hang:document.getElementById('fx-loaixe').value,
    ghi_chu_xe:document.getElementById('fx-ghichuXe').value,
    trang_thai:document.getElementById('fx-tt').value,
    loai_phan_loai_xe:plVal,
    la_xe_noi_bo:plVal==='noi_bo',
    updated_at:new Date().toISOString(),
  };
  const{error}=await db.from('van_don').update(data).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã lưu xe & cont');
  await refreshOrder(id);
}

async function saveCuoc(id){
  const data={
    gia_cuoc_khach:parseNum(document.getElementById('fc-cuockh').value),
    gia_cuoc_thau:parseNum(document.getElementById('fc-cuocthau')?.value||'0'),
    thanh_toan_khach:document.getElementById('fc-thukh').value,
    thanh_toan_thau:document.getElementById('fc-trathau')?.value||'Chưa trả',
    updated_at:new Date().toISOString(),
  };
  const{error}=await db.from('van_don').update(data).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
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
  if(!confirm('Mở khóa vận đơn này để chỉnh sửa?\nTrạng thái sẽ chuyển về "Chờ xác nhận"'))return;
  const{error}=await db.from('van_don').update({
    locked:false, locked_at:null, locked_by:null,
    trang_thai:'Chờ xác nhận',
    updated_at:new Date().toISOString()
  }).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã mở khóa — có thể chỉnh sửa');
  await refreshOrder(id);
}

async function lockOrder(id){
  if(!confirm('Xác nhận HOÀN THÀNH và KHÓA vận đơn này?\nSau khi khóa sẽ không thể chỉnh sửa!'))return;
  const{error}=await db.from('van_don').update({trang_thai:'Hoàn thành',locked:true,locked_at:new Date().toISOString(),locked_by:CU.id,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã hoàn thành và khóa vận đơn');
  await refreshOrder(id);
}

async function refreshOrder(id){
  const{data}=await db.from('van_don').select('*').eq('id',id).single();
  if(data){const idx=ORDERS.findIndex(x=>x.id===id);if(idx>=0)ORDERS[idx]=data;await renderDP(data);}
  pgOrders(document.getElementById('content'));
}

// OPEN FORM (thêm mới)
function openForm(){
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  const khopts=KH.map(k=>`<option>${k.ten_cong_ty}</option>`).join('');
  bg.innerHTML=`<div class="modal">
  <div class="modal-head"><h3><i class="ti ti-plus" style="color:var(--primary)"></i>Thêm vận đơn mới</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body">
    <div class="form-section-title" style="font-size:10px;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px"><i class="ti ti-file-description"></i> Thông tin cơ bản</div>
    <div class="form-grid">
      <div class="form-group"><label>Ngày *</label><input type="date" id="nf-ngay" value="${today()}"></div>
      <div class="form-group"><label>Khách hàng *</label><select id="nf-khach"><option value="">-- Chọn --</option>${khopts}</select></div>
      <div class="form-group"><label>Loại hàng *</label><select id="nf-loai" onchange="toggleNFBill()">
        <option>Nhập</option><option>Xuất</option><option>Chuyển kho</option>
      </select></div>
      <div class="form-group" id="nfgrp-bill"><label>Số Bill / Booking</label><input type="text" id="nf-bill" placeholder="Nhập số bill hoặc booking..."></div>
      <div class="form-group"><label>Điểm lấy hàng *</label><input type="text" id="nf-lay" placeholder="Kho / KCN / Cảng..."></div>
      <div class="form-group"><label>Điểm trả hàng *</label><input type="text" id="nf-tra" placeholder="Kho / KCN / Cảng..."></div>
      <div class="form-group full"><label>Ghi chú</label><textarea id="nf-ghichu" rows="2"></textarea></div>
    </div>
    <div class="form-section-title" style="font-size:10px;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 8px"><i class="ti ti-currency-dong"></i> Dịch vụ kèm theo</div>
    <div class="form-grid">
      <div class="form-group">
        <label><input type="checkbox" id="nf-doilenh" style="width:auto;margin-right:5px">Đổi lệnh</label>
        <input type="text" id="nf-phidl" placeholder="Phí / cont (VNĐ)" oninput="this.value=fmtInput(this.value)">
        <span style="font-size:10px;color:var(--text-muted)">thu theo số cont</span>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="nf-tokhai" style="width:auto;margin-right:5px">Mở tờ khai</label>
        <input type="text" id="nf-phitk" placeholder="Phí / lô (VNĐ)" oninput="this.value=fmtInput(this.value)">
        <span style="font-size:10px;color:var(--text-muted)">thu theo lô</span>
      </div>
    </div>
  </div>
  <div class="modal-foot"><button class="btn" onclick="closeModal()">Hủy</button><button class="btn btn-primary" onclick="saveNew()"><i class="ti ti-device-floppy"></i> Tạo vận đơn</button></div>
  </div>`;
  document.body.appendChild(bg);
}

function toggleNFBill(){
  // Single field for both bill/booking - just update placeholder
  const loai=document.getElementById('nf-loai')?.value;
  const billEl=document.getElementById('nf-bill');
  if(billEl){
    if(loai==='Nhập') billEl.placeholder='Số bill hàng nhập...';
    else if(loai==='Xuất') billEl.placeholder='Số booking hàng xuất...';
    else billEl.placeholder='Số bill / booking...';
  }
}

async function saveNew(){
  const khach=document.getElementById('nf-khach').value;
  const lay=document.getElementById('nf-lay').value;
  const tra=document.getElementById('nf-tra').value;
  if(!khach){toast('Vui lòng chọn khách hàng','error');return;}
  if(!lay){toast('Vui lòng nhập điểm lấy hàng','error');return;}
  if(!tra){toast('Vui lòng nhập điểm trả hàng','error');return;}
  const loai=document.getElementById('nf-loai').value;
  const billVal=document.getElementById('nf-bill')?.value||null;
  const data={
    ma_don:genMa(),
    ngay:document.getElementById('nf-ngay').value,
    ten_khach:khach,
    loai_hang:loai,
    so_bill:loai==='Nhập'?billVal:null,
    so_booking:loai!=='Nhập'?billVal:null,
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
  const coThau=!!o.ma_thau_phu||plXe==='thau_tu_lai'||plXe==='thau_thue_lai';
  const coLaiXe=isNoiBo||isThauThueLai;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:460px">
  <div class="modal-head"><h3><i class="ti ti-receipt" style="color:var(--warning)"></i>Thêm chi phí phát sinh</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body">
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;background:var(--bg);padding:7px 10px;border-radius:var(--r)">Vận đơn: <strong>${maDon}</strong></div>
    <div class="form-grid">
      <div class="form-group full"><label>Loại chi *</label><select id="ch-loai">
        <option>Cao tốc / Vé đường</option>
        <option>Công nhân bốc xếp</option>
        <option>Lưu ca</option>
        <option>Lưu bãi / Lưu cont</option>
        <option>Phí cảng</option>
        <option>Nâng hạ cont</option>
        <option>Giám sát hải quan</option>
        <option>Chi phí khác</option>
      </select></div>

      <div style="grid-column:1/-1;border-radius:var(--r);padding:10px 12px;border:1px solid var(--border);background:var(--bg)">
        <div style="font-size:10px;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
          <i class="ti ti-coins"></i> Số tiền
          ${isNoiBo?'<span style="background:#ede9fe;color:#7c3aed;border-radius:8px;padding:1px 8px;margin-left:6px;font-size:10px;text-transform:none">🚗 Xe nội bộ — '+o.bien_kiem_soat+'</span>':coThau?'<span style="background:#fef3c7;color:var(--warning);border-radius:8px;padding:1px 8px;margin-left:6px;font-size:10px;text-transform:none">🚛 Xe thầu — '+o.ma_thau_phu+'</span>':'<span style="background:#f1f5f9;color:var(--text-muted);border-radius:8px;padding:1px 8px;margin-left:6px;font-size:10px;text-transform:none">Chưa xếp xe</span>'}
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Thu khách (VNĐ) *</label>
            <input type="text" id="ch-thukh" placeholder="0"
              oninput="this.value=fmtInput(this.value);autoFillTraThau()"
              style="border-color:var(--teal)">
            <span style="font-size:10px;color:var(--teal)">Vào bảng kê thu khách</span>
          </div>
          ${coThau?`
          <div class="form-group">
            <label>Trả thầu (VNĐ) <span style="font-size:10px;color:var(--warning)">· ${o.ma_thau_phu||''}</span></label>
            <input type="text" id="ch-trathau" placeholder="0"
              oninput="this.value=fmtInput(this.value)"
              style="border-color:var(--warning)">
            <span style="font-size:10px;color:var(--warning)">BN Chain trả thầu khoản này</span>
          </div>`:`<input type="hidden" id="ch-trathau" value="0">`}
          ${coLaiXe?`
          <div class="form-group">
            <label>Trả lái xe (VNĐ) <span style="font-size:10px;color:#8b5cf6">· ${o.ten_lai_xe||''}</span></label>
            <input type="text" id="ch-tralaixe" placeholder="0"
              oninput="this.value=fmtInput(this.value)"
              style="border-color:#8b5cf6">
            <span style="font-size:10px;color:#8b5cf6">${isThauThueLai?'Lương BN Chain trả hộ — trừ vào cước thầu khi quyết toán':'Trừ vào lương lái xe'}</span>
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

function autoFillTraThau(){
  // Khi nhập thu khách, tự gợi ý trả thầu = cùng số tiền
  const thuEl=document.getElementById('ch-thukh');
  const thauEl=document.getElementById('ch-trathau');
  if(thuEl&&thauEl&&!thauEl.value){
    thauEl.value=thuEl.value;
  }
}


async function editChiHo(chiHoId, vdId, maDon){
  const{data}=await db.from('chi_ho').select('*').eq('id',chiHoId).single();
  if(!data)return;
  const o=ORDERS.find(x=>x.id===vdId)||{};
  const plXe=o.loai_phan_loai_xe||'';
  const coThau=!!o.ma_thau_phu||plXe==='thau_tu_lai'||plXe==='thau_thue_lai';
  const coLaiXe=plXe==='noi_bo'||plXe==='thau_thue_lai';
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:460px">
  <div class="modal-head"><h3><i class="ti ti-edit" style="color:var(--teal)"></i> Sửa chi phí phát sinh</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body">
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;background:var(--bg);padding:7px 10px;border-radius:var(--r)">Vận đơn: <strong>${maDon}</strong></div>
    <div class="form-grid">
      <div class="form-group full"><label>Loại chi *</label><select id="ch-loai">
        <option ${data.loai_chi==='Cao tốc / Vé đường'?'selected':''}>Cao tốc / Vé đường</option>
        <option ${data.loai_chi==='Công nhân bốc xếp'?'selected':''}>Công nhân bốc xếp</option>
        <option ${data.loai_chi==='Lưu ca'?'selected':''}>Lưu ca</option>
        <option ${data.loai_chi==='Lưu bãi / Lưu cont'?'selected':''}>Lưu bãi / Lưu cont</option>
        <option ${data.loai_chi==='Phí cảng'?'selected':''}>Phí cảng</option>
        <option ${data.loai_chi==='Nâng hạ cont'?'selected':''}>Nâng hạ cont</option>
        <option ${data.loai_chi==='Giám sát hải quan'?'selected':''}>Giám sát hải quan</option>
        <option ${data.loai_chi==='Chi phí khác'?'selected':''}>Chi phí khác</option>
      </select></div>
      <div style="grid-column:1/-1;background:var(--bg);border-radius:var(--r);padding:10px 12px;border:1px solid var(--border)">
        <div style="font-size:10px;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px"><i class="ti ti-coins"></i> Số tiền</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Thu khách (VNĐ) *</label>
            <input type="text" id="ch-thukh" value="${fmtInput(data.tien_thu_khach||data.so_tien||0)}"
              oninput="this.value=fmtInput(this.value)" style="border-color:var(--teal)">
          </div>
          ${coThau?`<div class="form-group">
            <label>Trả thầu (VNĐ)</label>
            <input type="text" id="ch-trathau" value="${fmtInput(data.tien_tra_thau||0)}"
              oninput="this.value=fmtInput(this.value)" style="border-color:var(--warning)">
            <span style="font-size:10px;color:var(--warning)">BN Chain trả thầu khoản này</span>
          </div>`:`<input type="hidden" id="ch-trathau" value="0">`}
          ${coLaiXe?`<div class="form-group">
            <label>Trả lái xe (VNĐ)</label>
            <input type="text" id="ch-tralaixe" value="${fmtInput(data.tien_tra_laixe||0)}"
              oninput="this.value=fmtInput(this.value)" style="border-color:#8b5cf6">
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

async function deleteChiHo(chiHoId, vdId){
  if(!confirm('Xóa khoản chi phí này?'))return;
  const{error}=await db.from('chi_ho').delete().eq('id',chiHoId);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã xóa chi phí');
  const o=ORDERS.find(x=>x.id===vdId);
  if(o){DP_TAB='chiho';await renderDP(o);}
}


async function saveChiHo(vdId,maDon){
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

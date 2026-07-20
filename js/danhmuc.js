// DANHMUC.JS — Khách hàng, Phương tiện, Lái xe, Nhân viên
// Requires: config.js

async function pgKH(c){
  if(!canSee(['quan_ly','ke_toan','ceo'])){toast('Không có quyền thực hiện','error');return;}
  const{data}=await db.from('khach_hang').select('*').eq('active',true).order('ten_cong_ty');
  const list=data||[];
  // Lưu list vào biến global để search lọc client-side
  window._khList=list;

  function renderKHTable(arr){
    const tbody=document.getElementById('kh-tbody');
    if(!tbody)return;
    tbody.innerHTML=arr.length?arr.map(k=>`<tr>
      <td class="text-blue fw6">${k.ma_kh}</td><td style="font-weight:500">${k.ten_cong_ty}</td>
      <td>${k.nguoi_lien_he||'—'}</td><td>${k.so_dien_thoai||'—'}</td>
      <td>${k.email||'—'}</td><td>${k.ma_so_thue||'—'}</td>
      <td style="text-align:right">${fmt(k.luong_thuong??10000)}</td>
      <td>${canEdit?`<div style="display:flex;gap:4px">
        <button class="btn btn-xs btn-teal" onclick="editKH('${k.id}')"><i class="ti ti-edit"></i></button>
        <button class="btn btn-xs btn-danger" onclick="deleteKH('${k.id}','${k.ten_cong_ty}')"><i class="ti ti-trash"></i></button>
      </div>`:'—'}</td>
    </tr>`).join(''):`<tr><td colspan="8"><div class="empty"><i class="ti ti-search-off"></i>Không tìm thấy khách hàng nào</div></td></tr>`;
    document.getElementById('kh-count').textContent=arr.length+' khách hàng';
  }

  window.filterKH=function(){
    const q=(document.getElementById('kh-search').value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(!q){renderKHTable(window._khList);return;}
    renderKHTable(window._khList.filter(k=>{
      const hay=[k.ma_kh,k.ten_cong_ty,k.nguoi_lien_he,k.so_dien_thoai,k.ma_so_thue].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return hay.includes(q);
    }));
  };

  c.innerHTML=`
  <div class="toolbar" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    ${canEdit?`<button class="btn btn-primary" onclick="openAddKH()"><i class="ti ti-plus"></i> Thêm khách hàng</button>`:''}
    <div style="position:relative;flex:1;max-width:320px">
      <i class="ti ti-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:14px;pointer-events:none"></i>
      <input id="kh-search" type="text" placeholder="Tìm theo mã, tên, MST, SĐT..." oninput="filterKH()"
        style="width:100%;padding:7px 10px 7px 32px;border:1px solid var(--border);border-radius:var(--r);font-size:13px;background:var(--card)">
    </div>
    <span id="kh-count" style="font-size:12px;color:var(--text-muted)">${list.length} khách hàng</span>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <colgroup><col style="width:80px"><col style="width:180px"><col style="width:130px"><col style="width:110px"><col style="width:150px"><col style="width:100px"><col style="width:130px"><col style="width:80px"></colgroup>
    <thead><tr><th>Mã KH</th><th>Tên công ty</th><th>Người LH</th><th>Điện thoại</th><th>Email</th><th>MST</th><th>Lương thường (ĐĐ/QL)</th><th>Thao tác</th></tr></thead>
    <tbody id="kh-tbody"></tbody>
  </table></div>`;
  renderKHTable(list);
}

function openAddKH(existing={}){
  const isEdit=!!existing.id;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:480px">
  <div class="modal-head"><h3>${isEdit?'Sửa':'Thêm'} khách hàng</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body"><div class="form-grid">
    <div class="form-group"><label>Mã KH *</label><input id="kh-ma" value="${existing.ma_kh||''}" placeholder="KH007" ${isEdit?'disabled':''}></div>
    <div class="form-group"><label>Tên công ty *</label><input id="kh-ten" value="${existing.ten_cong_ty||''}"></div>
    <div class="form-group"><label>Người LH</label><input id="kh-nlh" value="${existing.nguoi_lien_he||''}"></div>
    <div class="form-group"><label>Điện thoại</label><input id="kh-dt" value="${existing.so_dien_thoai||''}"></div>
    <div class="form-group"><label>Email</label><input id="kh-email" type="email" value="${existing.email||''}"></div>
    <div class="form-group"><label>Mã số thuế</label><input id="kh-mst" value="${existing.ma_so_thue||''}"></div>
    <div class="form-group"><label>Lương thường (ĐĐ/QL) <span style="font-size:10px;color:#8b5cf6">· dùng cho Bảng lương</span></label>
      <input id="kh-luong" type="text" value="${fmtInput(existing.luong_thuong??10000)}" oninput="fmtOnInput(this)"></div>
    <div class="form-group full"><label>Địa chỉ</label><input id="kh-dc" value="${existing.dia_chi||''}"></div>
    <div class="form-group full"><label>Ghi chú</label><textarea id="kh-gc">${existing.ghi_chu||''}</textarea></div>
  </div></div>
  <div class="modal-foot"><button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="saveKH('${existing.id||''}')"><i class="ti ti-device-floppy"></i> Lưu</button>
  </div></div>`;
  document.body.appendChild(bg);
}
async function editKH(id){
  const{data}=await db.from('khach_hang').select('*').eq('id',id).single();
  if(data)openAddKH(data);
}
async function saveKH(id=''){
  if(!canSee(['quan_ly','ke_toan','ceo'])){toast('Không có quyền thực hiện','error');return;}
  const d={ten_cong_ty:document.getElementById('kh-ten').value,nguoi_lien_he:document.getElementById('kh-nlh').value,so_dien_thoai:document.getElementById('kh-dt').value,email:document.getElementById('kh-email').value,ma_so_thue:document.getElementById('kh-mst').value,luong_thuong:parseNum(document.getElementById('kh-luong').value)||10000,dia_chi:document.getElementById('kh-dc').value,ghi_chu:document.getElementById('kh-gc').value};
  if(!d.ten_cong_ty){toast('Nhập tên công ty','error');return;}
  let error;
  if(id){({error}=await db.from('khach_hang').update(d).eq('id',id));}
  else{d.ma_kh=document.getElementById('kh-ma').value;if(!d.ma_kh){toast('Nhập mã KH','error');return;}({error}=await db.from('khach_hang').insert(d));}
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast(id?'Đã cập nhật':'Đã thêm khách hàng');closeModal();await loadMaster();pgKH(document.getElementById('content'));
}
async function deleteKH(id,ten){
  if(!canSee(['quan_ly','ke_toan','ceo'])){toast('Không có quyền thực hiện','error');return;}
  if(!confirm(`Xóa khách hàng "${ten}"?`))return;
  const{error}=await db.from('khach_hang').update({active:false}).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã xóa');await loadMaster();pgKH(document.getElementById('content'));
}

// ============ PHƯƠNG TIỆN (gộp Xe + Lái xe + Thầu phụ) ============
async function pgLaiXe(c){ pgPhuongTien(c); } // redirect
async function pgThauPhu(c){ pgPhuongTien(c); }
async function pgXe(c){ pgPhuongTien(c); }

async function pgPhuongTien(c){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền thực hiện','error');return;}
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const[{data:xeList},{data:tpList},{data:lxList}]=await Promise.all([
    db.from('xe').select('*').eq('active',true).order('bien_so'),
    db.from('thau_phu').select('*').eq('active',true).order('ten_cong_ty'),
    db.from('lai_xe').select('*').eq('active',true).order('ho_ten'),
  ]);
  const loaiLabel={'noi_bo':'🚗 Nội bộ','thau_tu_lai':'🚛 Thầu tự lái','thau_thue_lai':'🔄 Thầu thuê lái'};

  c.innerHTML=`
  ${canEdit?`<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <button class="btn btn-primary" onclick="openAddXe()"><i class="ti ti-plus"></i> Thêm xe</button>
    <button class="btn btn-teal" onclick="openAddTP()"><i class="ti ti-plus"></i> Thêm thầu phụ</button>
    <button class="btn" onclick="openAddLX()"><i class="ti ti-plus"></i> Thêm lái xe</button>
  </div>`:''}

  <h4 style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">
    <i class="ti ti-truck"></i> DANH SÁCH XE (${(xeList||[]).length})
  </h4>
  <div class="tbl-wrap" style="margin-bottom:16px"><table class="tbl">
    <colgroup><col style="width:110px"><col style="width:130px"><col style="width:130px"><col style="width:140px"><col style="width:140px"><col style="width:100px"><col style="width:80px"></colgroup>
    <thead><tr><th>Biển số</th><th>Loại xe</th><th>Phân loại</th><th>Thầu phụ</th><th>Lái xe mặc định</th><th>Tải trọng</th><th>Thao tác</th></tr></thead>
    <tbody>${(xeList||[]).map(x=>`<tr>
      <td class="text-blue fw6">${x.bien_so}</td>
      <td>${x.loai_xe||'—'}</td>
      <td>${loaiLabel[x.loai_phan_loai]||'—'}</td>
      <td>${x.ten_thau_phu||x.ma_thau_phu||'—'}</td>
      <td>${x.ten_lai_xe_mac_dinh||'—'}</td>
      <td>${x.tai_trong||'—'}</td>
      <td>${canEdit?`<div style="display:flex;gap:4px">
        <button class="btn btn-xs btn-teal" onclick="editXe('${x.id}')"><i class="ti ti-edit"></i></button>
        <button class="btn btn-xs btn-danger" onclick="deleteXe('${x.id}','${x.bien_so}')"><i class="ti ti-trash"></i></button>
      </div>`:'—'}</td>
    </tr>`).join('')}</tbody>
  </table></div>

  <h4 style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">
    <i class="ti ti-users"></i> THẦU PHỤ (${(tpList||[]).length})
  </h4>
  <div class="tbl-wrap" style="margin-bottom:16px"><table class="tbl">
    <colgroup><col style="width:110px"><col style="width:160px"><col style="width:120px"><col style="width:110px"><col style="width:130px"><col style="width:110px"><col style="width:70px"></colgroup>
    <thead><tr><th>Mã thầu</th><th>Tên công ty</th><th>Người LH</th><th>Điện thoại</th><th>Số TK</th><th>Ngân hàng</th><th>Thao tác</th></tr></thead>
    <tbody>${(tpList||[]).map(t=>`<tr>
      <td class="text-blue fw6">${t.ma_thau}</td><td class="fw6">${t.ten_cong_ty}</td>
      <td>${t.nguoi_lien_he||'—'}</td><td>${t.so_dien_thoai||'—'}</td>
      <td>${t.so_tai_khoan||'—'}</td><td>${t.ngan_hang||'—'}</td>
      <td>${canEdit?`<div style="display:flex;gap:4px">
        <button class="btn btn-xs btn-teal" onclick="editTP('${t.id}')"><i class="ti ti-edit"></i></button>
        <button class="btn btn-xs btn-danger" onclick="deleteTP('${t.id}','${t.ma_thau}')"><i class="ti ti-trash"></i></button>
      </div>`:'—'}</td>
    </tr>`).join('')}</tbody>
  </table></div>

  <h4 style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">
    <i class="ti ti-id-badge"></i> LÁI XE (${(lxList||[]).length})
  </h4>
  <div class="tbl-wrap"><table class="tbl">
    <colgroup><col style="width:160px"><col style="width:110px"><col style="width:120px"><col style="width:90px"><col style="width:90px"><col style="width:70px"></colgroup>
    <thead><tr><th>Họ tên</th><th>Điện thoại</th><th>CMND/CCCD</th><th>Bằng lái</th><th>HH bằng</th><th>Thao tác</th></tr></thead>
    <tbody>${(lxList||[]).map(l=>`<tr>
      <td class="fw6">${l.ho_ten}</td><td>${l.so_dien_thoai||'—'}</td>
      <td>${l.so_cmnd||'—'}</td><td>${l.bang_lai||'—'}</td><td>${l.ngay_het_han_bang||'—'}</td>
      <td>${canEdit?`<div style="display:flex;gap:4px">
        <button class="btn btn-xs btn-teal" onclick="editLX('${l.id}')"><i class="ti ti-edit"></i></button>
        <button class="btn btn-xs btn-danger" onclick="deleteLX('${l.id}','${l.ho_ten}')"><i class="ti ti-trash"></i></button>
      </div>`:'—'}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

// ---- XE CRUD ----
function openAddXe(existing={}){
  const isEdit=!!existing.id;
  const tpOpts=TP.map(t=>`<option value="${t.ma_thau}" ${existing.ma_thau_phu===t.ma_thau?'selected':''}>${t.ma_thau} — ${t.ten_cong_ty}</option>`).join('');
  const lxOpts=LX.map(l=>`<option value="${l.ho_ten}" ${existing.ten_lai_xe_mac_dinh===l.ho_ten?'selected':''}>${l.ho_ten}</option>`).join('');
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:500px">
  <div class="modal-head"><h3>${isEdit?'Sửa':'Thêm'} xe</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body"><div class="form-grid">
    <div class="form-group"><label>Biển số *</label><input id="xe-bs" value="${existing.bien_so||''}" placeholder="99H-06375" ${isEdit?'disabled':''}></div>
    <div class="form-group"><label>Loại xe</label>
      <select id="xe-lx"><option value="">-- Chọn --</option>
        ${['Xe đầu kéo','Xe tải nhỏ','Xe tải lớn','Mooc','Rơ mooc'].map(v=>`<option ${existing.loai_xe===v?'selected':''}>${v}</option>`).join('')}
      </select></div>
    <div class="form-group"><label>Phân loại *</label>
      <select id="xe-pl" onchange="toggleXeFields()">
        <option value="thau_tu_lai" ${(!existing.loai_phan_loai||existing.loai_phan_loai==='thau_tu_lai')?'selected':''}>🚛 Thầu tự lái</option>
        <option value="thau_thue_lai" ${existing.loai_phan_loai==='thau_thue_lai'?'selected':''}>🔄 Thầu thuê lái</option>
        <option value="noi_bo" ${existing.loai_phan_loai==='noi_bo'?'selected':''}>🚗 Xe nội bộ</option>
      </select></div>
    <div class="form-group"><label>Tải trọng</label><input id="xe-tt" value="${existing.tai_trong||''}" placeholder="20 tấn"></div>
    <div class="form-group" id="xe-dinhmuc-group" style="${(existing.loai_phan_loai==='noi_bo'||existing.loai_phan_loai==='thau_thue_lai')?'':'display:none'}">
      <label>Định mức khoán (lít/km)</label>
      <input id="xe-dinhmuc" type="number" step="0.01" value="${existing.dinh_muc_khoan||''}" placeholder="VD: 0.35">
      <span style="font-size:10px;color:var(--text-muted)">Dùng để tính lương khoán km ở Nhật ký hành trình</span>
    </div>
    <div class="form-group" id="xe-thau-group" style="${existing.loai_phan_loai==='noi_bo'?'display:none':''}">
      <label>Thầu phụ</label>
      <select id="xe-tp"><option value="">-- Chọn --</option>${tpOpts}</select>
    </div>
    <div class="form-group" id="xe-laixe-group">
      <label>Lái xe mặc định</label>
      <input type="text" id="xe-laixe" value="${existing.ten_lai_xe_mac_dinh||''}" placeholder="Nhập tên lái xe..." list="xe-lx-dl">
      <datalist id="xe-lx-dl">${lxOpts}</datalist>
      <span style="font-size:10px;color:var(--text-muted)">Gõ tên hoặc chọn từ danh sách</span>
    </div>
    <div class="form-group"><label>Năm SX</label><input id="xe-nam" type="number" value="${existing.nam_sx||2020}"></div>
    <div class="form-group full"><label>Ghi chú</label><textarea id="xe-gc">${existing.ghi_chu||''}</textarea></div>
  </div></div>
  <div class="modal-foot"><button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="saveXeModal('${existing.id||''}')"><i class="ti ti-device-floppy"></i> Lưu</button>
  </div></div>`;
  document.body.appendChild(bg);
}
function toggleXeFields(){
  const pl=document.getElementById('xe-pl')?.value;
  const thauGrp=document.getElementById('xe-thau-group');
  const dmGrp=document.getElementById('xe-dinhmuc-group');
  // Ẩn thầu phụ nếu xe nội bộ
  if(thauGrp)thauGrp.style.display=pl==='noi_bo'?'none':'';
  // Định mức khoán km chỉ áp dụng nội bộ + thầu thuê lái (thầu tự lái không nhận lương công ty)
  if(dmGrp)dmGrp.style.display=(pl==='noi_bo'||pl==='thau_thue_lai')?'':'none';
  // Lái xe luôn hiện cho mọi loại
}
async function editXe(id){
  const{data}=await db.from('xe').select('*').eq('id',id).single();
  if(data)openAddXe(data);
}
async function saveXeModal(id=''){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền thực hiện','error');return;}
  const pl=document.getElementById('xe-pl').value;
  const tpSel=document.getElementById('xe-tp');
  const tpMa=tpSel?.value||'';
  const tpTen=tpSel?.options[tpSel.selectedIndex]?.text?.split('—')[1]?.trim()||'';
  const lxVal=document.getElementById('xe-laixe')?.value||'';
  const d={
    loai_xe:document.getElementById('xe-lx')?.value||'',
    loai_phan_loai:pl,
    tai_trong:document.getElementById('xe-tt')?.value||'',
    ten_lai_xe_mac_dinh:lxVal,
    ma_thau_phu:tpMa,
    ten_thau_phu:tpTen,
    nam_sx:+document.getElementById('xe-nam')?.value||null,
    dinh_muc_khoan:document.getElementById('xe-dinhmuc')?.value?+document.getElementById('xe-dinhmuc').value:null,
    la_xe_noi_bo:pl==='noi_bo',
    ghi_chu:document.getElementById('xe-gc')?.value||'',
  };
  let error;
  if(id){({error}=await db.from('xe').update(d).eq('id',id));}
  else{d.bien_so=document.getElementById('xe-bs').value;if(!d.bien_so){toast('Nhập biển số','error');return;}({error}=await db.from('xe').insert(d));}
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast(id?'Đã cập nhật xe':'Đã thêm xe');closeModal();pgPhuongTien(document.getElementById('content'));
}
async function deleteXe(id,bien){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền thực hiện','error');return;}
  if(!confirm(`Xóa xe "${bien}"?`))return;
  const{error}=await db.from('xe').update({active:false}).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã xóa xe');pgPhuongTien(document.getElementById('content'));
}

// ---- THẦU PHỤ CRUD ----
function openAddTP(existing={}){
  const isEdit=!!existing.id;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:480px">
  <div class="modal-head"><h3>${isEdit?'Sửa':'Thêm'} thầu phụ</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body"><div class="form-grid">
    <div class="form-group"><label>Mã thầu *</label><input id="tp-ma" value="${existing.ma_thau||''}" placeholder="TC.XXX001" ${isEdit?'disabled':''}></div>
    <div class="form-group"><label>Tên công ty *</label><input id="tp-ten" value="${existing.ten_cong_ty||''}"></div>
    <div class="form-group"><label>Người LH</label><input id="tp-nlh" value="${existing.nguoi_lien_he||''}"></div>
    <div class="form-group"><label>Điện thoại</label><input id="tp-dt" value="${existing.so_dien_thoai||''}"></div>
    <div class="form-group"><label>Số tài khoản</label><input id="tp-stk" value="${existing.so_tai_khoan||''}"></div>
    <div class="form-group"><label>Ngân hàng</label><input id="tp-nh" value="${existing.ngan_hang||''}"></div>
    <div class="form-group full"><label>Ghi chú</label><textarea id="tp-gc">${existing.ghi_chu||''}</textarea></div>
  </div></div>
  <div class="modal-foot"><button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="saveTP('${existing.id||''}')"><i class="ti ti-device-floppy"></i> Lưu</button>
  </div></div>`;
  document.body.appendChild(bg);
}
async function editTP(id){
  const{data}=await db.from('thau_phu').select('*').eq('id',id).single();
  if(data)openAddTP(data);
}
async function saveTP(id=''){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền thực hiện','error');return;}
  const d={ten_cong_ty:document.getElementById('tp-ten').value,nguoi_lien_he:document.getElementById('tp-nlh').value,so_dien_thoai:document.getElementById('tp-dt').value,so_tai_khoan:document.getElementById('tp-stk').value,ngan_hang:document.getElementById('tp-nh').value,ghi_chu:document.getElementById('tp-gc').value};
  if(!d.ten_cong_ty){toast('Nhập tên công ty','error');return;}
  let error;
  if(id){({error}=await db.from('thau_phu').update(d).eq('id',id));}
  else{d.ma_thau=document.getElementById('tp-ma').value;if(!d.ma_thau){toast('Nhập mã thầu','error');return;}({error}=await db.from('thau_phu').insert(d));}
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast(id?'Đã cập nhật':'Đã thêm thầu phụ');closeModal();await loadMaster();pgPhuongTien(document.getElementById('content'));
}
async function deleteTP(id,ma){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền thực hiện','error');return;}
  if(!confirm(`Xóa thầu phụ "${ma}"?`))return;
  const{error}=await db.from('thau_phu').update({active:false}).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã xóa');await loadMaster();pgPhuongTien(document.getElementById('content'));
}

// ---- LÁI XE CRUD ----
function openAddLX(existing={}){
  const isEdit=!!existing.id;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:440px">
  <div class="modal-head"><h3>${isEdit?'Sửa':'Thêm'} lái xe</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body"><div class="form-grid">
    <div class="form-group"><label>Họ tên *</label><input id="lx-ten" value="${existing.ho_ten||''}"></div>
    <div class="form-group"><label>Điện thoại</label><input id="lx-dt" value="${existing.so_dien_thoai||''}"></div>
    <div class="form-group"><label>CMND/CCCD</label><input id="lx-cmnd" value="${existing.so_cmnd||''}"></div>
    <div class="form-group"><label>Hạng bằng</label><input id="lx-bang" value="${existing.bang_lai||''}" placeholder="B2, C, D..."></div>
    <div class="form-group"><label>HH bằng lái</label><input id="lx-hh" type="date" value="${existing.ngay_het_han_bang||''}"></div>
  </div></div>
  <div class="modal-foot"><button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="saveLX('${existing.id||''}')"><i class="ti ti-device-floppy"></i> Lưu</button>
  </div></div>`;
  document.body.appendChild(bg);
}
async function editLX(id){
  const{data}=await db.from('lai_xe').select('*').eq('id',id).single();
  if(data)openAddLX(data);
}
async function saveLX(id=''){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền thực hiện','error');return;}
  const d={ho_ten:document.getElementById('lx-ten').value,so_dien_thoai:document.getElementById('lx-dt').value,so_cmnd:document.getElementById('lx-cmnd').value,bang_lai:document.getElementById('lx-bang').value,ngay_het_han_bang:document.getElementById('lx-hh').value||null};
  if(!d.ho_ten){toast('Nhập họ tên','error');return;}
  let error;
  if(id){({error}=await db.from('lai_xe').update(d).eq('id',id));}
  else{({error}=await db.from('lai_xe').insert(d));}
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast(id?'Đã cập nhật':'Đã thêm lái xe');closeModal();await loadMaster();pgPhuongTien(document.getElementById('content'));
}
async function deleteLX(id,ten){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền thực hiện','error');return;}
  if(!confirm(`Xóa lái xe "${ten}"?`))return;
  const{error}=await db.from('lai_xe').update({active:false}).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã xóa');await loadMaster();pgPhuongTien(document.getElementById('content'));
}


async function pgNV(c){
  if(!canSee(['ceo'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Chỉ CEO có quyền</div>';return;}
  const{data}=await db.from('users').select('*').order('vai_tro');
  const rMap={nhan_vien:'Nhân viên',ops_hp:'OPS Hải Phòng',quan_ly:'Quản lý',ke_toan:'Kế toán',ceo:'CEO',thu_quy:'Thủ quỹ'};
  c.innerHTML=`
  <div class="toolbar">
    <button class="btn btn-primary" onclick="openAddNV()"><i class="ti ti-plus"></i> Thêm tài khoản</button>
    <span style="font-size:12px;color:var(--text-muted);align-self:center">Chỉ CEO tạo và quản lý tài khoản đăng nhập</span>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <colgroup><col style="width:140px"><col style="width:170px"><col style="width:110px"><col style="width:110px"><col style="width:110px"><col style="width:110px"></colgroup>
    <thead><tr><th>Tên đăng nhập</th><th>Họ tên</th><th>Vai trò</th><th>Trạng thái</th><th>Mật khẩu</th><th>Thao tác</th></tr></thead>
    <tbody>${(data||[]).map(u=>`<tr>
      <td class="fw6" style="color:var(--teal)">${u.username||'—'}</td>
      <td class="fw6">${u.ho_ten}</td>
      <td><span class="tag tag-new">${rMap[u.vai_tro]||u.vai_tro}</span></td>
      <td><span class="tag ${u.active?'tag-dathu':'tag-huy'}">${u.active?'Đang làm':'Đã nghỉ'}</span></td>
      <td><button class="btn btn-xs" onclick="openDoiMK('${u.id}','${u.ho_ten.replace(/'/g,"\\'")}')"><i class="ti ti-key"></i> Đổi MK</button></td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-xs btn-teal" onclick="editNV('${u.id}')"><i class="ti ti-edit"></i></button>
        <button class="btn btn-xs btn-danger" title="${u.active?'Vô hiệu hóa':'Kích hoạt lại'}" onclick="toggleNV('${u.id}',${u.active},'${u.ho_ten.replace(/'/g,"\\'")}')"><i class="ti ti-${u.active?'user-off':'user-check'}"></i></button>
      </div></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function openAddNV(existing={}){
  const isEdit=!!existing.id;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:420px">
  <div class="modal-head">
    <h3><i class="ti ti-user-plus" style="color:var(--teal)"></i> ${isEdit?'Sửa thông tin':'Tạo tài khoản mới'}</h3>
    <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
  </div>
  <div class="modal-body"><div class="form-grid">
    <div class="form-group">
      <label>Tên đăng nhập *</label>
      <input id="nv-user" value="${existing.username||''}" placeholder="vd: nguyen.van.a" ${isEdit?'disabled':''} autocomplete="off">
      ${!isEdit?'<div style="font-size:11px;color:var(--text-muted);margin-top:3px">Không dấu, không khoảng trắng. Không thể đổi sau khi tạo.</div>':''}
    </div>
    <div class="form-group">
      <label>Họ tên *</label>
      <input id="nv-ten" value="${existing.ho_ten||''}" placeholder="Nguyễn Văn A">
    </div>
    ${!isEdit?`<div class="form-group full">
      <label>Mật khẩu *</label>
      <input id="nv-pass" type="password" placeholder="Tối thiểu 6 ký tự" autocomplete="new-password">
    </div>`:''}
    <div class="form-group full"><label>Vai trò</label>
      <select id="nv-role">
        <option value="nhan_vien" ${existing.vai_tro==='nhan_vien'?'selected':''}>Nhân viên — Vận hành cơ bản</option>
        <option value="ops_hp" ${existing.vai_tro==='ops_hp'?'selected':''}>OPS Hải Phòng — Upload & duyệt hóa đơn</option>
        <option value="quan_ly" ${existing.vai_tro==='quan_ly'?'selected':''}>Quản lý — Mở khóa đơn, danh mục</option>
        <option value="ke_toan" ${existing.vai_tro==='ke_toan'?'selected':''}>Kế toán — Nhập cước, bảng kê</option>
        <option value="thu_quy" ${existing.vai_tro==='thu_quy'?'selected':''}>Thủ quỹ — Duyệt chi phí, chỉ xem chuyến/báo cáo</option>
        <option value="ceo" ${existing.vai_tro==='ceo'?'selected':''}>CEO — Toàn quyền</option>
      </select>
    </div>
  </div></div>
  <div class="modal-foot">
    <button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="saveNV('${existing.id||''}')"><i class="ti ti-device-floppy"></i> ${isEdit?'Cập nhật':'Tạo tài khoản'}</button>
  </div></div>`;
  document.body.appendChild(bg);
}

function openDoiMK(id, ten){
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:360px">
  <div class="modal-head">
    <h3><i class="ti ti-key" style="color:var(--warning)"></i> Đổi mật khẩu — ${ten}</h3>
    <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
  </div>
  <div class="modal-body">
    <div class="form-group"><label>Mật khẩu mới *</label><input id="mk-new" type="password" placeholder="Tối thiểu 6 ký tự" autocomplete="new-password"></div>
    <div class="form-group"><label>Xác nhận lại *</label><input id="mk-confirm" type="password" placeholder="Nhập lại mật khẩu mới" autocomplete="new-password"></div>
  </div>
  <div class="modal-foot">
    <button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="saveDoiMK('${id}')"><i class="ti ti-check"></i> Xác nhận đổi</button>
  </div></div>`;
  document.body.appendChild(bg);
}

async function saveDoiMK(id){
  const np=document.getElementById('mk-new').value;
  const cp=document.getElementById('mk-confirm').value;
  if(!np||np.length<6){toast('Mật khẩu tối thiểu 6 ký tự','error');return;}
  if(np!==cp){toast('Mật khẩu xác nhận không khớp','error');return;}
  const{error}=await db.from('users').update({password:np}).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã đổi mật khẩu thành công');closeModal();
}

async function editNV(id){
  const{data}=await db.from('users').select('*').eq('id',id).single();
  if(data)openAddNV(data);
}

async function saveNV(id=''){
  if(!canSee(['ceo'])){toast('Không có quyền thực hiện','error');return;}
  const d={ho_ten:document.getElementById('nv-ten').value.trim(),vai_tro:document.getElementById('nv-role').value};
  if(!d.ho_ten){toast('Nhập họ tên','error');return;}
  let error;
  if(id){
    ({error}=await db.from('users').update(d).eq('id',id));
  } else {
    const uname=document.getElementById('nv-user').value.trim().toLowerCase().replace(/\s+/g,'');
    const pass=document.getElementById('nv-pass').value;
    if(!uname){toast('Nhập tên đăng nhập','error');return;}
    if(pass.length<6){toast('Mật khẩu tối thiểu 6 ký tự','error');return;}
    // Kiểm tra trùng username
    const{data:dup}=await db.from('users').select('id').eq('username',uname);
    if(dup&&dup.length>0){toast('Tên đăng nhập đã tồn tại, chọn tên khác','error');return;}
    d.username=uname;
    d.password=pass;
    d.email=uname+'@bnchain.local'; // placeholder — cột email NOT NULL trong DB
    d.active=true;
    ({error}=await db.from('users').insert(d));
  }
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast(id?'Đã cập nhật':'Tài khoản đã được tạo');closeModal();await loadMaster();pgNV(document.getElementById('content'));
}

async function toggleNV(id,active,ten){
  if(!canSee(['ceo'])){toast('Không có quyền thực hiện','error');return;}
  // Không cho tự vô hiệu hóa chính mình
  if(id===CU?.id&&active){toast('Không thể vô hiệu hóa tài khoản đang đăng nhập','error');return;}
  if(!confirm(`${active?'Vô hiệu hóa':'Kích hoạt lại'} tài khoản "${ten}"?`))return;
  const{error}=await db.from('users').update({active:!active}).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast(active?'Đã vô hiệu hóa tài khoản':'Đã kích hoạt lại');pgNV(document.getElementById('content'));
}

// ============ ĐỊA ĐIỂM ============
async function pgDiaDiem(c){
  if(!canSee(['quan_ly','ceo'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const{data}=await db.from('dia_diem').select('*').eq('active',true).order('loai').order('ten_chuan');
  const list=data||[];
  const loaiIcon={'Cảng':'🚢','KCN':'🏭','Kho':'📦','Depot':'🔲','Cửa khẩu':'🛃','Khác':'📍'};
  // Lưu list để search client-side
  window._ddList=list;

  function renderDDTable(arr){
    const tbody=document.getElementById('dd-tbody');
    if(!tbody)return;
    tbody.innerHTML=arr.length?arr.map(d=>`<tr>
      <td style="font-weight:600">${loaiIcon[d.loai]||'📍'} ${d.ten_chuan}</td>
      <td><span class="tag">${d.loai||'—'}</span></td>
      <td style="font-size:12px;color:var(--text-muted)">${d.dia_phuong||'—'}</td>
      <td style="font-size:12px;color:var(--teal)">${d.viet_tat||'—'}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-xs btn-teal" onclick="editDD('${d.id}')"><i class="ti ti-edit"></i></button>
        <button class="btn btn-xs btn-danger" onclick="deleteDD('${d.id}','${d.ten_chuan.replace(/'/g,"\\'")}')"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`).join(''):`<tr><td colspan="5"><div class="empty"><i class="ti ti-search-off"></i>Không tìm thấy địa điểm nào</div></td></tr>`;
    document.getElementById('dd-count').textContent=arr.length+' địa điểm';
  }

  window.filterDD=function(){
    const q=(document.getElementById('dd-search').value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(!q){renderDDTable(window._ddList);return;}
    renderDDTable(window._ddList.filter(d=>{
      const hay=[d.ten_chuan,d.loai,d.dia_phuong,d.viet_tat].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return hay.includes(q);
    }));
  };

  c.innerHTML=`
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
    <button class="btn btn-primary" onclick="openAddDD()"><i class="ti ti-plus"></i> Thêm địa điểm</button>
    <div style="position:relative;flex:1;max-width:320px">
      <i class="ti ti-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:14px;pointer-events:none"></i>
      <input id="dd-search" type="text" placeholder="Tìm tên, loại, địa phương, viết tắt..." oninput="filterDD()"
        style="width:100%;padding:7px 10px 7px 32px;border:1px solid var(--border);border-radius:var(--r);font-size:13px;background:var(--card)">
    </div>
    <span id="dd-count" style="font-size:12px;color:var(--text-muted)">${list.length} địa điểm</span>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <colgroup><col style="width:220px"><col style="width:90px"><col style="width:120px"><col style="width:180px"><col style="width:90px"></colgroup>
    <thead><tr><th>Tên chuẩn</th><th>Loại</th><th>Địa phương</th><th>Viết tắt / gợi ý tìm</th><th>Thao tác</th></tr></thead>
    <tbody id="dd-tbody"></tbody>
  </table></div>
  <div style="display:flex;gap:8px;margin-top:24px;border-bottom:1px solid var(--border)">
    <button class="btn btn-sm ${DD_SUBTAB==='giaLuong'?'btn-primary':''}" onclick="chuyenDDSubTab('giaLuong')">Bảng giá lương</button>
    <button class="btn btn-sm ${DD_SUBTAB==='khoangCach'?'btn-primary':''}" onclick="chuyenDDSubTab('khoangCach')">Khoảng cách</button>
  </div>
  <div id="bgl-wrap" style="margin-top:16px;${DD_SUBTAB!=='giaLuong'?'display:none':''}"></div>
  <div id="kc-wrap" style="margin-top:16px;${DD_SUBTAB!=='khoangCach'?'display:none':''}"></div>`;
  renderDDTable(list);
  renderBangGiaLuong(list);
  renderKhoangCach(list);
}
let DD_SUBTAB='giaLuong';
function chuyenDDSubTab(t){
  DD_SUBTAB=t;
  document.getElementById('bgl-wrap').style.display=t==='giaLuong'?'':'none';
  document.getElementById('kc-wrap').style.display=t==='khoangCach'?'':'none';
  document.querySelectorAll('#content .btn-sm').forEach(b=>b.classList.remove('btn-primary'));
  event?.target?.classList.add('btn-primary');
}

// ============ KHOẢNG CÁCH GIỮA 2 ĐIỂM (cho Nhật ký hành trình) ============
// Riêng biệt với Bảng giá lương ở trên — đây là km thực tế, không phải giá tiền.
async function renderKhoangCach(ddList){
  const wrap=document.getElementById('kc-wrap');
  if(!wrap)return;
  if(!canSee(['quan_ly','ceo'])){wrap.innerHTML='';return;}
  const{data,error}=await db.from('khoang_cach').select('*').order('id');
  if(error){wrap.innerHTML=`<div class="empty"><i class="ti ti-alert-circle"></i>Chưa có bảng khoang_cach — chạy SQL migration trước</div>`;return;}
  window._kcList=data||[];
  const ddOpts=ddList.map(d=>`<option value="${d.ten_chuan}">${d.ten_chuan}</option>`).join('');
  wrap.innerHTML=`
  <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:2px"><i class="ti ti-ruler-2"></i> Khoảng cách giữa các điểm (km)</div>
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Dùng để tính đoạn rỗng trong Nhật ký hành trình. Mặc định 2 chiều bằng nhau — sửa riêng nếu cần.</div>
  <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
    <select id="kc-a" style="width:200px"><option value="">-- Điểm A --</option>${ddOpts}</select>
    <span style="font-size:13px;color:var(--text-muted)">↔</span>
    <select id="kc-b" style="width:200px"><option value="">-- Điểm B --</option>${ddOpts}</select>
    <input type="number" id="kc-km" placeholder="Km" style="width:100px">
    <label style="font-size:12px;display:flex;align-items:center;gap:4px"><input type="checkbox" id="kc-2chieu" checked> 2 chiều bằng nhau</label>
    <button class="btn btn-primary btn-sm" onclick="themKhoangCach()"><i class="ti ti-plus"></i> Thêm</button>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Điểm A</th><th>Điểm B</th><th>Km</th><th>Thao tác</th></tr></thead>
    <tbody>
    ${(window._kcList.length?window._kcList:[]).map(k=>`<tr>
      <td>${k.diem_a}</td><td>${k.diem_b}</td>
      <td><input type="number" value="${k.km}" style="width:90px" onchange="suaKhoangCach(${k.id},this.value)"></td>
      <td><button class="btn btn-xs btn-danger" onclick="xoaKhoangCach(${k.id})"><i class="ti ti-trash"></i></button></td>
    </tr>`).join('')||'<tr><td colspan="4"><div class="empty">Chưa có khoảng cách nào</div></td></tr>'}
    </tbody>
  </table></div>`;
}

async function themKhoangCach(){
  const a=document.getElementById('kc-a').value, b=document.getElementById('kc-b').value;
  const km=Number(document.getElementById('kc-km').value)||0;
  const haiChieu=document.getElementById('kc-2chieu').checked;
  if(!a||!b||a===b){toast('Chọn đủ 2 điểm khác nhau','error');return;}
  const rows=[{diem_a:a,diem_b:b,km}];
  if(haiChieu) rows.push({diem_a:b,diem_b:a,km});
  const{error}=await db.from('khoang_cach').insert(rows);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã thêm khoảng cách');
  renderKhoangCach(window._ddList);
}
async function suaKhoangCach(id,km){
  const{error}=await db.from('khoang_cach').update({km:Number(km)||0}).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã cập nhật');
}
async function xoaKhoangCach(id){
  if(!confirm('Xóa dòng khoảng cách này?'))return;
  const{error}=await db.from('khoang_cach').delete().eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  renderKhoangCach(window._ddList);
}

// ============ BẢNG GIÁ LƯƠNG LÁI XE THEO TỈNH (gộp 1 dòng cấu hình, không CRUD từng dòng) ============
// Điểm đi mặc định luôn là Hải Phòng (đa số chuyến). Tỉnh đến lấy tự động (distinct) từ danh sách
// Điểm đã có ở bảng trên — không cần khai báo tỉnh riêng, không phát sinh danh mục mới.
function renderBangGiaLuong(ddList){
  const wrap=document.getElementById('bgl-wrap');
  if(!wrap)return;
  if(!canSee(['quan_ly','ceo'])){wrap.innerHTML='';return;}
  const tinhSet=[...new Set(ddList.map(d=>tinhTuDiaPhuong(d.dia_phuong)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  const gia=CH_LUONG.bang_gia_tinh||{};
  // Cảnh báo Điểm nào có "Địa phương" khả nghi (quá ngắn, không giống tên tỉnh thật) — không tự loại
  // khỏi bảng vì có thể vẫn đúng, chỉ nêu tên để bạn vào bảng Điểm phía trên kiểm tra lại tận gốc.
  const khaNghi=ddList.filter(d=>{
    const t=tinhTuDiaPhuong(d.dia_phuong);
    return t&&t.replace(/\s/g,'').length<=3;
  });
  const canhbao=khaNghi.length?`<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:var(--r);padding:8px 14px;margin-bottom:10px;font-size:12px">
    <i class="ti ti-alert-triangle" style="color:#d97706"></i>
    <strong style="color:#92400e">${khaNghi.length} Điểm có ô "Địa phương" nghi gõ sai (quá ngắn/không giống tên tỉnh)</strong> — sửa lại ở bảng Điểm phía trên:
    ${khaNghi.map(d=>`<span style="background:#fef9c3;border-radius:3px;padding:1px 5px;margin-left:3px">${d.ten_chuan} → "${d.dia_phuong}"</span>`).join('')}
  </div>`:'';
  wrap.innerHTML=canhbao+`
  <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:2px"><i class="ti ti-coin"></i> Bảng giá lương lái xe theo tỉnh</div>
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Điểm đi mặc định: Hải Phòng. Sửa số rồi bấm "Lưu bảng giá" — dùng cho trang Bảng lương.</div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Tỉnh đến</th><th>Lương thường (VNĐ)</th><th>Lương kết hợp / kẹp ghép (VNĐ)</th></tr></thead>
    <tbody>
    ${tinhSet.length?tinhSet.map(t=>{
      const g=gia[t]||{};
      return `<tr>
        <td style="font-weight:500">${t}</td>
        <td><input type="text" class="bgl-thuong" data-tinh="${t}" value="${fmtInput(g.thuong||0)}" oninput="fmtOnInput(this)" style="width:140px"></td>
        <td><input type="text" class="bgl-kethop" data-tinh="${t}" value="${fmtInput(g.ket_hop||0)}" oninput="fmtOnInput(this)" style="width:140px"></td>
      </tr>`;
    }).join(''):'<tr><td colspan="3"><div class="empty">Chưa có địa điểm nào để suy ra tỉnh</div></td></tr>'}
    </tbody>
  </table></div>
  <div style="margin-top:10px">
    <button class="btn btn-primary" onclick="saveBangGiaLuong()"><i class="ti ti-device-floppy"></i> Lưu bảng giá</button>
  </div>`;
}

async function saveBangGiaLuong(){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền thực hiện','error');return;}
  const bang={};
  document.querySelectorAll('.bgl-thuong').forEach(inp=>{
    const t=inp.dataset.tinh;
    bang[t]=bang[t]||{};
    bang[t].thuong=parseNum(inp.value);
  });
  document.querySelectorAll('.bgl-kethop').forEach(inp=>{
    const t=inp.dataset.tinh;
    bang[t]=bang[t]||{};
    bang[t].ket_hop=parseNum(inp.value);
  });
  const{error}=await db.from('cau_hinh_luong').upsert({id:1,bang_gia_tinh:bang,updated_at:new Date().toISOString()});
  if(error){toast('Lỗi: '+error.message,'error');return;}
  CH_LUONG.bang_gia_tinh=bang;
  toast('Đã lưu bảng giá lương');
}

function openAddDD(existing={}){
  const isEdit=!!existing.id;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:500px">
  <div class="modal-head"><h3>${isEdit?'Sửa':'Thêm'} địa điểm</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body"><div class="form-grid">
    <div class="form-group full"><label>Tên chuẩn *<span style="font-size:10px;color:var(--text-muted);margin-left:6px">Viết HOA, đầy đủ dấu</span></label>
      <input id="dd-ten" value="${existing.ten_chuan||''}" placeholder="VD: CẢNG HẢI PHÒNG, KCN QUẾ VÕ BẮC NINH"></div>
    <div class="form-group"><label>Loại</label>
      <select id="dd-loai">
        ${['Cảng','KCN','Kho','Depot','Cửa khẩu','Khác'].map(l=>`<option value="${l}" ${(existing.loai||'Khác')===l?'selected':''}>${l}</option>`).join('')}
      </select></div>
    <div class="form-group"><label>Địa phương<span style="font-size:10px;color:var(--text-muted);margin-left:4px">VD: Hải An, Hải Phòng</span></label>
      <input id="dd-dphuong" value="${existing.dia_phuong||''}" placeholder="Phường/xã, tỉnh/thành"></div>
    <div class="form-group full"><label>Viết tắt / từ khóa tìm kiếm<span style="font-size:10px;color:var(--text-muted);margin-left:6px">Cách nhau bằng dấu phẩy</span></label>
      <input id="dd-viettat" value="${existing.viet_tat||''}" placeholder="VD: CHP, cảng HP, hai phong">
      <span style="font-size:10px;color:var(--teal)">Điều vận gõ bất kỳ từ nào trong này sẽ ra gợi ý</span></div>
  </div></div>
  <div class="modal-foot"><button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="saveDD('${existing.id||''}')"><i class="ti ti-device-floppy"></i> Lưu</button>
  </div></div>`;
  document.body.appendChild(bg);
  setTimeout(()=>document.getElementById('dd-ten')?.focus(),50);
}

async function editDD(id){
  const{data}=await db.from('dia_diem').select('*').eq('id',id).single();
  if(data)openAddDD(data);
}

async function saveDD(id=''){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền','error');return;}
  const ten=document.getElementById('dd-ten').value.trim();
  if(!ten){toast('Nhập tên chuẩn','error');return;}
  const d={
    ten_chuan:ten,
    loai:document.getElementById('dd-loai').value,
    dia_phuong:document.getElementById('dd-dphuong').value.trim()||null,
    viet_tat:document.getElementById('dd-viettat').value.trim()||null,
  };
  let error;
  if(id){({error}=await db.from('dia_diem').update(d).eq('id',id));}
  else{({error}=await db.from('dia_diem').insert(d));}
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast(id?'Đã cập nhật địa điểm':'Đã thêm địa điểm');
  closeModal();
  await loadMaster();
  pgDiaDiem(document.getElementById('content'));
}

async function deleteDD(id,ten){
  if(!canSee(['quan_ly','ceo'])){toast('Không có quyền','error');return;}
  if(!confirm('Xóa địa điểm "'+ten+'"?\nCác vận đơn cũ không bị ảnh hưởng.'))return;
  const{error}=await db.from('dia_diem').update({active:false}).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã xóa');await loadMaster();pgDiaDiem(document.getElementById('content'));
}

// CHIPHI.JS — Module Chi phí, Kho dầu, Tài sản cố định
// Requires: config.js, orders.js, danhmuc.js (XE, TP, KH globals + closeModal())
// Quy ước: mọi khoản tiền ra đều qua tab Ghi nhận -> Duyệt (CEO + Thủ quỹ).
// Kho dầu (Nhập) và Tài sản cố định chỉ hiển thị KẾT QUẢ tự sinh sau khi đã thanh toán.

let CHIPHI_TAB='ghi_nhan';
let KHODAU_TAB='xuat';
window._cpFiles=[];

// Danh mục loại chi phí — field quy định khung động hiện trong form Ghi nhận
const LOAI_CHI_PHI=[
  {v:'Sửa chữa xe',        nhom:'kiem_soat', field:'xe',     doc:'Hóa đơn (hoặc tick không có hóa đơn)', docRequired:false},
  {v:'Đăng kiểm, đăng ký', nhom:'kiem_soat', field:'xe',     doc:'Hóa đơn/biên lai', docRequired:false},
  {v:'Mua dầu nhập kho',   nhom:'kiem_soat', field:'dau',    doc:'Hóa đơn mua dầu', docRequired:true},
  {v:'Trả nợ thầu',        nhom:'kiem_soat', field:'thau',   doc:'Bảng kê công nợ thầu', docRequired:true},
  {v:'Mua xe',             nhom:'kiem_soat', field:'taisan', doc:'Hóa đơn mua xe + giấy đăng ký', docRequired:true},
  {v:'Feedback/hoa hồng khách', nhom:'thuong', field:'khach', doc:null, docRequired:false},
  {v:'Thuê văn phòng',     nhom:'thuong', field:null},
  {v:'Bảo hiểm',           nhom:'thuong', field:null},
  {v:'Thuê vỏ mooc',       nhom:'thuong', field:null},
  {v:'Tiền ăn',            nhom:'thuong', field:null},
  {v:'Tạm ứng lương',      nhom:'thuong', field:null},
  {v:'Rút tiền cá nhân',   nhom:'thuong', field:null},
  {v:'Chi khác',           nhom:'thuong', field:null},
];

function tenThauPhu(maThau){
  const t=(TP||[]).find(x=>x.ma_thau===maThau);
  return t?`${t.ma_thau} — ${t.ten_cong_ty}`:(maThau||'—');
}
function cpTrangThaiTag(t){
  const m={cho_duyet:['Chờ duyệt','tag-cho'],da_duyet:['Đã duyệt','tag-xn'],da_thanh_toan:['Đã thanh toán','tag-dathu'],tu_choi:['Từ chối','tag-huy']};
  const[label,cls]=m[t]||['Chờ duyệt','tag-cho'];
  return`<span class="tag ${cls}">${label}</span>`;
}

// ==================== TRANG CHI PHÍ — ROUTER 4 TAB ====================
function pgChiPhi(c){
  if(!canSee(['ke_toan','ceo','thu_quy'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
  const isThuQuy=CU?.vai_tro==='thu_quy';
  if(isThuQuy&&CHIPHI_TAB==='ghi_nhan')CHIPHI_TAB='duyet';
  const tabs=[
    {k:'ghi_nhan',label:'Ghi nhận',icon:'edit',hide:isThuQuy},
    {k:'duyet',label:'Duyệt',icon:'checkbox'},
    {k:'doi_soat',label:'Cần đối soát',icon:'list-check'},
    {k:'bao_cao',label:'Báo cáo',icon:'chart-bar'},
  ];
  c.innerHTML=`<div class="tabs" style="margin-bottom:14px">
    ${tabs.filter(t=>!t.hide).map(t=>`<div class="tab ${CHIPHI_TAB===t.k?'active':''}" onclick="switchChiPhiTab('${t.k}')"><i class="ti ti-${t.icon}"></i> ${t.label}</div>`).join('')}
  </div>
  <div id="cp-body"><div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div></div>`;
  renderChiPhiTab();
}
function switchChiPhiTab(k){CHIPHI_TAB=k;pgChiPhi(document.getElementById('content'));}
function renderChiPhiTab(){
  const body=document.getElementById('cp-body');
  if(!body)return;
  if(CHIPHI_TAB==='ghi_nhan')renderGhiNhan(body);
  else if(CHIPHI_TAB==='duyet')renderDuyetChiPhi(body);
  else if(CHIPHI_TAB==='doi_soat')renderDoiSoat(body);
  else if(CHIPHI_TAB==='bao_cao')renderBaoCaoChiPhi(body);
}

// ==================== TAB GHI NHẬN ====================
async function renderGhiNhan(c){
  const{data,error}=await db.from('chi_phi').select('*').order('created_at',{ascending:false}).limit(150);
  if(error){c.innerHTML=`<div class="empty"><i class="ti ti-alert-circle"></i>Chưa có bảng chi_phi — chạy migration_chi_phi.sql trong Supabase trước.<br><span style="font-size:11px;color:var(--text-muted)">${error.message}</span></div>`;return;}
  const list=data||[];
  c.innerHTML=`
  <div class="toolbar" style="margin-bottom:12px">
    <button class="btn btn-primary" onclick="openModalChiPhi()"><i class="ti ti-plus"></i> Tạo phiếu chi phí</button>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Ngày</th><th>Loại chi phí</th><th>Diễn giải</th><th>Thụ hưởng</th><th>Số tiền</th><th>Trạng thái</th><th>Chứng từ</th></tr></thead>
    <tbody>
    ${list.length===0?`<tr><td colspan="7"><div class="empty"><i class="ti ti-inbox"></i>Chưa có phiếu nào</div></td></tr>`:''}
    ${list.map(o=>`<tr onclick="xemChiTietChiPhi('${o.id}')" style="cursor:pointer">
      <td>${fmtDate(o.ngay)}</td>
      <td>${o.loai_chi_phi}${o.can_kiem_soat?' <span class="tag" style="background:#FAECE7;color:#712B13;font-size:10px">Kiểm soát</span>':''}</td>
      <td style="font-size:12px">${o.noi_dung||'—'}${o.bien_kiem_soat?` · ${o.bien_kiem_soat}`:''}${o.ma_thau_phu?` · ${tenThauPhu(o.ma_thau_phu)}`:''}</td>
      <td style="font-size:12px">${o.ten_thu_huong||'—'}${o.so_tk_thu_huong?`<br><span style="color:var(--text-muted)">STK ${o.so_tk_thu_huong}</span>`:''}</td>
      <td class="text-orange fw6">${fmtM(o.so_tien)}</td>
      <td>${cpTrangThaiTag(o.trang_thai)}</td>
      <td><button class="btn btn-xs" onclick="event.stopPropagation();xemChiTietChiPhi('${o.id}')"><i class="ti ti-paperclip"></i></button></td>
    </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function openModalChiPhi(){
  if(!canSee(['ke_toan','ceo'])){toast('Không có quyền tạo phiếu','error');return;}
  window._cpFiles=[];
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  const loaiOpts=LOAI_CHI_PHI.map(l=>`<option value="${l.v}">${l.v}</option>`).join('');
  bg.innerHTML=`<div class="modal" style="width:540px">
  <div class="modal-head">
    <h3><i class="ti ti-receipt-2" style="color:var(--teal)"></i> Tạo phiếu chi phí</h3>
    <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
  </div>
  <div class="modal-body">
    <div class="form-grid">
      <div class="form-group full"><label>Loại chi phí *</label>
        <select id="cp-loai" onchange="onChangeLoaiChiPhi()"><option value="">-- Chọn --</option>${loaiOpts}</select>
      </div>
      <div class="form-group"><label>Ngày *</label><input type="date" id="cp-ngay" value="${today()}"></div>
      <div class="form-group"><label>Số tiền *</label><input id="cp-tien" data-money="1" oninput="fmtOnInput(this)" placeholder="0"></div>
      <div id="cp-dynamic" class="form-group full"></div>
      <div class="form-group full"><label>Diễn giải</label><input id="cp-noidung" placeholder="Mô tả ngắn"></div>
      <div class="form-group full" style="background:var(--bg-soft,#f3f4f6);border-radius:var(--r);padding:10px 12px">
        <label style="display:block;margin-bottom:6px"><i class="ti ti-building-bank"></i> Tài khoản thụ hưởng</label>
        <div class="form-grid" style="gap:8px">
          <div class="form-group"><label style="font-size:11px">Tên người/đơn vị *</label><input id="cp-thu-ten" placeholder="VD: Cây xăng Hoà Phát / Để tiền mặt nếu không chuyển khoản"></div>
          <div class="form-group"><label style="font-size:11px">Số tài khoản</label><input id="cp-thu-stk" placeholder="VD: 0123456789"></div>
          <div class="form-group full"><label style="font-size:11px">Ngân hàng</label><input id="cp-thu-nh" placeholder="VD: Vietcombank"></div>
        </div>
      </div>
      <div class="form-group full">
        <label>Chứng từ đính kèm <span id="cp-doc-hint" style="font-weight:400;color:var(--text-muted)"></span></label>
        <div id="cp-files-list" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px"></div>
        <input type="file" id="cp-file-input" multiple style="display:none" onchange="onAddChiPhiFiles(this)">
        <div id="cp-dropzone"
          ondragover="event.preventDefault();this.style.borderColor='var(--teal)';this.style.background='#f0fdfa'"
          ondragleave="this.style.borderColor='#d1d5db';this.style.background='transparent'"
          ondrop="onDropChiPhiFiles(event,this)"
          onclick="document.getElementById('cp-file-input').click()"
          style="border:1.5px dashed #d1d5db;border-radius:var(--r);padding:16px;text-align:center;cursor:pointer;transition:.15s">
          <i class="ti ti-cloud-upload" style="font-size:22px;color:var(--text-muted)"></i>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Kéo thả file vào đây, hoặc bấm để chọn</div>
        </div>
        <label id="cp-khonghd-wrap" style="display:none;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);margin-top:8px;cursor:pointer">
          <input type="checkbox" id="cp-khong-hd" style="width:auto"> Không có hóa đơn — đính kèm ảnh/biên nhận thay thế
        </label>
      </div>
    </div>
  </div>
  <div class="modal-foot">
    <button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="saveChiPhi()"><i class="ti ti-send"></i> Gửi duyệt</button>
  </div>
  </div>`;
  document.body.appendChild(bg);
}

function onChangeLoaiChiPhi(){
  const v=document.getElementById('cp-loai').value;
  const meta=LOAI_CHI_PHI.find(l=>l.v===v);
  const box=document.getElementById('cp-dynamic');
  const tienInput=document.getElementById('cp-tien');
  const docHint=document.getElementById('cp-doc-hint');
  const khongHdWrap=document.getElementById('cp-khonghd-wrap');
  if(!meta){box.innerHTML='';if(docHint)docHint.textContent='';return;}
  tienInput.removeAttribute('disabled');
  khongHdWrap.style.display=v==='Sửa chữa xe'?'flex':'none';
  docHint.textContent=meta.doc?`(${meta.doc}${meta.docRequired?' — bắt buộc':''})`:'';
  if(meta.field==='xe'){
    const xeOpts=(XE||[]).map(x=>`<option value="${x.bien_so}">${x.bien_so}</option>`).join('');
    box.innerHTML=`<div class="form-grid">
      <div class="form-group"><label>Biển số xe *</label><select id="cp-xe" onchange="onChangeXeChiPhi()"><option value="">-- Chọn --</option>${xeOpts}</select></div>
      <div class="form-group"><label>Thầu phụ (tự động)</label><input id="cp-thau-auto" disabled placeholder="—"></div>
    </div>`;
  }else if(meta.field==='dau'){
    box.innerHTML=`<div class="form-grid">
      <div class="form-group full"><label>Nhà cung cấp</label><input id="cp-dau-ncc" placeholder="VD: Cây xăng Hoà Phát"></div>
      <div class="form-group"><label>Số lít mua</label><input id="cp-dau-lit" data-money="1" oninput="fmtOnInput(this);tinhTienDau()" placeholder="0"></div>
      <div class="form-group"><label>Đơn giá nhập</label><input id="cp-dau-gia" data-money="1" oninput="fmtOnInput(this);tinhTienDau()" placeholder="0"></div>
      <div class="form-group full"><label>Số phiếu / hóa đơn</label><input id="cp-dau-phieu" placeholder="HD..."></div>
    </div>`;
    tienInput.setAttribute('disabled','');tienInput.value='0';
  }else if(meta.field==='thau'){
    const tpOpts=(TP||[]).map(t=>`<option value="${t.ma_thau}">${t.ma_thau} — ${t.ten_cong_ty}</option>`).join('');
    box.innerHTML=`<div class="form-group"><label>Thầu phụ *</label><select id="cp-thau-sel"><option value="">-- Chọn --</option>${tpOpts}</select></div>`;
  }else if(meta.field==='taisan'){
    box.innerHTML=`<div class="form-grid">
      <div class="form-group"><label>Loại tài sản</label><input id="cp-taisan-loai" placeholder="VD: Xe tải, Đầu kéo"></div>
      <div class="form-group"><label>Biển số (nếu có)</label><input id="cp-taisan-bien" placeholder="VD: 99H-12345"></div>
      <div class="form-group full"><label>Thời gian khấu hao (tháng)</label><input id="cp-taisan-khauhao" value="60"></div>
    </div>`;
  }else if(meta.field==='khach'){
    const khOpts=(KH||[]).map(k=>`<option value="${k.ten_cong_ty}">${k.ten_cong_ty}</option>`).join('');
    box.innerHTML=`<div class="form-group"><label>Khách hàng (tùy chọn)</label><select id="cp-khach-sel"><option value="">-- Không chọn --</option>${khOpts}</select></div>`;
  }else{
    box.innerHTML='';
  }
}
function onChangeXeChiPhi(){
  const bien=document.getElementById('cp-xe').value;
  const xe=(XE||[]).find(x=>x.bien_so===bien);
  const inp=document.getElementById('cp-thau-auto');
  if(!xe){inp.value='';return;}
  inp.value=xe.loai_phan_loai==='noi_bo'?'Xe nội bộ — không thu hồi':tenThauPhu(xe.ma_thau_phu);
}
function tinhTienDau(){
  const lit=parseNum(document.getElementById('cp-dau-lit')?.value||0);
  const gia=parseNum(document.getElementById('cp-dau-gia')?.value||0);
  const el=document.getElementById('cp-tien');
  if(el)el.value=fmtInput(String(lit*gia));
}
function onAddChiPhiFiles(input){
  window._cpFiles=window._cpFiles||[];
  Array.from(input.files||[]).forEach(f=>window._cpFiles.push(f));
  input.value='';
  renderCpFilesChips();
}
function onDropChiPhiFiles(e,zone){
  e.preventDefault();
  zone.style.borderColor='#d1d5db';zone.style.background='transparent';
  window._cpFiles=window._cpFiles||[];
  Array.from(e.dataTransfer?.files||[]).forEach(f=>window._cpFiles.push(f));
  renderCpFilesChips();
}
function removeCpFile(idx){window._cpFiles.splice(idx,1);renderCpFilesChips();}
function renderCpFilesChips(){
  const box=document.getElementById('cp-files-list');
  if(!box)return;
  box.innerHTML=(window._cpFiles||[]).map((f,i)=>`<div style="display:flex;align-items:center;gap:6px;background:var(--bg-soft,#f3f4f6);border-radius:6px;padding:4px 8px;font-size:12px">
    <i class="ti ti-file"></i><span>${f.name}</span><i class="ti ti-x" style="cursor:pointer;color:var(--text-muted)" onclick="removeCpFile(${i})"></i>
  </div>`).join('');
}

async function saveChiPhi(){
  const loai=document.getElementById('cp-loai').value;
  if(!loai){toast('Chọn loại chi phí','error');return;}
  const meta=LOAI_CHI_PHI.find(l=>l.v===loai);
  const ngay=document.getElementById('cp-ngay').value;
  let soTien=parseNum(document.getElementById('cp-tien').value);
  const noiDung=document.getElementById('cp-noidung').value.trim();
  const tenThuHuong=document.getElementById('cp-thu-ten').value.trim();
  if(!tenThuHuong){toast('Nhập tên người/đơn vị thụ hưởng (ghi "Tiền mặt" nếu không chuyển khoản)','error');return;}
  const data={
    ma_de_nghi:'CP'+Date.now().toString(36).toUpperCase(),
    ngay,loai_chi_phi:loai,noi_dung:noiDung,
    ten_thu_huong:tenThuHuong,
    so_tk_thu_huong:document.getElementById('cp-thu-stk').value.trim()||null,
    ngan_hang_thu_huong:document.getElementById('cp-thu-nh').value.trim()||null,
    can_kiem_soat:meta?.nhom==='kiem_soat',
    created_by:CU?.id,trang_thai:'cho_duyet',
  };
  if(meta?.field==='xe'){
    const bien=document.getElementById('cp-xe')?.value;
    if(!bien){toast('Chọn biển số xe','error');return;}
    const xe=(XE||[]).find(x=>x.bien_so===bien);
    data.bien_kiem_soat=bien;
    if(xe?.loai_phan_loai==='noi_bo'){data.ma_thau_phu=null;data.can_kiem_soat=false;}
    else data.ma_thau_phu=xe?.ma_thau_phu||null;
  }
  if(meta?.field==='dau'){
    const lit=parseNum(document.getElementById('cp-dau-lit').value);
    const gia=parseNum(document.getElementById('cp-dau-gia').value);
    if(!lit||!gia){toast('Nhập đủ số lít và đơn giá','error');return;}
    soTien=lit*gia;
    data.so_lit=lit;data.don_gia=gia;
    const ncc=document.getElementById('cp-dau-ncc').value||'';
    const phieu=document.getElementById('cp-dau-phieu').value||'';
    data.noi_dung=`${noiDung} | NCC:${ncc} | Phiếu:${phieu}`.trim();
  }
  if(meta?.field==='thau'){
    const ma=document.getElementById('cp-thau-sel')?.value;
    if(!ma){toast('Chọn thầu phụ','error');return;}
    data.ma_thau_phu=ma;
    if(loai==='Trả nợ thầu')data.lien_ket_cong_no=false; // giai đoạn 1 — độc lập, chưa tự trừ Công nợ
  }
  if(meta?.field==='taisan'){
    data.loai_tai_san=document.getElementById('cp-taisan-loai')?.value||null;
    data.bien_kiem_soat=document.getElementById('cp-taisan-bien')?.value||null;
    data.thoi_gian_khau_hao_thang=parseInt(document.getElementById('cp-taisan-khauhao')?.value)||60;
  }
  if(meta?.field==='khach'){
    data.ma_khach_hang=document.getElementById('cp-khach-sel')?.value||null;
  }
  if(!soTien){toast('Nhập số tiền','error');return;}
  data.so_tien=soTien;
  if(meta?.docRequired&&(!window._cpFiles||!window._cpFiles.length)){
    toast(`Loại "${loai}" yêu cầu đính kèm chứng từ`,'error');return;
  }
  try{
    const{data:saved,error}=await db.from('chi_phi').insert(data).select().single();
    if(error){toast('Lỗi: '+error.message,'error');return;}
    if(window._cpFiles&&window._cpFiles.length){
      for(const f of window._cpFiles){
        const path=await uploadChiPhiFile(f,loai,saved.ma_de_nghi);
        if(path)await db.from('chi_phi_files').insert({chi_phi_id:saved.id,ten_file:f.name,duong_dan:path,uploaded_by:CU?.id});
      }
    }
    toast('Đã gửi duyệt');closeModal();window._cpFiles=[];
    pgChiPhi(document.getElementById('content'));
  }catch(err){toast('Lỗi: '+err.message,'error');}
}

async function uploadChiPhiFile(file,loai,maDeNghi){
  try{
    const d=new Date();const yyyy=d.getFullYear();const mm=String(d.getMonth()+1).padStart(2,'0');
    const safeLoai=(loai||'khac').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'_').toUpperCase();
    const path=`chi-phi/${yyyy}/${mm}/${safeLoai}/${maDeNghi}/${Date.now()}_${file.name}`;
    const{error}=await db.storage.from('hoa-don').upload(path,file,{contentType:file.type,upsert:false});
    if(error){console.warn('Upload chứng từ lỗi (non-fatal):',error.message);return null;}
    return path;
  }catch(e){console.warn(e);return null;}
}

function kvRow(label,value,opts={}){
  if(value===undefined||value===null||value==='')return'';
  return`<div style="display:flex;justify-content:space-between;margin-bottom:4px;gap:10px">
    <span style="color:var(--text-muted);white-space:nowrap">${opts.icon?`<i class="ti ti-${opts.icon}"></i> `:''}${label}</span>
    <span style="text-align:right;${opts.strong?'font-weight:600':''}${opts.color?`;color:${opts.color}`:''}">${value}</span>
  </div>`;
}
// Tách "ghi chú | NCC:... | Phiếu:..." được gộp khi lưu phiếu Mua dầu nhập kho
function parseDauNoiDung(noiDung){
  const s=noiDung||'';
  const ncc=(s.match(/NCC:([^|]*)/)||[])[1]?.trim()||'';
  const phieu=(s.match(/Phiếu:([^|]*)/)||[])[1]?.trim()||'';
  const ghiChu=s.split('|')[0]?.trim()||'';
  return{ghiChu,ncc,phieu};
}

// Sinh các dòng thông tin riêng theo từng loại chi phí (xe/dầu/thầu/tài sản/khách)
function renderChiTietRieng(o){
  const meta=LOAI_CHI_PHI.find(l=>l.v===o.loai_chi_phi);
  if(meta?.field==='dau'){
    const{ghiChu,ncc,phieu}=parseDauNoiDung(o.noi_dung);
    return{
      rows:kvRow('Số lít mua',o.so_lit?fmt(o.so_lit)+' lít':'—')
         +kvRow('Đơn giá nhập',o.don_gia?fmtM(o.don_gia):'—')
         +kvRow('Nhà cung cấp',ncc||'—')
         +kvRow('Số phiếu/hóa đơn',phieu||'—'),
      ghiChu,
    };
  }
  if(meta?.field==='xe'){
    return{rows:kvRow('Biển số xe',o.bien_kiem_soat||'—',{strong:true})+kvRow('Thầu phụ',o.ma_thau_phu?tenThauPhu(o.ma_thau_phu):'Xe nội bộ — không thu hồi'),ghiChu:o.noi_dung};
  }
  if(meta?.field==='thau'){
    return{rows:kvRow('Thầu phụ',o.ma_thau_phu?tenThauPhu(o.ma_thau_phu):'—',{strong:true})+kvRow('Liên kết Công nợ',o.lien_ket_cong_no?'Đã liên kết':'Chưa liên kết (giai đoạn 1)'),ghiChu:o.noi_dung};
  }
  if(meta?.field==='taisan'){
    return{rows:kvRow('Loại tài sản',o.loai_tai_san||'—')+kvRow('Biển số (nếu có)',o.bien_kiem_soat||'—')+kvRow('Thời gian khấu hao',(o.thoi_gian_khau_hao_thang||60)+' tháng'),ghiChu:o.noi_dung};
  }
  if(meta?.field==='khach'){
    return{rows:kvRow('Khách hàng',o.ma_khach_hang||'(không chọn)'),ghiChu:o.noi_dung};
  }
  return{rows:'',ghiChu:o.noi_dung};
}

async function xemChiTietChiPhi(id){
  // Mở modal ngay với khung rỗng để phản hồi tức thì, không chờ DB mới hiện gì — tránh cảm giác lag
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:560px">
  <div class="modal-head"><h3><i class="ti ti-receipt-2" style="color:var(--teal)"></i> Chi tiết phiếu chi phí</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body" style="display:block" id="cct-body"><div class="loading"><i class="ti ti-loader-2"></i> Đang tải...</div></div>
  <div class="modal-foot" id="cct-foot"><button class="btn" onclick="closeModal()">Đóng</button></div>
  </div>`;
  document.body.appendChild(bg);

  const[{data:o},{data:files}]=await Promise.all([
    db.from('chi_phi').select('*').eq('id',id).single(),
    db.from('chi_phi_files').select('*').eq('chi_phi_id',id),
  ]);
  const body=document.getElementById('cct-body');
  if(!body)return; // người dùng đã đóng modal trước khi tải xong
  if(!o){body.innerHTML='<div class="empty"><i class="ti ti-alert-circle"></i>Không tìm thấy phiếu</div>';return;}
  const fileList=files||[];
  const{rows:riengRows,ghiChu}=renderChiTietRieng(o);
  document.querySelector('#modal-bg .modal-head h3').innerHTML=`<i class="ti ti-receipt-2" style="color:var(--teal)"></i> ${o.loai_chi_phi}${o.ma_de_nghi?` — ${o.ma_de_nghi}`:''}`;
  body.innerHTML=`
    <div style="background:var(--bg-soft,#f3f4f6);border-radius:var(--r);padding:10px 14px;font-size:12px;margin-bottom:12px">
      ${kvRow('Ngày',fmtDate(o.ngay))}
      ${kvRow('Số tiền',fmtM(o.so_tien),{strong:true,color:'var(--orange,#d97706)'})}
      ${riengRows}
      ${kvRow('Diễn giải',ghiChu||'—')}
      <div style="border-top:1px dashed #d1d5db;margin:6px 0"></div>
      ${kvRow('Thụ hưởng',o.ten_thu_huong||'—',{icon:'building-bank',strong:true})}
      ${kvRow('Số TK',o.so_tk_thu_huong)}
      ${kvRow('Ngân hàng',o.ngan_hang_thu_huong)}
      <div style="border-top:1px dashed #d1d5db;margin:6px 0"></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Trạng thái</span>${cpTrangThaiTag(o.trang_thai)}</div>
    </div>
    <div>
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Chứng từ đính kèm (${fileList.length})</div>
      ${fileList.length===0
        ?`<div style="font-size:12px;color:var(--text-muted)"><i class="ti ti-file-off"></i> Chưa có chứng từ đính kèm</div>`
        :`<div style="display:flex;gap:6px;flex-wrap:wrap">${fileList.map((f,i)=>`<button class="btn btn-xs" onclick="xemMotChungTu('${f.duong_dan}')"><i class="ti ti-file"></i> ${f.ten_file||('File '+(i+1))}</button>`).join('')}</div>`}
    </div>`;
  const foot=document.getElementById('cct-foot');
  if(foot&&canSee(['ceo'])){
    foot.innerHTML=`<button class="btn btn-danger" onclick="xoaChiPhi('${o.id}')"><i class="ti ti-trash"></i> Xóa phiếu</button><button class="btn" onclick="closeModal()">Đóng</button>`;
  }
}

// Xóa phiếu chi phí — chỉ CEO (admin). Dọn dẹp toàn bộ dữ liệu tự sinh liên quan:
// file chứng từ trong Storage, bản ghi Kho dầu (dau_nhap) hoặc Tài sản cố định (tai_san) nếu phiếu đã tạo ra chúng.
async function xoaChiPhi(id){
  if(!canSee(['ceo'])){toast('Chỉ CEO có quyền xóa','error');return;}
  const{data:o}=await db.from('chi_phi').select('*').eq('id',id).single();
  if(!o){toast('Không tìm thấy phiếu','error');return;}
  let warn=`Xóa phiếu "${o.loai_chi_phi}" — ${fmtM(o.so_tien)}?`;
  if(o.trang_thai_thu_hoi==='da_thu_hoi')warn+='\n⚠️ Khoản này ĐÃ được trừ vào 1 kỳ trả thầu trước — xóa sẽ mất lịch sử trừ đó, báo cáo kỳ cũ có thể lệch nếu xem lại.';
  if(o.loai_chi_phi==='Mua dầu nhập kho'&&o.trang_thai==='da_thanh_toan')warn+='\n⚠️ Sẽ xóa luôn lần nhập kho dầu tương ứng (trừ lại số lít đã cộng vào tồn kho).';
  if(o.loai_chi_phi==='Mua xe'&&o.trang_thai==='da_thanh_toan')warn+='\n⚠️ Sẽ xóa luôn Tài sản cố định đã tạo từ phiếu này.';
  if(!confirm(warn))return;
  try{
    const{data:files}=await db.from('chi_phi_files').select('duong_dan').eq('chi_phi_id',id);
    if(files?.length)await db.storage.from('hoa-don').remove(files.map(f=>f.duong_dan));
    await db.from('dau_nhap').delete().eq('chi_phi_id',id);
    await db.from('tai_san').delete().eq('chi_phi_id',id);
    const{error}=await db.from('chi_phi').delete().eq('id',id); // chi_phi_files tự xóa theo (ON DELETE CASCADE)
    if(error){toast('Lỗi: '+error.message,'error');return;}
    toast('Đã xóa phiếu chi phí');closeModal();
    pgChiPhi(document.getElementById('content'));
  }catch(err){toast('Lỗi: '+err.message,'error');}
}
async function xemMotChungTu(path){
  const{data:su}=await db.storage.from('hoa-don').createSignedUrl(path,3600);
  if(su?.signedUrl)window.open(su.signedUrl,'_blank');
}

// ==================== TAB DUYỆT ====================
async function renderDuyetChiPhi(c){
  const{data,error}=await db.from('chi_phi').select('*').in('trang_thai',['cho_duyet','da_duyet']).order('created_at',{ascending:false});
  if(error){c.innerHTML=`<div class="empty"><i class="ti ti-alert-circle"></i>Chưa có bảng chi_phi — chạy migration trước.</div>`;return;}
  const list=data||[];
  const canDuyetCeo=CU?.vai_tro==='ceo';
  const canDuyetTQ=CU?.vai_tro==='thu_quy';
  const canMarkPaid=canSee(['ke_toan','ceo','thu_quy']);
  c.innerHTML=list.length===0?'<div class="empty"><i class="ti ti-checks"></i>Không có phiếu chờ duyệt</div>':
  list.map(o=>`<div class="bk-group" style="padding:12px 14px;margin-bottom:10px;cursor:pointer" onclick="xemChiTietChiPhi('${o.id}')">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:180px">
        <div style="font-weight:600">${o.loai_chi_phi}${o.bien_kiem_soat?` · ${o.bien_kiem_soat}`:''}</div>
        <div style="font-size:12px;color:var(--text-muted)">${o.ma_thau_phu?tenThauPhu(o.ma_thau_phu):(o.ma_khach_hang||'')} · ${fmtM(o.so_tien)} · ${fmtDate(o.ngay)} · ${o.noi_dung||''}</div>
        <div style="font-size:12px;color:var(--teal);margin-top:2px"><i class="ti ti-building-bank"></i> Thụ hưởng: <strong>${o.ten_thu_huong||'—'}</strong>${o.so_tk_thu_huong?` · STK ${o.so_tk_thu_huong}`:''}${o.ngan_hang_thu_huong?` · ${o.ngan_hang_thu_huong}`:''}</div>
      </div>
      <span class="tag ${o.duyet_ceo_at?'tag-dathu':'tag-cho'}">${o.duyet_ceo_at?'CEO đã duyệt':'Chờ CEO'}</span>
      <span class="tag ${o.duyet_thu_quy_at?'tag-dathu':'tag-cho'}">${o.duyet_thu_quy_at?'Thủ quỹ đã duyệt':'Chờ thủ quỹ'}</span>
      <button class="btn btn-xs" onclick="event.stopPropagation();xemChiTietChiPhi('${o.id}')"><i class="ti ti-paperclip"></i> Chi tiết</button>
      ${canDuyetCeo&&!o.duyet_ceo_at?`<button class="btn btn-xs btn-teal" onclick="event.stopPropagation();duyetChiPhi('${o.id}','ceo')">Duyệt (CEO)</button>`:''}
      ${canDuyetTQ&&!o.duyet_thu_quy_at?`<button class="btn btn-xs btn-teal" onclick="event.stopPropagation();duyetChiPhi('${o.id}','thu_quy')">Duyệt (Thủ quỹ)</button>`:''}
      ${o.trang_thai==='da_duyet'&&canMarkPaid?`<button class="btn btn-xs btn-primary" onclick="event.stopPropagation();markChiPhiPaid('${o.id}')"><i class="ti ti-cash"></i> Đã thanh toán</button>`:''}
    </div>
  </div>`).join('');
}

async function duyetChiPhi(id,role){
  if(role==='ceo'&&CU?.vai_tro!=='ceo'){toast('Chỉ CEO duyệt được mục này','error');return;}
  if(role==='thu_quy'&&CU?.vai_tro!=='thu_quy'){toast('Chỉ Thủ quỹ duyệt được mục này','error');return;}
  const field=role==='ceo'?{duyet_ceo_at:new Date().toISOString(),duyet_ceo_by:CU?.id}:{duyet_thu_quy_at:new Date().toISOString(),duyet_thu_quy_by:CU?.id};
  // Ghi nhận duyệt của vai trò này TRƯỚC (không phụ thuộc trạng thái đọc trước đó — tránh lệch nếu 2 người bấm gần cùng lúc)
  const{error}=await db.from('chi_phi').update(field).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  // Đọc lại trạng thái mới nhất — chỉ chuyển "đã duyệt" khi CẢ HAI đã có, bất kể ai duyệt trước
  const{data:fresh}=await db.from('chi_phi').select('duyet_ceo_at,duyet_thu_quy_at,trang_thai').eq('id',id).single();
  if(fresh?.duyet_ceo_at&&fresh?.duyet_thu_quy_at&&fresh.trang_thai==='cho_duyet'){
    await db.from('chi_phi').update({trang_thai:'da_duyet'}).eq('id',id);
  }
  toast('Đã duyệt');renderChiPhiTab();
}

async function markChiPhiPaid(id){
  if(!canSee(['ke_toan','ceo','thu_quy'])){toast('Không có quyền','error');return;}
  const{data:o}=await db.from('chi_phi').select('*').eq('id',id).single();
  if(!o)return;
  const{error}=await db.from('chi_phi').update({trang_thai:'da_thanh_toan',thanh_toan_at:new Date().toISOString()}).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  // Side effect đúng nguyên tắc "1 cửa duy nhất": tự sinh kết quả ở module phụ trợ
  if(o.loai_chi_phi==='Mua dầu nhập kho'){
    const noi=(o.noi_dung||'');
    const ncc=(noi.match(/NCC:([^|]*)/)||[])[1]?.trim()||null;
    const phieu=(noi.match(/Phiếu:([^|]*)/)||[])[1]?.trim()||null;
    await db.from('dau_nhap').insert({chi_phi_id:o.id,ngay_nhap:o.ngay,nha_cung_cap:ncc,so_lit:o.so_lit,don_gia_nhap:o.don_gia,thanh_tien:o.so_tien,so_phieu_hoa_don:phieu});
    toast('Đã thanh toán — đã cộng vào tồn kho dầu');
  }else if(o.loai_chi_phi==='Mua xe'){
    await db.from('tai_san').insert({chi_phi_id:o.id,ten_tai_san:o.loai_tai_san||'Tài sản mua mới',loai_tai_san:o.loai_tai_san,bien_kiem_soat:o.bien_kiem_soat,ngay_mua:o.ngay,nguyen_gia:o.so_tien,thoi_gian_khau_hao_thang:o.thoi_gian_khau_hao_thang||60});
    toast('Đã thanh toán — đã tạo tài sản cố định');
  }else{
    toast('Đã đánh dấu thanh toán');
  }
  renderChiPhiTab();
}

// ==================== TAB CẦN ĐỐI SOÁT ====================
async function renderDoiSoat(c){
  const[r1,r2]=await Promise.all([
    db.from('chi_phi').select('*').eq('can_kiem_soat',true).eq('da_doi_soat',false).eq('trang_thai','da_thanh_toan').order('ngay',{ascending:false}),
    db.from('dau_xuat').select('*').eq('da_doi_soat',false).neq('trang_thai_thu_hoi','khong_thu_hoi').order('ngay_do',{ascending:false}),
  ]);
  const items=[
    ...(r1.data||[]).map(o=>({id:o.id,nguon:'chi_phi',label:o.loai_chi_phi,bien:o.bien_kiem_soat,thau:o.ma_thau_phu,tien:o.so_tien,ngay:o.ngay})),
    ...(r2.data||[]).map(o=>({id:o.id,nguon:'dau_xuat',label:`Đổ dầu ${fmt(o.so_lit)} lít`,bien:o.bien_kiem_soat,thau:o.ma_thau_phu,tien:o.thanh_tien,ngay:o.ngay_do})),
  ].sort((a,b)=>(b.ngay||'').localeCompare(a.ngay||''));
  c.innerHTML=items.length===0?'<div class="empty"><i class="ti ti-checks"></i>Không có khoản cần đối soát</div>':
  items.map(o=>`<div class="bk-group" style="padding:12px 14px;margin-bottom:10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
    <div style="flex:1;min-width:180px">
      <div style="font-weight:600">${o.label}${o.bien?` · ${o.bien}`:''}</div>
      <div style="font-size:12px;color:var(--text-muted)">${o.thau?tenThauPhu(o.thau):'—'} · Đề nghị ${fmtM(o.tien)} · ${fmtDate(o.ngay)}</div>
    </div>
    <span class="tag" style="background:#FAECE7;color:#712B13">Chưa đối soát</span>
    <button class="btn btn-xs btn-teal" onclick="xacNhanDoiSoat('${o.nguon}','${o.id}')"><i class="ti ti-check"></i> Xác nhận khớp</button>
  </div>`).join('');
}

async function xacNhanDoiSoat(nguon,id){
  if(!canSee(['ke_toan','ceo','thu_quy'])){toast('Không có quyền','error');return;}
  const{error}=await db.from(nguon).update({da_doi_soat:true,nguoi_doi_soat:CU?.id,ngay_doi_soat:new Date().toISOString()}).eq('id',id);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã xác nhận đối soát');renderChiPhiTab();
}

// ==================== TAB BÁO CÁO ====================
function renderBaoCaoChiPhi(c){
  const now=new Date();
  const curVal=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  c.innerHTML=`<div class="toolbar" style="margin-bottom:14px">
    <input type="month" id="cpbc-thang" value="${curVal}" onchange="loadBaoCaoChiPhi()">
  </div>
  <div id="cpbc-content"><div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div></div>`;
  loadBaoCaoChiPhi();
}

async function loadBaoCaoChiPhi(){
  const thang=document.getElementById('cpbc-thang')?.value;
  if(!thang)return;
  const[y,m]=thang.split('-');
  const from=`${y}-${m}-01`;
  const to=`${y}-${m}-${String(new Date(+y,+m,0).getDate()).padStart(2,'0')}`;
  const box=document.getElementById('cpbc-content');
  if(!box)return;
  const{data,error}=await db.from('chi_phi').select('*').gte('ngay',from).lte('ngay',to).eq('trang_thai','da_thanh_toan');
  if(error){box.innerHTML=`<div class="empty"><i class="ti ti-alert-circle"></i>Chưa có bảng chi_phi — chạy migration trước.</div>`;return;}
  const list=data||[];
  const tong=list.reduce((s,o)=>s+(+o.so_tien||0),0);
  const ks=list.filter(o=>o.can_kiem_soat);
  const ksChuaThuHoi=ks.filter(o=>o.trang_thai_thu_hoi==='chua_thu_hoi').reduce((s,o)=>s+(+o.so_tien||0),0);
  const ksDaThuHoi=ks.filter(o=>o.trang_thai_thu_hoi==='da_thu_hoi').reduce((s,o)=>s+(+o.so_tien||0),0);
  const canDoiSoat=ks.filter(o=>!o.da_doi_soat).length;
  const byLoai={};
  list.forEach(o=>{if(!byLoai[o.loai_chi_phi])byLoai[o.loai_chi_phi]={tien:0,ks:o.can_kiem_soat};byLoai[o.loai_chi_phi].tien+=(+o.so_tien||0);});
  const maxTien=Math.max(1,...Object.values(byLoai).map(x=>x.tien));
  box.innerHTML=`
  <div class="stats-row stats-4" style="margin-bottom:16px">
    <div class="stat-card"><div class="stat-lbl">Tổng chi tháng này</div><div class="stat-val">${fmt(Math.round(tong/1e6))}tr</div></div>
    <div class="stat-card"><div class="stat-lbl">Cần kiểm soát · chưa thu hồi</div><div class="stat-val text-red">${fmt(Math.round(ksChuaThuHoi/1e6))}tr</div></div>
    <div class="stat-card"><div class="stat-lbl">Cần kiểm soát · đã thu hồi</div><div class="stat-val text-green">${fmt(Math.round(ksDaThuHoi/1e6))}tr</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="switchChiPhiTab('doi_soat')"><div class="stat-lbl">Phiếu cần đối soát</div><div class="stat-val">${canDoiSoat}</div></div>
  </div>
  ${Object.keys(byLoai).length===0?'<div class="empty"><i class="ti ti-inbox"></i>Không có chi phí đã thanh toán trong tháng này</div>':
  Object.entries(byLoai).sort((a,b)=>b[1].tien-a[1].tien).map(([loai,o])=>`
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
    <span class="tag" style="min-width:90px;text-align:center;background:${o.ks?'#FAECE7':'var(--bg-soft,#f3f4f6)'};color:${o.ks?'#712B13':'var(--text-muted)'}">${o.ks?'Kiểm soát':'Thông thường'}</span>
    <span style="flex:1;font-size:13px">${loai}</span>
    <div style="flex:2;height:8px;background:var(--bg-soft,#f3f4f6);border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.round(o.tien/maxTien*100)}%;background:${o.ks?'#D85A30':'#888780'}"></div></div>
    <span style="font-size:13px;color:var(--text-muted);min-width:90px;text-align:right">${fmtM(o.tien)}</span>
  </div>`).join('')}`;
}

// ==================== TRANG KHO DẦU ====================
async function pgKhoDau(c){
  if(!canSee(['ke_toan','ceo','thu_quy'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const[r1,r2]=await Promise.all([
    db.from('dau_nhap').select('so_lit,ngay_nhap'),
    db.from('dau_xuat').select('so_lit,ngay_do'),
  ]);
  if(r1.error||r2.error){c.innerHTML=`<div class="empty"><i class="ti ti-alert-circle"></i>Chưa có bảng dau_nhap/dau_xuat — chạy migration_chi_phi.sql trước.</div>`;return;}
  const nhap=r1.data||[],xuat=r2.data||[];
  const tongNhap=nhap.reduce((s,o)=>s+(+o.so_lit||0),0);
  const tongXuat=xuat.reduce((s,o)=>s+(+o.so_lit||0),0);
  const tonKho=tongNhap-tongXuat;
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
  const cutoffStr=cutoff.toISOString().split('T')[0];
  const xuat30=xuat.filter(o=>(o.ngay_do||'')>=cutoffStr).reduce((s,o)=>s+(+o.so_lit||0),0);
  const tbNgay=xuat30/30;
  const soNgayDuPhong=tbNgay>0?Math.round(tonKho/tbNgay):null;
  const thangNay=today().slice(0,7);
  const nhapThangNay=nhap.filter(o=>(o.ngay_nhap||'').slice(0,7)===thangNay).reduce((s,o)=>s+(+o.so_lit||0),0);
  const xuatThangNay=xuat.filter(o=>(o.ngay_do||'').slice(0,7)===thangNay).reduce((s,o)=>s+(+o.so_lit||0),0);
  c.innerHTML=`
  <div class="stats-row stats-4" style="margin-bottom:16px">
    <div class="stat-card"><div class="stat-lbl">Tồn kho hiện tại</div><div class="stat-val">${fmt(Math.round(tonKho))} lít</div></div>
    <div class="stat-card"><div class="stat-lbl">Dự kiến đủ dùng</div><div class="stat-val ${soNgayDuPhong!==null&&soNgayDuPhong<7?'text-red':''}">${soNgayDuPhong===null?'—':soNgayDuPhong+' ngày'}</div></div>
    <div class="stat-card"><div class="stat-lbl">Nhập tháng này</div><div class="stat-val">${fmt(Math.round(nhapThangNay))} lít</div></div>
    <div class="stat-card"><div class="stat-lbl">Xuất tháng này</div><div class="stat-val">${fmt(Math.round(xuatThangNay))} lít</div></div>
  </div>
  ${soNgayDuPhong!==null&&soNgayDuPhong<7?`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:var(--r);padding:8px 12px;margin-bottom:12px;font-size:12px;color:#b91c1c"><i class="ti ti-alert-triangle"></i> Tồn kho dầu chỉ còn đủ dùng ~${soNgayDuPhong} ngày — cần nạp thêm (qua tab Ghi nhận ở trang Chi phí)</div>`:''}
  <div class="tabs" style="margin-bottom:14px">
    <div class="tab ${KHODAU_TAB==='xuat'?'active':''}" onclick="switchKhoDauTab('xuat')"><i class="ti ti-gas-station"></i> Xuất dầu</div>
    <div class="tab ${KHODAU_TAB==='nhap'?'active':''}" onclick="switchKhoDauTab('nhap')"><i class="ti ti-truck-loading"></i> Nhập dầu</div>
  </div>
  <div id="kd-body"></div>`;
  renderKhoDauTab();
}
function switchKhoDauTab(k){KHODAU_TAB=k;pgKhoDau(document.getElementById('content'));}
function renderKhoDauTab(){
  const body=document.getElementById('kd-body');if(!body)return;
  if(KHODAU_TAB==='xuat')renderXuatDau(body);else renderNhapDauList(body);
}

async function renderXuatDau(c){
  const{data}=await db.from('dau_xuat').select('*').order('ngay_do',{ascending:false}).limit(150);
  const list=data||[];
  c.innerHTML=`
  <div class="toolbar" style="margin-bottom:12px"><button class="btn btn-primary" onclick="openModalXuatDau()"><i class="ti ti-plus"></i> Ghi phiếu xuất dầu</button></div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Ngày</th><th>Biển số</th><th>Thầu phụ</th><th>Số lít</th><th>Đơn giá</th><th>Thành tiền</th><th>Thu hồi</th></tr></thead>
    <tbody>
    ${list.length===0?`<tr><td colspan="7"><div class="empty"><i class="ti ti-inbox"></i>Chưa có phiếu xuất dầu</div></td></tr>`:''}
    ${list.map(o=>`<tr>
      <td>${fmtDate(o.ngay_do)}</td><td>${o.bien_kiem_soat}</td><td>${o.ma_thau_phu?tenThauPhu(o.ma_thau_phu):'Nội bộ'}</td>
      <td>${fmt(o.so_lit)} lít</td><td>${fmtM(o.don_gia_ban_le)}</td><td class="text-orange fw6">${fmtM(o.thanh_tien)}</td>
      <td><span class="tag ${o.trang_thai_thu_hoi==='da_thu_hoi'?'tag-dathu':(o.trang_thai_thu_hoi==='khong_thu_hoi'?'tag-new':'tag-cho')}">${o.trang_thai_thu_hoi==='da_thu_hoi'?'Đã thu hồi':(o.trang_thai_thu_hoi==='khong_thu_hoi'?'Không thu hồi':'Chưa thu hồi')}</span></td>
    </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function openModalXuatDau(){
  if(!canSee(['ke_toan','ceo'])){toast('Không có quyền','error');return;}
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  const xeOpts=(XE||[]).map(x=>`<option value="${x.bien_so}">${x.bien_so}</option>`).join('');
  bg.innerHTML=`<div class="modal" style="width:460px">
    <div class="modal-head"><h3><i class="ti ti-gas-station" style="color:var(--teal)"></i> Phiếu xuất dầu cho xe</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Ngày đổ *</label><input type="date" id="xd-ngay" value="${today()}"></div>
      <div class="form-group"><label>Biển số xe *</label><select id="xd-xe" onchange="onChangeXeXuatDau()"><option value="">-- Chọn --</option>${xeOpts}</select></div>
      <div class="form-group full"><label>Thầu phụ (tự động)</label><input id="xd-thau-auto" disabled></div>
      <div class="form-group"><label>Số lít đổ *</label><input id="xd-lit" data-money="1" oninput="fmtOnInput(this);tinhTienXuatDau()" placeholder="0"></div>
      <div class="form-group"><label>Đơn giá bán lẻ *</label><input id="xd-gia" data-money="1" oninput="fmtOnInput(this);tinhTienXuatDau()" placeholder="0"></div>
      <div class="form-group full"><label>Thành tiền (tự tính)</label><input id="xd-tien" disabled></div>
    </div></div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Hủy</button><button class="btn btn-primary" onclick="saveXuatDau()"><i class="ti ti-device-floppy"></i> Lưu phiếu</button></div>
  </div>`;
  document.body.appendChild(bg);
}
function onChangeXeXuatDau(){
  const bien=document.getElementById('xd-xe').value;
  const xe=(XE||[]).find(x=>x.bien_so===bien);
  const inp=document.getElementById('xd-thau-auto');
  if(!xe){inp.value='';return;}
  inp.value=xe.loai_phan_loai==='noi_bo'?'Xe nội bộ — không thu hồi':tenThauPhu(xe.ma_thau_phu);
}
function tinhTienXuatDau(){
  const lit=parseNum(document.getElementById('xd-lit')?.value||0);
  const gia=parseNum(document.getElementById('xd-gia')?.value||0);
  const el=document.getElementById('xd-tien');if(el)el.value=fmtInput(String(lit*gia));
}
async function saveXuatDau(){
  const bien=document.getElementById('xd-xe').value;
  if(!bien){toast('Chọn biển số xe','error');return;}
  const xe=(XE||[]).find(x=>x.bien_so===bien);
  const lit=parseNum(document.getElementById('xd-lit').value);
  const gia=parseNum(document.getElementById('xd-gia').value);
  if(!lit||!gia){toast('Nhập đủ số lít và đơn giá','error');return;}
  const isNoiBo=xe?.loai_phan_loai==='noi_bo';
  const data={
    ngay_do:document.getElementById('xd-ngay').value,
    bien_kiem_soat:bien,
    ma_thau_phu:isNoiBo?null:(xe?.ma_thau_phu||null),
    doi_tuong:isNoiBo?'noi_bo':'thau_phu',
    so_lit:lit,don_gia_ban_le:gia,thanh_tien:lit*gia,
    nguoi_thuc_hien:CU?.ho_ten,created_by:CU?.id,
    trang_thai_thu_hoi:isNoiBo?'khong_thu_hoi':'chua_thu_hoi',
  };
  const{error}=await db.from('dau_xuat').insert(data);
  if(error){toast('Lỗi: '+error.message,'error');return;}
  toast('Đã lưu phiếu xuất dầu');closeModal();
  pgKhoDau(document.getElementById('content'));
}

async function renderNhapDauList(c){
  const{data}=await db.from('dau_nhap').select('*').order('ngay_nhap',{ascending:false}).limit(100);
  const list=data||[];
  c.innerHTML=`
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px"><i class="ti ti-info-circle"></i> Danh sách này tự sinh từ phiếu "Mua dầu nhập kho" đã duyệt và thanh toán ở trang Chi phí (tab Ghi nhận). Muốn nhập thêm dầu, tạo phiếu mới ở trang Chi phí.</div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Ngày nhập</th><th>Nhà cung cấp</th><th>Số lít</th><th>Đơn giá nhập</th><th>Thành tiền</th><th>Số phiếu</th></tr></thead>
    <tbody>
    ${list.length===0?`<tr><td colspan="6"><div class="empty"><i class="ti ti-inbox"></i>Chưa có lần nhập dầu nào</div></td></tr>`:''}
    ${list.map(o=>`<tr>
      <td>${fmtDate(o.ngay_nhap)}</td><td>${o.nha_cung_cap||'—'}</td>
      <td>${fmt(o.so_lit)} lít</td><td>${fmtM(o.don_gia_nhap)}</td>
      <td class="text-orange fw6">${fmtM(o.thanh_tien)}</td><td>${o.so_phieu_hoa_don||'—'}</td>
    </tr>`).join('')}
    </tbody>
  </table></div>`;
}

// ==================== TRANG TÀI SẢN CỐ ĐỊNH ====================
async function pgTaiSan(c){
  if(!canSee(['quan_ly','ke_toan','ceo','thu_quy'])){c.innerHTML='<div class="empty"><i class="ti ti-lock"></i>Không có quyền</div>';return;}
  const{data,error}=await db.from('tai_san').select('*').order('ngay_mua',{ascending:false});
  if(error){c.innerHTML=`<div class="empty"><i class="ti ti-alert-circle"></i>Chưa có bảng tai_san — chạy migration_chi_phi.sql trước.</div>`;return;}
  const list=data||[];
  const now=new Date();
  c.innerHTML=`
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px"><i class="ti ti-info-circle"></i> Danh sách tự sinh khi phiếu "Mua xe" ở trang Chi phí được duyệt và đánh dấu đã thanh toán.</div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Tên tài sản</th><th>Biển số</th><th>Ngày mua</th><th>Nguyên giá</th><th>Khấu hao/tháng</th><th>Đã khấu hao</th><th>Giá trị còn lại</th><th>Trạng thái</th></tr></thead>
    <tbody>
    ${list.length===0?`<tr><td colspan="8"><div class="empty"><i class="ti ti-inbox"></i>Chưa có tài sản nào</div></td></tr>`:''}
    ${list.map(o=>{
      const soThang=Math.max(0,Math.floor((now-new Date(o.ngay_mua))/(1000*60*60*24*30)));
      const khThang=Math.round((+o.nguyen_gia||0)/(o.thoi_gian_khau_hao_thang||60));
      const daKhauHao=Math.min(+o.nguyen_gia||0,khThang*soThang);
      const conLai=(+o.nguyen_gia||0)-daKhauHao;
      return`<tr>
        <td class="fw6">${o.ten_tai_san}</td><td>${o.bien_kiem_soat||'—'}</td><td>${fmtDate(o.ngay_mua)}</td>
        <td>${fmtM(o.nguyen_gia)}</td><td>${fmtM(khThang)}</td><td class="text-orange">${fmtM(daKhauHao)}</td>
        <td class="text-green fw6">${fmtM(conLai)}</td>
        <td><span class="tag ${o.trang_thai==='dang_su_dung'?'tag-dathu':'tag-huy'}">${o.trang_thai==='dang_su_dung'?'Đang sử dụng':'Đã thanh lý'}</span></td>
      </tr>`;
    }).join('')}
    </tbody>
  </table></div>`;
}

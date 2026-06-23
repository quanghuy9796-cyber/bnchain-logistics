// HOADON.JS — Upload & Xử lý Hóa Đơn, AI Scan
// Requires: config.js, pdf-lib (CDN in index.html)

// ── 1. TÁCH TRANG PDF ────────────────────────────────────────────────────────
async function splitPdfPages(file){
  if(file.type!=='application/pdf') return [file];
  try{
    const ab=await file.arrayBuffer();
    const srcDoc=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const total=srcDoc.getPageCount();
    if(total<=1) return [file];
    const pages=[];
    for(let i=0;i<total;i++){
      const newDoc=await PDFLib.PDFDocument.create();
      const[copied]=await newDoc.copyPages(srcDoc,[i]);
      newDoc.addPage(copied);
      const bytes=await newDoc.save();
      const pageName=file.name.replace(/\.pdf$/i,`_trang${i+1}.pdf`);
      pages.push(new File([bytes],pageName,{type:'application/pdf'}));
    }
    return pages;
  }catch(e){
    console.warn('pdf-lib split error, fallback:',e);
    return [file];
  }
}

// ── 2. UPLOAD LÊN SUPABASE STORAGE ──────────────────────────────────────────
// tenKhach: tên khách hàng (nếu đã biết) — dùng làm thư mục
// soContList: mảng số cont (nếu đã biết) — dùng làm sub-thư mục
// Nếu chưa biết → lưu vào pending/ để move sau khi duyệt
function buildStoragePath(file, tenKhach, soContList){
  const now=new Date();
  const yyyy=now.getFullYear();
  const mm=String(now.getMonth()+1).padStart(2,'0');
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const ts=Date.now();

  // Helper làm sạch string thành folder-safe
  function toSafe(str,maxLen){
    return (str||'')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9]/g,'_')
      .replace(/_+/g,'_').replace(/^_|_$/g,'')
      .toUpperCase().slice(0,maxLen||30);
  }

  if(tenKhach){
    const safeKh=toSafe(tenKhach,20);
    if(soContList&&soContList.length>0){
      // Path đầy đủ: hoadon/YYYY/MM/KH/CONT/file
      const safeCont=toSafe(soContList[0],15); // lấy cont đầu tiên làm thư mục
      return `hoadon/${yyyy}/${mm}/${safeKh}/${safeCont}/${ts}_${safeName}`;
    }
    // Biết khách nhưng chưa có cont (vd CSHT)
    return `hoadon/${yyyy}/${mm}/${safeKh}/no_cont/${ts}_${safeName}`;
  }
  // Chưa biết khách → pending, sẽ move sau khi duyệt tay
  return `hoadon/pending/${yyyy}/${mm}/${ts}_${safeName}`;
}

async function uploadHDToStorage(file, tenKhach, soContList){
  try{
    const path=buildStoragePath(file, tenKhach, soContList);
    const{error}=await db.storage.from('hoa-don').upload(path,file,{contentType:file.type,upsert:false});
    if(error){console.warn('Storage upload (non-fatal):',error.message);return null;}
    return path;
  }catch(e){console.warn('Storage exception:',e);return null;}
}

// ── 3. XEM HÓA ĐƠN (popup) ──────────────────────────────────────────────────
async function xemHoaDon(hdId,storagePath){
  let displayName=null;
  if(!storagePath){
    const{data:hd}=await db.from('hoa_don').select('storage_path,file_name').eq('id',hdId).single();
    if(hd?.storage_path){storagePath=hd.storage_path;displayName=hd.file_name;}
    else{toast('Chưa có file đính kèm','error');return;}
  }
  const{data,error}=await db.storage.from('hoa-don').createSignedUrl(storagePath,3600);
  if(error||!data?.signedUrl){toast('Không thể tải file: '+(error?.message||'Lỗi Storage'),'error');return;}
  const isPdf=storagePath.toLowerCase().endsWith('.pdf');
  const url=data.signedUrl;
  const dlName=displayName||storagePath.split('/').pop();
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:90vw;max-width:900px;height:90vh;display:flex;flex-direction:column">
  <div class="modal-head" style="flex-shrink:0">
    <h3><i class="ti ti-file-invoice" style="color:var(--teal)"></i> Xem hóa đơn</h3>
    <div style="display:flex;gap:6px">
      <button class="btn btn-sm btn-teal" onclick="taiMotHoaDon('${url}','${dlName}')"><i class="ti ti-download"></i> Tải về</button>
      <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
    </div>
  </div>
  <div style="flex:1;overflow:hidden">
    ${isPdf
      ?`<iframe src="${url}" style="width:100%;height:100%;border:none"></iframe>`
      :`<div style="width:100%;height:100%;overflow:auto;display:flex;align-items:center;justify-content:center;background:#f5f5f5">
          <img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain">
        </div>`}
  </div></div>`;
  document.body.appendChild(bg);
}

async function taiMotHoaDon(url,fileName){
  try{
    const res=await fetch(url);
    const blob=await res.blob();
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=fileName||'hoadon.pdf';
    document.body.appendChild(a);a.click();
    document.body.removeChild(a);
  }catch(e){toast('Lỗi tải file','error');}
}

// ── 4. TRANG UPLOAD HÓA ĐƠN ─────────────────────────────────────────────────
async function pgHoaDon(c){
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const[{data:cho},{data:daXong},{data:trungHuy}]=await Promise.all([
    db.from('hoa_don').select('*').eq('trang_thai','cho_xu_ly').order('created_at',{ascending:false}),
    db.from('hoa_don').select('*').eq('trang_thai','da_duyet').order('created_at',{ascending:false}).limit(30),
    db.from('hoa_don').select('*').eq('trang_thai','huy').ilike('ly_do_cho','Trùng với%').order('created_at',{ascending:false}).limit(15),
  ]);
  const choList=cho||[];
  const doneList=daXong||[];
  const trungList=trungHuy||[];

  c.innerHTML=`
  <div style="background:linear-gradient(135deg,var(--teal),var(--teal-dark));border-radius:var(--rl);padding:16px 20px;margin-bottom:16px;color:#fff">
    <div style="font-size:14px;font-weight:600;margin-bottom:4px"><i class="ti ti-cloud-upload"></i> Upload Hóa Đơn Điện Tử</div>
    <div style="font-size:11px;opacity:.8;margin-bottom:12px">PDF tự động tách từng trang — AI đọc & tạo chi hộ ngay, không cần duyệt</div>
    <div id="hd-drop-area" style="border:2px dashed rgba(255,255,255,.4);border-radius:var(--r);padding:20px;text-align:center;cursor:pointer;transition:all .2s"
      onclick="document.getElementById('hd-file-input').click()"
      ondragover="event.preventDefault();this.style.borderColor='#fff'"
      ondragleave="this.style.borderColor='rgba(255,255,255,.4)'"
      ondrop="handleHDDrop(event)">
      <i class="ti ti-files" style="font-size:28px;display:block;margin-bottom:6px;opacity:.8"></i>
      <div style="font-size:13px;font-weight:500">Nhấn hoặc kéo thả file vào đây</div>
      <div style="font-size:11px;opacity:.7;margin-top:3px">PDF, JPG, PNG — Tối đa 20 file cùng lúc</div>
      <input type="file" id="hd-file-input" accept=".pdf,image/*" multiple style="display:none" onchange="handleHDFiles(this.files)">
    </div>
  </div>

  <div id="hd-progress-area" style="display:none;margin-bottom:16px">
    <div style="font-size:12px;font-weight:600;color:var(--teal);margin-bottom:8px" id="hd-progress-label">Đang xử lý...</div>
    <div style="background:var(--bg);border-radius:var(--r);height:8px;overflow:hidden">
      <div id="hd-progress-bar" style="background:var(--teal);height:8px;border-radius:var(--r);width:0%;transition:width .3s"></div>
    </div>
    <div id="hd-file-list" style="margin-top:10px"></div>
  </div>

  <div id="hd-result-area" style="display:none;margin-bottom:16px"></div>

  ${choList.length?`
  <div style="margin-bottom:14px">
    <div style="font-size:12px;font-weight:600;color:var(--danger);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;display:flex;align-items:center;gap:6px">
      <i class="ti ti-alert-circle"></i> CHỜ ĐIỀN SỐ CONT (${choList.length} hóa đơn)
    </div>
    <div class="tbl-wrap"><table class="tbl">
      <colgroup><col style="width:80px"><col style="width:90px"><col style="width:140px"><col style="width:100px"><col style="width:200px"><col style="width:120px"><col style="width:110px"></colgroup>
      <thead><tr><th>Ngày HĐ</th><th>Số HĐ</th><th>Loại DV</th><th>Số tiền</th><th>Lý do chờ</th><th>Người upload</th><th>Thao tác</th></tr></thead>
      <tbody>
      ${choList.map(h=>`<tr>
        <td>${h.ngay_hd||'—'}</td>
        <td style="color:var(--teal)">${h.so_hd||'—'}</td>
        <td>${h.loai_dv||'—'}</td>
        <td class="text-orange fw6">${fmtM(h.tong_tien)}</td>
        <td style="font-size:11px;color:var(--danger)">${h.ly_do_cho||'Chưa khớp cont'}</td>
        <td style="font-size:11px">${h.ten_nguoi_upload||'—'}</td>
        <td><div style="display:flex;gap:4px">
          ${h.storage_path?`<button class="btn btn-xs" onclick="xemHoaDon('${h.id}','${h.storage_path}')" title="Xem file"><i class="ti ti-eye"></i></button>`:''}
          <button class="btn btn-xs btn-teal" onclick="xuLyHD('${h.id}')"><i class="ti ti-link"></i> Xử lý</button>
          <button class="btn btn-xs btn-danger" onclick="huyHD('${h.id}')"><i class="ti ti-x"></i></button>
        </div></td>
      </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`:''}

  ${doneList.length?`
  <div>
    <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
      <i class="ti ti-history"></i> Đã xử lý gần đây (${doneList.length})
    </div>
    <div class="tbl-wrap"><table class="tbl">
      <colgroup><col style="width:80px"><col style="width:90px"><col style="width:140px"><col style="width:100px"><col style="width:160px"><col style="width:120px"><col style="width:60px"></colgroup>
      <thead><tr><th>Ngày HĐ</th><th>Số HĐ</th><th>Loại DV</th><th>Số tiền</th><th>Cont</th><th>Người upload</th><th>File</th></tr></thead>
      <tbody>
      ${doneList.map(h=>`<tr>
        <td>${h.ngay_hd||'—'}</td>
        <td style="color:var(--teal)">${h.so_hd||'—'}</td>
        <td>${h.loai_dv||'—'}</td>
        <td class="text-orange fw6">${fmtM(h.tong_tien)}</td>
        <td style="font-size:11px;font-family:monospace">${(h.so_cont_list||[]).join(', ')||'—'}</td>
        <td style="font-size:11px">${h.ten_nguoi_upload||'—'}</td>
        <td>${h.storage_path?`<button class="btn btn-xs" onclick="xemHoaDon('${h.id}','${h.storage_path}')" title="Xem"><i class="ti ti-eye"></i></button>`:'—'}</td>
      </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`:''}

  ${trungList.length?`
  <div style="margin-top:14px">
    <div style="font-size:12px;font-weight:600;color:#b45309;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;display:flex;align-items:center;gap:6px">
      <i class="ti ti-ban"></i> Đã tự động hủy do trùng (${trungList.length}) — không tính chi hộ
    </div>
    <div class="tbl-wrap"><table class="tbl">
      <colgroup><col style="width:80px"><col style="width:90px"><col style="width:140px"><col style="width:140px"><col style="width:100px"><col style="width:160px"><col style="width:120px"></colgroup>
      <thead><tr><th>Ngày HĐ</th><th>Số HĐ</th><th>Đơn vị bán</th><th>Đơn vị mua</th><th>Số tiền</th><th>Lý do hủy</th><th>Người upload</th></tr></thead>
      <tbody>
      ${trungList.map(h=>`<tr>
        <td>${h.ngay_hd||'—'}</td>
        <td style="color:var(--teal)">${h.so_hd||'—'}</td>
        <td style="font-size:11px">${h.ten_don_vi_xuat||'—'}</td>
        <td style="font-size:11px">${h.ten_don_vi_mua||'—'}</td>
        <td class="text-orange fw6">${fmtM(h.tong_tien)}</td>
        <td style="font-size:11px;color:#b45309">${h.ly_do_cho||'Trùng hóa đơn'}</td>
        <td style="font-size:11px">${h.ten_nguoi_upload||'—'}</td>
      </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`:''}

  ${!choList.length&&!doneList.length?'<div class="empty"><i class="ti ti-inbox"></i>Chưa có hóa đơn nào. Upload file để bắt đầu!</div>':''}`;
}

function handleHDDrop(e){
  e.preventDefault();
  document.getElementById('hd-drop-area').style.borderColor='rgba(255,255,255,.4)';
  handleHDFiles(e.dataTransfer.files);
}

// ── 5. XỬ LÝ FILE UPLOAD ────────────────────────────────────────────────────
async function handleHDFiles(files){
  if(!files||!files.length)return;
  const rawArr=Array.from(files).slice(0,20);

  document.getElementById('hd-progress-area').style.display='block';
  document.getElementById('hd-result-area').style.display='none';
  document.getElementById('hd-progress-label').textContent='Đang tách trang PDF...';
  document.getElementById('hd-progress-bar').style.width='0%';

  // Bước 1: tách mỗi PDF thành file 1 trang riêng
  const fileArr=[];
  for(const f of rawArr){
    const pages=await splitPdfPages(f);
    fileArr.push(...pages);
  }

  const results={matched:[],pending:[],trung:[]};

  for(let i=0;i<fileArr.length;i++){
    const file=fileArr[i];
    document.getElementById('hd-progress-bar').style.width=Math.round((i/fileArr.length)*100)+'%';
    document.getElementById('hd-progress-label').textContent=`Đang xử lý ${i+1}/${fileArr.length}: ${file.name}`;
    document.getElementById('hd-file-list').innerHTML=fileArr.map((f,j)=>`
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)">
        <i class="ti ti-${j<i?'check-circle':j===i?'loader-2':''}" style="color:${j<i?'var(--success)':j===i?'var(--teal)':'var(--text-muted)'};${j===i?'animation:spin 1s linear infinite':''}"></i>
        <span style="flex:1">${f.name}</span>
        <span style="color:var(--text-muted);font-size:11px">${j<i?'✅ Xong':j===i?'🔄 Đang đọc...':'⏳ Chờ'}</span>
      </div>`).join('');

    try{
      // AI đọc trước — cần biết tên khách + cont để build đúng path Storage
      const hdList=await processOneHD(file);
      for(const hdData of hdList){
        try{
          if(hdData.is_trung){
            // Trùng hóa đơn → KHÔNG upload Storage, KHÔNG tạo chi hộ — chỉ lưu record 'huy' để có vết kiểm tra
            const saved=await saveHoaDon(hdData,file.name,null);
            results.trung.push({...hdData,id:saved.id,file:file.name});
            continue;
          }
          // Lấy tên khách + cont từ kết quả AI (nếu đã khớp VĐ)
          const tenKhach=hdData.van_don_matches?.[0]?.ten_khach||null;
          const soContList=hdData.so_cont_list||[];
          // Upload với path đúng thư mục (hoặc pending/ nếu chưa biết khách)
          const storagePath=await uploadHDToStorage(file, tenKhach, soContList);
          const saved=await saveHoaDon(hdData,file.name,storagePath);
          if(hdData.trang_thai==='da_khop') results.matched.push({...hdData,id:saved.id,file:file.name});
          else results.pending.push({...hdData,id:saved.id,file:file.name,ly_do:hdData.ly_do_cho});
        }catch(saveErr){
          results.pending.push({file:file.name,ly_do:'Lỗi lưu: '+saveErr.message,tong_tien:0});
        }
      }
    }catch(err){
      results.pending.push({file:file.name,ly_do:'Lỗi đọc AI: '+err.message,tong_tien:0});
    }
  }

  // Done — tất cả xong
  document.getElementById('hd-progress-bar').style.width='100%';
  document.getElementById('hd-progress-label').textContent=`✅ Hoàn tất ${fileArr.length} trang`;
  document.getElementById('hd-file-list').innerHTML=fileArr.map(f=>`
    <div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)">
      <i class="ti ti-check-circle" style="color:var(--success)"></i>
      <span style="flex:1">${f.name}</span>
      <span style="color:var(--text-muted);font-size:11px">✅ Xong</span>
    </div>`).join('');

  // Reload queue rồi show kết quả + scroll xuống
  await pgHoaDon(document.getElementById('content'));
  showHDResults(results);
  setTimeout(()=>{
    const ra=document.getElementById('hd-result-area');
    if(ra) ra.scrollIntoView({behavior:'smooth',block:'start'});
  },100);
}

// ── 6. AI ĐỌC 1 FILE (đã là 1 trang) ───────────────────────────────────────
async function processOneHD(file){
  const base64=await new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=()=>res(r.result.split(',')[1]);
    r.onerror=()=>rej(new Error('Không đọc được file'));
    r.readAsDataURL(file);
  });

  const isImage=file.type.startsWith('image/');
  const mediaType=isImage?file.type:'application/pdf';

  const prompt=`Đây là 1 trang hóa đơn/biên lai dịch vụ logistics tại cảng Hải Phòng, Việt Nam.
Trả về JSON ARRAY với đúng 1 phần tử (chỉ array thuần, không markdown, không giải thích):
[{
  "so_hd": "số hóa đơn hoặc số biên lai",
  "ngay_hd": "ngày trên HĐ format YYYY-MM-DD",
  "loai_dv": "Chỉ được chọn 1 trong: Nâng/hạ cont / Phí CSHT / Lưu ca / Phí cảng, bãi / Phí local charge / Chi phí khác. Quy tắc: (1) Bất kỳ dịch vụ nâng container, hạ container, nâng hàng, hạ hàng, nâng vỏ, hạ vỏ, nâng hạ cont → đều chọn Nâng/hạ cont. (2) CSHT / cơ sở hạ tầng → Phí CSHT. (3) Vệ sinh/sửa/rửa cont / lưu bãi / lưu cont → Phí cảng, bãi. (4) Local charge / phụ phí → Phí local charge. (5) Còn lại → Chi phí khác.",
  "tong_tien": số tiền VNĐ cuối cùng (số nguyên không dấu phẩy),
  "so_cont_list": ["POLU4510295"],
  "loai_cont": "20DC hoặc 40HC v.v",
  "mst_khach": "mã số thuế đơn vị MUA",
  "ten_don_vi_mua": "tên đơn vị MUA hàng/dịch vụ — lấy đúng tên công ty ghi ở phần 'Tên đơn vị' trong khối Người mua hàng/Đơn vị mua, KHÔNG nhầm với đơn vị bán",
  "ten_don_vi_xuat": "tên đơn vị BÁN hóa đơn",
  "ghi_chu": "thông tin thêm quan trọng",
  "confidence": "cao / trung_binh / thap"
}]
Lưu ý: số cont thường sau "Công-te-nơ số:" hoặc trong tên DV như POLU4510295-40HC-GP`;

  const response=await fetch(PROXY_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'gemini-2.5-flash',
      contents:[{parts:[
        {inline_data:{mime_type:mediaType,data:base64}},
        {text:prompt}
      ]}]
    })
  });

  const data=await response.json();
  if(data.error) throw new Error('Gemini: '+(data.error.message||JSON.stringify(data.error)));
  const text=data.text||'';

  const arrMatch=text.match(/\[[\s\S]*\]/);
  const objMatch=text.match(/\{[\s\S]*\}/);
  if(!arrMatch&&!objMatch) throw new Error('AI không trả về JSON hợp lệ. Raw: '+text.slice(0,200));

  let aiList=[];
  if(arrMatch){
    aiList=JSON.parse(arrMatch[0]);
    if(!Array.isArray(aiList)) aiList=[aiList];
  } else {
    aiList=[JSON.parse(objMatch[0])];
  }

  const resultList=[];
  for(const ai of aiList){
    // Kiểm tra trùng TRƯỚC khi khớp cont — nếu trùng thì hủy luôn, không upload, không tạo chi hộ
    const trung=await checkHoaDonTrung(ai.so_hd,ai.ngay_hd,ai.ten_don_vi_mua);
    if(trung){
      resultList.push({
        so_hd:ai.so_hd||null,ngay_hd:ai.ngay_hd||null,loai_dv:ai.loai_dv||null,
        tong_tien:ai.tong_tien||0,so_cont_list:ai.so_cont_list||[],
        mst_khach:ai.mst_khach||null,ten_don_vi_mua:ai.ten_don_vi_mua||null,
        ten_don_vi_xuat:ai.ten_don_vi_xuat||null,
        ai_confidence:ai.confidence||'trung_binh',ai_ghi_chu:ai.ghi_chu||null,
        trang_thai:'huy',
        ly_do_cho:`Trùng với HĐ đã ghi nhận trước (Số HĐ ${ai.so_hd||'?'} · Ngày ${ai.ngay_hd||'?'} · ${ai.ten_don_vi_mua||'?'}, mã HĐ cũ: ${trung.id}) — tự động hủy, không tạo chi hộ.`,
        is_trung:true,
      });
      continue;
    }
    const matched=await matchContToVanDon(ai);
    resultList.push({
      so_hd:ai.so_hd||null,ngay_hd:ai.ngay_hd||null,loai_dv:ai.loai_dv||null,
      tong_tien:ai.tong_tien||0,so_cont_list:ai.so_cont_list||[],
      mst_khach:ai.mst_khach||null,ten_don_vi_mua:ai.ten_don_vi_mua||null,
      ten_don_vi_xuat:ai.ten_don_vi_xuat||null,
      ai_confidence:ai.confidence||'trung_binh',ai_ghi_chu:ai.ghi_chu||null,
      ...matched,
    });
  }
  return resultList;
}

// ── 6b. KIỂM TRA TRÙNG HÓA ĐƠN (3 tiêu chí: Số HĐ + Ngày HĐ + Đơn vị mua) ──
// Trả về record hoa_don trùng (nếu có, trang_thai khác 'huy') hoặc null
async function checkHoaDonTrung(soHd,ngayHd,tenDonViMua){
  if(!soHd||!ngayHd||!tenDonViMua) return null; // thiếu dữ liệu thì không đủ cơ sở kết luận trùng
  const{data}=await db.from('hoa_don')
    .select('id,so_hd,ngay_hd,ten_don_vi_mua,trang_thai')
    .eq('so_hd',soHd).eq('ngay_hd',ngayHd)
    .ilike('ten_don_vi_mua',tenDonViMua.trim())
    .neq('trang_thai','huy')
    .limit(1);
  return data&&data.length?data[0]:null;
}

// ── 7. KHỚP CONT VỚI VẬN ĐƠN ────────────────────────────────────────────────
async function matchContToVanDon(ai){
  const conts=ai.so_cont_list||[];

  if(conts.length===0&&ai.tong_tien>0){
    const s40=Math.round(ai.tong_tien/500000),s20=Math.round(ai.tong_tien/250000);
    return{trang_thai:'cho_xu_ly',ly_do_cho:`HĐ CSHT — Ước tính ${s40} cont 40 hoặc ${s20} cont 20. Cần chọn bill/booking.`,so_cont_list:[]};
  }
  if(conts.length===0){
    return{trang_thai:'cho_xu_ly',ly_do_cho:'AI không đọc được số cont.',so_cont_list:[]};
  }

  // Query tất cả VĐ khớp với các số cont AI đọc được
  const{data:vds}=await db.from('van_don')
    .select('id,ma_don,so_cont,ten_khach,loai_hang,phi_doi_lenh,tra_thau_doi_lenh')
    .in('so_cont',conts);

  if(!vds||vds.length===0){
    return{trang_thai:'cho_xu_ly',ly_do_cho:`Số cont ${conts.join(', ')} chưa có trong hệ thống.`,so_cont_list:conts};
  }

  // ── Trường hợp: 1 HĐ nhiều cont — kiểm tra xem các cont có cùng 1 khách không
  if(conts.length>1){
    const khachSet=new Set(vds.map(v=>v.ten_khach).filter(Boolean));
    if(khachSet.size<=1){
      // Cùng 1 khách → logic cũ, ghi tất cả
      return{trang_thai:'da_khop',van_don_matches:vds,so_cont_list:conts};
    }
    // Nhiều khách khác nhau trong 1 HĐ nhiều cont → xử lý tay
    return{
      trang_thai:'cho_xu_ly',
      ly_do_cho:`HĐ gồm ${conts.length} cont thuộc ${khachSet.size} khách khác nhau (${[...khachSet].join(', ')}). Cần xử lý tay để phân bổ đúng.`,
      so_cont_list:conts,
    };
  }

  // ── Trường hợp: 1 cont — kiểm tra số VĐ khớp
  if(vds.length===1){
    // Chỉ 1 VĐ → ghi nhận bình thường
    return{trang_thai:'da_khop',van_don_matches:vds,so_cont_list:conts};
  }

  // 1 cont nhưng khớp nhiều VĐ (nhiều khách khác nhau)
  const coDoiLenh=vds.filter(v=>+v.phi_doi_lenh>0||+v.tra_thau_doi_lenh>0);

  if(coDoiLenh.length===1){
    // Chỉ 1 khách có đổi lệnh → ghi nhận vào khách đó
    return{trang_thai:'da_khop',van_don_matches:coDoiLenh,so_cont_list:conts};
  }

  if(coDoiLenh.length===0){
    // Không ai có đổi lệnh → chuyển xử lý tay, OPS tự chọn
    const khachNames=vds.map(v=>`${v.ma_don}/${v.ten_khach||'?'}`).join(', ');
    return{
      trang_thai:'cho_xu_ly',
      ly_do_cho:`Cont ${conts[0]} khớp ${vds.length} VĐ (${khachNames}) — không có khách nào tick đổi lệnh. Chọn VĐ phù hợp.`,
      so_cont_list:conts,
    };
  }

  // Cả 2 (hoặc nhiều hơn) đều có đổi lệnh → xử lý tay bắt buộc
  const khachNames=coDoiLenh.map(v=>`${v.ma_don}/${v.ten_khach||'?'}`).join(', ');
  return{
    trang_thai:'cho_xu_ly',
    ly_do_cho:`Cont ${conts[0]} có ${coDoiLenh.length} VĐ đều có đổi lệnh (${khachNames}). OPS cần chọn đúng khách chịu phí.`,
    so_cont_list:conts,
  };
}

// ── 8. LƯU HÓA ĐƠN + TẠO CHI HỘ NGAY ──────────────────────────────────────
// Tạo tên file hiển thị đẹp để dùng khi tải về — KHÔNG đụng vào Storage
// Format: YYYY-MM_LoaiDV_CONT1-CONT2.pdf
function buildDisplayName(loaiDv, conts, ngayHd){
  try{
    const ym=(ngayHd||today()).slice(0,7);
    const loaiSafe=(loaiDv||'HoaDon')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // bỏ dấu
      .replace(/[^a-zA-Z0-9\s]/g,'').trim().replace(/\s+/g,'-');
    const contSafe=(conts||[]).join('-').replace(/[^A-Z0-9-]/g,'');
    return`${ym}_${loaiSafe}${contSafe?'_'+contSafe:''}.pdf`;
  }catch(e){return null;}
}

// Map loai_dv từ AI → loai_chi chuẩn của hệ thống
function mapLoaiDv(loaiDv){
  if(!loaiDv) return 'Chi phí khác';
  const v=loaiDv.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  // Tất cả dạng nâng/hạ cont → gộp thành 1 loại duy nhất cho bảng kê
  if(/nang|ha hang|ha vo|ha cont|nang ha|nang vo/.test(v)) return 'Nâng/hạ cont';
  if(/csht|co so ha tang/.test(v)) return 'Phí CSHT';
  if(/luu ca/.test(v)) return 'Lưu ca';
  if(/ve sinh|sua cont|rua cont|luu bai|luu cont|phi cang|cang bai/.test(v)) return 'Phí cảng, bãi';
  if(/local|phu phi/.test(v)) return 'Phí local charge';
  return 'Chi phí khác';
}

async function saveHoaDon(hd,fileName,storagePath=null){
  // Khớp cont → da_duyet ngay, không qua bước chờ
  const trangThai=hd.trang_thai==='da_khop'?'da_duyet':hd.trang_thai;

  // Tên hiển thị khi tải về (lưu vào file_name, không đổi file trên Storage)
  let displayName=fileName;
  if(hd.trang_thai==='da_khop'&&hd.van_don_matches?.length){
    const n=buildDisplayName(hd.loai_dv,hd.van_don_matches.map(v=>v.so_cont),hd.ngay_hd);
    if(n) displayName=n;
  }

  const{data,error}=await db.from('hoa_don').insert({
    so_hd:hd.so_hd,ngay_hd:hd.ngay_hd,loai_dv:hd.loai_dv,
    tong_tien:hd.tong_tien,so_cont_list:hd.so_cont_list,
    mst_khach:hd.mst_khach,ten_don_vi_xuat:hd.ten_don_vi_xuat,
    ten_don_vi_mua:hd.ten_don_vi_mua,
    trang_thai:trangThai,ly_do_cho:hd.ly_do_cho||null,
    ai_confidence:hd.ai_confidence,ai_ghi_chu:hd.ai_ghi_chu,
    nguoi_upload:CU?.id,ten_nguoi_upload:CU?.ho_ten,
    nguoi_duyet:hd.trang_thai==='da_khop'?CU?.id:null,
    ngay_duyet:hd.trang_thai==='da_khop'?new Date().toISOString():null,
    file_name:displayName,storage_path:storagePath||null,
  }).select().single();
  if(error) throw new Error(error.message);

  if(hd.trang_thai==='da_khop'&&hd.van_don_matches?.length){
    const allConts=hd.van_don_matches.map(v=>v.so_cont);
    const allContsStr=allConts.join(', ');
    const loaiChi=`${mapLoaiDv(hd.loai_dv)} + ${allContsStr}`;
    for(let i=0;i<hd.van_don_matches.length;i++){
      const vd=hd.van_don_matches[i];
      const laChinh=i===0;
      await db.from('hoa_don_van_don').insert({
        hoa_don_id:data.id,van_don_id:vd.id,so_cont:vd.so_cont,
        ma_don:vd.ma_don,so_tien:laChinh?hd.tong_tien:0,
        la_cont_chinh:laChinh,da_tao_chi_ho:true,
      });
      await db.from('chi_ho').insert({
        van_don_id:vd.id,ma_don:vd.ma_don,
        loai_chi:loaiChi,
        ngay_chi:hd.ngay_hd||today(),
        so_tien:laChinh?hd.tong_tien:0,
        tien_thu_khach:laChinh?hd.tong_tien:0,
        tien_tra_thau:0,tien_tra_laixe:0,
        nguoi_chi:CU?.ho_ten||'OPS',
        chung_tu:hd.so_hd,hoa_don_id:data.id,
        hoa_don_khach:true,
        la_tham_chieu:!laChinh,
        so_tien_hd_goc:laChinh?null:hd.tong_tien,
        ghi_chu:laChinh
          ?`HĐ ${hd.so_hd||''} | Bán: ${hd.ten_don_vi_xuat||'—'} | Mua: ${hd.ten_don_vi_mua||'—'}`
          :`Tiền ghi nhận tại: ${hd.van_don_matches[0].so_cont}`,
      });
    }
  }
  return data;
}

// ── 9. HIỂN THỊ KẾT QUẢ ─────────────────────────────────────────────────────
function showHDResults(results){
  const ra=document.getElementById('hd-result-area');
  if(!ra) return;
  ra.style.display='block';
  ra.innerHTML=`
  <div style="display:grid;grid-template-columns:${results.trung.length?'1fr 1fr 1fr':'1fr 1fr'};gap:12px;margin-bottom:12px">
    <div class="stat-card" style="border-color:var(--success)">
      <div class="stat-lbl">✅ Tự động vào chi hộ</div>
      <div class="stat-val text-green">${results.matched.length}</div>
      <div class="stat-sub">Đã tạo chi phí phát sinh</div>
    </div>
    <div class="stat-card" style="border-color:var(--danger)">
      <div class="stat-lbl">⚠️ Cần điền cont tay</div>
      <div class="stat-val text-red">${results.pending.length}</div>
      <div class="stat-sub">Xem queue bên dưới</div>
    </div>
    ${results.trung.length?`
    <div class="stat-card" style="border-color:#f59e0b">
      <div class="stat-lbl">🚫 Trùng — đã tự hủy</div>
      <div class="stat-val" style="color:#b45309">${results.trung.length}</div>
      <div class="stat-sub">Không tạo chi hộ, không lưu file</div>
    </div>`:''}
  </div>
  ${results.matched.length?`
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--r);padding:10px 14px;margin-bottom:10px">
    <div style="font-size:11px;font-weight:600;color:var(--success);margin-bottom:6px">ĐÃ TẠO CHI HỘ TỰ ĐỘNG</div>
    ${results.matched.map(h=>`<div style="font-size:12px;padding:3px 0;border-bottom:1px solid #d1fae5">
      📄 ${h.file} → ${h.loai_dv||'?'} | ${fmtM(h.tong_tien)} | Cont: ${(h.so_cont_list||[]).join(', ')||'?'}
    </div>`).join('')}
  </div>`:''}
  ${results.trung.length?`
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--r);padding:10px 14px;margin-bottom:10px">
    <div style="font-size:11px;font-weight:600;color:#b45309;margin-bottom:6px">🚫 PHÁT HIỆN TRÙNG — ĐÃ TỰ ĐỘNG HỦY (không tạo chi hộ, không lưu file)</div>
    ${results.trung.map(h=>`<div style="font-size:12px;padding:3px 0;border-bottom:1px solid #fde68a">
      📄 ${h.file} — HĐ ${h.so_hd||'?'} · ${h.ngay_hd||'?'} · Bán: ${h.ten_don_vi_xuat||'?'} · Mua: ${h.ten_don_vi_mua||'?'} | ${fmtM(h.tong_tien)}
    </div>`).join('')}
  </div>`:''}
  ${results.pending.length?`
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:var(--r);padding:10px 14px">
    <div style="font-size:11px;font-weight:600;color:var(--danger);margin-bottom:6px">CẦN ĐIỀN SỐ CONT THỦ CÔNG</div>
    ${results.pending.map(h=>`<div style="font-size:12px;padding:3px 0;border-bottom:1px solid #fee2e2">
      ⚠️ ${h.file} — ${h.ly_do||'Lỗi xử lý'}
    </div>`).join('')}
  </div>`:''}
  <div style="font-size:11px;color:var(--text-muted);text-align:center;padding:6px 0">↓ Danh sách queue đã cập nhật bên dưới</div>`;
}

// ── 10. XỬ LÝ THỦ CÔNG (điền cont tay) ──────────────────────────────────────
async function xuLyHD(id){
  const{data:hd}=await db.from('hoa_don').select('*').eq('id',id).single();
  if(!hd)return;

  let previewHtml='<div style="height:180px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;background:var(--bg);border-radius:var(--r);margin-bottom:12px"><i class="ti ti-file-off" style="margin-right:6px"></i>Chưa có file đính kèm</div>';
  if(hd.storage_path){
    const{data:su}=await db.storage.from('hoa-don').createSignedUrl(hd.storage_path,3600);
    if(su?.signedUrl){
      const isPdf=hd.storage_path.toLowerCase().endsWith('.pdf');
      previewHtml=isPdf
        ?`<iframe src="${su.signedUrl}" style="width:100%;height:260px;border:none;border-radius:var(--r);margin-bottom:12px"></iframe>`
        :`<img src="${su.signedUrl}" style="width:100%;max-height:220px;object-fit:contain;border-radius:var(--r);margin-bottom:12px;background:var(--bg)">`;
    }
  }

  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:560px">
  <div class="modal-head"><h3><i class="ti ti-link" style="color:var(--teal)"></i> Xử lý thủ công — ${hd.so_hd||'Không có số HĐ'}</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body" style="display:block">
    ${previewHtml}
    <div style="background:var(--bg);border-radius:var(--r);padding:10px 14px;margin-bottom:12px;font-size:12px">
      <div style="font-weight:600;font-size:13px;margin-bottom:4px">${hd.loai_dv||'Không rõ loại'} — <span class="text-orange">${fmtM(hd.tong_tien)}</span></div>
      <div style="display:flex;gap:16px;color:var(--text-muted)">
        <span>📅 ${hd.ngay_hd||'—'}</span><span>🏢 Bán: ${hd.ten_don_vi_xuat||'—'}</span>${hd.ten_don_vi_mua?`<span>🧾 Mua: ${hd.ten_don_vi_mua}</span>`:''}
      </div>
      <div style="color:var(--danger);margin-top:6px;font-size:11px"><i class="ti ti-alert-circle"></i> ${hd.ly_do_cho||'Chưa khớp cont'}</div>
    </div>
    <div class="form-group" style="margin-bottom:8px">
      <label style="font-weight:600">Số cont *
        <span style="font-weight:400;color:var(--text-muted);font-size:11px">— CSHT có thể điền nhiều cont</span>
      </label>
      <div id="xuly-cont-list" style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;gap:6px;align-items:center">
          <input type="text" class="xuly-cont-input" placeholder="CSNU1519330" maxlength="11"
            oninput="this.value=formatCont(this.value);xuLyTimVanDon()"
            style="font-family:monospace;font-size:13px;letter-spacing:1px;text-transform:uppercase;flex:1">
          <button class="btn btn-xs btn-teal" onclick="xuLyThemCont()" title="Thêm cont"><i class="ti ti-plus"></i></button>
        </div>
      </div>
      <div id="xuly-vd-found" style="margin-top:6px;font-size:12px;min-height:20px"></div>
    </div>
    <div class="form-group">
      <label>Ghi chú</label>
      <textarea id="xuly-gc" rows="2" placeholder="Ghi chú thêm nếu cần..."></textarea>
    </div>
  </div>
  <div class="modal-foot">
    <button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="saveXuLyHD('${id}')"><i class="ti ti-check"></i> Xác nhận & tạo chi hộ</button>
  </div>
  </div>`;
  document.body.appendChild(bg);
}

function xuLyThemCont(){
  const list=document.getElementById('xuly-cont-list');
  const div=document.createElement('div');
  div.style.cssText='display:flex;gap:6px;align-items:center';
  div.innerHTML=`<input type="text" class="xuly-cont-input" placeholder="CSNU1519330" maxlength="11"
    oninput="this.value=formatCont(this.value);xuLyTimVanDon()"
    style="font-family:monospace;font-size:13px;letter-spacing:1px;text-transform:uppercase;flex:1">
    <button class="btn btn-xs btn-danger" onclick="this.parentElement.remove();xuLyTimVanDon()" title="Xóa"><i class="ti ti-x"></i></button>`;
  list.appendChild(div);
}

function xuLyTimVanDon(){
  const el=document.getElementById('xuly-vd-found');
  if(!el)return;
  const conts=[...document.querySelectorAll('.xuly-cont-input')]
    .map(i=>i.value.trim().toUpperCase()).filter(v=>v.length>=6);
  if(!conts.length){el.innerHTML='';return;}
  const found=ORDERS.filter(o=>o.so_cont&&conts.some(c=>o.so_cont.toUpperCase().includes(c)));
  if(!found.length){
    el.innerHTML=`<span style="color:var(--danger)"><i class="ti ti-x"></i> Không tìm thấy vận đơn nào</span>`;
  } else {
    el.innerHTML=`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--r);padding:6px 10px">
      <div style="font-weight:600;color:var(--success);margin-bottom:4px"><i class="ti ti-check"></i> Tìm thấy ${found.length} vận đơn:</div>
      ${found.slice(0,5).map(o=>`<div style="font-size:11px;padding:3px 0">
        ${o.ma_don} — ${o.ten_khach||'—'} — cont: <strong>${o.so_cont}</strong>
        ${o.locked?'<span style="background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 5px;font-size:10px">🔒</span>':''}
      </div>`).join('')}
    </div>`;
  }
}

// ── Hiện UI chọn tay khi 1 cont khớp nhiều vận đơn mà không phân biệt được bằng đổi lệnh ──
function renderXuLyChonTay(hdId,vdList,conts){
  const found=document.getElementById('xuly-vd-found');
  if(!found)return;
  found.innerHTML=`
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--r);padding:8px 10px;margin-top:4px">
    <div style="font-weight:600;color:#b45309;font-size:12px;margin-bottom:6px">
      <i class="ti ti-alert-triangle"></i> Cont ${conts.join(', ')} khớp ${vdList.length} vận đơn khác nhau — không có đổi lệnh nào phân biệt được.
      Tự chọn đúng vận đơn liên quan đến hóa đơn này (có thể tick nhiều nếu thật sự là 1 lô gộp):
    </div>
    ${vdList.map(v=>`
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 0;border-bottom:1px solid #fde68a;cursor:pointer">
        <input type="checkbox" class="xuly-vd-pick" value="${v.id}">
        <span style="flex:1">${v.ma_don} — ${v.ten_khach||'—'} — ${v.ngay||'—'} — cont: <strong>${v.so_cont}</strong>
        ${(+v.phi_doi_lenh>0||+v.tra_thau_doi_lenh>0)?'<span style="color:var(--teal)">· có đổi lệnh</span>':''}</span>
      </label>`).join('')}
    <button class="btn btn-xs btn-primary" style="margin-top:8px" onclick="saveXuLyHD('${hdId}',[...document.querySelectorAll('.xuly-vd-pick:checked')].map(i=>i.value))">
      <i class="ti ti-check"></i> Xác nhận lựa chọn & tạo chi hộ
    </button>
  </div>`;
}

async function saveXuLyHD(hdId,forcedVdIds=null){
  const conts=[...document.querySelectorAll('.xuly-cont-input')]
    .map(i=>i.value.trim().toUpperCase()).filter(v=>v.length>=6);
  const gc=document.getElementById('xuly-gc')?.value||'';
  if(!conts.length){toast('Vui lòng điền ít nhất 1 số cont','error');return;}

  const{data:hd}=await db.from('hoa_don').select('*').eq('id',hdId).single();
  if(!hd)return;

  // Tìm tất cả vận đơn khớp
  let vdList=[];
  for(const cont of conts){
    const{data:vds}=await db.from('van_don').select('*').ilike('so_cont','%'+cont+'%');
    if(vds?.length) vdList.push(...vds.filter(v=>!vdList.find(x=>x.id===v.id)));
  }
  if(!vdList.length){toast('Không tìm thấy vận đơn nào khớp','error');return;}

  if(forcedVdIds!==null){
    if(!forcedVdIds.length){toast('Vui lòng tick ít nhất 1 vận đơn trước khi xác nhận','error');return;}
    // OPS đã tự chọn tay từ bước cảnh báo mơ hồ — chỉ giữ đúng các VĐ được tick
    vdList=vdList.filter(v=>forcedVdIds.includes(v.id));
    if(!vdList.length){toast('Không có vận đơn nào được chọn','error');return;}
  } else if(vdList.length>1){
    // 1 cont nhưng khớp nhiều vận đơn khác nhau (cont tái sử dụng cho nhiều chuyến)
    // → áp dụng cùng logic an toàn như matchContToVanDon(): ưu tiên vận đơn có đổi lệnh
    const coDoiLenh=vdList.filter(v=>+v.phi_doi_lenh>0||+v.tra_thau_doi_lenh>0);
    if(coDoiLenh.length===1){
      // Chỉ 1 vận đơn có đổi lệnh → CHỈ ghi nhận đúng vận đơn đó, bỏ hẳn các vận đơn không liên quan
      vdList=coDoiLenh;
    } else {
      // Không phân biệt được tự động (0 hoặc ≥2 đổi lệnh) → KHÔNG tự gán chính/tham chiếu
      // Bắt OPS tự tick đúng vận đơn liên quan trước khi lưu
      renderXuLyChonTay(hdId,vdList,conts);
      return;
    }
  }

  // Tên file tải về đẹp: YYYY-MM_LoaiDV_CONT1-CONT2.pdf
  const displayName=buildDisplayName(hd.loai_dv,conts,hd.ngay_hd);

  // Tên chi hộ
  const contStr=conts.join(', ');
  const loaiChi=`${mapLoaiDv(hd.loai_dv)} + ${contStr}`;

  await db.from('hoa_don').update({
    trang_thai:'da_duyet',ly_do_cho:null,ai_ghi_chu:gc,
    nguoi_duyet:CU?.id,ngay_duyet:new Date().toISOString(),
    so_cont_list:conts,
    file_name:displayName||hd.file_name,
  }).eq('id',hdId);

  // Move file khỏi pending/ nếu đang nằm ở đó
  if(hd.storage_path&&hd.storage_path.startsWith('hoadon/pending/')){
    try{
      // Lấy tên khách từ vận đơn đầu tiên
      const tenKhach=vdList[0]?.ten_khach||null;
      // Build path mới đúng thư mục
      const fakeFile={name:hd.storage_path.split('/').pop(),type:'application/pdf'};
      const newPath=buildStoragePath(fakeFile, tenKhach, conts);
      const{error:moveErr}=await db.storage.from('hoa-don').move(hd.storage_path, newPath);
      if(!moveErr){
        // Cập nhật storage_path mới vào DB
        await db.from('hoa_don').update({storage_path:newPath}).eq('id',hdId);
      } else {
        console.warn('Move file non-fatal:', moveErr.message);
        // Không block — chi hộ vẫn tạo bình thường, file vẫn xem được
      }
    }catch(moveEx){
      console.warn('Move exception non-fatal:', moveEx);
    }
  }

  for(let i=0;i<vdList.length;i++){
    const vd=vdList[i];
    const laChinh=i===0;
    await db.from('hoa_don_van_don').insert({
      hoa_don_id:hdId,van_don_id:vd.id,so_cont:vd.so_cont,
      ma_don:vd.ma_don,so_tien:laChinh?hd.tong_tien:0,
      la_cont_chinh:laChinh,da_tao_chi_ho:true,
    });
    await db.from('chi_ho').insert({
      van_don_id:vd.id,ma_don:vd.ma_don,
      loai_chi:loaiChi,
      ngay_chi:hd.ngay_hd||today(),
      so_tien:laChinh?hd.tong_tien:0,
      tien_thu_khach:laChinh?hd.tong_tien:0,
      tien_tra_thau:0,tien_tra_laixe:0,
      nguoi_chi:CU?.ho_ten||'OPS',
      chung_tu:hd.so_hd,hoa_don_id:hdId,
      hoa_don_khach:true,
      la_tham_chieu:!laChinh,
      so_tien_hd_goc:laChinh?null:hd.tong_tien,
      ghi_chu:laChinh
        ?`HĐ ${hd.so_hd||''} | Bán: ${hd.ten_don_vi_xuat||'—'} | Mua: ${hd.ten_don_vi_mua||'—'}${gc?' | '+gc:''}`
        :`Tiền ghi nhận tại: ${vdList[0].so_cont}`,
    });
  }

  toast(`✅ Đã tạo chi hộ "${loaiChi}" cho ${vdList.length} vận đơn`);
  closeModal();
  pgHoaDon(document.getElementById('content'));
}

async function huyHD(id){
  const{data:hd}=await db.from('hoa_don').select('storage_path,trang_thai,so_hd').eq('id',id).single();
  if(hd?.trang_thai==='da_duyet'){
    toast('HĐ này đã tạo chi hộ — vào tab Chi hộ của vận đơn, xóa chi phí tương ứng để dọn đúng dữ liệu','error');
    return;
  }
  if(!confirm(`Hủy & xóa vĩnh viễn HĐ ${hd?.so_hd||'(không số)'}?\nFile trên Supabase Storage sẽ bị xóa, KHÔNG thể khôi phục!`))return;
  try{
    // Gỡ liên kết van_don nếu có (phòng trường hợp đã match nhưng chưa duyệt)
    await db.from('hoa_don_van_don').delete().eq('hoa_don_id',id);
    if(hd?.storage_path){
      const{error:rmErr}=await db.storage.from('hoa-don').remove([hd.storage_path]);
      if(rmErr)console.warn('Xóa file Storage lỗi (non-fatal):',rmErr.message);
    }
    const{error}=await db.from('hoa_don').delete().eq('id',id);
    if(error){toast('Lỗi DB: '+error.message,'error');return;}
    toast('Đã xóa hóa đơn & file Storage');
  }catch(e){
    toast('Lỗi: '+e.message,'error');return;
  }
  pgHoaDon(document.getElementById('content'));
}

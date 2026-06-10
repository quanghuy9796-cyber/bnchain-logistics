// HOADON.JS — Upload & Xử lý Hóa Đơn, AI Scan
// Requires: config.js

async function pgHoaDon(c){
  c.innerHTML='<div class="loading"><i class="ti ti-loader-2"></i>Đang tải...</div>';
  const[{data:cho},{data:daKhop}]=await Promise.all([
    db.from('hoa_don').select('*').eq('trang_thai','cho_xu_ly').order('created_at',{ascending:false}),
    db.from('hoa_don').select('*').in('trang_thai',['da_khop','cho_duyet']).order('created_at',{ascending:false}).limit(50),
  ]);
  const choList=cho||[];
  const khopList=daKhop||[];

  c.innerHTML=`
  <!-- UPLOAD AREA -->
  <div style="background:linear-gradient(135deg,var(--teal),var(--teal-dark));border-radius:var(--rl);padding:16px 20px;margin-bottom:16px;color:#fff">
    <div style="font-size:14px;font-weight:600;margin-bottom:4px"><i class="ti ti-cloud-upload"></i> Upload Hóa Đơn Điện Tử</div>
    <div style="font-size:11px;opacity:.8;margin-bottom:12px">Kéo thả nhiều file PDF/ảnh cùng lúc — AI tự đọc và khớp với vận đơn</div>
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

  <!-- PROGRESS (ẩn ban đầu) -->
  <div id="hd-progress-area" style="display:none;margin-bottom:16px">
    <div style="font-size:12px;font-weight:600;color:var(--teal);margin-bottom:8px" id="hd-progress-label">Đang xử lý...</div>
    <div style="background:var(--bg);border-radius:var(--r);height:8px;overflow:hidden">
      <div id="hd-progress-bar" style="background:var(--teal);height:8px;border-radius:var(--r);width:0%;transition:width .3s"></div>
    </div>
    <div id="hd-file-list" style="margin-top:10px"></div>
  </div>

  <!-- KẾT QUẢ SAU KHI PROCESS -->
  <div id="hd-result-area" style="display:none;margin-bottom:16px"></div>

  <!-- QUEUE CHỜ XỬ LÝ -->
  ${choList.length?`
  <div style="margin-bottom:14px">
    <div style="font-size:12px;font-weight:600;color:var(--danger);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;display:flex;align-items:center;gap:6px">
      <i class="ti ti-alert-circle"></i> CHỜ XỬ LÝ (${choList.length} hóa đơn)
    </div>
    <div class="tbl-wrap"><table class="tbl">
      <colgroup><col style="width:80px"><col style="width:90px"><col style="width:150px"><col style="width:100px"><col style="width:120px"><col style="width:150px"><col style="width:120px"></colgroup>
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

  <!-- ĐÃ KHỚP / CHỜ DUYỆT -->
  ${khopList.length?`
  <div>
    <div style="font-size:12px;font-weight:600;color:var(--success);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
      <span><i class="ti ti-check-circle"></i> ĐÃ KHỚP — CHỜ KẾ TOÁN DUYỆT (${khopList.length})</span>
      ${canSee(['ke_toan','ceo'])?`<button class="btn btn-sm btn-success" onclick="duyetTatCa()"><i class="ti ti-checks"></i> Duyệt tất cả</button>`:''}
    </div>
    <div class="tbl-wrap"><table class="tbl">
      <colgroup><col style="width:80px"><col style="width:90px"><col style="width:150px"><col style="width:100px"><col style="width:150px"><col style="width:100px"><col style="width:120px"></colgroup>
      <thead><tr><th>Ngày HĐ</th><th>Số HĐ</th><th>Loại DV</th><th>Số tiền</th><th>Vận đơn khớp</th><th>Độ tin cậy</th><th>Thao tác</th></tr></thead>
      <tbody>
      ${khopList.map(h=>`<tr>
        <td>${h.ngay_hd||'—'}</td>
        <td style="color:var(--teal)">${h.so_hd||'—'}</td>
        <td>${h.loai_dv||'—'}</td>
        <td class="text-orange fw6">${fmtM(h.tong_tien)}</td>
        <td style="font-size:11px">${(h.so_cont_list||[]).join(', ')||'—'}</td>
        <td><span class="tag ${h.ai_confidence==='cao'?'tag-done':h.ai_confidence==='trung_binh'?'tag-cho':'tag-huy'}">${h.ai_confidence==='cao'?'Cao':h.ai_confidence==='trung_binh'?'TB':'Thấp'}</span></td>
        <td><div style="display:flex;gap:4px">
          ${h.storage_path?`<button class="btn btn-xs" onclick="xemHoaDon('${h.id}','${h.storage_path}')" title="Xem file"><i class="ti ti-eye"></i></button>`:''}
          ${canSee(['ke_toan','ceo'])?`<button class="btn btn-xs btn-success" onclick="duyetHD('${h.id}')"><i class="ti ti-check"></i> Duyệt</button>`:''}
          <button class="btn btn-xs btn-danger" onclick="huyHD('${h.id}')"><i class="ti ti-x"></i></button>
        </div></td>
      </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`:''}

  ${!choList.length&&!khopList.length?'<div class="empty"><i class="ti ti-inbox"></i>Chưa có hóa đơn nào. Upload file để bắt đầu!</div>':''}`;
}

function handleHDDrop(e){
  e.preventDefault();
  document.getElementById('hd-drop-area').style.borderColor='rgba(255,255,255,.4)';
  handleHDFiles(e.dataTransfer.files);
}

async function handleHDFiles(files){
  if(!files||!files.length)return;
  const fileArr=Array.from(files).slice(0,20);
  
  // Show progress
  document.getElementById('hd-progress-area').style.display='block';
  document.getElementById('hd-result-area').style.display='none';
  
  const results={matched:[],pending:[]};
  
  for(let i=0;i<fileArr.length;i++){
    const file=fileArr[i];
    const pct=Math.round((i/fileArr.length)*100);
    document.getElementById('hd-progress-bar').style.width=pct+'%';
    document.getElementById('hd-progress-label').textContent=`Đang xử lý ${i+1}/${fileArr.length}: ${file.name}`;
    
    // Update file list
    document.getElementById('hd-file-list').innerHTML=fileArr.map((f,j)=>`
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)">
        <i class="ti ti-${j<i?'check-circle':j===i?'loader-2':''}" style="color:${j<i?'var(--success)':j===i?'var(--teal)':'var(--text-muted)'};${j===i?'animation:spin 1s linear infinite':''}"></i>
        <span style="flex:1">${f.name}</span>
        <span style="color:var(--text-muted);font-size:11px">${j<i?'✅ Xong':j===i?'🔄 Đang đọc...':'⏳ Chờ'}</span>
      </div>`).join('');
    
    try{
      const[hdList,storagePath]=await Promise.all([
        processOneHD(file),
        uploadHDToStorage(file),
      ]);
      for(let k=0;k<hdList.length;k++){
        const hdData=hdList[k];
        const pageLabel=hdList.length>1?` (trang ${k+1}/${hdList.length})`:'';
        try{
          const saved=await saveHoaDon(hdData,file.name+pageLabel,storagePath);
          if(hdData.trang_thai==='da_khop') results.matched.push({...hdData,id:saved.id,file:file.name+pageLabel});
          else results.pending.push({...hdData,id:saved.id,file:file.name+pageLabel,ly_do:hdData.ly_do_cho});
        }catch(saveErr){
          results.pending.push({file:file.name+pageLabel,ly_do:'Lỗi lưu: '+saveErr.message,tong_tien:0});
        }
      }
    }catch(err){
      results.pending.push({file:file.name,ly_do:'Lỗi đọc AI: '+err.message,tong_tien:0});
    }
  }

  // Done — update file list: tất cả xong
  document.getElementById('hd-progress-bar').style.width='100%';
  document.getElementById('hd-progress-label').textContent=`✅ Hoàn tất ${fileArr.length} hóa đơn`;
  document.getElementById('hd-file-list').innerHTML=fileArr.map(f=>`
    <div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)">
      <i class="ti ti-check-circle" style="color:var(--success)"></i>
      <span style="flex:1">${f.name}</span>
      <span style="color:var(--text-muted);font-size:11px">✅ Xong</span>
    </div>`).join('');

  // Reload queue trước, rồi show kết quả tóm tắt + scroll xuống
  await pgHoaDon(document.getElementById('content'));
  showHDResults(results);
  setTimeout(()=>{
    const ra=document.getElementById('hd-result-area');
    if(ra) ra.scrollIntoView({behavior:'smooth',block:'start'});
  },100);
}

async function processOneHD(file){
  // Read file as base64
  const base64=await new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=()=>res(r.result.split(',')[1]);
    r.onerror=()=>rej(new Error('Không đọc được file'));
    r.readAsDataURL(file);
  });

  const isImage=file.type.startsWith('image/');
  const mediaType=isImage?file.type:'application/pdf';

  // PDF nhiều trang = nhiều HĐ → trả về mảng
  // Ảnh 1 trang → trả về mảng 1 phần tử
  const prompt=`Đây là file hóa đơn/biên lai dịch vụ logistics tại cảng Hải Phòng, Việt Nam.
File có thể có NHIỀU TRANG, mỗi trang là 1 hóa đơn riêng biệt.
Đọc TẤT CẢ các trang. Trả về JSON ARRAY (chỉ array thuần, không markdown, không giải thích):
[
  {
    "so_hd": "số hóa đơn hoặc số biên lai",
    "ngay_hd": "ngày trên HĐ format YYYY-MM-DD",
    "loai_dv": "Nâng hàng / Hạ vỏ / Nâng vỏ / Hạ hàng / CSHT / Lưu cont / Phí cảng / Giám sát HQ",
    "tong_tien": số tiền VNĐ cuối cùng (số nguyên không dấu phẩy),
    "so_cont_list": ["POLU4510295"],
    "loai_cont": "20DC hoặc 40HC v.v",
    "mst_khach": "mã số thuế đơn vị MUA",
    "ten_don_vi_xuat": "tên đơn vị BÁN hóa đơn",
    "ghi_chu": "thông tin thêm quan trọng",
    "confidence": "cao / trung_binh / thap"
  }
]
Lưu ý: số cont thường sau "Công-te-nơ số:" hoặc trong tên DV như POLU4510295-40HC-GP`;

  const response=await fetch(PROXY_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'gemini-2.5-flash',
      contents:[{
        parts:[
          {inline_data:{mime_type:mediaType,data:base64}},
          {text:prompt}
        ]
      }]
    })
  });

  const data=await response.json();
  if(data.error) throw new Error('Gemini: '+(data.error.message||JSON.stringify(data.error)));
  const text=data.text||'';

  // Extract JSON array hoặc object từ response
  const arrMatch=text.match(/\[[\s\S]*\]/);
  const objMatch=text.match(/\{[\s\S]*\}/);
  if(!arrMatch&&!objMatch) throw new Error('AI không trả về JSON hợp lệ. Raw: '+text.slice(0,200));

  // Parse thành mảng
  let aiList=[];
  if(arrMatch){
    aiList=JSON.parse(arrMatch[0]);
    if(!Array.isArray(aiList)) aiList=[aiList];
  } else {
    aiList=[JSON.parse(objMatch[0])];
  }

  // Xử lý từng HĐ trong array → trả về array kết quả
  const resultList=[];
  for(const ai of aiList){
    const matched=await matchContToVanDon(ai);
    resultList.push({
      so_hd:ai.so_hd||null,
      ngay_hd:ai.ngay_hd||null,
      loai_dv:ai.loai_dv||null,
      tong_tien:ai.tong_tien||0,
      so_cont_list:ai.so_cont_list||[],
      mst_khach:ai.mst_khach||null,
      ten_don_vi_xuat:ai.ten_don_vi_xuat||null,
      ai_confidence:ai.confidence||'trung_binh',
      ai_ghi_chu:ai.ghi_chu||null,
      ...matched,
    });
  }
  return resultList; // luôn trả về array
}

async function matchContToVanDon(ai){
  const conts=ai.so_cont_list||[];
  
  // Case 1: Có số cont → tìm trong van_don
  if(conts.length>0){
    const{data:vds}=await db.from('van_don').select('id,ma_don,so_cont,ten_khach,loai_hang')
      .in('so_cont',conts);
    if(vds&&vds.length>0){
      return{
        trang_thai:'da_khop',
        van_don_matches:vds,
        so_cont_list:conts,
      };
    }
  }
  
  // Case 2: HĐ CSHT (không có cont, có tổng tiền)
  if(conts.length===0&&ai.tong_tien>0){
    const tiLe=ai.tong_tien/500000;
    const soCont40=Math.round(tiLe);
    const soCont20=Math.round(ai.tong_tien/250000);
    return{
      trang_thai:'cho_xu_ly',
      ly_do_cho:`HĐ CSHT — Ước tính ${soCont40} cont 40 hoặc ${soCont20} cont 20. Cần chọn bill/booking.`,
      so_cont_list:[],
    };
  }
  
  // Case 3: Có cont nhưng không tìm thấy trong DB
  if(conts.length>0){
    return{
      trang_thai:'cho_xu_ly',
      ly_do_cho:`Số cont ${conts.join(', ')} chưa có trong hệ thống. Kiểm tra lại vận đơn.`,
      so_cont_list:conts,
    };
  }
  
  return{
    trang_thai:'cho_xu_ly',
    ly_do_cho:'AI không đọc được số cont. Kiểm tra lại hóa đơn.',
    so_cont_list:[],
  };
}

async function uploadHDToStorage(file){
  try{
    const now=new Date();
    const ym=`${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}`;
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=`hoadon/${ym}/${Date.now()}_${safeName}`;
    const{error}=await db.storage.from('hoa-don').upload(path,file,{contentType:file.type,upsert:false});
    if(error){console.warn('Storage upload (non-fatal):',error.message);return null;}
    return path;
  }catch(e){console.warn('Storage upload exception:',e);return null;}
}

async function xemHoaDon(hdId,storagePath){
  if(!storagePath){
    if(hdId){
      const{data:hd}=await db.from('hoa_don').select('storage_path,file_name').eq('id',hdId).single();
      if(hd?.storage_path) storagePath=hd.storage_path;
      else{toast('Chưa có file đính kèm cho hóa đơn này','error');return;}
    } else {toast('Không tìm thấy file','error');return;}
  }
  const{data,error}=await db.storage.from('hoa-don').createSignedUrl(storagePath,3600);
  if(error||!data?.signedUrl){toast('Không thể tải file: '+(error?.message||'Lỗi Storage'),'error');return;}
  const isPdf=storagePath.toLowerCase().endsWith('.pdf');
  const url=data.signedUrl;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:90vw;max-width:900px;height:90vh;display:flex;flex-direction:column">
  <div class="modal-head" style="flex-shrink:0">
    <h3><i class="ti ti-file-invoice" style="color:var(--teal)"></i> Xem hóa đơn</h3>
    <div style="display:flex;gap:6px;align-items:center">
      <a href="${url}" download target="_blank" class="btn btn-sm btn-teal"><i class="ti ti-download"></i> Tải về</a>
      <button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
    </div>
  </div>
  <div style="flex:1;overflow:hidden;border-radius:0 0 var(--rl) var(--rl)">
    ${isPdf
      ?`<iframe src="${url}" style="width:100%;height:100%;border:none"></iframe>`
      :`<div style="width:100%;height:100%;overflow:auto;display:flex;align-items:center;justify-content:center;background:#f5f5f5">
          <img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px">
        </div>`
    }
  </div>
  </div>`;
  document.body.appendChild(bg);
}

async function downloadHD(hdId){
  const{data:hd}=await db.from('hoa_don').select('storage_path,file_name').eq('id',hdId).single();
  if(!hd?.storage_path){toast('Chưa có file đính kèm','error');return;}
  const{data,error}=await db.storage.from('hoa-don').createSignedUrl(hd.storage_path,300);
  if(error||!data?.signedUrl){toast('Lỗi tạo link tải','error');return;}
  const a=document.createElement('a');a.href=data.signedUrl;a.download=hd.file_name||'hoadon';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}

async function saveHoaDon(hd,fileName,storagePath=null){
  const{data,error}=await db.from('hoa_don').insert({
    so_hd:hd.so_hd,
    ngay_hd:hd.ngay_hd,
    loai_dv:hd.loai_dv,
    tong_tien:hd.tong_tien,
    so_cont_list:hd.so_cont_list,
    mst_khach:hd.mst_khach,
    ten_don_vi_xuat:hd.ten_don_vi_xuat,
    trang_thai:hd.trang_thai,
    ly_do_cho:hd.ly_do_cho||null,
    ai_confidence:hd.ai_confidence,
    ai_ghi_chu:hd.ai_ghi_chu,
    nguoi_upload:CU?.id,
    ten_nguoi_upload:CU?.ho_ten,
    file_name:fileName,
    storage_path:storagePath||null,
  }).select().single();
  if(error)throw new Error(error.message);
  
  // Nếu khớp → tạo liên kết hoa_don_van_don
  if(hd.trang_thai==='da_khop'&&hd.van_don_matches?.length){
    for(let i=0;i<hd.van_don_matches.length;i++){
      const vd=hd.van_don_matches[i];
      const soTien=i===0?hd.tong_tien:0; // cont đầu chịu tiền
      await db.from('hoa_don_van_don').insert({
        hoa_don_id:data.id,
        van_don_id:vd.id,
        so_cont:vd.so_cont,
        ma_don:vd.ma_don,
        so_tien:soTien,
        la_cont_chinh:i===0,
        da_tao_chi_ho:false,
      });
    }
  }
  return data;
}

function showHDResults(results){
  const ra=document.getElementById('hd-result-area');
  ra.style.display='block';
  ra.innerHTML=`
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
    <div class="stat-card" style="border-color:var(--success)">
      <div class="stat-lbl">✅ Khớp tự động</div>
      <div class="stat-val text-green">${results.matched.length}</div>
      <div class="stat-sub">Chờ kế toán duyệt</div>
    </div>
    <div class="stat-card" style="border-color:var(--danger)">
      <div class="stat-lbl">⚠️ Cần xử lý thêm</div>
      <div class="stat-val text-red">${results.pending.length}</div>
      <div class="stat-sub">Xem queue bên dưới</div>
    </div>
  </div>
  ${results.matched.length?`
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--r);padding:10px 14px;margin-bottom:10px">
    <div style="font-size:11px;font-weight:600;color:var(--success);margin-bottom:6px">ĐÃ KHỚP TỰ ĐỘNG</div>
    ${results.matched.map(h=>`<div style="font-size:12px;padding:3px 0;border-bottom:1px solid #d1fae5">
      📄 ${h.file} → ${h.loai_dv||'?'} | ${fmtM(h.tong_tien)} | Cont: ${(h.so_cont_list||[]).join(', ')||'?'}
    </div>`).join('')}
  </div>`:''}
  ${results.pending.length?`
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:var(--r);padding:10px 14px;margin-bottom:10px">
    <div style="font-size:11px;font-weight:600;color:var(--danger);margin-bottom:6px">CẦN XỬ LÝ THÊM</div>
    ${results.pending.map(h=>`<div style="font-size:12px;padding:3px 0;border-bottom:1px solid #fee2e2">
      ⚠️ ${h.file} — ${h.ly_do||'Lỗi xử lý'}
    </div>`).join('')}
  </div>`:''}
  <div style="font-size:11px;color:var(--text-muted);text-align:center;padding:6px 0">
    ↓ Danh sách queue đã được cập nhật bên dưới
  </div>`;
}

async function xuLyHD(id){
  const{data:hd}=await db.from('hoa_don').select('*').eq('id',id).single();
  if(!hd)return;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:540px">
  <div class="modal-head"><h3><i class="ti ti-link" style="color:var(--teal)"></i> Xử lý hóa đơn thủ công</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body" style="display:block">
    <!-- Thông tin HĐ -->
    <div style="background:var(--bg);border-radius:var(--r);padding:10px 14px;margin-bottom:14px;font-size:12px">
      <div style="font-weight:600;font-size:13px;margin-bottom:4px">${hd.loai_dv||'Không rõ loại'} — ${hd.so_hd||'Không có số HĐ'}</div>
      <div style="display:flex;gap:16px;color:var(--text-muted)">
        <span>💰 <strong class="text-orange">${fmtM(hd.tong_tien)}</strong></span>
        <span>📅 ${hd.ngay_hd||'—'}</span>
        <span>🏢 ${hd.ten_don_vi_xuat||'—'}</span>
      </div>
      <div style="color:var(--danger);margin-top:6px;font-size:11px"><i class="ti ti-alert-circle"></i> ${hd.ly_do_cho||'Chưa khớp cont'}</div>
    </div>
    <!-- Điền số cont -->
    <div class="form-group" style="margin-bottom:12px">
      <label style="font-weight:600">Số cont liên quan * <span style="font-weight:400;color:var(--text-muted)">(11 ký tự, vd: CSNU1519330)</span></label>
      <input type="text" id="xuly-cont" placeholder="CSNU1519330" maxlength="11"
        oninput="this.value=formatCont(this.value);xuLyTimVanDon(this.value)"
        style="font-family:monospace;font-size:14px;letter-spacing:1px;text-transform:uppercase">
      <div id="xuly-vd-found" style="margin-top:6px;font-size:12px;min-height:20px"></div>
    </div>
    <div class="form-group">
      <label>Ghi chú</label>
      <textarea id="xuly-gc" rows="2" placeholder="Ghi chú thêm nếu cần..."></textarea>
    </div>
  </div>
  <div class="modal-foot">
    <button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" id="xuly-btn-ok" onclick="saveXuLyHD('${id}')"><i class="ti ti-check"></i> Xác nhận & tạo chi hộ</button>
  </div>
  </div>`;
  document.body.appendChild(bg);
}

function xuLyTimVanDon(cont){
  const el=document.getElementById('xuly-vd-found');
  if(!el)return;
  if(cont.length<6){el.innerHTML='';return;}
  const found=ORDERS.filter(o=>o.so_cont&&o.so_cont.toUpperCase().includes(cont.toUpperCase()));
  if(found.length===0){
    el.innerHTML=`<span style="color:var(--danger)"><i class="ti ti-x"></i> Không tìm thấy vận đơn nào có cont này</span>`;
  } else {
    el.innerHTML=`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--r);padding:6px 10px">
      <div style="font-weight:600;color:var(--success);margin-bottom:4px"><i class="ti ti-check"></i> Tìm thấy ${found.length} vận đơn:</div>
      ${found.slice(0,3).map(o=>`<div style="font-size:11px;padding:3px 0;display:flex;align-items:center;gap:6px">
        <span>${o.ma_don} — ${o.ten_khach||'—'} — cont: <strong>${o.so_cont}</strong></span>
        ${o.locked?'<span style="background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 5px;font-size:10px">🔒 Đã khóa</span>':'<span style="background:#dcfce7;color:#166534;border-radius:4px;padding:1px 5px;font-size:10px">✓ Đang mở</span>'}
      </div>`).join('')}
    </div>`;
  }
}

async function saveXuLyHD(hdId){
  const cont=document.getElementById('xuly-cont').value.trim().toUpperCase();
  const gc=document.getElementById('xuly-gc').value;
  if(!cont||cont.length<6){toast('Vui lòng điền số cont','error');return;}

  // Tìm vận đơn theo số cont
  const{data:vds}=await db.from('van_don').select('*').ilike('so_cont','%'+cont+'%');
  if(!vds||vds.length===0){toast('Không tìm thấy vận đơn nào có cont '+cont,'error');return;}
  const vd=vds[0]; // lấy vận đơn đầu tiên khớp

  // Lấy thông tin HĐ
  const{data:hd}=await db.from('hoa_don').select('*').eq('id',hdId).single();
  if(!hd)return;

  // Cập nhật trạng thái HĐ
  await db.from('hoa_don').update({trang_thai:'da_duyet',ly_do_cho:null,ai_ghi_chu:gc,nguoi_duyet:CU?.id,ngay_duyet:new Date().toISOString()}).eq('id',hdId);

  // Tạo liên kết hoa_don_van_don
  await db.from('hoa_don_van_don').insert({
    hoa_don_id:hdId,van_don_id:vd.id,so_cont:vd.so_cont,
    ma_don:vd.ma_don,so_tien:hd.tong_tien,la_cont_chinh:true,da_tao_chi_ho:true,
  });

  // Tạo chi_ho luôn
  await db.from('chi_ho').insert({
    van_don_id:vd.id,
    ma_don:vd.ma_don,
    loai_chi:hd.loai_dv||'Chi hộ HĐ',
    ngay_chi:hd.ngay_hd||today(),
    so_tien:hd.tong_tien,
    tien_thu_khach:hd.tong_tien,
    tien_tra_thau:0,tien_tra_laixe:0,
    nguoi_chi:hd.ten_nguoi_upload||'OPS',
    chung_tu:hd.so_hd,
    hoa_don_id:hdId,
    hoa_don_khach:true,
    da_thu_lai:false,
    ghi_chu:`HĐ ${hd.so_hd||''} | ${hd.ten_don_vi_xuat||''} | Nhập tay: ${cont}${gc?(' | '+gc):''}`,
  });

  toast('✅ Đã tạo chi hộ cho cont '+vd.so_cont+' — '+vd.ma_don);
  closeModal();
  pgHoaDon(document.getElementById('content'));
}

async function duyetHD(id){
  if(!canSee(['ke_toan','ceo'])){toast('Không có quyền','error');return;}
  const{data:hdvds}=await db.from('hoa_don_van_don').select('*').eq('hoa_don_id',id).eq('la_cont_chinh',true);
  const{data:hd}=await db.from('hoa_don').select('*').eq('id',id).single();
  if(!hd||!hdvds?.length){toast('Không tìm thấy thông tin','error');return;}

  // Tìm thông tin vận đơn để hiển thị xác nhận
  const main=hdvds[0];
  const vd=ORDERS.find(x=>x.id===main.van_don_id)||{ma_don:main.ma_don,so_cont:main.so_cont,ten_khach:'—'};

  // Modal xác nhận trước khi tạo chi hộ
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:480px">
  <div class="modal-head"><h3><i class="ti ti-check-circle" style="color:var(--success)"></i> Xác nhận duyệt hóa đơn</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body" style="display:block">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--r);padding:12px 14px;margin-bottom:12px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Chi phí sẽ được tạo</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
        <div><span style="color:var(--text-muted)">Loại DV:</span> <strong>${hd.loai_dv||'—'}</strong></div>
        <div><span style="color:var(--text-muted)">Số HĐ:</span> <strong>${hd.so_hd||'—'}</strong></div>
        <div><span style="color:var(--text-muted)">Số tiền:</span> <strong class="text-orange">${fmtM(hd.tong_tien)}</strong></div>
        <div><span style="color:var(--text-muted)">Ngày HĐ:</span> <strong>${hd.ngay_hd||'—'}</strong></div>
        <div><span style="color:var(--text-muted)">Vận đơn:</span> <strong>${vd.ma_don}</strong></div>
        <div><span style="color:var(--text-muted)">Số cont:</span> <strong style="font-family:monospace">${vd.so_cont||main.so_cont||'—'}</strong></div>
        <div style="grid-column:1/-1"><span style="color:var(--text-muted)">Khách hàng:</span> <strong>${vd.ten_khach||'—'}</strong></div>
        <div style="grid-column:1/-1"><span style="color:var(--text-muted)">Đơn vị xuất HĐ:</span> ${hd.ten_don_vi_xuat||'—'}</div>
      </div>
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--r);padding:8px 12px;font-size:11px;color:#92400e">
      <i class="ti ti-info-circle"></i> Sau khi duyệt, chi phí sẽ tự động vào <strong>Chi hộ có HĐ (Phần 2)</strong> của vận đơn trên.
    </div>
  </div>
  <div class="modal-foot">
    <button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-success" onclick="confirmDuyetHD('${id}')"><i class="ti ti-check"></i> Xác nhận duyệt</button>
  </div>
  </div>`;
  document.body.appendChild(bg);
}

async function confirmDuyetHD(id,skipReload=false){
  closeModal();
  if(!canSee(['ke_toan','ceo'])){toast('Không có quyền','error');return;}
  const{data:hdvds}=await db.from('hoa_don_van_don').select('*').eq('hoa_don_id',id).eq('la_cont_chinh',true);
  const{data:hd}=await db.from('hoa_don').select('*').eq('id',id).single();
  if(!hd||!hdvds?.length){toast('Không tìm thấy thông tin','error');return;}

  const main=hdvds[0];

  // Lấy tất cả cont liên quan đến HĐ này
  const contList=hd.so_cont_list||[];
  // Tìm các vận đơn phụ (cont phụ) — trừ cont chính
  const contPhu=contList.filter(c=>c!==main.so_cont);
  const vdPhuList=[];
  for(const cont of contPhu){
    const{data:vds}=await db.from('van_don').select('id,ma_don,so_cont,ten_khach').ilike('so_cont','%'+cont+'%');
    if(vds?.length) vdPhuList.push(...vds.filter(v=>v.id!==main.van_don_id));
  }

  // Tạo chi_ho CHÍNH cho cont chính — ghi nhận số tiền thật
  const contPhuStr=contPhu.length?` | Chung với: ${contPhu.join(', ')}`:'';
  await db.from('chi_ho').insert({
    van_don_id:main.van_don_id,
    ma_don:main.ma_don,
    loai_chi:hd.loai_dv||'Chi hộ HĐ',
    ngay_chi:hd.ngay_hd||today(),
    so_tien:hd.tong_tien,
    tien_thu_khach:hd.tong_tien,
    tien_tra_thau:0,tien_tra_laixe:0,
    nguoi_chi:hd.ten_nguoi_upload||'OPS',
    chung_tu:hd.so_hd,
    hoa_don_id:id,
    hoa_don_khach:true,
    da_thu_lai:false,
    la_tham_chieu:false,
    ghi_chu:`HĐ ${hd.so_hd||''} | ${hd.ten_don_vi_xuat||''}${contPhuStr}`,
  });

  // Tạo chi_ho THAM CHIẾU cho các cont phụ — không tính tiền, chỉ để note
  for(const vdPhu of vdPhuList){
    const contChinh=main.so_cont||main.ma_don;
    const contPhiChinh=contPhu.filter(c=>c!==vdPhu.so_cont);
    const cungVoiStr=[contChinh,...contPhiChinh].filter(Boolean).join(', ');
    await db.from('chi_ho').insert({
      van_don_id:vdPhu.id,
      ma_don:vdPhu.ma_don,
      loai_chi:hd.loai_dv||'Chi hộ HĐ',
      ngay_chi:hd.ngay_hd||today(),
      so_tien:0,
      tien_thu_khach:0,
      tien_tra_thau:0,tien_tra_laixe:0,
      nguoi_chi:hd.ten_nguoi_upload||'OPS',
      chung_tu:hd.so_hd,
      hoa_don_id:id,
      hoa_don_khach:true,
      da_thu_lai:false,
      la_tham_chieu:true,
      so_tien_hd_goc:hd.tong_tien,
      ghi_chu:`Tiền ghi nhận tại: ${cungVoiStr}`,
    });
  }

  // Cập nhật trạng thái HĐ và liên kết
  await db.from('hoa_don').update({trang_thai:'da_duyet',nguoi_duyet:CU?.id,ngay_duyet:new Date().toISOString()}).eq('id',id);
  await db.from('hoa_don_van_don').update({da_tao_chi_ho:true}).eq('hoa_don_id',id);

  if(!skipReload){
    const msg=vdPhuList.length>0
      ?`✅ Đã duyệt — Tạo chi hộ chính + ${vdPhuList.length} note tham chiếu cho các cont liên quan`
      :'✅ Đã duyệt — Chi hộ đã được tạo tự động';
    toast(msg);
    pgHoaDon(document.getElementById('content'));
  }
}

async function duyetTatCa(){
  if(!canSee(['ke_toan','ceo'])){toast('Không có quyền','error');return;}
  if(!confirm('Duyệt tất cả hóa đơn đang chờ?'))return;
  const{data:list}=await db.from('hoa_don').select('id').eq('trang_thai','da_khop');
  if(!list?.length){toast('Không có HĐ nào chờ duyệt');return;}
  let count=0;
  for(const h of list){
    try{await confirmDuyetHD(h.id,true);count++;}catch(e){console.error('Lỗi duyệt',h.id,e);}
  }
  toast(`✅ Đã duyệt ${count}/${list.length} hóa đơn`);
  pgHoaDon(document.getElementById('content'));
}

async function huyHD(id){
  if(!confirm('Hủy hóa đơn này?'))return;
  await db.from('hoa_don').update({trang_thai:'huy'}).eq('id',id);
  toast('Đã hủy');
  pgHoaDon(document.getElementById('content'));
}

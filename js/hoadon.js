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
      const hdData=await processOneHD(file);
      const saved=await saveHoaDon(hdData, file.name);
      if(hdData.trang_thai==='da_khop') results.matched.push({...hdData,id:saved.id,file:file.name});
      else results.pending.push({...hdData,id:saved.id,file:file.name,ly_do:hdData.ly_do_cho});
    }catch(err){
      results.pending.push({file:file.name,ly_do:'Lỗi: '+err.message,tong_tien:0});
    }
  }
  
  // Done
  document.getElementById('hd-progress-bar').style.width='100%';
  document.getElementById('hd-progress-label').textContent=`✅ Hoàn tất ${fileArr.length} hóa đơn`;
  
  // Show results
  showHDResults(results);
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
  
  // Prompt đọc hóa đơn — dùng chung cho cả PDF và ảnh
  const prompt=`Đây là hóa đơn/biên lai dịch vụ logistics tại cảng Hải Phòng, Việt Nam. File có thể có nhiều trang.
Đọc TẤT CẢ các trang và trả về JSON duy nhất (chỉ JSON thuần, không markdown, không giải thích):
{
  "so_hd": "số hóa đơn hoặc số biên lai (vd: 30486 hoặc 1462063)",
  "ngay_hd": "ngày trên HĐ format YYYY-MM-DD",
  "loai_dv": "loại dịch vụ chính: Nâng hàng / Hạ vỏ / Nâng vỏ / Hạ hàng / CSHT / Lưu cont / Phí cảng / Giám sát HQ",
  "tong_tien": số tiền VNĐ cuối cùng phải thanh toán (số nguyên, không dấu phẩy, không VAT label),
  "so_cont_list": ["POLU4510295","FFAU7443981"],
  "loai_cont": "20DC hoặc 40HC hoặc 40DC v.v",
  "mst_khach": "mã số thuế đơn vị MUA (không phải bán)",
  "ten_don_vi_xuat": "tên đơn vị BÁN/xuất hóa đơn",
  "ghi_chu": "thông tin thêm: tờ khai, loại hình, ghi chú quan trọng",
  "confidence": "cao nếu đọc rõ số cont / trung_binh nếu không chắc / thap nếu mờ hoặc không có"
}
Lưu ý: số cont thường xuất hiện sau chữ "Công-te-nơ số:" hoặc trong tên dịch vụ như POLU4510295-40HC-GP`;

  // Build Gemini request — cùng format cho cả ảnh lẫn PDF
  const filePart={
    inline_data:{
      mime_type: mediaType,
      data: base64,
    }
  };

  const response=await fetch(PROXY_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'gemini-2.5-flash',
      contents:[{
        parts:[
          filePart,
          {text: prompt}
        ]
      }]
    })
  });

  const data=await response.json();
  if(data.error) throw new Error('Gemini: '+data.error);
  const text=data.text||'{}';
  const jsonMatch=text.match(/\{[\s\S]*\}/);
  if(!jsonMatch) throw new Error('AI không trả về JSON hợp lệ');
  const ai=JSON.parse(jsonMatch[0]);
  
  // Try to match with van_don
  const matched=await matchContToVanDon(ai);
  
  return{
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
  };
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

async function saveHoaDon(hd, fileName){
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
  <button class="btn btn-teal" style="width:100%;justify-content:center" onclick="pgHoaDon(document.getElementById('content'))">
    <i class="ti ti-refresh"></i> Xem danh sách queue
  </button>`;
}

async function xuLyHD(id){
  // Mở modal để chọn vận đơn thủ công
  const{data:hd}=await db.from('hoa_don').select('*').eq('id',id).single();
  if(!hd)return;
  const vdopts=ORDERS.filter(o=>!o.locked).slice(0,200).map(o=>`<option value="${o.id}">${o.ma_don} — ${o.ten_khach} — ${o.so_cont||'chưa có cont'} — ${o.ngay}</option>`).join('');
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:520px">
  <div class="modal-head"><h3><i class="ti ti-link" style="color:var(--teal)"></i> Xử lý thủ công</h3><button class="btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="modal-body" style="display:block">
    <div style="background:var(--bg);border-radius:var(--r);padding:10px 12px;margin-bottom:12px;font-size:12px">
      <div><strong>${hd.loai_dv||'Không rõ loại'}</strong> | ${hd.so_hd||'Không có số HĐ'} | <span class="text-orange fw6">${fmtM(hd.tong_tien)}</span></div>
      <div style="color:var(--danger);margin-top:4px"><i class="ti ti-alert-circle"></i> ${hd.ly_do_cho}</div>
      ${(hd.so_cont_list||[]).length?`<div style="margin-top:4px">Số cont AI đọc: <strong>${hd.so_cont_list.join(', ')}</strong></div>`:''}
    </div>
    <div class="form-group" style="margin-bottom:10px">
      <label>Chọn vận đơn liên quan *</label>
      <select id="xuly-vd" style="font-size:12px"><option value="">-- Tìm và chọn vận đơn --</option>${vdopts}</select>
    </div>
    <div class="form-group">
      <label>Ghi chú xử lý</label>
      <textarea id="xuly-gc" rows="2" placeholder="Lý do chọn vận đơn này..."></textarea>
    </div>
  </div>
  <div class="modal-foot">
    <button class="btn" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="saveXuLyHD('${id}')"><i class="ti ti-check"></i> Xác nhận khớp</button>
  </div>
  </div>`;
  document.body.appendChild(bg);
}

async function saveXuLyHD(hdId){
  const vdId=document.getElementById('xuly-vd').value;
  const gc=document.getElementById('xuly-gc').value;
  if(!vdId){toast('Vui lòng chọn vận đơn','error');return;}
  const vd=ORDERS.find(x=>x.id===vdId);
  await db.from('hoa_don').update({trang_thai:'da_khop',ly_do_cho:null,ai_ghi_chu:gc}).eq('id',hdId);
  await db.from('hoa_don_van_don').insert({hoa_don_id:hdId,van_don_id:vdId,so_cont:vd?.so_cont,ma_don:vd?.ma_don,so_tien:0,la_cont_chinh:true,da_tao_chi_ho:false});
  toast('Đã khớp vận đơn');closeModal();
  pgHoaDon(document.getElementById('content'));
}

async function duyetHD(id){
  if(!canSee(['ke_toan','ceo'])){toast('Không có quyền','error');return;}
  const{data:hdvds}=await db.from('hoa_don_van_don').select('*').eq('hoa_don_id',id).eq('la_cont_chinh',true);
  const{data:hd}=await db.from('hoa_don').select('*').eq('id',id).single();
  if(!hd||!hdvds?.length){toast('Không tìm thấy thông tin','error');return;}
  
  const main=hdvds[0];
  // Tạo chi_ho record
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
    hoa_don_khach:true,
    da_thu_lai:false,
    ghi_chu:`HĐ ${hd.so_hd||''} | ${hd.ten_don_vi_xuat||''}`,
  });
  
  // Cập nhật trạng thái HĐ và liên kết
  await db.from('hoa_don').update({trang_thai:'da_duyet',nguoi_duyet:CU?.id,ngay_duyet:new Date().toISOString()}).eq('id',id);
  await db.from('hoa_don_van_don').update({da_tao_chi_ho:true}).eq('hoa_don_id',id);
  
  toast('✅ Đã duyệt — Chi hộ đã được tạo tự động');
  pgHoaDon(document.getElementById('content'));
}

async function duyetTatCa(){
  if(!canSee(['ke_toan','ceo'])){toast('Không có quyền','error');return;}
  if(!confirm('Duyệt tất cả hóa đơn đang chờ?'))return;
  const{data:list}=await db.from('hoa_don').select('id').eq('trang_thai','da_khop');
  if(!list?.length){toast('Không có HĐ nào chờ duyệt');return;}
  for(const h of list) await duyetHD(h.id);
  toast(`✅ Đã duyệt ${list.length} hóa đơn`);
}

async function huyHD(id){
  if(!confirm('Hủy hóa đơn này?'))return;
  await db.from('hoa_don').update({trang_thai:'huy'}).eq('id',id);
  toast('Đã hủy');
  pgHoaDon(document.getElementById('content'));
}

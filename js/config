// CONFIG.JS — Globals, Auth, Utils, Navigation
// BN Chain Logistics

const SUPA_URL='https://vcrnlyvdquodiqfwaogj.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjcm5seXZkcXVvZGlxZndhb2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4ODM1MDIsImV4cCI6MjA5NjQ1OTUwMn0.dHIDkaaRPkk3KG0WZW2yARnqTepPNoQYh1U5oFeG7RU';
const {createClient}=supabase;
const db=createClient(SUPA_URL,SUPA_KEY);

let CU=null; // current user
let PAGE='orders';
let SEL=null; // selected id
let ORDERS=[];
let KH=[],LX=[],TP=[],NV=[];
let DP_TAB='info'; // detail panel tab
let ORDER_FILTER='all';
let ORDER_SEARCH='';
let ORDER_LOAI='';
let ORDER_THANG='';

const fmt=n=>Number(n||0).toLocaleString('vi-VN');
const fmtM=n=>fmt(n)+' đ';
const today=()=>new Date().toISOString().split('T')[0];
const genMa=()=>{const d=new Date();return`BNC-${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`};
// Format số tiền có dấu phẩy
const fmtInput = v => v.toString().replace(/\D/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,',');
const parseNum = v => parseInt(v.toString().replace(/,/g,''))||0;

// Validate biển số: 99H-06375 hoặc 99A-123.45

function validateBienSo(v){
  return /^\d{2}[A-Z]\d?-\d{4,5}$/.test(v.toUpperCase().replace(/\s/g,''));
}
// Format biển số tự động
function formatBienSo(v){
  let s=v.toUpperCase().replace(/[^0-9A-Z-]/g,'');
  return s;
}
// Validate + format số cont: đúng 11 ký tự AAAU1234567
function formatCont(v){
  let s=v.toUpperCase().replace(/[^0-9A-Z]/g,'');
  if(s.length>11) s=s.slice(0,11);
  return s;
}


function toast(msg,type='success'){
  const t=document.createElement('div');t.className=`toast ${type}`;
  t.innerHTML=`<i class="ti ti-${type==='success'?'check':'alert-circle'}"></i>${msg}`;
  document.body.appendChild(t);setTimeout(()=>t.remove(),3000);
}

function ttTag(s){
  const m={'Chờ xếp xe':'tag-cho','Đang vận chuyển':'tag-chay','Chờ xác nhận':'tag-xn','Hoàn thành':'tag-xong','Hủy':'tag-huy'};
  return`<span class="tag ${m[s]||'tag-cho'}">${s}</span>`;
}
function loaiTag(l){
  const m={'Xuất':'tag-xuat','Nhập':'tag-nhap','CK':'tag-ck'};
  return`<span class="tag ${m[l]||''}">${l||'-'}</span>`;
}
function thuTag(t){
  const m={'Đã thu':'tag-dathu','Chưa thu':'tag-chuathu','Đã thu một phần':'tag-motphan'};
  return`<span class="tag ${m[t]||'tag-chuathu'}">${t||'Chưa thu'}</span>`;
}
function canSee(roles){return roles.includes(CU?.vai_tro);}
function canEdit(o){
  // CEO và quan_ly có thể sửa kể cả đã khóa
  if(o?.locked && canSee(['quan_ly','ceo'])) return true;
  if(o?.locked) return false;
  return canSee(['nhan_vien','quan_ly','ke_toan','ceo']);
}

// AUTH
async function doLogin(){
  const email=document.getElementById('li-email').value.trim();
  const{data,error}=await db.from('users').select('*').eq('email',email).eq('active',true).single();
  if(error||!data){toast('Email không tồn tại','error');return;}
  CU=data;
  document.getElementById('login-page').style.display='none';
  document.getElementById('app-page').style.display='flex';
  document.getElementById('u-name').textContent=data.ho_ten;
  const rMap={nhan_vien:'Nhân viên',quan_ly:'Quản lý',ke_toan:'Kế toán',ceo:'CEO'};
  document.getElementById('u-role').textContent=rMap[data.vai_tro];
  document.getElementById('role-pill').textContent=rMap[data.vai_tro];
  document.getElementById('today-lbl').textContent=new Date().toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
  await loadMaster();
  renderPage();
}
function doLogout(){CU=null;document.getElementById('app-page').style.display='none';document.getElementById('login-page').style.display='flex';}

async function loadMaster(){
  const[a,b,c,d]=await Promise.all([
    db.from('khach_hang').select('*').eq('active',true).order('ten_cong_ty'),
    db.from('lai_xe').select('*').eq('active',true).order('ho_ten'),
    db.from('thau_phu').select('*').eq('active',true).order('ten_cong_ty'),
    db.from('users').select('*').eq('active',true).order('ho_ten'),
  ]);
  KH=a.data||[];LX=b.data||[];TP=c.data||[];NV=d.data||[];
}

// NAV
function nav(p,el){
  document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active'));
  el.classList.add('active');PAGE=p;SEL=null;
  document.getElementById('dp').style.display='none';
  const T={orders:'Quản lý vận đơn',dieuvan:'Bảng điều vận',chiho:'Chi hộ / Phát sinh',hoadon:'Upload & Xử lý Hóa Đơn',congno:'Công nợ',bangke:'Bảng kê thu khách',traphau:'Trả thầu phụ',baocao:'Báo cáo tháng',kh:'Khách hàng',laixe:'Lái xe',thauphu:'Thầu phụ',xe:'Quản lý xe',nv:'Nhân viên'};
  document.getElementById('page-title').textContent=T[p]||p;
  renderPage();
}
function renderPage(){
  const c=document.getElementById('content');
  const P={orders:pgOrders,dieuvan:pgDieuVan,chiho:pgChiHo,hoadon:pgHoaDon,congno:pgCongNo,bangke:pgBangKe,traphau:pgTraThau,baocao:pgBaoCao,kh:pgKH,laixe:pgLaiXe,thauphu:pgThauPhu,xe:pgXe,nv:pgNV};
  if(P[PAGE])P[PAGE](c); else c.innerHTML='<div class="empty"><i class="ti ti-tools"></i>Đang xây dựng...</div>';
}

// ==================== ORDERS ====================

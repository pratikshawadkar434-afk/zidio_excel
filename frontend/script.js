const API_BASE = localStorage.getItem('apiBase') || 'http://localhost:5000';
let token = localStorage.getItem('token') || null;
let excelData = [];
let chartInstance = null;

// ============ UTILITIES ============
function toast(msg, type='success', timeout=2500){
  const c = document.getElementById('toast');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(()=>{ t.remove(); }, timeout);
}
function setAuthUI(){
  const logoutBtn = document.getElementById('logoutBtn');
  const openAuth = document.getElementById('openAuth');
  if(token){ logoutBtn.style.display='inline-flex'; openAuth.style.display='none'; }
  else { logoutBtn.style.display='none'; openAuth.style.display='inline-flex'; }
}
function fmtDate(dstr){ const d = new Date(dstr); return d.toLocaleString(); }

// ============ THEME TOGGLE ============
const body = document.body;
const themeBtn = document.getElementById('btnTheme');

themeBtn.addEventListener('click', () => {
  body.classList.toggle('light');
  const icon = themeBtn.querySelector('i');
  if (body.classList.contains('light')) {
    icon.className = 'ti ti-moon';
    toast('Light mode enabled ☀️');
  } else {
    icon.className = 'ti ti-sun';
    toast('Dark mode enabled 🌙');
  }
});


// ============ AUTH MODAL LOGIC ============
const authModal = document.getElementById('authModal');
const openAuth = document.getElementById('openAuth');
const closeAuth = document.getElementById('closeAuth');
openAuth.addEventListener('click', ()=> authModal.showModal());
closeAuth.addEventListener('click', ()=> authModal.close());

// Tabs
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    document.getElementById(tab+'Panel').classList.add('active');
  });
});

// Login
document.getElementById('loginBtn').addEventListener('click', async ()=>{
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  try{
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || 'Login failed');
    token = data.token; localStorage.setItem('token', token);
    toast('Logged in successfully ✅');
    authModal.close(); setAuthUI(); fetchHistory();
  }catch(err){ toast(err.message, 'error'); }
});

// Register
document.getElementById('registerBtn').addEventListener('click', async ()=>{
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  try{
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || 'Registration failed');
    token = data.token; localStorage.setItem('token', token);
    toast('Account created 🎉'); authModal.close(); setAuthUI(); fetchHistory();
  }catch(err){ toast(err.message, 'error'); }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', ()=>{
  token = null; localStorage.removeItem('token');
  toast('Logged out'); setAuthUI(); document.getElementById('historyList').innerHTML = '<p class="muted">Login to view your upload history.</p>';
});

// ============ EXCEL PARSE ============
document.getElementById('parseBtn').addEventListener('click', ()=>{
  const file = document.getElementById('fileInput').files[0];
  if(!file){ toast('Please choose an Excel file', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e)=>{
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if(!sheet.length){ toast('Sheet is empty', 'error'); return; }
    excelData = sheet;
    populateDropdowns(sheet);
    toast('File parsed successfully');
    // if logged in, upload file to backend
    if(token){
      uploadToServer(file).catch(()=>{});
    }
  };
  reader.readAsArrayBuffer(file);
});

function populateDropdowns(sheet){
  const keys = Object.keys(sheet[0]);
  const x = document.getElementById('xAxis');
  const y = document.getElementById('yAxis');
  x.innerHTML = ''; y.innerHTML='';
  keys.forEach(k=>{
    const ox = document.createElement('option'); ox.value=k; ox.textContent=k; x.appendChild(ox);
    const oy = document.createElement('option'); oy.value=k; oy.textContent=k; y.appendChild(oy);
  });
}

// ============ CHART ============
document.getElementById('generateChart').addEventListener('click', ()=>{
  const xKey = document.getElementById('xAxis').value;
  const yKey = document.getElementById('yAxis').value;
  const type = document.getElementById('chartType').value;
  if(!xKey || !yKey || !excelData.length){ toast('Parse a file and select axes', 'error'); return; }
  const labels = excelData.map(r=> r[xKey]);
  const values = excelData.map(r=> Number(r[yKey]));
  const ctx = document.getElementById('chartCanvas').getContext('2d');
  if(chartInstance) chartInstance.destroy();
  const dataset = {
    label: `${yKey} vs ${xKey}`,
    data: type==='scatter' ? excelData.map(r=>({x:r[xKey], y:Number(r[yKey])})) : values,
    borderWidth:2, pointRadius:3
  };
  chartInstance = new Chart(ctx, {
    type,
    data: {
      labels: type==='scatter' ? undefined : labels,
      datasets: [dataset]
    },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      scales: (type==='pie')? {} : { y: { beginAtZero: true } },
      plugins: { legend: { position:'top' } }
    }
  });
  toast('Chart generated');
});

// Download PNG
document.getElementById('downloadPNG').addEventListener('click', ()=>{
  if(!chartInstance){ toast('Generate a chart first', 'error'); return; }
  const a = document.createElement('a');
  a.href = chartInstance.toBase64Image();
  a.download = 'chart.png';
  a.click();
});

// ============ BACKEND INTEGRATION ============
async function uploadToServer(file){
  try{
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE}/api/upload`, {
      method:'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: fd
    });
    if(!res.ok) throw new Error('Upload failed');
    const up = await res.json();
    toast('Saved upload to history');
    addHistoryItem(up);
  }catch(err){ toast(err.message, 'error'); }
}

async function fetchHistory(){
  if(!token){ return; }
  try{
    const res = await fetch(`${API_BASE}/api/upload`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if(!data.length){ list.innerHTML = '<p class="muted">No uploads yet.</p>'; return; }
    data.reverse().forEach(addHistoryItem);
  }catch(err){ console.error(err); }
}

function addHistoryItem(up){
  const list = document.getElementById('historyList');
  if(list.classList.contains('empty')){ list.classList.remove('empty'); list.innerHTML=''; }
  const div = document.createElement('div');
  div.className = 'history-item';
  div.innerHTML = `
    <div>
      <div><strong>${up.fileName || 'File'}</strong></div>
      <div class="muted">${fmtDate(up.createdAt || up.updatedAt || Date.now())}</div>
    </div>
    <span class="badge">#${(up._id || '').slice(-6)}</span>
  `;
  list.prepend(div);
}

// INIT
setAuthUI();
fetchHistory();

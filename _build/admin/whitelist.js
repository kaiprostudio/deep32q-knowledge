// Deep32Q 白名單管理 — 前端邏輯
const API_BASE = 'https://api-whitelist.kaiproapp.com';
const ADMIN_EMAIL = 's902632@gmail.com';
const ADMIN_API_KEY = '236359e75e9709b227b19343d6052db9fec5d2d5585c2e00';

const msgEl = document.getElementById('msg');
const tbody = document.getElementById('tbody');
const table = document.getElementById('table');
const loading = document.getElementById('loading');
const countEl = document.getElementById('count');
const emailInput = document.getElementById('emailInput');
const addBtn = document.getElementById('addBtn');

function showMsg(text, type) {
  msgEl.textContent = text;
  msgEl.className = 'msg ' + type;
  if (text) setTimeout(() => { msgEl.className = 'msg'; }, 4000);
}

async function whitelistApi(method, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': ADMIN_API_KEY,
    },
    credentials: 'include',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + '/whitelist', opts);
  if (!res.ok) {
    let err = 'HTTP ' + res.status;
    try { const d = await res.json(); if (d.error) err = d.error; } catch(e) {}
    throw new Error(err);
  }
  return res.json();
}

async function loadWhitelist() {
  loading.style.display = '';
  table.style.display = 'none';
  try {
    const data = await whitelistApi('GET');
    renderTable(data.emails || []);
  } catch(e) {
    loading.style.display = 'none';
    showMsg('無法載入白名單：' + e.message, 'error');
  }
}

function renderTable(emails) {
  loading.style.display = 'none';
  table.style.display = '';
  countEl.textContent = emails.length;
  tbody.innerHTML = '';

  if (emails.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="2">白名單為空</td></tr>';
    return;
  }

  emails.forEach(email => {
    const tr = document.createElement('tr');
    const isAdmin = email === ADMIN_EMAIL;

    const tdEmail = document.createElement('td');
    tdEmail.className = 'email-col';
    tdEmail.textContent = email;
    if (isAdmin) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = '管理員';
      tdEmail.appendChild(badge);
    }
    tr.appendChild(tdEmail);

    const tdAction = document.createElement('td');
    tdAction.className = 'action-col';
    if (!isAdmin) {
      const btn = document.createElement('button');
      btn.className = 'btn-del';
      btn.textContent = '刪除';
      btn.onclick = () => deleteEmail(email);
      tdAction.appendChild(btn);
    }
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });
}

async function addEmail() {
  const email = emailInput.value.trim().toLowerCase();
  if (!email) { showMsg('請輸入 email', 'error'); return; }
  if (!email.includes('@')) { showMsg('email 格式不正確', 'error'); return; }

  addBtn.disabled = true;
  try {
    await whitelistApi('POST', { email });
    showMsg('✅ ' + email + ' 已加入白名單', 'success');
    emailInput.value = '';
    await loadWhitelist();
  } catch(e) {
    showMsg('加入失敗：' + e.message, 'error');
  } finally {
    addBtn.disabled = false;
  }
}

async function deleteEmail(email) {
  if (!confirm('確定將 ' + email + ' 從白名單移除？')) return;
  try {
    await whitelistApi('DELETE', { email });
    showMsg('已移除 ' + email, 'info');
    await loadWhitelist();
  } catch(e) {
    showMsg('刪除失敗：' + e.message, 'error');
  }
}

loadWhitelist();
emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') addEmail(); });

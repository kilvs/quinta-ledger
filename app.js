// ============================================================
// QUINTA CAFE — EXPENSE MANAGER
// app.js
// ============================================================
// SETUP: Replace the URL below with your deployed Web App URL
// Apps Script → Deploy → New Deployment → Web App → Copy URL
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbyNhaarRnzJeTGwjdEBgShbrwqRK4Gb4FiIgLGBq8Nha7zNr3Ogg4W2AlQp2fWd4jX1Xg/exec';

// ── STATE ─────────────────────────────────────────────────────
let state = {
  tab: 'daily',       // 'daily' | 'monthly'
  records: [],
  filtered: [],
  categories: { daily: [], monthly: [] },
  search: '',
  filterCat: '',
  filterMonth: '',
  editing: null,          // record being edited
  pendingDelete: null
};

// ── API ───────────────────────────────────────────────────────
async function apiFetch(params) {
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

async function apiPost(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return res.json();
}

// ── INIT ──────────────────────────────────────────────────────
async function init() {
  setLoading(true);
  try {
    const cats = await apiFetch({ action: 'categories' });
    if (cats.success) {
      state.categories.daily = cats.daily;
      state.categories.monthly = cats.monthly;
    }
    await loadRecords();
    setApiStatus('connected');
  } catch (e) {
    setApiStatus('error');
    showToast('Cannot connect to API. Check your URL in app.js.', 'error');
  }
  setLoading(false);
}

async function loadRecords() {
  setLoading(true);
  try {
    const res = await apiFetch({ action: 'list', sheet: state.tab });
    if (res.success) {
      state.records = res.data;
      applyFilters();
      renderStats();
      renderTable();
    } else {
      showToast('Error loading records: ' + res.error, 'error');
    }
  } catch (e) {
    showToast('Network error: ' + e.message, 'error');
  }
  setLoading(false);
}

// ── FILTERS ───────────────────────────────────────────────────
function applyFilters() {
  let rows = [...state.records];
  const q = state.search.toLowerCase().trim();

  if (q) {
    rows = rows.filter(r => {
      return Object.values(r).some(v => String(v).toLowerCase().includes(q));
    });
  }
  if (state.filterCat) {
    rows = rows.filter(r => r['Category'] === state.filterCat);
  }
  if (state.tab === 'daily' && state.filterMonth) {
    rows = rows.filter(r => String(r['Date'] || '').startsWith(state.filterMonth));
  }
  // Sort by date descending
  rows.sort((a, b) => {
    const da = a['Date'] || a['Month (YYYY-MM)'] || '';
    const db = b['Date'] || b['Month (YYYY-MM)'] || '';
    return db.localeCompare(da);
  });
  state.filtered = rows;
}

// ── RENDER ────────────────────────────────────────────────────
function renderStats() {
  const rows = state.records;
  const total = rows.reduce((s, r) => s + (parseFloat(r['Amount']) || 0), 0);
  const count = rows.length;

  // Most recent date
  const dates = rows.map(r => r['Date'] || r['Month (YYYY-MM)'] || '').filter(Boolean).sort();
  const latest = dates.length ? dates[dates.length - 1] : '—';

  document.getElementById('statCount').textContent = count;
  document.getElementById('statTotal').textContent = '₱' + total.toLocaleString('en-PH', { minimumFractionDigits: 2 });
  document.getElementById('statLatest').textContent = latest;
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  const rows = state.filtered;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const isMonthly = state.tab === 'monthly';
    const date = isMonthly ? (r['Month (YYYY-MM)'] || '') : (r['Date'] || '');
    const cat = r['Category'] || '';
    const amount = parseFloat(r['Amount']) || 0;
    const notes = r['Notes'] || '';
    const recurring = r['Recurring (Y/N)'] || '';
    const enteredBy = r['Entered By'] || '';

    const extraCol = isMonthly
      ? `<td><span class="badge ${recurring === 'Yes' ? 'badge-yes' : 'badge-no'}">${recurring || '—'}</span></td>`
      : `<td class="td-notes" title="${esc(notes)}">${esc(notes) || '—'}</td>`;

    return `<tr>
      <td class="td-date">${esc(date)}</td>
      <td class="td-cat">${esc(cat)}</td>
      <td class="td-amount">₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      ${extraCol}
      <td class="td-notes" title="${esc(isMonthly ? notes : enteredBy)}">${esc(isMonthly ? notes : enteredBy) || '—'}</td>
      <td class="td-actions">
        <button class="btn btn-sm" onclick="openEdit(${r.rowIndex})" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-danger" onclick="confirmDelete(${r.rowIndex})" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function renderCategoryFilter() {
  const sel = document.getElementById('filterCat');
  const cats = state.categories[state.tab] || [];
  sel.innerHTML = `<option value="">All categories</option>` +
    cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  sel.value = state.filterCat;
}

function renderFormCategories() {
  const sel = document.getElementById('fieldCategory');
  const cats = state.categories[state.tab] || [];
  sel.innerHTML = cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

function renderMonthFilter() {
  const wrap = document.getElementById('monthFilterWrap');
  wrap.style.display = state.tab === 'daily' ? '' : 'none';
}

function renderFormFields() {
  const isMonthly = state.tab === 'monthly';
  document.getElementById('fieldDateWrap').style.display = isMonthly ? 'none' : '';
  document.getElementById('fieldMonthWrap').style.display = isMonthly ? '' : 'none';
  document.getElementById('fieldRecurWrap').style.display = isMonthly ? '' : 'none';
  document.getElementById('fieldEnteredWrap').style.display = isMonthly ? 'none' : '';
}

// ── MODAL — ADD / EDIT ────────────────────────────────────────
function openAdd() {
  state.editing = null;
  document.getElementById('modalTitle').textContent = state.tab === 'daily'
    ? 'Add Daily Expense' : 'Add Monthly Expense';
  resetForm();
  renderFormFields();
  renderFormCategories();
  // Default date to today / current month
  if (state.tab === 'daily') {
    document.getElementById('fieldDate').value = todayStr();
  } else {
    document.getElementById('fieldMonth').value = currentMonthStr();
  }
  openModal();
}

function openEdit(rowIndex) {
  const rec = state.records.find(r => r.rowIndex === rowIndex);
  if (!rec) return;
  state.editing = rec;
  document.getElementById('modalTitle').textContent = state.tab === 'daily'
    ? 'Edit Daily Expense' : 'Edit Monthly Expense';
  resetForm();
  renderFormFields();
  renderFormCategories();

  const isMonthly = state.tab === 'monthly';
  if (isMonthly) {
    document.getElementById('fieldMonth').value = rec['Month (YYYY-MM)'] || '';
  } else {
    document.getElementById('fieldDate').value = rec['Date'] || '';
  }
  document.getElementById('fieldCategory').value = rec['Category'] || '';
  document.getElementById('fieldAmount').value = rec['Amount'] || '';
  document.getElementById('fieldNotes').value = rec['Notes'] || '';
  if (isMonthly) {
    document.getElementById('fieldRecurring').value = rec['Recurring (Y/N)'] || 'No';
  } else {
    document.getElementById('fieldEnteredBy').value = rec['Entered By'] || '';
  }
  openModal();
}

async function saveRecord() {
  const isMonthly = state.tab === 'monthly';
  const record = {};

  if (isMonthly) {
    record['Month (YYYY-MM)'] = document.getElementById('fieldMonth').value.trim();
    record['Category'] = document.getElementById('fieldCategory').value;
    record['Amount'] = document.getElementById('fieldAmount').value;
    record['Notes'] = document.getElementById('fieldNotes').value.trim();
    record['Recurring (Y/N)'] = document.getElementById('fieldRecurring').value;
    if (!record['Month (YYYY-MM)']) { showToast('Month is required.', 'error'); return; }
  } else {
    record['Date'] = document.getElementById('fieldDate').value.trim();
    record['Category'] = document.getElementById('fieldCategory').value;
    record['Amount'] = document.getElementById('fieldAmount').value;
    record['Notes'] = document.getElementById('fieldNotes').value.trim();
    record['Entered By'] = document.getElementById('fieldEnteredBy').value.trim() || 'Staff';
    if (!record['Date']) { showToast('Date is required.', 'error'); return; }
  }

  if (!record['Amount'] || isNaN(parseFloat(record['Amount'])) || parseFloat(record['Amount']) <= 0) {
    showToast('Enter a valid amount.', 'error'); return;
  }

  setLoading(true);
  try {
    let res;
    if (state.editing) {
      res = await apiPost({ action: 'update', sheet: state.tab, rowIndex: state.editing.rowIndex, record });
    } else {
      res = await apiPost({ action: 'add', sheet: state.tab, record });
    }
    if (res.success) {
      closeModal();
      showToast(state.editing ? 'Record updated.' : 'Record added.', 'success');
      await loadRecords();
    } else {
      showToast('Error: ' + res.error, 'error');
    }
  } catch (e) {
    showToast('Network error: ' + e.message, 'error');
  }
  setLoading(false);
}

// ── DELETE ────────────────────────────────────────────────────
function confirmDelete(rowIndex) {
  state.pendingDelete = rowIndex;
  document.getElementById('confirmOverlay').classList.add('open');
}

async function executeDelete() {
  document.getElementById('confirmOverlay').classList.remove('open');
  if (!state.pendingDelete) return;
  setLoading(true);
  try {
    const res = await apiPost({ action: 'delete', sheet: state.tab, rowIndex: state.pendingDelete });
    if (res.success) {
      showToast('Record deleted.', 'success');
      await loadRecords();
    } else {
      showToast('Error: ' + res.error, 'error');
    }
  } catch (e) {
    showToast('Network error: ' + e.message, 'error');
  }
  state.pendingDelete = null;
  setLoading(false);
}

// ── TAB SWITCH ────────────────────────────────────────────────
function switchTab(tab) {
  state.tab = tab;
  state.search = '';
  state.filterCat = '';
  state.filterMonth = '';
  document.getElementById('searchInput').value = '';
  document.getElementById('filterCat').value = '';
  document.getElementById('monthFilter').value = '';
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  // Swap table headers
  const thead = document.getElementById('tableHead');
  const isMonthly = tab === 'monthly';
  thead.innerHTML = isMonthly
    ? `<tr>
        <th>Month</th><th>Category</th><th>Amount</th>
        <th>Recurring</th><th>Notes</th><th style="width:80px">Actions</th>
       </tr>`
    : `<tr>
        <th>Date</th><th>Category</th><th>Amount</th>
        <th>Notes</th><th>Entered By</th><th style="width:80px">Actions</th>
       </tr>`;
  renderCategoryFilter();
  renderMonthFilter();
  loadRecords();
}

// ── UTILS ─────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function currentMonthStr() {
  return new Date().toISOString().slice(0, 7);
}
function openModal() { document.getElementById('modalOverlay').classList.add('open'); }
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); state.editing = null; }
function resetForm() {
  ['fieldDate', 'fieldMonth', 'fieldAmount', 'fieldNotes', 'fieldEnteredBy']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const rc = document.getElementById('fieldRecurring');
  if (rc) rc.value = 'No';
}

function setLoading(on) {
  document.getElementById('loadingBar').classList.toggle('active', on);
}

function setApiStatus(status) {
  const dot = document.getElementById('apiDot');
  const txt = document.getElementById('apiTxt');
  dot.className = 'api-dot ' + status;
  txt.textContent = status === 'connected' ? 'Connected' : status === 'error' ? 'Error' : 'Connecting…';
}

let toastTimer;
function showToast(msg, type = '') {
  const c = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  c.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}

// ── EVENT LISTENERS ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchInput').addEventListener('input', e => {
    state.search = e.target.value;
    applyFilters(); renderTable();
  });
  document.getElementById('filterCat').addEventListener('change', e => {
    state.filterCat = e.target.value;
    applyFilters(); renderTable();
  });
  document.getElementById('monthFilter').addEventListener('change', e => {
    state.filterMonth = e.target.value;
    applyFilters(); renderTable();
  });

  // Close modal on backdrop click
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('confirmOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.remove('open');
      state.pendingDelete = null;
    }
  });

  // Default table headers for daily
  switchTab('daily');
  init();
});

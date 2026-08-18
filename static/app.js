/* StatsPack Tech Sales Agent Portal — app shell */
'use strict';

const VERSION = 'v1.0';
const $ = id => document.getElementById(id);
let ME = null, SETTINGS = {}, STAGES = [], FX = [];

/* ---------------------------------------------------------------- utils */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

const usd = n => (n == null || n === '') ? '—'
  : '$' + Number(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const usd0 = n => (n == null || n === '') ? '—'
  : '$' + Math.round(Number(n)).toLocaleString('en-US');
const pct = n => (n == null) ? '—' : (Number(n) * 100).toFixed(1) + '%';
const money = (n, cur) => Number(n || 0).toLocaleString('en-US',
  {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' ' + (cur || '');
const dt = s => s ? String(s).slice(0, 10) : '—';

function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'err' ? 6000 : 3600);
}

function token() { return localStorage.getItem('sp_token') || ''; }

function signOut() {
  api('/api/logout', 'POST').catch(() => {}).finally(() => {
    localStorage.removeItem('sp_token');
    localStorage.removeItem('sp_user');
    location.replace('/login');
  });
}

async function api(path, method, body) {
  const opts = {method: method || 'GET', headers: {'Authorization': 'Bearer ' + token()}};
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(path, opts);
  let data = {};
  try { data = await r.json(); } catch (e) { data = {}; }
  if (r.status === 401) { localStorage.removeItem('sp_token'); location.replace('/login'); throw new Error('Signed out'); }
  if (r.status === 428) { openPasswordModal(true); throw new Error(data.error || 'Set a new password'); }
  if (!r.ok) throw new Error(data.error || ('Request failed (' + r.status + ')'));
  return data;
}

/* ---------------------------------------------------------------- modal */
function modal(title, bodyHTML, footHTML) {
  $('modalRoot').innerHTML =
    `<div class="modal-back" id="mBack"><div class="modal" role="dialog" aria-modal="true">
       <div class="modal-head"><h3>${esc(title)}</h3><button class="x" id="mX" aria-label="Close">×</button></div>
       <div class="modal-body">${bodyHTML}</div>
       ${footHTML ? `<div class="modal-foot">${footHTML}</div>` : ''}
     </div></div>`;
  const close = () => { $('modalRoot').innerHTML = ''; };
  $('mX').onclick = close;
  $('mBack').onclick = e => { if (e.target.id === 'mBack') close(); };
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
  const first = document.querySelector('.modal-body input, .modal-body select, .modal-body textarea');
  if (first) first.focus();
  return close;
}
const closeModal = () => { $('modalRoot').innerHTML = ''; };

function val(id) { const e = $(id); return e ? e.value.trim() : ''; }
function num(id) { const e = $(id); return e ? Number(e.value || 0) : 0; }

/* ---------------------------------------------------------------- chrome */
const NAV_ADMIN = [
  ['dashboard', '▦', 'Dashboard'],
  ['agents', '👤', 'Agents'],
  ['clients', '🏢', 'Clients'],
  ['payments', '💳', 'Payments'],
  ['commissions', '％', 'Commission'],
  ['payouts', '📤', 'Payouts'],
  ['settings', '⚙', 'Settings'],
  ['audit', '🕘', 'Activity log'],
];
const NAV_AGENT = [
  ['dashboard', '▦', 'Dashboard'],
  ['clients', '🏢', 'My clients'],
  ['payments', '💳', 'Payments received'],
  ['commissions', '％', 'My commission'],
  ['payouts', '📤', 'My payouts'],
  ['profile', '⚙', 'My profile'],
];

function paintChrome() {
  const initials = (ME.name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  $('avatar').textContent = initials;
  $('whoName').textContent = ME.name;
  $('whoRole').textContent = ME.role === 'admin' ? 'StatsPack admin' : 'Sales agent';
  $('verLabel').textContent = 'Agent Portal · ' + VERSION;
  const items = ME.role === 'admin' ? NAV_ADMIN : NAV_AGENT;
  $('nav').innerHTML =
    `<div class="nav-label">${ME.role === 'admin' ? 'Manage' : 'My work'}</div>` +
    items.map(([k, i, t]) => `<a href="#/${k}" data-k="${k}"><span class="ic">${i}</span>${t}</a>`).join('') +
    `<div class="nav-label">Account</div>
     <a href="#" id="navPw"><span class="ic">🔑</span>Change password</a>
     <a href="#" id="navOut"><span class="ic">⎋</span>Sign out</a>`;
  $('navPw').onclick = e => { e.preventDefault(); openPasswordModal(false); };
  $('navOut').onclick = e => { e.preventDefault(); signOut(); };
}

function setActive(key, title) {
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.k === key));
  $('pageTitle').textContent = title;
  document.title = title + ' · StatsPack Agent Portal';
}

$('burger').onclick = () => { $('sidebar').classList.add('open'); $('backdrop').classList.add('show'); };
$('backdrop').onclick = () => { $('sidebar').classList.remove('open'); $('backdrop').classList.remove('show'); };

/* ---------------------------------------------------------------- password */
function openPasswordModal(forced) {
  modal(forced ? 'Set a new password' : 'Change password', `
    ${forced ? '<p class="muted" style="margin-bottom:14px">Your account is using a temporary password. Choose your own before you continue.</p>' : ''}
    <div class="field"><label class="lbl" for="pwOld">Current password</label>
      <input class="inp" id="pwOld" type="password" autocomplete="current-password"></div>
    <div class="field"><label class="lbl" for="pwNew">New password</label>
      <input class="inp" id="pwNew" type="password" autocomplete="new-password">
      <div class="hint">At least 8 characters. Avoid anything you use elsewhere.</div></div>
    <div class="field"><label class="lbl" for="pwNew2">Repeat new password</label>
      <input class="inp" id="pwNew2" type="password" autocomplete="new-password"></div>`,
    `${forced ? '' : '<button class="btn ghost" onclick="closeModal()">Cancel</button>'}
     <button class="btn teal" id="pwSave">Save password</button>`);
  $('pwSave').onclick = async () => {
    if (val('pwNew') !== val('pwNew2')) return toast('The two new passwords do not match.', 'err');
    try {
      await api('/api/change-password', 'POST',
        {current_password: val('pwOld'), new_password: val('pwNew')});
      closeModal();
      toast('Password changed.', 'ok');
      if (forced) { setTimeout(() => location.reload(), 600); return; }
      ME.must_change_pw = false;
      route();
    } catch (e) { toast(e.message, 'err'); }
  };
}

/* ================================================================ VIEWS */
const view = html => { $('view').innerHTML = html; };
const loading = () => view('<div class="empty"><strong>Loading…</strong></div>');

function bar(frac) {
  if (frac == null) return '<span class="muted">no quota set</span>';
  const p = Math.max(0, Math.min(1, frac));
  const cls = frac >= 1 ? 'over' : (frac < 0.5 ? 'low' : '');
  return `<div style="display:flex;align-items:center;gap:8px">
    <div class="bar" style="flex:1"><i class="${cls}" style="width:${(p * 100).toFixed(0)}%"></i></div>
    <span class="num" style="font-size:12.5px">${pct(frac)}</span></div>`;
}

function kindBadge(k) {
  const map = {'First payment': 'first', 'Monthly (year 1)': 'year1',
               'After month 12': 'expired', 'Voided': 'voided'};
  return `<span class="badge ${map[k] || ''}">${esc(k)}</span>`;
}

function stageBadge(s) {
  const cls = s === 'Won' ? 'won' : (s === 'Lost' || s === 'Churned' ? 'lost' : 'info');
  return `<span class="badge ${cls}">${esc(s)}</span>`;
}

function emptyState(title, msg) {
  return `<div class="empty"><strong>${esc(title)}</strong>${esc(msg)}</div>`;
}

/* ---------------------------------------------------------- ADMIN: dashboard */
async function viewAdminDashboard() {
  setActive('dashboard', 'Dashboard');
  loading();
  const d = await api('/api/admin/overview');
  const t = d.totals;
  const maxTrend = Math.max(1, ...d.trend.map(x => x.amount));

  view(`
    <div class="stats">
      <div class="stat teal"><div class="k">Collected from clients</div><div class="v">${usd0(t.collected_usd)}</div>
        <div class="sub">${t.clients_won} paying / ${t.clients} clients</div></div>
      <div class="stat amber"><div class="k">Agent commission earned</div><div class="v">${usd0(t.agent_commission_usd)}</div>
        <div class="sub">across ${t.active_agents} active agents</div></div>
      <div class="stat slate"><div class="k">StatsPack share</div><div class="v">${usd0(t.statspack_share_usd)}</div>
        <div class="sub">after agent commission</div></div>
      <div class="stat coral"><div class="k">Owed to agents</div><div class="v">${usd0(t.owed_usd)}</div>
        <div class="sub">${usd0(t.paid_out_usd)} paid · ${usd0(t.in_flight_usd)} in progress</div></div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Collections by month</h2><span class="spacer"></span>
        <span class="muted">last ${d.trend.length} month${d.trend.length === 1 ? '' : 's'}, USD</span></div>
      <div class="card-body spark-wrap">
        ${d.trend.length ? `<div class="spark">${d.trend.map(x =>
          `<div style="height:${Math.max(3, x.amount / maxTrend * 100)}%" title="${x.month}: ${usd(x.amount)}">
             <span>${x.month.slice(2)}</span></div>`).join('')}</div>`
          : '<p class="muted">No payments recorded yet.</p>'}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Agent leaderboard</h2><span class="spacer"></span>
        <a href="#/agents" class="btn ghost sm">Manage agents</a></div>
      ${d.leaderboard.length ? `<div class="table-scroll"><table>
        <thead><tr><th>Agent</th><th>Country</th><th class="num">Clients won</th>
          <th class="num">Collected</th><th class="num">Commission</th><th class="num">Outstanding</th>
          <th style="min-width:150px">Quota attainment</th></tr></thead>
        <tbody>${d.leaderboard.map(a => `<tr>
          <td><a href="#/agent/${a.id}"><strong>${esc(a.name)}</strong></a>
            ${a.status !== 'Active' ? ' <span class="badge Suspended">Suspended</span>' : ''}</td>
          <td>${esc(a.country) || '—'}</td>
          <td class="num">${a.clients_won}</td>
          <td class="num">${usd0(a.collected_usd)}</td>
          <td class="num">${usd0(a.earned_usd)}</td>
          <td class="num">${usd0(a.outstanding_usd)}</td>
          <td>${bar(a.attainment)}</td></tr>`).join('')}</tbody></table></div>`
        : emptyState('No agents yet', 'Add your first agent to start tracking commission.')}
    </div>

    <div class="card">
      <div class="card-head"><h2>Recent payments</h2><span class="spacer"></span>
        <a href="#/payments" class="btn ghost sm">All payments</a></div>
      ${d.recent_payments.length ? `<div class="table-scroll"><table>
        <thead><tr><th>Date</th><th>Client</th><th>Type</th><th class="num">Amount</th>
          <th class="num">In USD</th><th class="num">Agent gets</th></tr></thead>
        <tbody>${d.recent_payments.map(p => `<tr>
          <td>${dt(p.paid_date)}</td><td>${esc(p.client_name)}</td>
          <td>${kindBadge(p.commission_kind)}</td>
          <td class="num">${money(p.amount, p.currency)}</td>
          <td class="num">${usd(p.amount_usd)}</td>
          <td class="num"><strong>${usd(p.agent_commission_usd)}</strong></td></tr>`).join('')}</tbody></table></div>`
        : emptyState('No payments yet', 'Record a client payment to trigger the first commission.')}
    </div>`);
}

/* ---------------------------------------------------------- ADMIN: agents */
async function viewAgents() {
  setActive('agents', 'Agents');
  loading();
  const d = await api('/api/admin/agents');
  view(`
    <div class="card">
      <div class="card-head"><h2>Sales agents</h2><span class="spacer"></span>
        <button class="btn teal" id="addAgent">Add agent</button></div>
      ${d.agents.length ? `<div class="table-scroll"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Country</th><th class="num">Clients</th>
          <th class="num">Collected</th><th class="num">Earned</th><th class="num">Outstanding</th>
          <th>Status</th><th></th></tr></thead>
        <tbody>${d.agents.map(a => `<tr>
          <td><a href="#/agent/${a.id}"><strong>${esc(a.name)}</strong></a></td>
          <td class="muted">${esc(a.email)}</td>
          <td>${esc(a.country) || '—'}</td>
          <td class="num">${a.clients_won}/${a.clients_total}</td>
          <td class="num">${usd0(a.collected_usd)}</td>
          <td class="num">${usd0(a.earned_usd)}</td>
          <td class="num"><strong>${usd0(a.outstanding_usd)}</strong></td>
          <td><span class="badge ${a.status}">${a.status}</span></td>
          <td><a class="btn ghost sm" href="#/agent/${a.id}">Open</a></td></tr>`).join('')}</tbody></table></div>`
        : emptyState('No agents yet', 'Add an agent and share their sign-in details.')}
    </div>`);
  $('addAgent').onclick = agentModal;
}

function agentModal() {
  modal('Add agent', `
    <div class="grid2">
      <div><label class="lbl" for="aName">Full name</label><input class="inp" id="aName" placeholder="Thabo Mokoena"></div>
      <div><label class="lbl" for="aEmail">Email (their username)</label><input class="inp" id="aEmail" type="email" placeholder="thabo@statspack.co.ls"></div>
      <div><label class="lbl" for="aPhone">Phone</label><input class="inp" id="aPhone" placeholder="+266 …"></div>
      <div><label class="lbl" for="aCountry">Country</label><input class="inp" id="aCountry" placeholder="Lesotho"></div>
      <div><label class="lbl" for="aQuota">Annual quota (USD)</label><input class="inp" id="aQuota" type="number" min="0" step="100" value="0">
        <div class="hint">Used for the attainment bar. Leave 0 if you don't set quotas.</div></div>
      <div><label class="lbl" for="aStart">Start date</label><input class="inp" id="aStart" type="date"></div>
    </div>
    <div style="margin-top:14px"><label class="lbl" for="aNotes">Notes</label>
      <textarea class="inp" id="aNotes" placeholder="Territory, contract reference, anything worth remembering."></textarea></div>
    <p class="hint" style="margin-top:12px">A one-time password is generated for you to pass on. They must change it at first sign-in.</p>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button>
     <button class="btn teal" id="aSave">Create agent</button>`);
  $('aSave').onclick = async () => {
    try {
      const r = await api('/api/admin/agents', 'POST', {
        name: val('aName'), email: val('aEmail'), phone: val('aPhone'),
        country: val('aCountry'), quota_usd: num('aQuota'), start_date: val('aStart'),
        notes: val('aNotes')
      });
      modal('Agent created', `
        <p>Give these details to the agent. The password is shown once and only once.</p>
        <div class="copybox">${esc(val('aEmail'))}<br>${esc(r.temp_password)}</div>
        <p class="hint">They will be asked to choose their own password the first time they sign in.</p>`,
        `<button class="btn teal" onclick="closeModal();route()">Done</button>`);
    } catch (e) { toast(e.message, 'err'); }
  };
}

/* ---------------------------------------------------- ADMIN: agent progress */
async function viewAgentDetail(id) {
  setActive('agents', 'Agent progress');
  loading();
  const d = await api('/api/admin/agents/' + id + '/progress');
  const m = d.metrics, a = d.agent;
  setActive('agents', a.name);

  view(`
    <div class="card">
      <div class="card-head">
        <h2>${esc(a.name)} <span class="badge ${a.status}">${a.status}</span></h2>
        <span class="spacer"></span>
        <button class="btn ghost sm" id="edit">Edit details</button>
        <button class="btn ghost sm" id="resetPw">Reset password</button>
        <button class="btn ${a.status === 'Active' ? 'danger' : 'teal'} sm" id="toggle">
          ${a.status === 'Active' ? 'Suspend' : 'Reactivate'}</button>
      </div>
      <div class="card-body">
        <div class="grid2">
          <div><span class="lbl">Email</span>${esc(a.email)}</div>
          <div><span class="lbl">Phone</span>${esc(a.phone) || '—'}</div>
          <div><span class="lbl">Country</span>${esc(a.country) || '—'}</div>
          <div><span class="lbl">Started</span>${dt(a.start_date)}</div>
        </div>
        ${d.notes ? `<div style="margin-top:14px"><span class="lbl">Notes</span>${esc(d.notes)}</div>` : ''}
      </div>
    </div>

    <div class="stats">
      <div class="stat teal"><div class="k">Collected from their clients</div><div class="v">${usd0(m.collected_usd)}</div>
        <div class="sub">${m.clients_won} won of ${m.clients_total}</div></div>
      <div class="stat amber"><div class="k">Commission earned</div><div class="v">${usd0(m.earned_usd)}</div>
        <div class="sub">${usd0(m.first_payment_usd)} first-payment · ${usd0(m.recurring_usd)} recurring</div></div>
      <div class="stat coral"><div class="k">Outstanding to pay</div><div class="v">${usd0(m.outstanding_usd)}</div>
        <div class="sub">${usd0(m.paid_out_usd)} already paid</div></div>
      <div class="stat green"><div class="k">Open pipeline</div><div class="v">${usd0(m.pipeline_usd)}</div>
        <div class="sub">monthly value, not yet won</div></div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Performance</h2></div>
      <div class="card-body">
        <div class="grid2">
          <div><span class="lbl">Quota attainment${a.quota_usd ? ' (of ' + usd0(a.quota_usd) + ')' : ''}</span>${bar(m.attainment)}</div>
          <div><span class="lbl">Win rate</span>${m.win_rate == null ? '<span class="muted">no decided deals yet</span>' : pct(m.win_rate)}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Progress notes</h2><span class="spacer"></span>
        <button class="btn teal sm" id="addNote">Add note</button></div>
      ${d.reviews.length ? `<div class="card-body">${d.reviews.map(r => `
        <div style="border-left:3px solid var(--teal);padding:2px 0 2px 13px;margin-bottom:15px">
          <div class="muted" style="font-size:12px">${dt(r.created_at)} · ${esc(r.author_name || 'admin')}
            ${r.period ? '· ' + esc(r.period) : ''} · rated ${r.rating}/5</div>
          <div style="margin-top:3px;white-space:pre-wrap">${esc(r.body)}</div>
          <button class="btn ghost sm" style="margin-top:7px" data-del="${r.id}">Delete</button>
        </div>`).join('')}</div>`
        : emptyState('No notes yet', 'Record a coaching conversation or a monthly review.')}
    </div>

    <div class="card">
      <div class="card-head"><h2>Their clients</h2></div>
      ${d.clients.length ? `<div class="table-scroll"><table>
        <thead><tr><th>Client</th><th>Country</th><th>Stage</th><th class="num">Monthly value</th>
          <th class="num">Payments</th><th class="num">Collected</th></tr></thead>
        <tbody>${d.clients.map(c => `<tr>
          <td><a href="#/client/${c.id}"><strong>${esc(c.name)}</strong></a></td>
          <td>${esc(c.country) || '—'}</td><td>${stageBadge(c.stage)}</td>
          <td class="num">${money(c.monthly_value, c.currency)}</td>
          <td class="num">${c.payments_count}</td>
          <td class="num">${usd0(c.collected_usd)}</td></tr>`).join('')}</tbody></table></div>`
        : emptyState('No clients yet', 'This agent has not logged any clients.')}
    </div>

    ${paymentsTable(d.payments, 'Payments on their clients', false)}

    <div class="card">
      <div class="card-head"><h2>Payouts</h2><span class="spacer"></span>
        <button class="btn teal sm" id="addPayout">Record payout</button></div>
      ${payoutRows(d.payouts, false)}
    </div>`);

  $('edit').onclick = () => editAgentModal(a, d.notes);
  $('resetPw').onclick = async () => {
    if (!confirm('Reset this agent\u2019s password? Their current password stops working immediately.')) return;
    try {
      const r = await api('/api/admin/agents/' + id + '/reset-password', 'POST', {});
      modal('New temporary password', `
        <p>Pass this to ${esc(a.name)}. It is shown once.</p>
        <div class="copybox">${esc(a.email)}<br>${esc(r.temp_password)}</div>`,
        `<button class="btn teal" onclick="closeModal()">Done</button>`);
    } catch (e) { toast(e.message, 'err'); }
  };
  $('toggle').onclick = async () => {
    const next = a.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await api('/api/admin/agents/' + id, 'PATCH', {status: next});
      toast('Agent ' + (next === 'Active' ? 'reactivated' : 'suspended') + '.', 'ok');
      route();
    } catch (e) { toast(e.message, 'err'); }
  };
  $('addNote').onclick = () => noteModal(id);
  $('addPayout').onclick = () => payoutModal(id, a.name, m.outstanding_usd);
  wirePayoutButtons();
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Delete this note?')) return;
    await api('/api/admin/reviews/' + b.dataset.del, 'DELETE', {});
    toast('Note deleted.', 'ok'); route();
  });
}

function editAgentModal(a, notes) {
  modal('Edit ' + a.name, `
    <div class="grid2">
      <div><label class="lbl" for="eName">Full name</label><input class="inp" id="eName" value="${esc(a.name)}"></div>
      <div><label class="lbl" for="eEmail">Email</label><input class="inp" id="eEmail" value="${esc(a.email)}"></div>
      <div><label class="lbl" for="ePhone">Phone</label><input class="inp" id="ePhone" value="${esc(a.phone)}"></div>
      <div><label class="lbl" for="eCountry">Country</label><input class="inp" id="eCountry" value="${esc(a.country)}"></div>
      <div><label class="lbl" for="eQuota">Annual quota (USD)</label><input class="inp" id="eQuota" type="number" min="0" step="100" value="${a.quota_usd}"></div>
      <div><label class="lbl" for="eStart">Start date</label><input class="inp" id="eStart" type="date" value="${esc(a.start_date)}"></div>
    </div>
    <div style="margin-top:14px"><label class="lbl" for="eNotes">Notes</label>
      <textarea class="inp" id="eNotes">${esc(notes || '')}</textarea></div>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button>
     <button class="btn teal" id="eSave">Save changes</button>`);
  $('eSave').onclick = async () => {
    try {
      await api('/api/admin/agents/' + a.id, 'PATCH', {
        name: val('eName'), email: val('eEmail'), phone: val('ePhone'), country: val('eCountry'),
        quota_usd: num('eQuota'), start_date: val('eStart'), notes: val('eNotes')
      });
      closeModal(); toast('Agent updated.', 'ok'); route();
    } catch (e) { toast(e.message, 'err'); }
  };
}

function noteModal(agentId) {
  modal('Add progress note', `
    <div class="grid2">
      <div><label class="lbl" for="nPeriod">Period</label><input class="inp" id="nPeriod" placeholder="August 2026"></div>
      <div><label class="lbl" for="nRating">Rating</label>
        <select class="inp" id="nRating">
          <option value="5">5 — excellent</option><option value="4">4 — strong</option>
          <option value="3" selected>3 — on track</option><option value="2">2 — needs support</option>
          <option value="1">1 — serious concern</option></select></div>
    </div>
    <div style="margin-top:14px"><label class="lbl" for="nBody">What happened</label>
      <textarea class="inp" id="nBody" placeholder="Be specific: what you observed, what you agreed, what happens next."></textarea></div>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button>
     <button class="btn teal" id="nSave">Save note</button>`);
  $('nSave').onclick = async () => {
    try {
      await api('/api/admin/reviews', 'POST', {
        agent_id: agentId, period: val('nPeriod'), rating: num('nRating'), body: val('nBody')});
      closeModal(); toast('Note saved.', 'ok'); route();
    } catch (e) { toast(e.message, 'err'); }
  };
}

/* ---------------------------------------------------------- CLIENTS */
async function viewClients() {
  const admin = ME.role === 'admin';
  setActive('clients', admin ? 'Clients' : 'My clients');
  loading();
  const d = await api('/api/clients');
  let agents = [];
  if (admin) agents = (await api('/api/admin/agents')).agents;

  view(`
    <div class="card">
      <div class="card-head"><h2>${admin ? 'All clients' : 'My clients'}</h2>
        <span class="spacer"></span>
        <input class="inp" id="search" placeholder="Search clients…" style="width:auto;min-width:180px">
        <button class="btn teal" id="addClient">Add client</button></div>
      ${d.clients.length ? `<div class="table-scroll"><table id="ctab">
        <thead><tr><th>Client</th>${admin ? '<th>Agent</th>' : ''}<th>Country</th><th>Stage</th>
          <th class="num">Monthly value</th><th class="num">Payments</th><th class="num">Collected</th>
          <th>Year-1 window ends</th></tr></thead>
        <tbody>${d.clients.map(c => `<tr data-s="${esc((c.name + ' ' + c.country + ' ' + c.agent_name + ' ' + c.product).toLowerCase())}">
          <td><a href="#/client/${c.id}"><strong>${esc(c.name)}</strong></a>
            ${c.product ? `<div class="muted">${esc(c.product)}</div>` : ''}</td>
          ${admin ? `<td>${esc(c.agent_name)}</td>` : ''}
          <td>${esc(c.country) || '—'}</td><td>${stageBadge(c.stage)}</td>
          <td class="num">${money(c.monthly_value, c.currency)}</td>
          <td class="num">${c.payments_count}</td>
          <td class="num">${usd0(c.collected_usd)}</td>
          <td>${c.window_end ? dt(c.window_end) : '<span class="muted">not started</span>'}</td>
        </tr>`).join('')}</tbody></table></div>`
        : emptyState('No clients yet', admin
            ? 'Add a client, or ask your agents to log their own.'
            : 'Add your first client to start building your pipeline.')}
    </div>`);

  $('addClient').onclick = () => clientModal(null, agents);
  const s = $('search');
  if (s) s.oninput = () => {
    const q = s.value.toLowerCase();
    document.querySelectorAll('#ctab tbody tr').forEach(tr =>
      tr.style.display = tr.dataset.s.includes(q) ? '' : 'none');
  };
}

function clientModal(existing, agents) {
  const c = existing || {};
  const curOpts = FX.map(f => `<option value="${f.code}" ${c.currency === f.code ? 'selected' : ''}>${f.code} — ${esc(f.label)}</option>`).join('');
  const stageOpts = STAGES.map(s => `<option ${c.stage === s ? 'selected' : ''}>${s}</option>`).join('');
  const agentPicker = (ME.role === 'admin' && agents && agents.length)
    ? `<div><label class="lbl" for="cAgent">Agent</label><select class="inp" id="cAgent">
         ${agents.map(a => `<option value="${a.id}" ${c.agent_id === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}
       </select></div>` : '';

  modal(existing ? 'Edit client' : 'Add client', `
    <div class="grid2">
      <div><label class="lbl" for="cName">Client name</label><input class="inp" id="cName" value="${esc(c.name || '')}" placeholder="Copperbelt Mining Services"></div>
      ${agentPicker}
      <div><label class="lbl" for="cPerson">Contact person</label><input class="inp" id="cPerson" value="${esc(c.contact_person || '')}"></div>
      <div><label class="lbl" for="cEmail">Contact email</label><input class="inp" id="cEmail" type="email" value="${esc(c.contact_email || '')}"></div>
      <div><label class="lbl" for="cPhone">Contact phone</label><input class="inp" id="cPhone" value="${esc(c.contact_phone || '')}"></div>
      <div><label class="lbl" for="cCountry">Country</label><input class="inp" id="cCountry" value="${esc(c.country || '')}"></div>
      <div><label class="lbl" for="cProduct">Product</label><input class="inp" id="cProduct" value="${esc(c.product || '')}" placeholder="SmartRegister"></div>
      <div><label class="lbl" for="cCur">Currency</label><select class="inp" id="cCur">${curOpts}</select></div>
      <div><label class="lbl" for="cValue">Monthly value</label><input class="inp" id="cValue" type="number" min="0" step="0.01" value="${c.monthly_value || 0}">
        <div class="hint">What they pay each month, in their currency.</div></div>
      <div><label class="lbl" for="cStage">Stage</label><select class="inp" id="cStage">${stageOpts}</select></div>
    </div>
    <div style="margin-top:14px"><label class="lbl" for="cNotes">Notes</label>
      <textarea class="inp" id="cNotes">${esc(c.notes || '')}</textarea></div>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button>
     <button class="btn teal" id="cSave">${existing ? 'Save changes' : 'Add client'}</button>`);

  $('cSave').onclick = async () => {
    const payload = {
      name: val('cName'), contact_person: val('cPerson'), contact_email: val('cEmail'),
      contact_phone: val('cPhone'), country: val('cCountry'), product: val('cProduct'),
      currency: val('cCur'), monthly_value: num('cValue'), stage: val('cStage'), notes: val('cNotes')
    };
    if ($('cAgent')) payload.agent_id = num('cAgent');
    try {
      if (existing) await api('/api/clients/' + existing.id, 'PATCH', payload);
      else await api('/api/clients', 'POST', payload);
      closeModal(); toast(existing ? 'Client updated.' : 'Client added.', 'ok'); route();
    } catch (e) { toast(e.message, 'err'); }
  };
}

async function viewClientDetail(id) {
  setActive('clients', 'Client');
  loading();
  const d = await api('/api/clients/' + id);
  const c = d.client;
  setActive('clients', c.name);
  const admin = ME.role === 'admin';
  const collected = d.payments.filter(p => !p.voided).reduce((s, p) => s + Number(p.amount_usd), 0);
  const comm = d.payments.reduce((s, p) => s + Number(p.agent_commission_usd), 0);

  view(`
    <div class="card">
      <div class="card-head"><h2>${esc(c.name)} ${stageBadge(c.stage)}</h2><span class="spacer"></span>
        <button class="btn ghost sm" id="editC">Edit</button>
        ${admin ? '<button class="btn teal sm" id="addPay">Record payment</button>' : ''}</div>
      <div class="card-body"><div class="grid2">
        <div><span class="lbl">Agent</span>${esc(c.agent_name)}</div>
        <div><span class="lbl">Contact</span>${esc(c.contact_person) || '—'}${c.contact_email ? '<br>' + esc(c.contact_email) : ''}${c.contact_phone ? '<br>' + esc(c.contact_phone) : ''}</div>
        <div><span class="lbl">Country</span>${esc(c.country) || '—'}</div>
        <div><span class="lbl">Product</span>${esc(c.product) || '—'}</div>
        <div><span class="lbl">Monthly value</span>${money(c.monthly_value, c.currency)} <span class="muted">(${usd(c.monthly_value_usd)})</span></div>
        <div><span class="lbl">Won on</span>${dt(c.won_date)}</div>
      </div>
      ${c.notes ? `<div style="margin-top:14px"><span class="lbl">Notes</span><span style="white-space:pre-wrap">${esc(c.notes)}</span></div>` : ''}
      </div>
    </div>

    <div class="stats">
      <div class="stat teal"><div class="k">Collected</div><div class="v">${usd0(collected)}</div>
        <div class="sub">${d.payments.filter(p => !p.voided).length} payment(s)</div></div>
      <div class="stat amber"><div class="k">Agent commission</div><div class="v">${usd0(comm)}</div></div>
      <div class="stat slate"><div class="k">Year-1 window ends</div>
        <div class="v" style="font-size:19px">${d.payments.length && d.payments[0].window_end ? dt(d.payments[0].window_end) : '—'}</div>
        <div class="sub">12 months from first payment</div></div>
    </div>

    ${paymentsTable(d.payments, 'Payment history', admin)}`);

  $('editC').onclick = async () => {
    let agents = [];
    if (admin) agents = (await api('/api/admin/agents')).agents;
    clientModal(c, agents);
  };
  if ($('addPay')) $('addPay').onclick = () => paymentModal(c);
  wirePaymentButtons();
}

/* ---------------------------------------------------------- PAYMENTS */
function paymentsTable(payments, title, admin) {
  return `<div class="card">
    <div class="card-head"><h2>${esc(title)}</h2><span class="spacer"></span>
      <span class="muted">${payments.length} record${payments.length === 1 ? '' : 's'}</span></div>
    ${payments.length ? `<div class="table-scroll"><table>
      <thead><tr><th>Date</th><th>Client</th><th>Commission type</th><th class="num">Amount</th>
        <th class="num">In USD</th><th class="num">Rate</th><th class="num">Agent</th>
        <th class="num">StatsPack</th><th>Ref</th>${admin ? '<th></th>' : ''}</tr></thead>
      <tbody>${payments.map(p => `<tr${p.voided ? ' style="opacity:.55"' : ''}>
        <td>${dt(p.paid_date)}</td>
        <td>${esc(p.client_name || '')}</td>
        <td>${kindBadge(p.commission_kind)}</td>
        <td class="num">${money(p.amount, p.currency)}</td>
        <td class="num">${usd(p.amount_usd)}</td>
        <td class="num">${p.voided ? '—' : pct(p.commission_rate)}</td>
        <td class="num"><strong>${usd(p.agent_commission_usd)}</strong></td>
        <td class="num">${usd(p.statspack_share_usd)}</td>
        <td class="muted">${esc(p.reference || '—')}</td>
        ${admin ? `<td><button class="btn ghost sm" data-void="${p.id}">${p.voided ? 'Restore' : 'Void'}</button></td>` : ''}
      </tr>`).join('')}</tbody></table></div>`
      : emptyState('No payments recorded', 'Commission is calculated the moment a payment is recorded.')}
  </div>`;
}

function wirePaymentButtons() {
  document.querySelectorAll('[data-void]').forEach(b => b.onclick = async () => {
    const restoring = b.textContent === 'Restore';
    if (!confirm(restoring
      ? 'Restore this payment? Commission will be recalculated.'
      : 'Void this payment? It stays on the record but earns no commission.')) return;
    try {
      await api('/api/payments/' + b.dataset.void + '/void', 'POST', {});
      toast(restoring ? 'Payment restored.' : 'Payment voided.', 'ok');
      route();
    } catch (e) { toast(e.message, 'err'); }
  });
}

async function viewPayments() {
  const admin = ME.role === 'admin';
  setActive('payments', admin ? 'Payments' : 'Payments received');
  loading();
  const d = await api('/api/payments');
  let clients = [];
  if (admin) clients = (await api('/api/clients')).clients;

  view(`
    ${admin ? `<div class="card"><div class="card-head">
      <h2>Record a client payment</h2><span class="spacer"></span>
      <button class="btn teal" id="newPay">Record payment</button></div>
      <div class="card-body"><p class="muted">Recording a payment is what triggers commission.
      The first payment for a client pays the agent ${pct(Number(SETTINGS.commission_first_rate))};
      every monthly payment inside the following ${SETTINGS.commission_window_months} months pays
      ${pct(Number(SETTINGS.commission_recurring_rate))}; after that the agent's commission ceases.</p></div></div>` : ''}
    ${paymentsTable(d.payments, admin ? 'All payments' : 'Payments on my clients', admin)}`);

  if ($('newPay')) $('newPay').onclick = () => paymentModal(null, clients);
  wirePaymentButtons();
}

function paymentModal(client, clients) {
  const curOpts = FX.map(f => `<option value="${f.code}" ${(client && client.currency === f.code) ? 'selected' : ''}>${f.code}</option>`).join('');
  const picker = client
    ? `<div><span class="lbl">Client</span><strong>${esc(client.name)}</strong></div>`
    : `<div><label class="lbl" for="pClient">Client</label><select class="inp" id="pClient">
         ${(clients || []).map(c => `<option value="${c.id}" data-cur="${c.currency}" data-val="${c.monthly_value}">${esc(c.name)} — ${esc(c.agent_name)}</option>`).join('')}
       </select></div>`;

  modal('Record payment', `
    <div class="grid2">
      ${picker}
      <div><label class="lbl" for="pDate">Date received</label>
        <input class="inp" id="pDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
      <div><label class="lbl" for="pAmount">Amount received</label>
        <input class="inp" id="pAmount" type="number" min="0.01" step="0.01" value="${client ? client.monthly_value : ''}"></div>
      <div><label class="lbl" for="pCur">Currency</label><select class="inp" id="pCur">${curOpts}</select></div>
      <div><label class="lbl" for="pRef">Reference</label><input class="inp" id="pRef" placeholder="Bank ref / invoice no."></div>
    </div>
    <div style="margin-top:14px"><label class="lbl" for="pNote">Note</label>
      <textarea class="inp" id="pNote" placeholder="Optional."></textarea></div>
    <p class="hint" style="margin-top:12px">The exchange rate is locked in at today's rate from Settings,
      so later rate changes will not move historic commission.</p>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button>
     <button class="btn teal" id="pSave">Record payment</button>`);

  if ($('pClient')) $('pClient').onchange = e => {
    const o = e.target.selectedOptions[0];
    $('pCur').value = o.dataset.cur;
    if (!$('pAmount').value) $('pAmount').value = o.dataset.val;
  };
  if ($('pClient') && $('pClient').selectedOptions[0]) {
    $('pCur').value = $('pClient').selectedOptions[0].dataset.cur;
  }

  $('pSave').onclick = async () => {
    try {
      const r = await api('/api/payments', 'POST', {
        client_id: client ? client.id : num('pClient'),
        amount: num('pAmount'), currency: val('pCur'), paid_date: val('pDate'),
        reference: val('pRef'), note: val('pNote')
      });
      closeModal();
      const p = r.payment;
      toast(`Payment recorded — ${p.commission_kind}, agent earns ${usd(p.agent_commission_usd)}.`, 'ok');
      route();
    } catch (e) { toast(e.message, 'err'); }
  };
}

/* ---------------------------------------------------------- COMMISSIONS */
async function viewCommissions() {
  const admin = ME.role === 'admin';
  setActive('commissions', admin ? 'Commission' : 'My commission');
  loading();
  const d = await api('/api/commissions');
  const r = d.rules;

  const rules = `<div class="card">
    <div class="card-head"><h2>How commission is calculated</h2></div>
    <div class="table-scroll"><table class="rule-table">
      <thead><tr><th>Payment stage</th><th class="num">Agent</th><th class="num">StatsPack</th>
        <th>Duration</th><th>Trigger</th></tr></thead>
      <tbody>
        <tr><td><strong>First client payment</strong></td>
          <td class="num">${pct(r.first_rate)}</td><td class="num">${pct(1 - r.first_rate)}</td>
          <td>Once only</td><td>On receipt of the client's first payment</td></tr>
        <tr><td><strong>Monthly payments — year 1</strong></td>
          <td class="num">${pct(r.recurring_rate)}</td><td class="num">${pct(1 - r.recurring_rate)}</td>
          <td>${r.window_months} months from the first payment</td><td>On receipt of each monthly payment</td></tr>
        <tr><td><strong>After month ${r.window_months}</strong></td>
          <td class="num">0.0%</td><td class="num">100.0%</td>
          <td>Indefinite</td><td class="muted">Commission ceases</td></tr>
      </tbody></table></div></div>`;

  if (!admin) {
    const c = d.commissions[0];
    view(rules + `
      <div class="stats">
        <div class="stat teal"><div class="k">Earned to date</div><div class="v">${usd0(c.earned_usd)}</div>
          <div class="sub">${usd0(c.first_payment_usd)} first-payment · ${usd0(c.recurring_usd)} monthly</div></div>
        <div class="stat green"><div class="k">Paid to me</div><div class="v">${usd0(c.paid_out_usd)}</div></div>
        <div class="stat amber"><div class="k">Being processed</div><div class="v">${usd0(c.in_flight_usd)}</div></div>
        <div class="stat coral"><div class="k">Still owed</div><div class="v">${usd0(c.outstanding_usd)}</div></div>
      </div>`);
    return;
  }

  view(rules + `
    <div class="card">
      <div class="card-head"><h2>Commission by agent</h2></div>
      ${d.commissions.length ? `<div class="table-scroll"><table>
        <thead><tr><th>Agent</th><th class="num">Collected</th><th class="num">First-payment</th>
          <th class="num">Monthly</th><th class="num">Total earned</th><th class="num">Paid</th>
          <th class="num">Processing</th><th class="num">Outstanding</th><th></th></tr></thead>
        <tbody>${d.commissions.map(c => `<tr>
          <td><a href="#/agent/${c.agent_id}"><strong>${esc(c.agent_name)}</strong></a></td>
          <td class="num">${usd0(c.collected_usd)}</td>
          <td class="num">${usd0(c.first_payment_usd)}</td>
          <td class="num">${usd0(c.recurring_usd)}</td>
          <td class="num"><strong>${usd0(c.earned_usd)}</strong></td>
          <td class="num">${usd0(c.paid_out_usd)}</td>
          <td class="num">${usd0(c.in_flight_usd)}</td>
          <td class="num"><strong>${usd0(c.outstanding_usd)}</strong></td>
          <td><button class="btn teal sm" data-pay="${c.agent_id}" data-name="${esc(c.agent_name)}"
                data-out="${c.outstanding_usd}">Pay</button></td></tr>`).join('')}</tbody></table></div>`
        : emptyState('No agents yet', 'Commission appears once you have agents with paying clients.')}
    </div>`);

  document.querySelectorAll('[data-pay]').forEach(b => b.onclick =
    () => payoutModal(Number(b.dataset.pay), b.dataset.name, Number(b.dataset.out)));
}

/* ---------------------------------------------------------- PAYOUTS */
function payoutRows(payouts, showAgent) {
  if (!payouts.length) return emptyState('No payouts yet', 'Record a payout when you have paid an agent.');
  const admin = ME.role === 'admin';
  return `<div class="table-scroll"><table>
    <thead><tr><th>Created</th>${showAgent ? '<th>Agent</th>' : ''}<th>Period</th>
      <th class="num">Amount</th><th>Status</th><th>Paid on</th><th>Reference</th>${admin ? '<th></th>' : ''}</tr></thead>
    <tbody>${payouts.map(p => `<tr>
      <td>${dt(p.created_at)}</td>
      ${showAgent ? `<td>${esc(p.agent_name || '')}</td>` : ''}
      <td>${esc(p.period_label) || '—'}</td>
      <td class="num"><strong>${usd(p.amount_usd)}</strong></td>
      <td><span class="badge ${p.status}">${p.status}</span></td>
      <td>${dt(p.paid_date)}</td>
      <td class="muted">${esc(p.reference) || '—'}</td>
      ${admin ? `<td><div class="btn-row">
        ${p.status !== 'Paid' ? `<button class="btn teal sm" data-mark="${p.id}">Mark paid</button>` : ''}
        ${p.status === 'Pending' ? `<button class="btn ghost sm" data-cancel="${p.id}">Cancel</button>` : ''}
      </div></td>` : ''}
    </tr>`).join('')}</tbody></table></div>`;
}

function wirePayoutButtons() {
  document.querySelectorAll('[data-mark]').forEach(b => b.onclick = async () => {
    try {
      await api('/api/payouts/' + b.dataset.mark, 'PATCH', {status: 'Paid'});
      toast('Payout marked paid.', 'ok'); route();
    } catch (e) { toast(e.message, 'err'); }
  });
  document.querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => {
    if (!confirm('Cancel this payout?')) return;
    try {
      await api('/api/payouts/' + b.dataset.cancel, 'PATCH', {status: 'Cancelled'});
      toast('Payout cancelled.', 'ok'); route();
    } catch (e) { toast(e.message, 'err'); }
  });
}

function payoutModal(agentId, agentName, outstanding) {
  modal('Record payout to ' + agentName, `
    <p class="muted" style="margin-bottom:14px">Outstanding commission: <strong>${usd(outstanding)}</strong></p>
    <div class="grid2">
      <div><label class="lbl" for="poAmount">Amount (USD)</label>
        <input class="inp" id="poAmount" type="number" min="0.01" step="0.01" value="${outstanding > 0 ? outstanding.toFixed(2) : ''}"></div>
      <div><label class="lbl" for="poPeriod">Period</label><input class="inp" id="poPeriod" placeholder="August 2026"></div>
      <div><label class="lbl" for="poRef">Reference</label><input class="inp" id="poRef" placeholder="EFT ref"></div>
    </div>
    <div style="margin-top:14px"><label class="lbl" for="poNote">Note</label>
      <textarea class="inp" id="poNote"></textarea></div>
    <p class="hint" style="margin-top:12px">This creates a Pending payout. Mark it Paid once the money has actually left.</p>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button>
     <button class="btn teal" id="poSave">Create payout</button>`);
  $('poSave').onclick = async () => {
    try {
      await api('/api/payouts', 'POST', {
        agent_id: agentId, amount_usd: num('poAmount'), period_label: val('poPeriod'),
        reference: val('poRef'), note: val('poNote')});
      closeModal(); toast('Payout created.', 'ok'); route();
    } catch (e) { toast(e.message, 'err'); }
  };
}

async function viewPayouts() {
  const admin = ME.role === 'admin';
  setActive('payouts', admin ? 'Payouts' : 'My payouts');
  loading();
  const d = await api('/api/payouts');
  view(`<div class="card">
    <div class="card-head"><h2>${admin ? 'All payouts' : 'Payouts to me'}</h2><span class="spacer"></span>
      ${admin ? '<a class="btn ghost sm" href="#/commissions">Pay an agent</a>' : ''}</div>
    ${payoutRows(d.payouts, admin)}</div>`);
  wirePayoutButtons();
}

/* ---------------------------------------------------------- AGENT dashboard */
async function viewAgentDashboard() {
  setActive('dashboard', 'Dashboard');
  loading();
  const d = await api('/api/agent/overview');
  const m = d.metrics, r = d.rules;

  view(`
    <div class="stats">
      <div class="stat teal"><div class="k">Commission earned</div><div class="v">${usd0(m.earned_usd)}</div>
        <div class="sub">${usd0(m.first_payment_usd)} first-payment · ${usd0(m.recurring_usd)} monthly</div></div>
      <div class="stat coral"><div class="k">Still owed to me</div><div class="v">${usd0(m.outstanding_usd)}</div>
        <div class="sub">${usd0(m.paid_out_usd)} already paid</div></div>
      <div class="stat green"><div class="k">Clients won</div><div class="v">${m.clients_won}</div>
        <div class="sub">of ${m.clients_total} logged</div></div>
      <div class="stat amber"><div class="k">Open pipeline</div><div class="v">${usd0(m.pipeline_usd)}</div>
        <div class="sub">monthly value not yet won</div></div>
    </div>

    ${m.quota_usd ? `<div class="card"><div class="card-head"><h2>Progress to quota</h2></div>
      <div class="card-body"><span class="lbl">${usd0(m.collected_usd)} collected of ${usd0(m.quota_usd)}</span>
      ${bar(m.attainment)}</div></div>` : ''}

    <div class="card">
      <div class="card-head"><h2>My clients</h2><span class="spacer"></span>
        <a class="btn teal sm" href="#/clients">Manage clients</a></div>
      ${d.clients.length ? `<div class="table-scroll"><table>
        <thead><tr><th>Client</th><th>Stage</th><th class="num">Monthly value</th><th>Country</th></tr></thead>
        <tbody>${d.clients.slice(0, 8).map(c => `<tr>
          <td><a href="#/client/${c.id}"><strong>${esc(c.name)}</strong></a></td>
          <td>${stageBadge(c.stage)}</td>
          <td class="num">${money(c.monthly_value, c.currency)}</td>
          <td>${esc(c.country) || '—'}</td></tr>`).join('')}</tbody></table></div>`
        : emptyState('No clients yet', 'Add your first client from the My clients page.')}
    </div>

    ${paymentsTable(d.payments.slice(0, 10), 'Recent payments from my clients', false)}

    <div class="card">
      <div class="card-head"><h2>Notes from StatsPack</h2></div>
      ${d.reviews.length ? `<div class="card-body">${d.reviews.map(rv => `
        <div style="border-left:3px solid var(--teal);padding:2px 0 2px 13px;margin-bottom:15px">
          <div class="muted" style="font-size:12px">${dt(rv.created_at)}
            ${rv.period ? '· ' + esc(rv.period) : ''} · rated ${rv.rating}/5</div>
          <div style="margin-top:3px;white-space:pre-wrap">${esc(rv.body)}</div>
        </div>`).join('')}</div>`
        : emptyState('No notes yet', 'Feedback from your StatsPack manager will appear here.')}
    </div>`);
}

/* ---------------------------------------------------------- SETTINGS */
async function viewSettings() {
  setActive('settings', 'Settings');
  loading();
  const d = await api('/api/admin/settings');
  const s = d.settings;

  view(`
    <div class="card">
      <div class="card-head"><h2>Commission rules</h2></div>
      <div class="card-body">
        <p class="muted" style="margin-bottom:16px">These drive every commission figure in the portal.
          Changing them recalculates historic payments too, so change them only when the agent
          agreement itself changes.</p>
        <div class="grid2">
          <div><label class="lbl" for="sFirst">First payment — agent share (%)</label>
            <input class="inp" id="sFirst" type="number" min="0" max="100" step="0.5" value="${(Number(s.commission_first_rate) * 100).toFixed(1)}"></div>
          <div><label class="lbl" for="sRecur">Monthly payments — agent share (%)</label>
            <input class="inp" id="sRecur" type="number" min="0" max="100" step="0.5" value="${(Number(s.commission_recurring_rate) * 100).toFixed(1)}"></div>
          <div><label class="lbl" for="sWindow">Commission window (months)</label>
            <input class="inp" id="sWindow" type="number" min="1" max="120" step="1" value="${s.commission_window_months}">
            <div class="hint">Counted from each client's first payment.</div></div>
        </div>
        <div class="btn-row" style="margin-top:16px"><button class="btn teal" id="saveRules">Save rules</button></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Exchange rates</h2><span class="spacer"></span>
        <span class="muted">units per 1 USD</span></div>
      <div class="card-body">
        <p class="muted" style="margin-bottom:14px">Rates are locked into each payment when you record it,
          so editing these changes future payments only. Update them from your bank before a payout run.</p>
        <div class="grid2" id="fxGrid">
          ${d.fx.map(f => `<div><label class="lbl" for="fx_${f.code}">${f.code} — ${esc(f.label)}</label>
            <input class="inp" id="fx_${f.code}" type="number" min="0.0001" step="0.0001"
              value="${f.rate}" ${f.code === 'USD' ? 'disabled' : ''}></div>`).join('')}
        </div>
        <div class="btn-row" style="margin-top:16px"><button class="btn teal" id="saveFx">Save rates</button></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Backup</h2></div>
      <div class="card-body">
        <p class="muted" style="margin-bottom:14px">Downloads every agent, client, payment and payout as a
          JSON file. Passwords are never included. Keep a copy somewhere off this server.</p>
        <button class="btn ghost" id="dlBackup">Download backup</button>
      </div>
    </div>`);

  $('saveRules').onclick = async () => {
    try {
      await api('/api/admin/settings', 'PUT', {settings: {
        commission_first_rate: num('sFirst') / 100,
        commission_recurring_rate: num('sRecur') / 100,
        commission_window_months: num('sWindow')}});
      toast('Commission rules saved.', 'ok');
      SETTINGS = (await api('/api/me')).settings;
    } catch (e) { toast(e.message, 'err'); }
  };
  $('saveFx').onclick = async () => {
    const rates = d.fx.map(f => ({code: f.code, rate: Number($('fx_' + f.code).value), label: f.label}));
    try {
      await api('/api/admin/fx', 'PUT', {rates});
      toast('Exchange rates saved.', 'ok');
      FX = (await api('/api/fx')).fx;
    } catch (e) { toast(e.message, 'err'); }
  };
  $('dlBackup').onclick = async () => {
    try {
      const data = await api('/api/admin/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'statspack-portal-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Backup downloaded.', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  };
}

async function viewAudit() {
  setActive('audit', 'Activity log');
  loading();
  const d = await api('/api/admin/audit');
  view(`<div class="card">
    <div class="card-head"><h2>Activity log</h2><span class="spacer"></span>
      <span class="muted">most recent 300 events</span></div>
    ${d.audit.length ? `<div class="table-scroll"><table>
      <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th><th>IP</th></tr></thead>
      <tbody>${d.audit.map(a => `<tr>
        <td class="muted">${esc(a.created_at)}</td><td>${esc(a.actor)}</td>
        <td><span class="badge">${esc(a.action)}</span></td>
        <td>${esc(a.detail)}</td><td class="muted">${esc(a.ip)}</td></tr>`).join('')}</tbody></table></div>`
      : emptyState('Nothing logged yet', 'Sign-ins and changes will appear here.')}</div>`);
}

async function viewProfile() {
  setActive('profile', 'My profile');
  view(`<div class="card">
    <div class="card-head"><h2>My details</h2></div>
    <div class="card-body"><div class="grid2">
      <div><span class="lbl">Name</span>${esc(ME.name)}</div>
      <div><span class="lbl">Email</span>${esc(ME.email)}</div>
      <div><span class="lbl">Country</span>${esc(ME.country) || '—'}</div>
      <div><span class="lbl">Phone</span>${esc(ME.phone) || '—'}</div>
      <div><span class="lbl">Started</span>${dt(ME.start_date)}</div>
      <div><span class="lbl">Annual quota</span>${ME.quota_usd ? usd0(ME.quota_usd) : '—'}</div>
    </div>
    <p class="hint" style="margin-top:16px">Ask your StatsPack administrator to correct any of these.</p>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn teal" onclick="openPasswordModal(false)">Change password</button></div>
    </div></div>`);
}

/* ---------------------------------------------------------------- router */
const ROUTES = {
  dashboard: () => ME.role === 'admin' ? viewAdminDashboard() : viewAgentDashboard(),
  agents: viewAgents,
  clients: viewClients,
  payments: viewPayments,
  commissions: viewCommissions,
  payouts: viewPayouts,
  settings: viewSettings,
  audit: viewAudit,
  profile: viewProfile,
};

async function route() {
  const hash = (location.hash || '#/dashboard').slice(2);
  const [key, arg] = hash.split('/');
  $('sidebar').classList.remove('open');
  $('backdrop').classList.remove('show');
  window.scrollTo(0, 0);
  try {
    if (key === 'agent' && arg) return await viewAgentDetail(arg);
    if (key === 'client' && arg) return await viewClientDetail(arg);
    const fn = ROUTES[key];
    if (!fn) { location.hash = '#/dashboard'; return; }
    if ((key === 'agents' || key === 'settings' || key === 'audit') && ME.role !== 'admin') {
      location.hash = '#/dashboard'; return;
    }
    await fn();
  } catch (e) {
    if (e.message === 'Signed out') return;
    view(`<div class="empty"><strong>Could not load this page</strong>${esc(e.message)}
      <div class="btn-row" style="justify-content:center;margin-top:14px">
        <button class="btn ghost" onclick="route()">Try again</button></div></div>`);
  }
}
window.addEventListener('hashchange', route);

/* ---------------------------------------------------------------- boot */
(async function boot() {
  if (!token()) { location.replace('/login'); return; }
  try {
    const d = await api('/api/me');
    ME = d.user; SETTINGS = d.settings; STAGES = d.stages;
    paintChrome();
    if (ME.must_change_pw) { openPasswordModal(true); return; }
    FX = (await api('/api/fx')).fx;
    const h = await fetch('/api/health').then(r => r.json()).catch(() => null);
    if (h) $('engineChip').textContent = h.version + ' · ' + (h.engine.startsWith('postgres') ? 'Postgres' : 'local');
    route();
  } catch (e) {
    localStorage.removeItem('sp_token');
    location.replace('/login');
  }
})();

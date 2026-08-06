/* UI. Three screens, routed off the hash: list, customer ledger, settings. */

(() => {
  const view = document.getElementById('view');
  const title = document.getElementById('title');
  const backBtn = document.getElementById('backBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const backdrop = document.getElementById('sheetBackdrop');
  const sheetTitle = document.getElementById('sheetTitle');
  const sheetBody = document.getElementById('sheetBody');
  const toastEl = document.getElementById('toast');

  const t = (k, ...a) => I18N.t(k, ...a);

  /* ---------- helpers ---------- */

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /* Indian grouping: 12,34,567 — Intl gets this right with the en-IN locale. */
  function money(paise) {
    const rupees = Math.abs(paise) / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    }).format(rupees);
  }

  const plainAmount = paise =>
    (Math.abs(paise) / 100).toFixed(paise % 100 === 0 ? 0 : 2);

  function shortDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y.slice(2)}`;
  }

  function relDate(ts) {
    if (!ts) return '';
    const days = Math.floor((Date.now() - ts) / 86400000);
    if (days <= 0) return I18N.lang === 'hi' ? 'आज' : 'Today';
    if (days === 1) return I18N.lang === 'hi' ? 'कल' : 'Yesterday';
    return shortDate(new Date(ts).toISOString().slice(0, 10));
  }

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }

  /* Amounts are typed in rupees, kept in paise. */
  function toPaise(input) {
    const n = Number(String(input).replace(/[^\d.]/g, ''));
    if (!isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  }

  function download(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- sheet ---------- */

  function openSheet(heading, html, wire) {
    sheetTitle.textContent = heading;
    sheetBody.innerHTML = html;
    backdrop.hidden = false;
    if (wire) wire(sheetBody);
    const first = sheetBody.querySelector('input, textarea, select');
    if (first) first.focus();
  }

  const closeSheet = () => { backdrop.hidden = true; sheetBody.innerHTML = ''; };

  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

  const sheetButtons = saveLabel => `
    <div class="sheet-actions">
      <button type="button" class="btn" data-close>${esc(t('cancel'))}</button>
      <button type="submit" class="btn btn-brand">${esc(saveLabel || t('save'))}</button>
    </div>`;

  sheetBody.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) closeSheet();
  });

  /* ---------- screens ---------- */

  function renderHome() {
    const { receivable, payable } = Store.totals();
    const q = (view.querySelector('#q') || {}).value || '';

    view.innerHTML = `
      <div class="summary">
        <div><span>${esc(t('toReceive'))}</span><strong class="amt-owe">${money(receivable)}</strong></div>
        <div><span>${esc(t('toPay'))}</span><strong class="amt-paid">${money(payable)}</strong></div>
      </div>
      <input id="q" class="search" type="search" placeholder="${esc(t('searchCustomer'))}" value="${esc(q)}">
      <div id="customers"></div>
      <div class="footer-bar"><div class="footer-inner">
        <button class="btn btn-brand btn-block" id="addCustomer">+ ${esc(t('newCustomer'))}</button>
      </div></div>`;

    renderCustomerList(q);

    view.querySelector('#q').addEventListener('input', e => renderCustomerList(e.target.value));
    view.querySelector('#addCustomer').addEventListener('click', () => customerForm());
  }

  function renderCustomerList(q) {
    const box = view.querySelector('#customers');
    const needle = q.trim().toLowerCase();
    const all = Store.customerList();
    const list = needle
      ? all.filter(c => c.name.toLowerCase().includes(needle) || c.phone.includes(needle))
      : all;

    if (!list.length) {
      box.innerHTML = `<p class="empty">${esc(all.length ? t('noMatch') : t('noCustomers'))}</p>`;
      return;
    }

    box.innerHTML = `<ul class="list">${list.map(c => `
      <li>
        <button class="row" data-id="${esc(c.id)}">
          <span class="avatar">${esc(c.name.trim().charAt(0).toUpperCase() || '?')}</span>
          <span class="row-main">
            <b>${esc(c.name)}</b>
            <small>${esc(relDate(c.lastActivity))}</small>
          </span>
          <span class="row-amt ${c.balance >= 0 ? 'amt-owe' : 'amt-paid'}">
            ${c.balance === 0 ? '—' : money(c.balance)}
            <small>${esc(c.balance === 0 ? t('settled') : c.balance > 0 ? t('willGet') : t('willGive'))}</small>
          </span>
        </button>
      </li>`).join('')}</ul>`;

    box.querySelectorAll('.row').forEach(row => {
      row.addEventListener('click', () => { location.hash = '#/c/' + row.dataset.id; });
    });
  }

  function renderCustomer(id) {
    const c = Store.getCustomer(id);
    if (!c) { location.hash = ''; return; }

    const balance = Store.balanceOf(id);
    const entries = Store.entriesFor(id).reverse();

    view.innerHTML = `
      <div class="balance">
        <span>${esc(balance === 0 ? t('settled') : balance > 0 ? t('willGet') : t('willGive'))}</span>
        <strong class="${balance >= 0 ? 'amt-owe' : 'amt-paid'}">${money(balance)}</strong>
      </div>

      <div class="actions">
        <button class="btn" id="remind">${esc(t('remind'))}</button>
        <button class="btn" id="call">${esc(t('call'))}</button>
      </div>

      <div class="list">
        <div class="ledger-head">
          <span>${esc(t('entries'))}</span>
          <span style="text-align:right">${esc(t('given'))}</span>
          <span style="text-align:right">${esc(t('received'))}</span>
          <span></span>
        </div>
        ${entries.length ? entries.map(e => `
          <div class="ledger-row" style="border-top:1px solid var(--line)">
            <span>
              <span class="date">${esc(shortDate(e.date))}</span>
              ${e.note ? `<div class="note">${esc(e.note)}</div>` : ''}
            </span>
            <span class="give">${e.type === 'give' ? money(e.paise) : ''}</span>
            <span class="take">${e.type === 'take' ? money(e.paise) : ''}</span>
            <button class="del-entry" data-del="${esc(e.id)}" aria-label="delete">&times;</button>
          </div>`).join('')
          : `<p class="empty">${esc(t('noEntries'))}</p>`}
      </div>

      <div class="actions" style="margin-top:16px">
        <button class="btn" id="editCustomer">${esc(t('editCustomer'))}</button>
        <button class="btn btn-danger" id="deleteCustomer">${esc(t('deleteCustomer'))}</button>
      </div>

      <div class="footer-bar"><div class="footer-inner">
        <button class="btn btn-give" id="give">${esc(t('youGave'))}</button>
        <button class="btn btn-take" id="take">${esc(t('youGot'))}</button>
      </div></div>`;

    view.querySelector('#give').addEventListener('click', () => entryForm(id, 'give'));
    view.querySelector('#take').addEventListener('click', () => entryForm(id, 'take'));
    view.querySelector('#remind').addEventListener('click', () => remind(c, balance));
    view.querySelector('#call').addEventListener('click', () => {
      if (!c.phone) return toast(t('needPhone'));
      location.href = 'tel:' + c.phone;
    });
    view.querySelector('#editCustomer').addEventListener('click', () => customerForm(c));
    view.querySelector('#deleteCustomer').addEventListener('click', () => {
      if (!confirm(t('confirmDeleteCustomer'))) return;
      Store.deleteCustomer(id);
      location.hash = '';
      toast(t('deleted'));
    });

    view.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm(t('confirmDeleteEntry'))) return;
        Store.deleteEntry(btn.dataset.del);
        render();
        toast(t('deleted'));
      });
    });
  }

  function renderSettings() {
    const s = Store.settings();
    view.innerHTML = `
      <form class="card" id="settingsForm">
        <label>${esc(t('shopName'))}
          <input name="shopName" value="${esc(s.shopName)}" maxlength="60">
        </label>
        <label>${esc(t('upiId'))}
          <input name="upiId" value="${esc(s.upiId)}" placeholder="name@upi" maxlength="60">
        </label>
        <p class="hint">${esc(t('upiHint'))}</p>
        <label>${esc(t('language'))}
          <select name="lang">
            <option value="hi" ${s.lang === 'hi' ? 'selected' : ''}>हिंदी</option>
            <option value="en" ${s.lang === 'en' ? 'selected' : ''}>English</option>
          </select>
        </label>
        <button class="btn btn-brand btn-block" type="submit">${esc(t('save'))}</button>
      </form>

      <div class="card">
        <h3>${esc(t('backup'))}</h3>
        <button class="btn btn-block" id="exportJson">${esc(t('downloadBackup'))}</button>
        <div style="height:10px"></div>
        <button class="btn btn-block" id="importJson">${esc(t('restoreBackup'))}</button>
        <div style="height:10px"></div>
        <button class="btn btn-block" id="exportCsv">${esc(t('downloadCsv'))}</button>
        <div style="height:10px"></div>
        <button class="btn btn-block btn-danger" id="clearAll">${esc(t('clearAll'))}</button>
        <input type="file" id="importFile" accept="application/json,.json" hidden>
      </div>

      <p class="hint" style="text-align:center">${esc(t('privacy'))}</p>`;

    view.querySelector('#settingsForm').addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target);
      Store.saveSettings({
        shopName: f.get('shopName').trim(),
        upiId: f.get('upiId').trim(),
        lang: f.get('lang')
      });
      I18N.setLang(f.get('lang'));
      document.documentElement.lang = f.get('lang');
      render();
      toast(t('saved'));
    });

    const stamp = Store.today();
    view.querySelector('#exportJson').addEventListener('click', () =>
      download(`udhar-khata-${stamp}.json`, Store.exportJSON(), 'application/json'));
    view.querySelector('#exportCsv').addEventListener('click', () =>
      download(`udhar-khata-${stamp}.csv`, '﻿' + Store.exportCSV(), 'text/csv'));

    const file = view.querySelector('#importFile');
    view.querySelector('#importJson').addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      try {
        Store.importJSON(await f.text());
        I18N.setLang(Store.settings().lang);
        render();
        toast(t('restored'));
      } catch (err) {
        console.error(err);
        toast(t('badFile'));
      }
      file.value = '';
    });

    view.querySelector('#clearAll').addEventListener('click', () => {
      if (!confirm(t('confirmClear'))) return;
      Store.clearAll();
      location.hash = '';
      toast(t('cleared'));
    });
  }

  /* ---------- forms ---------- */

  function customerForm(existing) {
    const c = existing || { name: '', phone: '', note: '' };
    openSheet(existing ? t('editCustomer') : t('newCustomer'), `
      <form id="f">
        <label>${esc(t('customerName'))}
          <input name="name" value="${esc(c.name)}" maxlength="60" required>
        </label>
        <label>${esc(t('phone'))}
          <input name="phone" type="tel" inputmode="tel" value="${esc(c.phone)}" maxlength="15">
        </label>
        <label>${esc(t('noteOptional'))}
          <input name="note" value="${esc(c.note)}" maxlength="120">
        </label>
        ${sheetButtons()}
      </form>`, box => {
      box.querySelector('#f').addEventListener('submit', e => {
        e.preventDefault();
        const f = new FormData(e.target);
        const name = f.get('name').trim();
        if (!name) return toast(t('needName'));
        const patch = { name, phone: f.get('phone'), note: f.get('note') };
        if (existing) Store.updateCustomer(existing.id, patch);
        else Store.addCustomer(patch);
        closeSheet();
        render();
        toast(t('saved'));
      });
    });
  }

  function entryForm(customerId, type) {
    openSheet(type === 'give' ? t('youGave') : t('youGot'), `
      <form id="f">
        <label>${esc(t('amount'))}
          <input name="amount" type="number" inputmode="decimal" step="0.01" min="0.01"
                 autocomplete="off" required style="font-size:22px;font-weight:600">
        </label>
        <label>${esc(t('details'))}
          <input name="note" maxlength="120" placeholder="${esc(I18N.lang === 'hi' ? 'जैसे: 2 किलो चीनी' : 'e.g. 2 kg sugar')}">
        </label>
        <label>${esc(t('date'))}
          <input name="date" type="date" value="${Store.today()}" max="${Store.today()}">
        </label>
        <div class="sheet-actions">
          <button type="button" class="btn" data-close>${esc(t('cancel'))}</button>
          <button type="submit" class="btn ${type === 'give' ? 'btn-give' : 'btn-take'}">${esc(t('save'))}</button>
        </div>
      </form>`, box => {
      box.querySelector('#f').addEventListener('submit', e => {
        e.preventDefault();
        const f = new FormData(e.target);
        const paise = toPaise(f.get('amount'));
        if (!paise) return toast(t('needAmount'));
        Store.addEntry({
          customerId,
          type,
          paise,
          note: f.get('note'),
          date: f.get('date') || Store.today()
        });
        closeSheet();
        render();
        toast(t('saved'));
      });
    });
  }

  /* ---------- WhatsApp reminder ---------- */

  function remind(customer, balance) {
    const s = Store.settings();
    const msg = t('reminderMsg', customer.name, plainAmount(balance), s.shopName, s.upiId);
    const text = encodeURIComponent(msg);
    /* wa.me needs the country code and no +; Indian numbers get 91 prefixed. */
    const digits = (customer.phone || '').replace(/\D/g, '');
    const to = digits.length === 10 ? '91' + digits : digits;
    window.open(to ? `https://wa.me/${to}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
  }

  /* ---------- routing ---------- */

  function render() {
    const hash = location.hash;
    const s = Store.settings();
    I18N.setLang(s.lang);
    document.documentElement.lang = s.lang;

    if (hash.startsWith('#/c/')) {
      const c = Store.getCustomer(hash.slice(4));
      title.textContent = c ? c.name : t('appName');
      backBtn.hidden = false;
      settingsBtn.hidden = true;
      renderCustomer(hash.slice(4));
    } else if (hash === '#/settings') {
      title.textContent = t('settings');
      backBtn.hidden = false;
      settingsBtn.hidden = true;
      renderSettings();
    } else {
      title.textContent = s.shopName || t('appName');
      backBtn.hidden = true;
      settingsBtn.hidden = false;
      renderHome();
    }
    window.scrollTo(0, 0);
  }

  backBtn.addEventListener('click', () => { location.hash = ''; });
  settingsBtn.addEventListener('click', () => { location.hash = '#/settings'; });
  window.addEventListener('hashchange', render);

  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW failed', err));
  }
})();

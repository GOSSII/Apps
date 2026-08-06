/* Data layer. Everything lives in localStorage — no server, no account, no
   data leaves the phone. Amounts are stored in paise (integers) so that
   repeated add/subtract never drifts the way floats do. */

const Store = (() => {
  const KEY = 'udhar-khata:v1';

  const blank = () => ({
    v: 1,
    shopName: '',
    upiId: '',
    lang: 'hi',
    customers: [],   // {id, name, phone, note, createdAt}
    entries: []      // {id, customerId, type:'give'|'take', paise, note, date, ts}
  });

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const parsed = JSON.parse(raw);
      return Object.assign(blank(), parsed);
    } catch (err) {
      console.error('Could not read saved data, starting fresh', err);
      return blank();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('Save failed', err);
      return false;
    }
  }

  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const today = () => new Date().toISOString().slice(0, 10);

  /* ---------- customers ---------- */

  function addCustomer({ name, phone, note }) {
    const c = {
      id: uid(),
      name: name.trim(),
      phone: (phone || '').replace(/\s|-/g, ''),
      note: (note || '').trim(),
      createdAt: Date.now()
    };
    data.customers.push(c);
    save();
    return c;
  }

  function updateCustomer(id, patch) {
    const c = getCustomer(id);
    if (!c) return null;
    if (patch.name !== undefined) c.name = patch.name.trim();
    if (patch.phone !== undefined) c.phone = patch.phone.replace(/\s|-/g, '');
    if (patch.note !== undefined) c.note = patch.note.trim();
    save();
    return c;
  }

  function deleteCustomer(id) {
    data.customers = data.customers.filter(c => c.id !== id);
    data.entries = data.entries.filter(e => e.customerId !== id);
    save();
  }

  const getCustomer = id => data.customers.find(c => c.id === id) || null;

  /* ---------- entries ---------- */

  /* type 'give' = goods/cash given on credit, customer owes more.
     type 'take' = customer paid, owed amount goes down. */
  function addEntry({ customerId, type, paise, note, date }) {
    const e = {
      id: uid(),
      customerId,
      type,
      paise: Math.round(paise),
      note: (note || '').trim(),
      date: date || today(),
      ts: Date.now()
    };
    data.entries.push(e);
    save();
    return e;
  }

  function deleteEntry(id) {
    data.entries = data.entries.filter(e => e.id !== id);
    save();
  }

  const entriesFor = id =>
    data.entries
      .filter(e => e.customerId === id)
      .sort((a, b) => (a.date === b.date ? a.ts - b.ts : a.date < b.date ? -1 : 1));

  /* Positive balance = customer owes the shop. */
  function balanceOf(id) {
    return data.entries.reduce((sum, e) => {
      if (e.customerId !== id) return sum;
      return sum + (e.type === 'give' ? e.paise : -e.paise);
    }, 0);
  }

  function lastActivity(id) {
    let last = 0;
    for (const e of data.entries) {
      if (e.customerId === id && e.ts > last) last = e.ts;
    }
    return last;
  }

  /* Customers with their balance, most recently active first. */
  function customerList() {
    return data.customers
      .map(c => ({
        ...c,
        balance: balanceOf(c.id),
        lastActivity: lastActivity(c.id) || c.createdAt
      }))
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }

  function totals() {
    let receivable = 0, payable = 0;
    for (const c of data.customers) {
      const b = balanceOf(c.id);
      if (b > 0) receivable += b;
      else payable += -b;
    }
    return { receivable, payable };
  }

  /* ---------- settings & backup ---------- */

  function settings() {
    return { shopName: data.shopName, upiId: data.upiId, lang: data.lang };
  }

  function saveSettings(patch) {
    Object.assign(data, patch);
    save();
  }

  const exportJSON = () => JSON.stringify(data, null, 2);

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.customers) || !Array.isArray(parsed.entries)) {
      throw new Error('Not a Udhar Khata backup file');
    }
    data = Object.assign(blank(), parsed);
    save();
  }

  function exportCSV() {
    const head = ['date', 'customer', 'phone', 'type', 'amount', 'note'];
    const name = id => (getCustomer(id) || {}).name || '';
    const phone = id => (getCustomer(id) || {}).phone || '';
    const cell = v => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [...data.entries]
      .sort((a, b) => a.ts - b.ts)
      .map(e => [
        e.date,
        name(e.customerId),
        phone(e.customerId),
        e.type === 'give' ? 'given' : 'received',
        (e.paise / 100).toFixed(2),
        e.note
      ].map(cell).join(','));
    return [head.join(','), ...rows].join('\n');
  }

  function clearAll() {
    data = blank();
    save();
  }

  return {
    addCustomer, updateCustomer, deleteCustomer, getCustomer,
    addEntry, deleteEntry, entriesFor, balanceOf,
    customerList, totals,
    settings, saveSettings,
    exportJSON, importJSON, exportCSV, clearAll,
    today
  };
})();

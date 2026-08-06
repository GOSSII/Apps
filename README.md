# उधार खाता / Udhar Khata

A tiny offline credit ledger for Indian shopkeepers. The daily loop it serves:
a customer takes goods on udhar, the shopkeeper taps **आपने दिए**, and later
taps **आपने लिए** when the money comes back. One glance shows who owes what;
one tap sends a WhatsApp reminder with the shop's UPI ID already in it.

No build step, no framework, no server, no account. Open `index.html` and it
works.

## Why this idea

Credit at the counter is a daily habit in millions of kirana shops, dairies,
vegetable carts, and chai stalls — and most of it still lives in a paper
notebook that gets lost, soaked, or argued over. The app has to survive the
realities of that counter:

- **Offline first.** Shop basements and village lanes drop signal constantly.
  A service worker caches the whole app, so it opens the same with 4G or none.
- **Hindi first.** Devanagari is the default; English is one toggle away.
- **Two buttons, not a form.** The entire daily interaction is *gave* / *got*.
- **WhatsApp for collection.** Reminders go out on the app people already use,
  rather than asking customers to install anything.
- **Nothing leaves the phone.** No signup, no upload — money data stays local,
  with JSON and CSV backup for when the phone is replaced.

## Features

- Customer list with running balance, sorted by most recent activity
- Totals at the top: **लेने हैं** (receivable) and **देने हैं** (payable)
- Per-customer ledger with date, note, and per-entry delete
- WhatsApp reminder with the pending amount, shop name, and UPI ID prefilled
- One-tap call to the customer
- Search by name or phone
- Hindi / English toggle
- Installable PWA, works fully offline
- Backup: download/restore JSON, export CSV for Excel or a CA

## Run it

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

A service worker needs `http://` or `https://` — opening the file directly
still works, just without offline caching. Deploy by copying the folder to any
static host (GitHub Pages, Netlify, Cloudflare Pages).

On Android Chrome, use **Add to Home screen** to install it as an app.

## How it's built

| File | Role |
| --- | --- |
| `index.html` | App shell — one page, three screens |
| `css/styles.css` | Styling, dark mode, 48px touch targets |
| `js/store.js` | Data layer over `localStorage` |
| `js/i18n.js` | Hindi/English strings |
| `js/app.js` | Screens, routing, forms, WhatsApp link |
| `sw.js` | Cache-first service worker |

Two decisions worth knowing:

- **Money is stored in paise as integers.** Balances are sums of many small
  add/subtract operations, and floats drift; `₹1250.50` is kept as `125050`.
- **Balance sign carries meaning.** Positive = customer owes the shop (shown in
  red), negative = the shop owes the customer (green). Everything else —
  totals, list colours, reminder text — reads off that one number.

Amounts render through `Intl.NumberFormat('en-IN')`, so grouping follows the
Indian lakh/crore convention (`₹12,34,567`), not the Western one.

## Testing

Verified against headless Chromium (20 checks): customer creation, balance
arithmetic, persistence across reload, search, language switch, WhatsApp deep
link and `91` prefixing, HTML-injection escaping on customer names, CSV export,
service worker registration, and reloading with the network switched off.

## Other ideas in the same spirit

If this one is not the right fit, the same "small, daily, offline, Hindi-first"
shape applies to:

1. **दूध-पेपर हिसाब** — monthly milk and newspaper tally. Mark a daily tick,
   get the month-end bill. Every household deals with this, nobody enjoys it.
2. **PG / flatmate kharcha split** — shared expenses for the rent-sharing
   population in metros, settled with UPI links.
3. **दवा रिमाइंडर** — medicine reminders in Hindi for elderly parents, set up
   by the adult child on their behalf.
4. **Mandi bhav tracker** — log daily crop rates by mandi, spot the best day
   to sell.

## Licence

MIT

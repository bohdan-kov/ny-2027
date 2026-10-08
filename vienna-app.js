const V = window.VIENNA;
const ITEMS = V.items;
const STEP = 24;
const KEY = 'ny27-vienna';

// ціни в даних у євро, показ — у вибраній валюті (currency.js)
const fmt = (n, d) => CUR.fmt(n, d);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
const $ = id => document.getElementById(id);
const median = a => a.length % 2 ? a[a.length >> 1] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;

/* ---------- Вибір житла: зберігається в браузері, головна сторінка рахує поїздку з ним ---------- */
const CITY = 'vienna', CHOICE_KEY = 'ny27-choice';
let MODE = {};
try { MODE = JSON.parse(localStorage.getItem('ny27-mode') || '{}') || {}; } catch (e) {}
// маршрут як на головній: потяг, якщо його обрано для міста, інакше автобус
const TRAIN = MODE[CITY] === 'train' && (window.TRAINS || {})[CITY];
const TR = TRAIN || (window.TRANSPORT || {})[CITY] || { out: [], back: [] };
const ROAD = [...TR.out, ...TR.back].reduce((s, l) => s + l[3], 0);  // дорога з особи туди й назад
const NIGHTS = 8 + (TR.extraNights || 0);
let CHOICE = {};
try { CHOICE = JSON.parse(localStorage.getItem(CHOICE_KEY) || '{}') || {}; } catch (e) {}
const chosenId = () => CHOICE[CITY] && CHOICE[CITY].id;
function choose(x) {
  if (!x || chosenId() === x.id) delete CHOICE[CITY];
  else CHOICE[CITY] = { id: x.id, s: x.s, n: x.n, k: x.k, p: x.p, t: x.t, r: x.r, v: x.v, d: x.d, i: x.i, u: x.u, im: x.im, at: V.meta.date };
  try { localStorage.setItem(CHOICE_KEY, JSON.stringify(CHOICE)); } catch (e) {}
  render();
}
function renderChoice() {
  const c = CHOICE[CITY], bar = $('choice');
  document.body.classList.toggle('has-choice', !!c);
  bar.hidden = !c;
  if (!c) return;
  const house = c.p * NIGHTS / 8, housePP = house / 6, pp = housePP + ROAD;
  bar.innerHTML = `<div class="ch-in">
    <div class="ch-stay">${c.im ? `<img src="${esc(c.im)}" alt="" referrerpolicy="no-referrer">` : ''}<div><span class="ch-label">Ваш вибір · ${esc(c.s)}</span><a href="${esc(c.u)}" target="_blank" rel="noopener">${esc(c.n)}</a></div></div>
    <dl class="ch-nums">
      <div><dt>Житло, ${NIGHTS} ночей</dt><dd>${fmt(house)}</dd></div>
      <div><dt>Житло з особи</dt><dd>${fmt(housePP)}</dd></div>
      <div><dt>Дорога з особи${TRAIN ? ', потяг' : ''}</dt><dd>${fmt(ROAD)}</dd></div>
      <div class="hl"><dt>Разом з особи</dt><dd>${fmt(pp)}</dd></div>
      <div><dt>На компанію</dt><dd>${fmt(pp * 6)}</dd></div>
    </dl>
    <div class="ch-act"><a href="index.html#c-vienna">На головну →</a><button type="button" id="ch-clear">Скасувати вибір</button></div>
  </div>`;
  $('ch-clear').addEventListener('click', () => choose(null));
}

/* ---------- Шапка ---------- */
const priceMax = Math.ceil(Math.max(...ITEMS.map(x => x.p)) / 100) * 100;
const SRC = Object.entries(V.meta.src).sort((a, b) => b[1] - a[1]).map(([k]) => k);
$('facts').innerHTML = [
  ['Варіантів', V.meta.n], ['Платформ', SRC.length], ['Найдешевше', fmt(V.meta.min)], ['Медіана', fmt(V.meta.median)]
].map(([k, v]) => `<li><span>${k}</span>${v}</li>`).join('');
$('lead').textContent = `Усе ціле житло для 6 гостей на 8 ночей: ${SRC.join(', ')}. Дублікати між платформами прибрано. Ціни актуальні на ${V.meta.date}.`;
$('f-src').innerHTML = [['all', 'Усі'], ...SRC.map(k => [k, `${k} <small>${V.meta.src[k]}</small>`])]
  .map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="false">${t}</button>`).join('');

/* ---------- Фільтри ---------- */
const DEF = { src: 'all', q: '', price: priceMax, rate: '0', dist: '99', br: '0', beds: '0', sort: 'price', rev: false };
let F = { ...DEF };
try { Object.assign(F, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
if (F.src !== 'all' && !V.meta.src[F.src]) F.src = 'all';
let shown = STEP;

const range = $('f-price');
range.min = Math.floor(V.meta.min / 100) * 100; range.max = priceMax;

function syncForm() {
  document.querySelectorAll('#f-src button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === F.src));
  if (document.activeElement !== $('f-q')) $('f-q').value = F.q;
  range.value = F.price; $('f-rate').value = F.rate; $('f-dist').value = F.dist;
  $('f-br').value = F.br; $('f-beds').value = F.beds; $('f-sort').value = F.sort; $('f-rev').checked = F.rev;
  $('f-price-v').textContent = +F.price >= priceMax ? 'будь-яка' : fmt(F.price);
}

const SORT = {
  price: (a, b) => a.p - b.p,
  '-price': (a, b) => b.p - a.p,
  rate: (a, b) => (b.r10 || 0) - (a.r10 || 0) || b.v - a.v,
  dist: (a, b) => (a.d ?? 99) - (b.d ?? 99)
};

function filtered() {
  const q = F.q.trim().toLowerCase();
  return ITEMS.filter(x =>
    (F.src === 'all' || x.s === F.src) &&
    x.p <= +F.price &&
    (+F.rate === 0 || (x.r10 || 0) >= +F.rate) &&
    (x.d ?? 99) <= +F.dist &&
    (+F.br === 0 || (x.br ?? 0) >= +F.br) &&
    (+F.beds === 0 || (x.b ?? 0) >= +F.beds) &&
    (!F.rev || x.v >= 5) &&
    (!q || (x.n + ' ' + x.k + ' ' + x.i).toLowerCase().includes(q))
  ).sort(SORT[F.sort]);
}

function card(x) {
  const pp = x.p / 6 / 8;
  const rate = x.r ? `<span class="star">★ ${x.r}</span><span>${x.v} відгуків</span>` : '<span>ще без оцінки</span>';
  const links = [[x.s, x.u], ...(x.u2 ? [['FeWo-direkt', x.u2]] : []), ...(x.also || []).map(a => [`${a.s} · ${fmt(a.p)}`, a.u])];
  const on = chosenId() === x.id;
  return `<article class="stay${on ? ' chosen' : ''}">
    <div class="ph">
      ${x.im ? `<img src="${esc(x.im)}" alt="${esc(x.n)}" loading="lazy" referrerpolicy="no-referrer">` : ''}
      <span class="pill src">${x.s}${x.via ? ` · ${esc(x.via)}` : ''}</span>
      <div class="price"><b>${fmt(x.p)}</b><small>за 8 ночей, ${esc(x.t)}</small></div>
    </div>
    <div class="body">
      <h3>${esc(x.n)}</h3>
      <div class="rate">${rate}${x.d != null ? `<span title="${x.da ? 'приблизно, за центром району' : ''}">${PIN} ${x.da ? '≈' : ''}${x.d} км</span>` : ''}${x.k ? `<span>${esc(x.k)}</span>` : ''}</div>
      <div class="info">${esc(x.i)}</div>
      <div class="foot"><span><b>${fmt(pp, 1)}</b> з людини за ніч</span><a class="go" href="${esc(x.u)}" target="_blank" rel="noopener">Переглянути →</a></div>
      ${links.length > 1 ? `<div class="alt">Також: ${links.slice(1).map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join(' · ')}</div>` : ''}
      <button type="button" class="pick" data-id="${esc(x.id)}" aria-pressed="${on}">${on ? '✓ Обрано' : 'Обрати це житло'}</button>
    </div>
  </article>`;
}

function render() {
  try { localStorage.setItem(KEY, JSON.stringify(F)); } catch (e) {}
  syncForm();
  const list = filtered();
  const ps = list.map(x => x.p).sort((a, b) => a - b);
  $('count').innerHTML = list.length
    ? `Знайдено <b>${list.length}</b> з ${ITEMS.length} · від ${fmt(ps[0])} · медіана ${fmt(median(ps))}`
    : `Знайдено <b>0</b> з ${ITEMS.length}`;
  $('list').innerHTML = list.slice(0, shown).map(card).join('');
  $('empty').hidden = list.length > 0;
  const rest = list.length - shown;
  $('more').hidden = rest <= 0;
  $('more').textContent = `Показати ще ${Math.min(rest, STEP)} (залишилось ${rest})`;
  renderChoice();
}

const set = patch => { Object.assign(F, patch); shown = STEP; render(); };
$('f-src').addEventListener('click', e => { const b = e.target.closest('button'); if (b) set({ src: b.dataset.v }); });
$('f-q').addEventListener('input', e => set({ q: e.target.value }));
range.addEventListener('input', e => set({ price: +e.target.value }));
[['f-rate', 'rate'], ['f-dist', 'dist'], ['f-br', 'br'], ['f-beds', 'beds'], ['f-sort', 'sort']]
  .forEach(([id, k]) => $(id).addEventListener('change', e => set({ [k]: e.target.value })));
$('f-rev').addEventListener('change', e => set({ rev: e.target.checked }));
$('f-reset').addEventListener('click', () => set({ ...DEF }));
$('more').addEventListener('click', () => { shown += STEP; render(); });
const BY_ID = new Map(ITEMS.map(x => [x.id, x]));
$('list').addEventListener('click', e => { const b = e.target.closest('.pick'); if (b) choose(BY_ID.get(b.dataset.id)); });

CUR.mount($('cur'));
CUR.onChange(render);
render();

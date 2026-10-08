const DATA = window.STAYS;
const T = window.TRANSPORT;
const PH = window.CITY_PHOTOS || {};
const NYX = window.NY_EXPERIENCE || {};
// міста з окремою сторінкою всіх варіантів житла
const CITY_PAGES = { vienna: 'vienna.html' };
const ORDER = Object.keys(T);
const legSum = r => [...r.out, ...r.back].reduce((s, l) => s + l[3], 0);
// Потяг замість автобуса (data/trains.js): вибір по місту зберігається в браузері,
// маршрут потяга підміняє автобусний до всіх розрахунків (ціна, логістика, дод. ночі)
const TRAINS = window.TRAINS || {};
let MODE = {};
try { MODE = JSON.parse(localStorage.getItem('ny27-mode') || '{}') || {}; } catch (e) {}
const BUS = {};
ORDER.forEach(c => {
  BUS[c] = { ...T[c], total: legSum(T[c]) };
  if (MODE[c] === 'train' && TRAINS[c]) {
    const r = TRAINS[c];
    Object.assign(T[c], { out: r.out, back: r.back, hours: r.hours, logi: r.logi, extraNights: r.extraNights || 0, alt: r.note, mode: 'train' });
  }
  T[c].total = legSum(T[c]);
});

// ціни в даних у євро, показ — у вибраній валюті (currency.js)
const fmt = (n, d) => CUR.fmt(n, d);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const staysOf = c => [...DATA[c].airbnb, ...DATA[c].booking];
const minPrice = c => Math.min(...staysOf(c).map(x => x.price));
// житло, обране на сторінці міста (vienna.html), зберігається в браузері; якщо є — рахуємо поїздку з ним
let CHOICE = {};
try { CHOICE = JSON.parse(localStorage.getItem('ny27-choice') || '{}') || {}; } catch (e) {}
const chosen = c => CITY_PAGES[c] && CHOICE[c] && CHOICE[c].p ? CHOICE[c] : null;
const stayPrice = c => chosen(c) ? chosen(c).p : minPrice(c);
const housing = (c, mode) => mode === 'avg' ? DATA[c].mean : stayPrice(c);
// житло на 8 ночей + додаткові ночі, якщо цього вимагає розклад дороги
const housingPP = c => stayPrice(c) * (8 + (T[c].extraNights || 0)) / 8 / 6;
const perPerson = c => housingPP(c) + T[c].total;

/* ---------- Оцінка поїздки ----------
   Overall = 60% NY Experience + 20% Logistics + 20% Price */
const NY_CRIT = [
  ['nye', 'Святкування 31.12', 25], ['atmosphere', 'Святкова атмосфера', 20], ['nightlife', 'Nightlife', 15],
  ['uniqueness', 'Унікальність', 10], ['eight_days', 'Що робити 8 днів', 10], ['official_events', 'Офіційні події', 10],
  ['weather', 'Погода', 5], ['comfort', 'Комфорт і натовпи', 5]
];
const LOG_CRIT = [
  ['hours', 'Час у дорозі', 50], ['transfers', 'Пересадки', 20], ['risk', 'Ризик стикувань', 15],
  ['nights', 'Нічні переїзди', 10], ['conv', 'Прибуття в місто', 5]
];
const lin = (v, best, worst, hi, lo) => best === worst ? hi : hi - (v - best) / (worst - best) * (hi - lo);
const LG = ORDER.map(c => T[c].logi);
const RANGE = k => [Math.min(...LG.map(l => l[k])), Math.max(...LG.map(l => l[k]))];
const [hMin, hMax] = RANGE('hours'), [tMin, tMax] = RANGE('transfers'), [nMin, nMax] = RANGE('nights');
const cheapestPP = Math.min(...ORDER.map(perPerson));
const r1 = x => Math.round(x * 10) / 10;

const SCORE = {};
ORDER.forEach(c => {
  const l = T[c].logi, ny = (NYX[c] || {}).scores || {};
  const logParts = {
    hours: lin(l.hours, hMin, hMax, 50, 10), transfers: lin(l.transfers, tMin, tMax, 20, 4),
    risk: l.risk, nights: lin(l.nights, nMin, nMax, 10, 2), conv: l.conv
  };
  const nyTotal = NY_CRIT.reduce((s, [k]) => s + (ny[k] || 0), 0);
  const logTotal = Object.values(logParts).reduce((s, v) => s + v, 0);
  const price = 100 * cheapestPP / perPerson(c);
  SCORE[c] = { ny, nyTotal, logParts, logTotal, price, overall: .6 * nyTotal + .2 * logTotal + .2 * price };
});
ORDER.sort((a, b) => SCORE[b].overall - SCORE[a].overall);

const ICON = {
  bus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v2M16 18v2"/><circle cx="8" cy="14.5" r=".8" fill="currentColor"/><circle cx="16" cy="14.5" r=".8" fill="currentColor"/></svg>',
  air: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L16.5 6a2 2 0 0 1 3 3l-4.5 4.5 1 7.5L14.5 22.5 12 15l-3 3v2.5L7.5 22 6 18l-4-1.5L3.5 15H6l3-3"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  train: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M9 21l-2-4M15 21l2-4"/><circle cx="9" cy="13.5" r=".8" fill="currentColor"/><circle cx="15" cy="13.5" r=".8" fill="currentColor"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
};

/* ---------- Рейтинг ---------- */
let sortBy = 'score';
try { sortBy = localStorage.getItem('ny27-sort') || 'score'; } catch (e) {}

function miniBar(label, v, cls) {
  return `<div class="mb"><span class="mb-l">${label}</span><span class="mb-t"><i class="${cls}" style="width:${Math.max(0, Math.min(100, v))}%"></i></span><b>${Math.round(v)}</b></div>`;
}
function renderTickets() {
  const rows = [...ORDER].sort((a, b) => sortBy === 'price' ? perPerson(a) - perPerson(b) : SCORE[b].overall - SCORE[a].overall);
  document.getElementById('tickets').innerHTML = rows.map((c, i) => {
    const s = SCORE[c];
    // місто з окремою сторінкою житла — квиток веде на неї, інші прокручують до розділу міста
    const page = CITY_PAGES[c];
    const label = `${T[c].ua}: оцінка ${Math.round(s.overall)} зі 100, ${fmt(perPerson(c))} на людину${page ? '. Відкрити всі варіанти житла' : ''}`;
    return `<${page ? `a href="${page}"` : 'button type="button"'} class="ticket${i === 0 ? ' first' : ''}${page ? ' has-page' : ''}" data-city="${c}" aria-label="${label}">
      <div class="t-top">
        <div class="t-name">${PH[c] ? `<img class="t-thumb" src="${PH[c].img}" alt="" loading="lazy">` : ''}<div><div class="t-rank">№ ${i + 1}</div><div class="t-city">${T[c].ua}</div><div class="t-cc">${T[c].cc}</div></div></div>
        ${i === 0 ? `<span class="t-badge">${sortBy === 'price' ? 'найдешевше' : 'найкраще для нас'}</span>` : ''}
      </div>
      <div class="t-total"><b>${Math.round(s.overall)}<small>/100</small></b><span>оцінка поїздки</span></div>
      <div class="mbs">${miniBar('NY', s.nyTotal, 'ny')}${miniBar('Логістика', s.logTotal, 'lg')}${miniBar('Ціна', s.price, 'pr')}</div>
      <div class="t-split"><span><b>${fmt(perPerson(c))}</b> на людину</span><span class="t-time">${ICON.clock}${T[c].hours}</span></div>
      ${page ? `<span class="t-go">${chosen(c) ? `Обране житло: ${esc(chosen(c).n)}` : 'Усі варіанти житла →'}</span>` : ''}
    </${page ? 'a' : 'button'}>`;
  }).join('');
  document.querySelectorAll('button.ticket').forEach(b => b.addEventListener('click', () =>
    document.getElementById('c-' + b.dataset.city).scrollIntoView()));
  document.getElementById('sort-score').setAttribute('aria-pressed', sortBy === 'score');
  document.getElementById('sort-price').setAttribute('aria-pressed', sortBy === 'price');
}
['score', 'price'].forEach(m => document.getElementById('sort-' + m).addEventListener('click', () => {
  sortBy = m; try { localStorage.setItem('ny27-sort', m); } catch (e) {} renderTickets();
}));

/* ---------- Міста ---------- */
function stayCard(x, cheapest) {
  const pp = x.price / 6 / 8;
  return `<article class="stay">
    <div class="ph">
      ${x.img ? `<img src="${x.img}" alt="${esc(x.name)}" loading="lazy">` : ''}
      <span class="pill src">${x.src}</span>
      ${cheapest ? '<span class="pill best">найдешевше</span>' : ''}
      <div class="price"><b>${fmt(x.price)}</b><small>за 8 ночей, ${x.taxnote}</small></div>
    </div>
    <div class="body">
      <h3>${esc(x.name)}</h3>
      <div class="rate"><span class="star">★ ${x.rating}</span><span>${x.reviews} відгуків</span><span>${ICON.pin} ${x.dist} км від центру</span></div>
      <div class="info">${esc(x.info)}</div>
      <div class="foot"><span><b>${fmt(pp, 1)}</b> з людини за ніч</span><a class="go" href="${x.url}" target="_blank" rel="noopener">Переглянути →</a></div>
    </div>
  </article>`;
}

// обране житло з окремої сторінки міста — у форматі stayCard
function mineBlock(c) {
  const x = chosen(c);
  const card = stayCard({ src: x.s, name: x.n, price: x.p, taxnote: x.t, rating: x.r || '—', reviews: x.v || 0, dist: x.d ?? '—', info: x.i, url: x.u, img: x.im }, false)
    .replace('<span class="pill src">', '<span class="pill mine">ваш вибір</span><span class="pill src">')
    .replace('<span class="star">★ —</span><span>0 відгуків</span>', '<span>ще без оцінки</span>');
  return `<div class="stays">${card}</div>
    <div class="mine-act"><a href="${CITY_PAGES[c]}">Змінити вибір →</a><button type="button" data-clear="${c}">Скасувати вибір і рахувати за найдешевшим</button></div>`;
}

// перемикач «Автобус / Потяг» для міст, куди є потяг
function modeSwitch(c) {
  const tr = TRAINS[c], on = T[c].mode === 'train';
  return `<div class="seg mode" role="group" aria-label="Транспорт">
    <button type="button" data-mode="bus" data-city="${c}" aria-pressed="${!on}">${ICON.bus} Автобус / літак · ${fmt(BUS[c].total)}</button>
    <button type="button" data-mode="train" data-city="${c}" aria-pressed="${on}">${ICON.train} Потяг · ${tr.approx ? '≈' : ''}${fmt(legSum(tr))}</button>
  </div>`;
}

function legItem(l) {
  const [when, ...rest] = l[2].split(' · ');
  return `<li class="leg">
    <span class="ico${l[0] === 'air' ? ' air' : ''}">${ICON[l[0]] || ICON.bus}</span>
    <div><div class="leg-name">${l[1]}</div><div class="leg-time">${when}${rest.length ? '<br>' + rest.join(' · ') : ''}</div></div>
    <span class="leg-price">${fmt(l[3], 2)}</span>
  </li>`;
}

function wizzTable(rows) {
  return `<details class="wizz"><summary>Перевірені рейси Wizz Air (${rows.length})</summary><div class="wizz-scroll"><table>
    <thead><tr><th>Напрямок</th><th>Дата</th><th class="num">Ціна</th><th class="num">≈ ${CUR.sym}</th><th>Примітка</th></tr></thead>
    <tbody>${rows.map(r => `<tr${r[4] === 'обраний' ? ' class="pick"' : ''}><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3] == null ? '—' : fmt(r[3])}</td><td>${r[4]}</td></tr>`).join('')}</tbody>
  </table></div><p class="wizz-note">Ціна за 1 особу, лише маленька сумка під сидіння. Дані з календаря цін wizzair.com на 07.10.2026.</p></details>`;
}

const STATUS = { confirmed: ['підтверджено', 'ok'], recurring: ['щороку', 'rec'], uncertain: ['під питанням', 'warn'] };
function critRows(list, vals, cls) {
  return list.map(([k, label, max]) => {
    const v = vals[k] || 0;
    return `<li><span class="cr-l">${label}</span><span class="cr-t"><i class="${cls}" style="width:${v / max * 100}%"></i></span><span class="cr-v">${r1(v)}<small>/${max}</small></span></li>`;
  }).join('');
}
function scoreCard(c) {
  const s = SCORE[c], x = NYX[c] || {}, l = T[c].logi;
  return `<div class="score">
    <div class="sc-col">
      <div class="sc-head"><h3>NY Experience</h3><b>${Math.round(s.nyTotal)}<small>/100</small></b></div>
      ${x.scores_research && Object.values(x.scores_research).reduce((p, v) => p + v, 0) !== Math.round(s.nyTotal) ? `<p class="sc-note">Початкова оцінка дослідження: ${Object.values(x.scores_research).reduce((p, v) => p + v, 0)}. Скориговано компанією.</p>` : ''}
      <ul class="crit">${critRows(NY_CRIT, s.ny, 'ny')}</ul>
    </div>
    <div class="sc-col">
      <div class="sc-head"><h3>Логістика</h3><b>${Math.round(s.logTotal)}<small>/100</small></b></div>
      <ul class="crit">${critRows(LOG_CRIT, s.logParts, 'lg')}</ul>
      <p class="sc-note">${l.hours} год у дорозі туди й назад · пересадок: ${l.transfers} · ночей у дорозі: ${l.nights}. ${l.note.charAt(0).toUpperCase() + l.note.slice(1)}.</p>
      <div class="sc-head sc-price"><h3>Ціна</h3><b>${Math.round(s.price)}<small>/100</small></b></div>
      <p class="sc-note">${fmt(perPerson(c))} на людину${T[c].extraNights ? `, включно з ${T[c].extraNights} додатковою ніччю житла` : ''}. Найдешевше місто отримує 100, інші пропорційно: 100 × ${fmt(cheapestPP)} / ціна міста.</p>
    </div>
    <div class="sc-col sc-ny">
      <h3>Новий рік тут</h3>
      ${x.summary_uk ? `<p class="lead-s">${esc(x.summary_uk)}</p>` : ''}
      <dl>
        ${x.nye_uk ? `<dt>31 грудня</dt><dd>${esc(x.nye_uk)}</dd>` : ''}
        ${x.markets_uk ? `<dt>Ярмарки й ілюмінації</dt><dd>${esc(x.markets_uk)}</dd>` : ''}
        ${x.weather_uk ? `<dt>Погода</dt><dd>${esc(x.weather_uk)}</dd>` : ''}
        ${x.risks_uk ? `<dt>Зверніть увагу</dt><dd>${esc(x.risks_uk)}</dd>` : ''}
      </dl>
      ${(x.events || []).length ? `<ul class="events">${x.events.map(ev => { const st = STATUS[ev.status] || STATUS.uncertain; return `<li><div class="ev-main"><span class="ev-d">${esc(ev.date)}</span>${ev.url ? `<a href="${esc(ev.url)}" target="_blank" rel="noopener">${esc(ev.name)}</a>` : `<span>${esc(ev.name)}</span>`}</div><span class="st ${st[1]}">${st[0]}</span></li>`; }).join('')}</ul>` : ''}
    </div>
  </div>`;
}

function renderCities() {
  document.getElementById('nav').innerHTML = ORDER.map(c => `<a href="#c-${c}" data-city="${c}">${T[c].ua}</a>`).join('');
  document.getElementById('cities').innerHTML = ORDER.map((c, i) => {
    const d = DATA[c], t = T[c], stays = staysOf(c), minP = minPrice(c);
    return `<section class="city" id="c-${c}" aria-labelledby="h-${c}">
      <div class="cover${PH[c] ? '' : ' no-photo'}">
        ${CITY_PAGES[c] ? `<a class="cover-link" href="${CITY_PAGES[c]}" aria-label="${t.ua}: усі варіанти житла"></a><span class="cover-go">Усі варіанти житла →</span>` : ''}
        ${PH[c] ? `<img src="${PH[c].img}" alt="${t.ua} у новорічні свята" loading="lazy">` : ''}
        <div class="cover-text">
          <span class="city-no">№ ${i + 1}</span>
          <h2 id="h-${c}">${t.ua}</h2>
          <div class="city-cc">${t.cc} · проаналізовано ${d.n} оголошень</div>
        </div>
        <div class="cover-score"><b>${Math.round(SCORE[c].overall)}</b><span>оцінка<br>поїздки</span></div>
        ${PH[c] ? `<a class="credit" href="${PH[c].source}" target="_blank" rel="noopener">Фото: ${esc(PH[c].author)}, ${PH[c].license}</a>` : ''}
      </div>
      <div class="kpis">
        <div class="kpi${chosen(c) ? ' hl-soft' : ''}"><b>${fmt(stayPrice(c))}</b><span>${chosen(c) ? 'обране житло' : 'найдешевше житло'}</span></div>
        <div class="kpi"><b>${fmt(d.mean)}</b><span>середня ціна житла</span></div>
        <div class="kpi"><b>${fmt(t.total)}</b><span>дорога з особи</span></div>
        <div class="kpi hl"><b>${fmt(perPerson(c))}</b><span>разом на людину${t.extraNights ? ' (з дод. ніччю)' : ''}</span></div>
      </div>
      ${scoreCard(c)}
      ${chosen(c) ? mineBlock(c) : ''}
      <div class="stays">${stays.map(x => stayCard(x, x.price === minP)).join('')}</div>
      ${CITY_PAGES[c] ? `<a class="all-link" href="${CITY_PAGES[c]}">Усі варіанти житла: ${t.ua} →</a>` : ''}
      <div class="route">
        ${TRAINS[c] ? modeSwitch(c) : ''}
        <div class="route-head"><h3>Дорога з Києва${t.mode === 'train' ? ' потягом' : ''}</h3><span class="sum"><b>${fmt(t.total)}</b> з особи туди й назад · ${fmt(t.total * 6)} на компанію${t.extraNights ? ` · <b>+${t.extraNights} ніч житла</b>` : ''}</span></div>
        <div class="dirs">
          <div class="dir"><div class="dir-label">Туди</div><ol class="legs">${t.out.map(legItem).join('')}</ol></div>
          <div class="dir"><div class="dir-label">Назад</div><ol class="legs">${t.back.map(legItem).join('')}</ol></div>
        </div>
        <p class="tip"><span class="tip-label">Варто знати</span>${t.alt}</p>
        ${t.wizz ? wizzTable(t.wizz) : ''}
      </div>
    </section>`;
  }).join('');

  // зміна транспорту перераховує всі оцінки — простіше перезавантажити сторінку на розділі міста
  document.querySelectorAll('.mode button').forEach(b => b.addEventListener('click', () => {
    const c = b.dataset.city;
    if ((MODE[c] || 'bus') === b.dataset.mode) return;
    if (b.dataset.mode === 'train') MODE[c] = 'train'; else delete MODE[c];
    try { localStorage.setItem('ny27-mode', JSON.stringify(MODE)); } catch (e) {}
    location.hash = 'c-' + c; location.reload();
  }));
  document.querySelectorAll('[data-clear]').forEach(b => b.addEventListener('click', () => {
    delete CHOICE[b.dataset.clear];
    try { localStorage.setItem('ny27-choice', JSON.stringify(CHOICE)); } catch (e) {}
    location.reload();
  }));

  // підсвічування поточного міста в навігації
  const links = [...document.querySelectorAll('.cities-nav a')];
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle('on', a.dataset.city === e.target.id.slice(2)));
    const on = links.find(a => a.classList.contains('on'));
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }), { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('.city').forEach(s => io.observe(s));
}

/* ---------- Сніг у шапці ---------- */
function snow() {
  const cv = document.getElementById('snow'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, flakes;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flakes = Array.from({ length: Math.round(w / 14) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.8 + .6, s: Math.random() * .4 + .15, d: Math.random() * Math.PI * 2 }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      ctx.globalAlpha = .35 + f.r / 4; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
      if (!still) { f.y += f.s; f.d += .01; f.x += Math.sin(f.d) * .25; if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; } }
    }
    if (!still) requestAnimationFrame(draw);
  };
  resize(); draw(); addEventListener('resize', () => { resize(); if (still) draw(); });
}

renderTickets(); renderCities(); snow();
CUR.mount(document.getElementById('cur'));
CUR.onChange(() => { renderTickets(); renderCities(); });

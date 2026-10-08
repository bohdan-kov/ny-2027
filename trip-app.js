const TRIP = window.TRIP;
const C = TRIP.city;
const S = TRIP.stay;
const ROUTE = TRIP.mode === 'train' ? window.TRAINS[C] : window.TRANSPORT[C];
const BUSR = window.TRANSPORT[C];
const NYX = (window.NY_EXPERIENCE || {})[C] || {};
const PH = (window.CITY_PHOTOS || {})[C];
const $ = id => document.getElementById(id);
// ціни в даних у євро, показ — у вибраній валюті (currency.js)
const fmt = (n, d) => CUR.fmt(n, d);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICON = {
  bus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v2M16 18v2"/><circle cx="8" cy="14.5" r=".8" fill="currentColor"/><circle cx="16" cy="14.5" r=".8" fill="currentColor"/></svg>',
  train: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M9 21l-2-4M15 21l2-4"/><circle cx="9" cy="13.5" r=".8" fill="currentColor"/><circle cx="15" cy="13.5" r=".8" fill="currentColor"/></svg>'
};
const STATUS = { confirmed: ['підтверджено', 'ok'], recurring: ['щороку', 'rec'], uncertain: ['під питанням', 'warn'] };

/* ---------- Розрахунок ---------- */
const N = TRIP.nights + (ROUTE.extraNights || 0), P = TRIP.people;
const house = S.price * N / TRIP.nights;
const outPP = ROUTE.out.reduce((s, l) => s + l[3], 0), backPP = ROUTE.back.reduce((s, l) => s + l[3], 0);
const roadPP = outPP + backPP;
const totalPP = house / P + roadPP;
const busPP = [...BUSR.out, ...BUSR.back].reduce((s, l) => s + l[3], 0);
const nyScore = Object.values(NYX.scores || {}).reduce((a, b) => a + b, 0);

/* ---------- Шапка ---------- */
if (PH) {
  $('hero').style.setProperty('--hero-img', `url("${PH.img}")`);
  $('credit').href = PH.source; $('credit').textContent = `Фото: ${PH.author}, ${PH.license}`;
}

function renderFacts() {
  $('facts').innerHTML = [
    ['Дати', `${TRIP.dates.in.slice(0, 5)} → ${TRIP.dates.out.slice(0, 5)}`], ['Ночей', N], ['Компанія', `${P} дорослих`],
    ['Дорога', TRIP.mode === 'train' ? 'потяг УЗ' : 'автобус'], ['Разом з особи', fmt(totalPP)]
  ].map(([k, v]) => `<li><span>${k}</span>${v}</li>`).join('');
}

/* ---------- Вартість ---------- */
function renderCost() {
  $('cost-big').innerHTML = `
    <div class="cb-main"><span>Разом з особи</span><b>${fmt(totalPP)}</b></div>
    <div class="cb-row"><div><span>На компанію</span><b>${fmt(totalPP * P)}</b></div><div><span>З особи за день</span><b>${fmt(totalPP / N, 1)}</b></div></div>
    ${TRIP.mode === 'train' ? `<p class="cb-note">Автобусом вийшло б ${fmt(house / P + busPP)} з особи: потяг ${roadPP <= busPP ? 'дешевший' : 'дорожчий'} на ${fmt(Math.abs(busPP - roadPP))}.</p>` : ''}`;
  const row = (name, per, all, cls = '') => `<tr class="${cls}"><th scope="row">${name}</th><td>${fmt(per, 2)}</td><td>${fmt(all, 2)}</td></tr>`;
  $('cost-table').innerHTML = `
    <thead><tr><th scope="col">Стаття</th><th scope="col">З особи</th><th scope="col">На компанію</th></tr></thead>
    <tbody>
      ${row(`Житло, ${N} ночей <small>${esc(S.src)}, ${esc(S.priceNote)}</small>`, house / P, house)}
      ${row(`<small>за ніч</small>`, house / P / N, house / N, 'sub')}
      ${row(`Дорога туди <small>${esc(ROUTE.out.map(l => l[1]).join(' + '))}</small>`, outPP, outPP * P)}
      ${row(`Дорога назад <small>${esc(ROUTE.back.map(l => l[1]).join(' + '))}</small>`, backPP, backPP * P)}
    </tbody>
    <tfoot>${row('Разом', totalPP, totalPP * P, 'total')}</tfoot>`;
}
$('incl').innerHTML = S.included.map(x => `<li>${esc(x)}</li>`).join('') + `<li>квитки на потяг туди й назад</li>`;
$('excl').innerHTML = TRIP.notIncluded.map(x => `<li>${esc(x)}</li>`).join('');

/* ---------- Житло ---------- */
$('stay-sub').innerHTML = `<b>${esc(S.name)}</b> · ${esc(S.district)} · ${S.distCentre} км від центру, ${S.distHbf} км від Головного вокзалу · <a href="https://www.google.com/maps?q=${S.lat},${S.lng}" target="_blank" rel="noopener">на мапі</a>`;
function renderLinks() {
  $('stay-links').innerHTML = [[S.src, S.url, S.price], ...S.alt]
    .map(([n, u, p], i) => `<a class="${i ? 'ghost' : 'primary'}" href="${esc(u)}" target="_blank" rel="noopener">${esc(n)} · ${fmt(p)}</a>`).join('');
}
const SHOW = 5;
$('gallery').innerHTML = S.photos.slice(0, SHOW).map(([src, alt], i) =>
  `<button type="button" class="g-item${i === 0 ? ' big' : ''}" data-i="${i}" aria-label="${esc(alt)}"><img src="${src}" alt="${esc(alt)}" loading="${i ? 'lazy' : 'eager'}">${i === SHOW - 1 && S.photos.length > SHOW ? `<span class="g-more">+${S.photos.length - SHOW} фото</span>` : ''}</button>`).join('');
$('about').textContent = S.about;
$('stay-facts').innerHTML = S.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
$('amen').innerHTML = S.amenities.map(x => `<li>${esc(x)}</li>`).join('');
$('cancel').innerHTML = S.cancel.map(([d, t]) => `<li><b>${esc(d)}</b> ${esc(t)}</li>`).join('');
$('alt-note').textContent = S.altNote;

/* ---------- Галерея ---------- */
const lb = $('lightbox'); let cur = 0;
function show(i) {
  cur = (i + S.photos.length) % S.photos.length;
  $('lb-img').src = S.photos[cur][0]; $('lb-img').alt = S.photos[cur][1];
  $('lb-cap').textContent = `${S.photos[cur][1]} · ${cur + 1} / ${S.photos.length}`;
}
$('gallery').addEventListener('click', e => { const b = e.target.closest('.g-item'); if (!b) return; show(+b.dataset.i); lb.showModal(); });
$('lb-prev').addEventListener('click', () => show(cur - 1));
$('lb-next').addEventListener('click', () => show(cur + 1));
$('lb-close').addEventListener('click', () => lb.close());
lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });

/* ---------- Дорога ---------- */
function legItem(l) {
  const [when, ...rest] = l[2].split(' · ');
  return `<li class="leg"><span class="ico">${ICON[l[0]] || ICON.bus}</span>
    <div><div class="leg-name">${esc(l[1])}</div><div class="leg-time">${esc(when)}${rest.length ? '<br>' + esc(rest.join(' · ')) : ''}</div></div>
    <span class="leg-price">${fmt(l[3], 2)}</span></li>`;
}
function renderRoute() {
  $('road-sub').textContent = `${TRIP.mode === 'train' ? 'Потяг Укрзалізниці' : 'Автобус'} з Києва, ${ROUTE.hours} в один бік.`;
  $('route').innerHTML = `
    <div class="route-head"><h3>Київ ⇄ Відень</h3><span class="sum"><b>${fmt(roadPP)}</b> з особи туди й назад · ${fmt(roadPP * P)} на компанію</span></div>
    <div class="dirs">
      <div class="dir"><div class="dir-label">Туди</div><ol class="legs">${ROUTE.out.map(legItem).join('')}</ol></div>
      <div class="dir"><div class="dir-label">Назад</div><ol class="legs">${ROUTE.back.map(legItem).join('')}</ol></div>
    </div>
    <p class="tip"><span class="tip-label">Варто знати</span>${ROUTE.note || ''}</p>
    <p class="tip"><span class="tip-label">Прибуття</span>Квартира за ${S.distHbf} км від Головного вокзалу (Wien Hauptbahnhof), ≈20–25 хв пішки або кілька зупинок трамваєм. Заїзд після 16:00, виїзд 05.01 до 10:00, тож якщо потяг приходить зранку, речі можна залишити в камері схову на вокзалі.</p>`;
}

/* ---------- Місто ---------- */
$('city-sub').textContent = `NY Experience: ${nyScore}/100. ${NYX.weather_uk ? 'Погода: ' + NYX.weather_uk + '.' : ''}`;
$('city').innerHTML = `
  <div class="sc-col sc-ny">
    ${NYX.summary_uk ? `<p class="lead-s">${esc(NYX.summary_uk)}</p>` : ''}
    <dl>
      ${NYX.nye_uk ? `<dt>31 грудня</dt><dd>${esc(NYX.nye_uk)}</dd>` : ''}
      ${NYX.markets_uk ? `<dt>Ярмарки й ілюмінації</dt><dd>${esc(NYX.markets_uk)}</dd>` : ''}
      ${NYX.risks_uk ? `<dt>Зверніть увагу</dt><dd>${esc(NYX.risks_uk)}</dd>` : ''}
    </dl>
  </div>
  <div class="sc-col">
    <h3>Події</h3>
    <ul class="events">${(NYX.events || []).map(ev => { const st = STATUS[ev.status] || STATUS.uncertain; return `<li><div class="ev-main"><span class="ev-d">${esc(ev.date)}</span>${ev.url ? `<a href="${esc(ev.url)}" target="_blank" rel="noopener">${esc(ev.name)}</a>` : `<span>${esc(ev.name)}</span>`}</div><span class="st ${st[1]}">${st[0]}</span></li>`; }).join('')}</ul>
  </div>`;

/* ---------- Як дістатися: карта й варіанти ---------- */
const GA = TRIP.getaround;
if (GA) {
  $('getaround').innerHTML = GA.options.map(o => `<article class="ga${o.best ? ' best' : ''}">
    <div class="ga-head"><h3>${esc(o.title)}</h3><b>${esc(o.time)}</b></div>
    ${o.best ? '<span class="ga-badge">найзручніше</span>' : ''}
    <p>${esc(o.text)}</p></article>`).join('');
  $('tickets').textContent = GA.tickets;
  $('nye-transport').textContent = GA.nye;
  $('ga-sources').innerHTML = 'Джерела: ' + GA.sources.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join(' · ');
  const KIND = { home: ['#B4517A', 'Квартира'], stop: ['#C0392B', 'Зупинка трамвая 1'], rail: ['#2E6DB4', 'Вокзал / S-Bahn'], sight: ['#B8862B', 'Місця Нового року'] };
  const LINES = [['tram', '#C0392B', 'Трамвай 1 до центру'], ['walk', '#2E7A67', 'Пішки: до центру й до вокзалу']];
  $('map-legend').innerHTML = [
    ...Object.values(KIND).map(([c, t]) => `<li><i class="dot" style="background:${c}"></i>${t}</li>`),
    ...LINES.map(([k, c, t]) => `<li><i class="ln ${k}" style="border-color:${c}"></i>${t}</li>`)
  ].join('');
  if (window.L) {
    const m = GA.map;
    const map = L.map('map', { scrollWheelZoom: false }).setView([48.195, 16.37], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    L.polyline(m.walkSteph, { color: '#2E7A67', weight: 4, dashArray: '6 8', opacity: .85 }).addTo(map).bindTooltip('Пішки до собору Св. Стефана · 4 км · ≈53 хв');
    L.polyline(m.walkHbf, { color: '#2E7A67', weight: 4, dashArray: '6 8', opacity: .85 }).addTo(map).bindTooltip('Пішки до вокзалу · 2,2 км · ≈30 хв');
    L.polyline(m.tram1, { color: '#C0392B', weight: 5, opacity: .85 }).addTo(map).bindTooltip('Трамвай 1 · Davidgasse → Опера → Ратуша → Шведенплац');
    const pts = m.points.map(([k, name, note, lat, lng]) => {
      const home = k === 'home';
      const mk = L.circleMarker([lat, lng], { radius: home ? 11 : 7, color: '#fff', weight: 2, fillColor: KIND[k][0], fillOpacity: 1 }).addTo(map)
        .bindPopup(`<b>${esc(name)}</b><br>${esc(note)}`);
      if (home) mk.bindTooltip('Наша квартира', { permanent: true, direction: 'right', offset: [10, 0], className: 'home-tip' });
      return [lat, lng];
    });
    map.fitBounds(L.latLngBounds(pts).pad(0.08));
  } else {
    $('map').innerHTML = `<p class="map-fallback">Карта не завантажилась. <a href="https://www.openstreetmap.org/?mlat=${S.lat}&mlon=${S.lng}#map=15/${S.lat}/${S.lng}" target="_blank" rel="noopener">Відкрити на OpenStreetMap →</a></p>`;
  }
}

function render() { renderFacts(); renderCost(); renderLinks(); renderRoute(); }
CUR.mount($('cur'));
CUR.onChange(render);
render();

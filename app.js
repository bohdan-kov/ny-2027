const DATA = window.STAYS;
const T = window.TRANSPORT;
const PH = window.CITY_PHOTOS || {};
const ORDER = Object.keys(T);
ORDER.forEach(c => { T[c].total = [...T[c].out, ...T[c].back].reduce((s, l) => s + l[3], 0); });

const fmt = n => Math.round(n).toLocaleString('uk-UA').replace(/ /g, ' ') + ' €';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const staysOf = c => [...DATA[c].airbnb, ...DATA[c].booking];
const minPrice = c => Math.min(...staysOf(c).map(x => x.price));
const housing = (c, mode) => mode === 'avg' ? DATA[c].mean : minPrice(c);
ORDER.sort((a, b) => (minPrice(a) / 6 + T[a].total) - (minPrice(b) / 6 + T[b].total));

const ICON = {
  bus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v2M16 18v2"/><circle cx="8" cy="14.5" r=".8" fill="currentColor"/><circle cx="16" cy="14.5" r=".8" fill="currentColor"/></svg>',
  air: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L16.5 6a2 2 0 0 1 3 3l-4.5 4.5 1 7.5L14.5 22.5 12 15l-3 3v2.5L7.5 22 6 18l-4-1.5L3.5 15H6l3-3"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
};

/* ---------- Рейтинг ---------- */
let mode = 'min';
try { mode = localStorage.getItem('ny27-mode') || 'min'; } catch (e) {}

function renderTickets() {
  const rows = ORDER.map(c => { const h = housing(c, mode) / 6; return { c, h, r: T[c].total, t: h + T[c].total }; })
    .sort((a, b) => a.t - b.t);
  const max = Math.max(...rows.map(r => r.t));
  document.getElementById('tickets').innerHTML = rows.map((r, i) => `
    <button type="button" class="ticket${i === 0 ? ' first' : ''}" data-city="${r.c}" aria-label="${T[r.c].ua}: ${fmt(r.t)} на людину">
      <div class="t-top">
        <div class="t-name">${PH[r.c] ? `<img class="t-thumb" src="${PH[r.c].img}" alt="" loading="lazy">` : ''}<div><div class="t-rank">№ ${i + 1}</div><div class="t-city">${T[r.c].ua}</div><div class="t-cc">${T[r.c].cc}</div></div></div>
        ${i === 0 ? '<span class="t-badge">найвигідніше</span>' : ''}
      </div>
      <div class="t-total"><b>${fmt(r.t)}</b><span>на людину</span></div>
      <div class="bar" aria-hidden="true"><span style="width:${r.h / max * 100}%;background:var(--house)"></span><span style="width:${r.r / max * 100}%;background:var(--road)"></span></div>
      <div class="t-split"><span>житло <b>${fmt(r.h)}</b></span><span>дорога <b>${fmt(r.r)}</b></span></div>
      <div class="t-time">${ICON.clock}${T[r.c].hours} в один бік</div>
    </button>`).join('');
  document.querySelectorAll('.ticket').forEach(b => b.addEventListener('click', () =>
    document.getElementById('c-' + b.dataset.city).scrollIntoView()));
  document.getElementById('mode-min').setAttribute('aria-pressed', mode === 'min');
  document.getElementById('mode-avg').setAttribute('aria-pressed', mode === 'avg');
}
['min', 'avg'].forEach(m => document.getElementById('mode-' + m).addEventListener('click', () => {
  mode = m; try { localStorage.setItem('ny27-mode', m); } catch (e) {} renderTickets();
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
      <div class="foot"><span><b>${pp.toFixed(1)} €</b> з людини за ніч</span><a class="go" href="${x.url}" target="_blank" rel="noopener">Переглянути →</a></div>
    </div>
  </article>`;
}

function legItem(l) {
  const [when, ...rest] = l[2].split(' · ');
  return `<li class="leg">
    <span class="ico${l[0] === 'air' ? ' air' : ''}">${l[0] === 'air' ? ICON.air : ICON.bus}</span>
    <div><div class="leg-name">${l[1]}</div><div class="leg-time">${when}${rest.length ? '<br>' + rest.join(' · ') : ''}</div></div>
    <span class="leg-price">${l[3].toFixed(2)} €</span>
  </li>`;
}

function wizzTable(rows) {
  return `<details class="wizz"><summary>Перевірені рейси Wizz Air (${rows.length})</summary><div class="wizz-scroll"><table>
    <thead><tr><th>Напрямок</th><th>Дата</th><th class="num">Ціна</th><th class="num">≈ €</th><th>Примітка</th></tr></thead>
    <tbody>${rows.map(r => `<tr${r[4] === 'обраний' ? ' class="pick"' : ''}><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3] == null ? '—' : r[3] + ' €'}</td><td>${r[4]}</td></tr>`).join('')}</tbody>
  </table></div><p class="wizz-note">Ціна за 1 особу, лише маленька сумка під сидіння. Дані з календаря цін wizzair.com на 07.10.2026.</p></details>`;
}

function renderCities() {
  document.getElementById('nav').innerHTML = ORDER.map(c => `<a href="#c-${c}" data-city="${c}">${T[c].ua}</a>`).join('');
  document.getElementById('cities').innerHTML = ORDER.map((c, i) => {
    const d = DATA[c], t = T[c], stays = staysOf(c), minP = minPrice(c);
    return `<section class="city" id="c-${c}" aria-labelledby="h-${c}">
      <div class="cover${PH[c] ? '' : ' no-photo'}">
        ${PH[c] ? `<img src="${PH[c].img}" alt="${t.ua} у новорічні свята" loading="lazy">` : ''}
        <div class="cover-text">
          <span class="city-no">№ ${i + 1}</span>
          <h2 id="h-${c}">${t.ua}</h2>
          <div class="city-cc">${t.cc} · проаналізовано ${d.n} оголошень</div>
        </div>
        ${PH[c] ? `<a class="credit" href="${PH[c].source}" target="_blank" rel="noopener">Фото: ${esc(PH[c].author)}, ${PH[c].license}</a>` : ''}
      </div>
      <div class="kpis">
        <div class="kpi"><b>${fmt(minP)}</b><span>найдешевше житло</span></div>
        <div class="kpi"><b>${fmt(d.mean)}</b><span>середня ціна житла</span></div>
        <div class="kpi"><b>${fmt(t.total)}</b><span>дорога з особи</span></div>
        <div class="kpi hl"><b>${fmt(minP / 6 + t.total)}</b><span>разом на людину</span></div>
      </div>
      <div class="stays">${stays.map(x => stayCard(x, x.price === minP)).join('')}</div>
      <div class="route">
        <div class="route-head"><h3>Дорога з Києва</h3><span class="sum"><b>${fmt(t.total)}</b> з особи туди й назад · ${fmt(t.total * 6)} на компанію</span></div>
        <div class="dirs">
          <div class="dir"><div class="dir-label">Туди</div><ol class="legs">${t.out.map(legItem).join('')}</ol></div>
          <div class="dir"><div class="dir-label">Назад</div><ol class="legs">${t.back.map(legItem).join('')}</ol></div>
        </div>
        <p class="tip"><span class="tip-label">Варто знати</span>${t.alt}</p>
        ${t.wizz ? wizzTable(t.wizz) : ''}
      </div>
    </section>`;
  }).join('');

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
